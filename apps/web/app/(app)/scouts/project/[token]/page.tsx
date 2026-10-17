import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLaunch } from "@/lib/scouts";
import { robinhoodMainnet } from "@/lib/chains";
import { ReferralSection } from "./referral-section";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `${token.slice(0, 10)}… · Scouts · Damkeeper`,
  };
}

const SOURCE_LABEL: Record<string, string> = {
  pons_v2_active: "Pons V2",
  pons_legacy: "Pons Legacy",
  pools_trade_current: "Pools.trade",
  pools_trade_original: "Pools.trade",
};

function timeAgo(unixSeconds: string) {
  const seconds = Number(unixSeconds);
  if (!seconds) return "—";
  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default async function ScoutsProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const launch = await getLaunch({ tokenAddress: token, chainId: robinhoodMainnet.id });

  if (!launch) notFound();

  const explorerBase = robinhoodMainnet.blockExplorers.default.url;

  return (
    <main className="main" style={{ padding: "32px 24px", maxWidth: 820, margin: "0 auto", width: "100%" }}>
      <a href="/scouts/launches" style={{ fontSize: 13, color: "var(--muted)" }}>
        ← Back to launches
      </a>

      <div style={{ marginTop: 16, marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text)" }}>
            {launch.tokenName ?? "Unnamed token"}
            {launch.tokenSymbol && (
              <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {launch.tokenSymbol}</span>
            )}
          </h1>
          <span
            className="chip"
            style={{
              background: "rgba(184, 243, 107, 0.1)",
              color: "var(--accent-pale)",
              fontSize: 11,
            }}
          >
            {SOURCE_LABEL[launch.source] ?? launch.source}
          </span>
        </div>
        <p className="mono" style={{ fontSize: 12, color: "var(--muted)", margin: "6px 0 0" }}>
          {launch.tokenAddress}
        </p>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
          Launched {timeAgo(launch.launchedAt)}
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 14 }}>
          Onchain launch evidence
        </div>
        <Field label="Token address" value={launch.tokenAddress} />
        <Field label="Deployer / creator" value={launch.creatorAddress} />
        <Field label="Launch factory" value={launch.factoryAddress} />
        {launch.pairAddress && <Field label="Quote asset" value={launch.pairAddress} />}
        <Field label="Launch block" value={launch.launchBlock} />
        <div style={{ marginTop: 12 }}>
          <a
            href={`${explorerBase}/tx/${launch.launchTxHash}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 12, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <svg className="icon" style={{ width: 12, height: 12 }}>
              <use href="#i-link" />
            </svg>
            View launch transaction on explorer
          </a>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
          Damkeeper products that fit
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          Locks, vesting, and funded staking are the Scout-eligible actions for new projects
          (burns and airdrops are tracked but not rewarded in V1).
        </p>
      </div>

      <ReferralSection projectToken={launch.tokenAddress} chainId={launch.chainId} />

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
          Completed Damkeeper actions
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          No verified lock, vesting, or staking activity for this project yet.
        </p>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 13, color: "var(--text-2)", wordBreak: "break-all" }}>
        {value}
      </div>
    </div>
  );
}
