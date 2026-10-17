"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const STATUS_LABEL: Record<string, string> = {
  created: "Awaiting acceptance",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
};

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
  const pending = Math.max(accepted - conversions.length, 0);

  return (
    <main className="wrap">
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="dot" />
          Scouts
        </div>
        <h1>Scout dashboard</h1>
        <p className="page-lede">
          Your referrals, verified conversions, and points. Points are a testnet simulation —
          not a $DAM payout.
        </p>
      </div>

      {!isConnected ? (
        <div className="card">
          <div className="empty-hero">
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true">
                <use href="#i-search" />
              </svg>
            </span>
            <h2>Connect your wallet</h2>
            <p>Your referrals are tied to your wallet address — connect to see them.</p>
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
          </div>
        </div>
      ) : loading ? (
        <div className="card">
          <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            Loading…
          </p>
        </div>
      ) : (
        <>
          <div className="metric-grid" style={{ marginBottom: 24 }}>
            <div className="metric">
              <span>Referrals created</span>
              <strong>{created}</strong>
            </div>
            <div className="metric">
              <span>Referrals accepted</span>
              <strong>{accepted}</strong>
            </div>
            <div className="metric">
              <span>Pending conversions</span>
              <strong>{pending}</strong>
            </div>
            <div className="metric accent">
              <span>Verified conversions</span>
              <strong>{verified}</strong>
            </div>
            <div className="metric accent">
              <span>Points earned</span>
              <strong>{pointsTotal}</strong>
              <small>testnet only</small>
            </div>
            <div className="metric">
              <span>Claimable $DAM</span>
              <strong>—</strong>
              <small>Phase 4</small>
            </div>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Your referrals</h2>
            </div>

            {referrals.length === 0 ? (
              <div className="empty-hero">
                <span className="ic">
                  <svg className="icon-lg" aria-hidden="true">
                    <use href="#i-link" />
                  </svg>
                </span>
                <h2>No referrals yet</h2>
                <p>
                  Browse <Link href="/scouts/launches">new launches</Link> and create a referral
                  from a project's detail page.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {referrals.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "14px 16px",
                      border: "1px solid var(--hair)",
                      borderRadius: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Link
                        href={`/scouts/project/${r.projectToken}`}
                        className="mono"
                        style={{ fontSize: 13, color: "var(--text)" }}
                      >
                        {r.projectToken.slice(0, 10)}…{r.projectToken.slice(-6)}
                      </Link>
                      <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 2 }}>
                        Created {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={r.status === "accepted" ? "badge" : "badge badge-muted"}>
                      <span className={r.status === "accepted" ? "status-dot live" : "status-dot"} />
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {rejected.length > 0 && (
            <section className="card">
              <div className="card-head">
                <h2>Rejected conversions</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rejected.map((c) => (
                  <div
                    key={c.id}
                    style={{ padding: "12px 16px", border: "1px solid var(--hair)", borderRadius: 12 }}
                  >
                    <div className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
                      {c.projectToken ? `${c.projectToken.slice(0, 10)}…${c.projectToken.slice(-6)}` : "—"}
                      {" · "}
                      {c.kind}
                    </div>
                    <div style={{ fontSize: 12, color: "#f87171", marginTop: 4 }}>{c.rejectionReason}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
