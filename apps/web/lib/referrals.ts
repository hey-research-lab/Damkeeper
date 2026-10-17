import { and, desc, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { keccak256, toBytes } from "viem";
import { db } from "@/db/client";
import { referrals, projectLaunches } from "@/db/schema";
import { robinhoodMainnet } from "@/lib/chains";

export interface ReferralView {
  id: string;
  referralCode: string;
  chainId: number;
  projectToken: string;
  projectOwner: string | null;
  scoutAddress: string;
  status: string;
  referralIdHash: string;
  createdAt: string;
  acceptedAt: string | null;
  expiresAt: string | null;
  acceptanceTxHash: string | null;
}

// 30 days, per brief §4 "Attribution window" recommended default.
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function toView(r: typeof referrals.$inferSelect): ReferralView {
  return {
    id: r.id,
    referralCode: r.referralCode,
    chainId: r.chainId,
    projectToken: r.projectToken,
    projectOwner: r.projectOwner,
    scoutAddress: r.scoutAddress,
    status: r.status,
    referralIdHash: r.referralIdHash,
    createdAt: r.createdAt.toISOString(),
    acceptedAt: r.acceptedAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    acceptanceTxHash: r.acceptanceTxHash,
  };
}

export async function createReferral(params: {
  chainId?: number;
  projectToken: string;
  scoutAddress: string;
}): Promise<ReferralView> {
  const chainId = params.chainId ?? robinhoodMainnet.id;
  const projectToken = params.projectToken.toLowerCase();
  const scoutAddress = params.scoutAddress.toLowerCase();

  // One project may have only one active (not expired/revoked) referral at a
  // time — brief §8 rule 1. "Active" here means created-or-accepted and not
  // past its expiry.
  const [existing] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.chainId, chainId),
        eq(referrals.projectToken, projectToken)
      )
    )
    .orderBy(desc(referrals.createdAt))
    .limit(1);

  if (existing && (existing.status === "created" || existing.status === "accepted")) {
    const stillActive = !existing.expiresAt || existing.expiresAt.getTime() > Date.now();
    if (stillActive) return toView(existing);
  }

  // Scout cannot refer a project controlled by the same wallet — brief §8 rule 2.
  // Checked against the launch indexer's recorded deployer, the only onchain
  // signal we have for "who controls this project."
  const [launch] = await db
    .select()
    .from(projectLaunches)
    .where(
      and(eq(projectLaunches.chainId, chainId), eq(projectLaunches.tokenAddress, projectToken))
    )
    .limit(1);

  if (launch && launch.creatorAddress === scoutAddress) {
    throw new Error("A Scout cannot refer a project they deployed themselves.");
  }

  const referralCode = randomBytes(9).toString("base64url");
  const referralIdHash = keccak256(toBytes(referralCode));
  const expiresAt = new Date(Date.now() + ATTRIBUTION_WINDOW_MS);

  const [created] = await db
    .insert(referrals)
    .values({ referralCode, chainId, projectToken, scoutAddress, referralIdHash, expiresAt })
    .returning();

  return toView(created);
}

export async function getReferral(id: string): Promise<ReferralView | null> {
  const [row] = await db.select().from(referrals).where(eq(referrals.id, id)).limit(1);
  return row ? toView(row) : null;
}

export async function getReferralByCode(code: string): Promise<ReferralView | null> {
  const [row] = await db.select().from(referrals).where(eq(referrals.referralCode, code)).limit(1);
  return row ? toView(row) : null;
}

export async function listReferralsByScout(params: {
  scoutAddress: string;
  chainId?: number;
}): Promise<ReferralView[]> {
  const chainId = params.chainId ?? robinhoodMainnet.id;
  const rows = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.chainId, chainId),
        eq(referrals.scoutAddress, params.scoutAddress.toLowerCase())
      )
    )
    .orderBy(desc(referrals.createdAt));
  return rows.map(toView);
}
