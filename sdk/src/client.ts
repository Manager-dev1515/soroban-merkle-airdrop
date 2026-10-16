/**
 * Typed client for the soroban-merkle-airdrop contract.
 */

import {
  Contract,
  rpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  scValToNative,
  nativeToScVal,
  Keypair,
  Address,
  Account,
  Networks,
} from "@stellar/stellar-sdk";
import type { ClaimProof, ClaimResult, SimulateClaimResult, NetworkConfig } from "./types.js";

export function createAirdropClient(config: NetworkConfig) {
  const server = new rpc.Server(config.rpcUrl, { allowHttp: false });
  const contractInst = new Contract(config.contractId);

  /** Check if an address has already claimed. */
  async function isClaimed(address: string): Promise<boolean> {
    const result = await simulateRead(
      contractInst.call("is_claimed", new Address(address).toScVal())
    );
    return scValToNative(result) as boolean;
  }

  /** Check if the airdrop is currently active. */
  async function isActive(): Promise<boolean> {
    const result = await simulateRead(contractInst.call("is_active"));
    return scValToNative(result) as boolean;
  }

  /** Fetch the Merkle root stored in the contract. */
  async function merkleRoot(): Promise<string | null> {
    const result = await simulateRead(contractInst.call("merkle_root"));
    const native = scValToNative(result);
    if (!native) return null;
    return Buffer.from(native as Uint8Array).toString("hex");
  }

  /** Fetch total tokens deposited. */
  async function totalDeposited(): Promise<bigint> {
    const result = await simulateRead(contractInst.call("total_deposited"));
    return BigInt(scValToNative(result) as number);
  }

  /**
   * Build the unsigned claim transaction for a given proof and signer.
   * This is the shared inner helper used by both `simulateClaim` and `claim`.
   *
   * @internal
   */
  async function buildClaimTx(
    claimProof: ClaimProof,
    signerPublicKey: string
  ) {
    const sourceAccount = await server.getAccount(signerPublicKey);

    // Convert proof array of hex strings → ScVal vec of BytesN<32>
    const proofScVal = xdr.ScVal.scvVec(
      claimProof.proof.map((h) => {
        const bytes = Buffer.from(h, "hex");
        return xdr.ScVal.scvBytes(bytes);
      })
    );

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(
        contractInst.call(
          "claim",
          new Address(signerPublicKey).toScVal(),
          nativeToScVal(claimProof.amount, { type: "i128" }),
          proofScVal
        )
      )
      .setTimeout(30)
      .build();

    return tx;
  }

  /**
   * Simulate a claim transaction and return the estimated fee and resource
   * usage without submitting anything on-chain.
   *
   * @param claimProof      - The proof package from `buildMerkleTree`.
   * @param signerPublicKey - The claimant's Stellar public key (G...).
   * @returns               Fee estimate in stroops and Soroban resource details.
   */
  async function simulateClaim(
    claimProof: ClaimProof,
    signerPublicKey: string
  ): Promise<SimulateClaimResult> {
    const tx = await buildClaimTx(claimProof, signerPublicKey);

    const simResult = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    const successResult = simResult as rpc.Api.SimulateTransactionSuccessResponse;

    // The minResourceFee from simulation is the Soroban resource fee.
    // Add it to the base fee to get the total estimated fee.
    const resourceFee = BigInt(successResult.minResourceFee ?? "0");
    const baseFee = BigInt(BASE_FEE);
    const totalFee = (baseFee + resourceFee).toString();

    // Extract resource consumption details from the simulation footprint.
    const resources = successResult.transactionData
      ? extractResources(successResult.transactionData)
      : {};

    return {
      fee: totalFee,
      resources,
    };
  }

  /**
   * Submit a claim transaction.
   *
   * Internally reuses the same simulation logic as `simulateClaim` to avoid
   * duplication — the simulation result is used to assemble the final tx.
   *
   * @param claimProof      - The proof package from `buildMerkleTree`.
   * @param signerSecretKey - The claimant's Stellar secret key (S...).
   */
  async function claim(
    claimProof: ClaimProof,
    signerSecretKey: string
  ): Promise<ClaimResult> {
    const keypair = Keypair.fromSecret(signerSecretKey);
    const tx = await buildClaimTx(claimProof, keypair.publicKey());

    const simResult = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    const preparedTx = rpc.assembleTransaction(tx, simResult).build();
    preparedTx.sign(keypair);

    const sendResult = await server.sendTransaction(preparedTx);
    if (sendResult.status === "ERROR") {
      throw new Error(`Transaction failed: ${sendResult.errorResult?.toXDR("base64")}`);
    }

    const txHash = sendResult.hash;
    while (true) {
      await sleep(2000);
      const poll = await server.getTransaction(txHash);
      if (poll.status === "SUCCESS") {
        return {
          success: true,
          txHash,
          address: claimProof.address,
          amount: claimProof.amount,
        };
      }
      if (poll.status === "FAILED") {
        throw new Error(`Transaction failed on-chain: ${txHash}`);
      }
    }
  }

  async function simulateRead(operation: xdr.Operation): Promise<xdr.ScVal> {
    const dummy = Keypair.random();
    const account = new Account(dummy.publicKey(), "0");
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResult = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Read simulation failed: ${simResult.error}`);
    }
    return (simResult as rpc.Api.SimulateTransactionSuccessResponse).result!.retval;
  }

  /**
   * Extract a human-readable resource summary from the simulation's
   * SorobanTransactionData XDR object.
   */
  function extractResources(
    transactionData: rpc.Api.SimulateTransactionSuccessResponse["transactionData"]
  ): SimulateClaimResult["resources"] {
    try {
      // transactionData may be an XDR object or base64 string depending on SDK version
      const sorobanData =
        typeof transactionData === "string"
          ? xdr.SorobanTransactionData.fromXDR(transactionData, "base64")
          : (transactionData as unknown as xdr.SorobanTransactionData);

      const resources = sorobanData.resources();
      return {
        instructions: resources.instructions(),
        readBytes: resources.readBytes(),
        writeBytes: resources.writeBytes(),
        readEntries: resources.footprint().readOnly().length,
        writeEntries: resources.footprint().readWrite().length,
      };
    } catch {
      // If extraction fails (e.g., SDK version differences), return an empty object
      return {};
    }
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  return { isClaimed, isActive, merkleRoot, totalDeposited, simulateClaim, claim };
}
