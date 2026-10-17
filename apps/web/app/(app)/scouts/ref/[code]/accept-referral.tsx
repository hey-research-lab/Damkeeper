"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { ReferralView } from "@/lib/referrals";

const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS as `0x${string}` | undefined;

const acceptReferralAbi = [
  {
    type: "function",
    name: "acceptReferral",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectToken", type: "address" },
      { name: "scout", type: "address" },
      { name: "referralIdHash", type: "bytes32" },
      { name: "expiresAt", type: "uint64" },
    ],
    outputs: [],
  },
] as const;

export function AcceptReferral({ referral }: { referral: ReferralView }) {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [done, setDone] = useState(referral.status === "accepted");

  useEffect(() => {
    if (!txConfirmed || !txHash || done) return;
    setConfirming(true);
    fetch(`/api/scouts/referrals/${referral.id}/confirm-acceptance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDone(true);
      })
      .catch((err) => setConfirmError(err instanceof Error ? err.message : "Failed to confirm"))
      .finally(() => setConfirming(false));
  }, [txConfirmed, txHash, done, referral.id]);

  if (done) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, color: "var(--accent)" }}>✓ Referral accepted onchain.</div>
      </div>
    );
  }

  if (!REGISTRY_ADDRESS) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          The referral registry contract isn't deployed on this environment yet. Check back soon.
        </p>
      </div>
    );
  }

  const expiresAtUnix = referral.expiresAt
    ? BigInt(Math.floor(new Date(referral.expiresAt).getTime() / 1000))
    : 0n;

  const handleAccept = () => {
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: acceptReferralAbi,
      functionName: "acceptReferral",
      args: [
        referral.projectToken as `0x${string}`,
        referral.scoutAddress as `0x${string}`,
        referral.referralIdHash as `0x${string}`,
        expiresAtUnix,
      ],
    });
  };

  if (!isConnected) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
          Connect the wallet that controls this project to accept the referral.
        </p>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            const injected = connectors.find((c) => c.id === "injected") || connectors[0];
            if (injected) connect({ connector: injected });
          }}
        >
          Connect wallet
        </button>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 4px" }}>Connected as</p>
      <p className="mono" style={{ fontSize: 13, color: "var(--text)", margin: "0 0 14px" }}>
        {address}
      </p>
      <button type="button" className="btn btn-primary" onClick={handleAccept} disabled={isPending || confirming}>
        {isPending ? "Confirm in wallet…" : confirming ? "Finalizing…" : "Accept referral"}
      </button>
      {(writeError || confirmError) && (
        <p style={{ fontSize: 12, color: "#f87171", marginTop: 10 }}>
          {writeError?.message ?? confirmError}
        </p>
      )}
    </div>
  );
}
