"use client";

import { useState } from "react";
import Link from "next/link";
import type { LaunchView } from "@/lib/scouts";
import { robinhoodMainnet } from "@/lib/chains";

interface LaunchesFeedProps {
  initialLaunches: LaunchView[];
}

const SOURCE_LABEL: Record<string, string> = {
  pons_v2: "Pons V2",
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
    <main className="wrap">
      <div className="page-head">
        <div className="page-eyebrow">
          <span className="dot" />
          Scouts · Robinhood Chain
        </div>
        <h1>New launches</h1>
        <p className="page-lede">
          Discover new token launches eligible for Scout referral.{" "}
          <Link href="/scouts/dashboard" style={{ color: "var(--accent)" }}>
            View your Scout dashboard →
          </Link>
        </p>
      </div>

      {initialLaunches.length === 0 ? (
        <div className="card">
          <div className="empty-hero">
            <span className="ic">
              <svg className="icon-lg" aria-hidden="true">
                <use href="#i-search" />
              </svg>
            </span>
            <h2>No launches detected yet</h2>
            <p>New launches appear here automatically as the indexer picks them up.</p>
          </div>
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
  const initial = (launch.tokenSymbol ?? launch.tokenName ?? "?").charAt(0).toUpperCase();
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className="card"
      style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, position: "relative" }}
    >
      <a
        href={`/scouts/project/${launch.tokenAddress}`}
        aria-label={`View ${launch.tokenName ?? launch.tokenAddress}`}
        style={{ position: "absolute", inset: 0 }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="tok-ic">
          {launch.tokenImage && !imageFailed ? (
            <img src={launch.tokenImage} alt="" onError={() => setImageFailed(true)} />
          ) : (
            initial
          )}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {launch.tokenName ?? "Unnamed token"}
            {launch.tokenSymbol && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {launch.tokenSymbol}</span>}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
            {short(launch.tokenAddress)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span className="badge">{SOURCE_LABEL[launch.source] ?? launch.source}</span>
        <span style={{ fontSize: 11, color: "var(--faint)" }}>{timeAgo(launch.launchedAt)}</span>
      </div>

      <div>
        <div style={{ fontSize: 10, color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Creator
        </div>
        <div className="mono" style={{ fontSize: 12, color: "var(--text-2)" }}>
          {short(launch.creatorAddress)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          paddingTop: 10,
          borderTop: "1px solid var(--hair)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--accent)" }}>
          <span className="status-dot live" />
          Open to refer
        </span>
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
          Explorer
          <svg className="icon" style={{ width: 11, height: 11 }}>
            <use href="#i-link" />
          </svg>
        </a>
      </div>
    </div>
  );
}
