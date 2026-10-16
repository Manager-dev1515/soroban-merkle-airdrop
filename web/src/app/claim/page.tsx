"use client";

import { useState } from "react";
import { createAirdropClient, verifyProof, NETWORKS } from "@soroban-merkle-airdrop/sdk";

const CONTRACT_ID = process.env.NEXT_PUBLIC_AIRDROP_CONTRACT_ID ?? "";
const NETWORK = (process.env.NEXT_PUBLIC_NETWORK ?? "testnet") as "testnet" | "mainnet";

type Status = "idle" | "checking" | "eligible" | "not_eligible" | "claimed" | "claiming" | "success" | "error";

// Map status → CSS variable name for border/text colour
const statusVar: Record<Status, string> = {
  idle:         "var(--text-muted)",
  checking:     "var(--text-muted)",
  eligible:     "var(--success)",
  not_eligible: "var(--accent)",
  claimed:      "var(--accent)",
  claiming:     "var(--text-muted)",
  success:      "var(--success)",
  error:        "var(--error)",
};

export default function ClaimPage() {
  const [address, setAddress]     = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [proofJson, setProofJson] = useState("");
  const [status, setStatus]       = useState<Status>("idle");
  const [message, setMessage]     = useState("");
  const [txHash, setTxHash]       = useState("");

  async function handleCheck() {
    if (!address.trim()) return;
    setStatus("checking");
    setMessage("");
    try {
      if (!CONTRACT_ID) throw new Error("Airdrop contract not configured");
      const client = createAirdropClient({ ...NETWORKS[NETWORK], contractId: CONTRACT_ID });
      const claimed = await client.isClaimed(address.trim());
      if (claimed) {
        setStatus("claimed");
        setMessage("This address has already claimed.");
      } else {
        if (proofJson) {
          const tree = JSON.parse(proofJson);
          const entry = tree.proofs?.[address.trim()];
          if (!entry) {
            setStatus("not_eligible");
            setMessage("This address is not in the airdrop list.");
          } else {
            setStatus("eligible");
            setMessage(`Eligible! Amount: ${entry.amount} tokens`);
          }
        } else {
          setStatus("eligible");
          setMessage("Address not yet claimed. Upload your proof JSON to proceed.");
        }
      }
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
    }
  }

  async function handleClaim() {
    if (!proofJson || !secretKey) return;
    setStatus("claiming");
    try {
      const tree  = JSON.parse(proofJson);
      const entry = tree.proofs?.[address.trim()];
      if (!entry) throw new Error("Address not found in proof file");

      const proof = { ...entry, amount: BigInt(entry.amount) };

      if (!verifyProof(tree.root, proof.address, proof.amount, proof.proof)) {
        throw new Error("Proof verification failed — file may be corrupted");
      }

      const client = createAirdropClient({ ...NETWORKS[NETWORK], contractId: CONTRACT_ID });
      const result = await client.claim(proof, secretKey);
      setTxHash(result.txHash);
      setStatus("success");
      setMessage(`Successfully claimed ${result.amount.toString()} tokens!`);
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Check &amp; Claim</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
        Enter your Stellar address to check eligibility, then claim your tokens.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={{ fontSize: 13, color: "var(--text-muted)" }}>
          YOUR STELLAR ADDRESS
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="G... or C..."
            style={inputStyle}
            aria-label="Stellar address"
          />
        </label>

        <label style={{ fontSize: 13, color: "var(--text-muted)" }}>
          PROOF FILE (JSON from merkle-airdrop generate) — optional for check
          <textarea
            value={proofJson}
            onChange={(e) => setProofJson(e.target.value)}
            placeholder="Paste your merkle-tree.json contents here..."
            rows={4}
            style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }}
            aria-label="Merkle proof JSON"
          />
        </label>

        <button
          onClick={handleCheck}
          disabled={!address || status === "checking"}
          style={accentBtnStyle}
        >
          {status === "checking" ? "Checking..." : "Check Eligibility"}
        </button>

        {status !== "idle" && message && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              background: "var(--surface)",
              border: `1px solid ${statusVar[status]}`,
              color: statusVar[status],
              fontSize: 14,
            }}
          >
            {message}
          </div>
        )}

        {(status === "eligible" || status === "claiming") && proofJson && (
          <>
            <label style={{ fontSize: 13, color: "var(--text-muted)" }}>
              SECRET KEY (to sign the claim transaction — never sent to any server)
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="S..."
                style={inputStyle}
                aria-label="Stellar secret key"
              />
            </label>
            <button
              onClick={handleClaim}
              disabled={!secretKey || status === "claiming"}
              style={successBtnStyle}
            >
              {status === "claiming" ? "Claiming..." : "Claim Tokens →"}
            </button>
          </>
        )}

        {status === "success" && txHash && (
          <div style={{ marginTop: 8 }}>
            <a
              href={`https://stellar.expert/explorer/${NETWORK}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)", fontSize: 13 }}
            >
              View transaction on Stellar Expert →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 14px",
  marginTop: 6,
  fontSize: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "monospace",
};

const accentBtnStyle: React.CSSProperties = {
  padding: "14px 24px",
  background: "var(--accent)",
  color: "var(--accent-fg)",
  fontWeight: 700,
  fontSize: 15,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  width: "100%",
};

const successBtnStyle: React.CSSProperties = {
  padding: "14px 24px",
  background: "var(--success)",
  color: "var(--accent-fg)",
  fontWeight: 700,
  fontSize: 15,
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  width: "100%",
};
