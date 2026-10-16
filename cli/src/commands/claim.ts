/**
 * `merkle-airdrop claim`
 *
 * Submit a claim transaction for a given address using the Merkle proof
 * from the generated tree JSON.
 *
 * Use `--dry-run` to simulate the transaction and print the estimated fee
 * without submitting anything on-chain.
 */

import { Command } from "commander";
import { readFile } from "fs/promises";
import { resolve } from "path";
import chalk from "chalk";
import ora from "ora";
import { createAirdropClient, verifyProof, NETWORKS } from "@soroban-merkle-airdrop/sdk";

export const claimCommand = new Command("claim")
  .description("Claim tokens from the airdrop")
  .requiredOption("-t, --tree <file>", "Merkle tree JSON (output of generate)")
  .requiredOption("-a, --address <address>", "Address to claim for")
  .option("-k, --secret-key <key>", "Stellar secret key (or set STELLAR_SECRET_KEY)")
  .option(
    "--dry-run",
    "Simulate the claim and print the estimated fee without submitting"
  )
  .action(async (opts, cmd) => {
    const globalOpts = cmd.parent?.opts() ?? {};
    const network = globalOpts.network ?? "testnet";
    const contractId = globalOpts.contractId ?? process.env.AIRDROP_CONTRACT_ID;
    const secretKey = opts.secretKey ?? process.env.STELLAR_SECRET_KEY;
    const isDryRun: boolean = !!opts.dryRun;

    if (!contractId) {
      console.error(chalk.red("Error: --contract-id or AIRDROP_CONTRACT_ID required"));
      process.exit(1);
    }
    if (!secretKey) {
      console.error(chalk.red("Error: --secret-key or STELLAR_SECRET_KEY required"));
      process.exit(1);
    }

    const spinner = ora("Loading Merkle tree...").start();
    try {
      const raw = JSON.parse(await readFile(resolve(opts.tree), "utf-8"));
      const entry = raw.proofs[opts.address];
      if (!entry) {
        spinner.fail(chalk.red(`Address ${opts.address} not found in airdrop list`));
        process.exit(1);
      }

      const proof = { ...entry, amount: BigInt(entry.amount) };

      spinner.text = "Verifying proof locally...";
      const valid = verifyProof(raw.root, proof.address, proof.amount, proof.proof);
      if (!valid) {
        spinner.fail(chalk.red("Proof verification failed — tree may be corrupted"));
        process.exit(1);
      }

      const preset = NETWORKS[network];
      const client = createAirdropClient({
        ...preset,
        contractId,
      });

      spinner.text = "Checking claim status...";
      const already = await client.isClaimed(opts.address);
      if (already) {
        spinner.warn(chalk.yellow(`${opts.address} has already claimed.`));
        process.exit(0);
      }

      // ── Dry-run mode: simulate and print fee estimate, then exit ──────────
      if (isDryRun) {
        spinner.text = "Simulating claim transaction (dry run)...";

        // simulateClaim takes the public key, not the secret key
        const { Keypair } = await import("@stellar/stellar-sdk");
        const publicKey = Keypair.fromSecret(secretKey).publicKey();

        const sim = await client.simulateClaim(proof, publicKey);

        spinner.succeed(chalk.cyan("Dry-run simulation complete (no transaction submitted)"));
        console.log(`\n  ${chalk.bold("Estimated fee:")} ${chalk.yellow(sim.fee)} stroops`);

        if (sim.resources && Object.keys(sim.resources).length > 0) {
          console.log(`\n  ${chalk.bold("Resource usage:")}`);
          const r = sim.resources;
          if (r.instructions !== undefined)
            console.log(`    Instructions: ${chalk.dim(r.instructions.toLocaleString())}`);
          if (r.readBytes !== undefined)
            console.log(`    Read bytes:   ${chalk.dim(r.readBytes.toLocaleString())}`);
          if (r.writeBytes !== undefined)
            console.log(`    Write bytes:  ${chalk.dim(r.writeBytes.toLocaleString())}`);
          if (r.readEntries !== undefined)
            console.log(`    Read entries: ${chalk.dim(r.readEntries)}`);
          if (r.writeEntries !== undefined)
            console.log(`    Write entries:${chalk.dim(r.writeEntries)}`);
        }
        console.log(
          `\n  ${chalk.dim("Tip: remove --dry-run to submit the transaction for real.")}\n`
        );
        process.exit(0);
      }

      // ── Live mode: submit the transaction ─────────────────────────────────
      spinner.text = "Submitting claim transaction...";
      const result = await client.claim(proof, secretKey);

      spinner.succeed(chalk.green("Claim submitted!"));
      console.log(`\n  ${chalk.bold("Tx hash:")} ${chalk.cyan(result.txHash)}`);
      console.log(`  ${chalk.bold("Address:")} ${result.address}`);
      console.log(`  ${chalk.bold("Amount:")}  ${result.amount.toString()}\n`);
    } catch (err) {
      spinner.fail(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });
