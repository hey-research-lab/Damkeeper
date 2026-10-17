"use client";

import { useState } from "react";
import { useAccount, useConnect } from "wagmi";

interface ReferralSectionProps {
  projectToken: string;
  chainId: number;
}

const STEPS = [
  "You create a referral link for this project.",
  "You share it with the project's team.",
  "They connect their wallet and accept it onchain.",
  "If they then lock, vest, or stake with Damkeeper, you get credit and points.",
];

export function ReferralSection({ projectToken, chainId }: ReferralSectionProps) {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const referralPath = referralCode ? `/scouts/ref/${referralCode}` : null;
  const referralUrl =
    referralPath && typeof window !== "undefined" ? `${window.location.origin}${referralPath}` : referralPath;

  const handleCopy = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
        Scout referral
      </div>

      {referralCode ? (
        <div>
          <p style={{ fontSize: 13, color: "var(--accent)", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
            <svg className="icon" style={{ width: 14, height: 14 }}>
              <use href="#i-check" />
            </svg>
            Link created. Send it to this project's team — once they accept it and adopt
            Damkeeper, you'll see it here on your{" "}
            <a href="/scouts/dashboard" style={{ color: "var(--accent)", textDecoration: "underline" }}>
              dashboard
            </a>
            .
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <div
              className="mono"
              style={{
                fontSize: 12,
                color: "var(--text-2)",
                background: "rgba(184, 243, 107, 0.08)",
                padding: "10px 12px",
                borderRadius: 6,
                wordBreak: "break-all",
                flex: 1,
              }}
            >
              {referralUrl}
            </div>
            <button type="button" className="btn btn-ghost" style={{ flexShrink: 0 }} onClick={handleCopy}>
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <ol style={{ margin: "0 0 14px", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {STEPS.map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--muted)" }}>
                {step}
              </li>
            ))}
          </ol>

          {!isConnected ? (
            <button type="button" className="btn btn-ghost" onClick={handleConnect}>
              Connect wallet to create a referral
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? "Creating…" : "Create referral link"}
              </button>
              {error && <p style={{ fontSize: 12, color: "#f87171", marginTop: 8 }}>{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
