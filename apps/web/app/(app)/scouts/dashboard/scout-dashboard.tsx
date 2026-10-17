"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import type { ReferralView } from "@/lib/referrals";

interface ConversionView {
  id: string;
  projectToken: string | null;
  kind: string;
  status: string;
  rejectionReason: string | null;
  rewardPoints: number;
}

export function ScoutDashboard() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const [referrals, setReferrals] = useState<ReferralView[]>([]);
  const [conversions, setConversions] = useState<ConversionView[]>([]);
  const [pointsTotal, setPointsTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/scouts/referrals?scout=${address}`).then((res) => res.json()),
      fetch(`/api/scouts/conversions?scout=${address}`).then((res) => res.json()),
    ])
      .then(([referralsData, conversionsData]) => {
        setReferrals(referralsData.referrals ?? []);
        setConversions(conversionsData.conversions ?? []);
        setPointsTotal(conversionsData.pointsTotal ?? 0);
      })
      .finally(() => setLoading(false));
  }, [address]);

  const created = referrals.length;
  const accepted = referrals.filter((r) => r.status === "accepted").length;
  const verified = conversions.filter((c) => c.status === "verified").length;
  const rejected = conversions.filter((c) => c.status === "rejected");
  const pending = accepted - conversions.length;

  return (
    <main className="main" style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto", width: "100%" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "var(--text)" }}>Scout Dashboard</h1>
      <p style={{ fontSize: 14, color: "var(--muted)", margin: "6px 0 28px" }}>
        Your referrals, verified conversions, and points.
      </p>

      {!isConnected ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const injected = connectors.find((c) => c.id === "injected") || connectors[0];
            if (injected) connect({ connector: injected });
          }}
        >
          Connect wallet
        </button>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <Stat label="Referrals created" value={created} />
            <Stat label="Referrals accepted" value={accepted} />
            <Stat label="Pending conversions" value={Math.max(pending, 0)} />
            <Stat label="Verified conversions" value={verified} />
            <Stat label="Points earned" value={pointsTotal} note="testnet, not $DAM" />
            <Stat label="Claimable $DAM" value="—" note="Phase 4" />
          </div>

          {loading ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Loading…</p>
          ) : referrals.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              No referrals yet. Create one from a project's detail page.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {referrals.map((r) => (
                <div key={r.id} className="card" style={{ padding: 16 }}>
                  <div className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
                    {r.projectToken}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    Status: <span style={{ color: r.status === "accepted" ? "var(--accent)" : "var(--text-2)" }}>
                      {r.status}
                    </span>
                    {" · "}Created {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {rejected.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
                Rejected conversions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rejected.map((c) => (
                  <div key={c.id} className="card" style={{ padding: 14 }}>
                    <div className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                      {c.projectToken} · {c.kind}
                    </div>
                    <div style={{ fontSize: 12, color: "#f87171", marginTop: 2 }}>{c.rejectionReason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="card" style={{ padding: "14px 18px", minWidth: 140 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>
        {label}
        {note && <span style={{ opacity: 0.6 }}> · {note}</span>}
      </div>
    </div>
  );
}
