"use client";

import { useState } from "react";
import { useAccount, useConnect } from "wagmi";

interface ReferralSectionProps {
  projectToken: string;
  chainId: number;
}

export function ReferralSection({ projectToken, chainId }: ReferralSectionProps) {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    const injected = connectors.find((c) => c.id === "injected") || connectors[0];
    if (injected) connect({ connector: injected });
  };

  const handleCreate = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scouts/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chainId, projectToken, scoutAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create referral");
      setReferralCode(data.referral.referralCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create referral");
    } finally {
      setLoading(false);
    }
  };

  const referralUrl = referralCode ? `/scouts/ref/${referralCode}` : null;

  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
        Scout referral
      </div>

      {referralCode ? (
        <div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 8px" }}>
            Share this link with the project's team to get attribution if they adopt Damkeeper.
          </p>
          <div
            className="mono"
            style={{
              fontSize: 12,
              color: "var(--accent)",
              background: "rgba(184, 243, 107, 0.08)",
              padding: "8px 10px",
              borderRadius: 6,
              wordBreak: "break-all",
            }}
          >
            {referralUrl}
          </div>
        </div>
      ) : !isConnected ? (
        <div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
            Connect your wallet to create a referral link for this project.
          </p>
          <button type="button" className="btn btn-ghost" onClick={handleConnect}>
            Connect wallet
          </button>
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 10px" }}>
            Create a referral link to introduce this project's team to Damkeeper.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? "Creating…" : "Create referral"}
          </button>
          {error && <p style={{ fontSize: 12, color: "#f87171", marginTop: 8 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
