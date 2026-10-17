"use client";

import type { LaunchView } from "@/lib/scouts";
import { robinhoodMainnet } from "@/lib/chains";

interface LaunchesFeedProps {
  initialLaunches: LaunchView[];
}

const SOURCE_LABEL: Record<string, string> = {
  pons_v2_active: "Pons V2",
  pons_legacy: "Pons Legacy",
  pools_trade_current: "Pools.trade",
  pools_trade_original: "Pools.trade",
};

function short(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function timeAgo(unixSeconds: string) {
  const seconds = Number(unixSeconds);
  if (!seconds) return "—";
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function LaunchesFeed({ initialLaunches }: LaunchesFeedProps) {
  return (
    <main className="main" style={{ padding: "32px 24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "var(--text)" }}>
            Scouts — New Launches
          </h1>
          <span
            className="chip mono"
            style={{
              background: "rgba(184, 243, 107, 0.12)",
              color: "var(--accent)",
              fontSize: 11,
              border: "1px solid rgba(184, 243, 107, 0.3)",
            }}
          >
            Robinhood Chain
          </span>
        </div>
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "6px 0 0", maxWidth: 600 }}>
          Discover new token launches eligible for Scout referral.
        </p>
      </div>

      {initialLaunches.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: 12,
            padding: "48px 24px",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          <svg className="icon" style={{ width: 28, height: 28, opacity: 0.5, marginBottom: 12 }}>
            <use href="#i-search" />
          </svg>
          <div style={{ fontSize: 15, color: "var(--text-2)" }}>No launches detected yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Check back soon — new launches appear automatically.</div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {initialLaunches.map((launch) => (
            <LaunchCard key={`${launch.chainId}-${launch.launchTxHash}`} launch={launch} />
          ))}
        </div>
      )}
    </main>
  );
}

function LaunchCard({ launch }: { launch: LaunchView }) {
  const explorerUrl = `${robinhoodMainnet.blockExplorers.default.url}/tx/${launch.launchTxHash}`;

  return (
    <div
      className="card"
      style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, position: "relative" }}
    >
      <a
        href={`/scouts/project/${launch.tokenAddress}`}
        aria-label={`View ${launch.tokenAddress}`}
        style={{ position: "absolute", inset: 0 }}
      />

      <div className="mono" style={{ fontSize: 13, color: "var(--text)" }}>
        {short(launch.tokenAddress)}
      </div>

      <span
        className="chip"
        style={{
          alignSelf: "flex-start",
          background: "rgba(184, 243, 107, 0.1)",
          color: "var(--accent-pale)",
          fontSize: 11,
        }}
      >
        {SOURCE_LABEL[launch.source] ?? launch.source}
      </span>

      <div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>Creator</div>
        <div className="mono" style={{ fontSize: 13, color: "var(--text-2)" }}>
          {short(launch.creatorAddress)}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--muted)" }}>{timeAgo(launch.launchedAt)}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--accent)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
        Open to refer
      </div>

      <a
        href={explorerUrl}
        target="_blank"
        rel="noreferrer"
        style={{
          fontSize: 12,
          color: "var(--muted)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          position: "relative",
          zIndex: 1,
        }}
      >
        <svg className="icon" style={{ width: 12, height: 12 }}>
          <use href="#i-link" />
        </svg>
        View on explorer
      </a>
    </div>
  );
}
