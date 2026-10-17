import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReferralByCode } from "@/lib/referrals";
import { getLaunch } from "@/lib/scouts";
import { AcceptReferral } from "./accept-referral";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accept Scout Referral · Damkeeper",
};

export default async function ScoutRefPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const referral = await getReferralByCode(code);
  if (!referral) notFound();

  const launch = await getLaunch({ tokenAddress: referral.projectToken, chainId: referral.chainId });

  return (
    <main className="main" style={{ padding: "32px 24px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--text)" }}>
        Accept Scout referral
      </h1>
      <p style={{ fontSize: 14, color: "var(--muted)", margin: "8px 0 24px" }}>
        A Scout has introduced your project to Damkeeper&apos;s lock, vesting, and staking
        infrastructure. Accepting does not transfer funds or grant token approvals.
      </p>

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>Project token</div>
        <div className="mono" style={{ fontSize: 13, color: "var(--text)", wordBreak: "break-all" }}>
          {referral.projectToken}
        </div>
        {launch && (
          <>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>Launched via</div>
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>{launch.source}</div>
          </>
        )}
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>Status</div>
        <div style={{ fontSize: 13, color: referral.status === "accepted" ? "var(--accent)" : "var(--text-2)" }}>
          {referral.status}
        </div>
      </div>

      <AcceptReferral referral={referral} />
    </main>
  );
}
