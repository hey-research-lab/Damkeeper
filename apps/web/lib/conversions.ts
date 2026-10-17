import { and, eq, gt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { referrals, positions, stakingPools, conversions } from "@/db/schema";

// Brief §10 "Suggested scoring model" — testnet simulation values only, not
// token payouts.
const BASE_POINTS: Record<string, number> = { lock: 100, vesting: 150, staking: 200 };

// Brief §9 recommended initial thresholds.
const MIN_DURATION_SECONDS = 30n * 24n * 60n * 60n; // 30 days

export interface ReconcileResult {
  checked: number;
  verified: number;
  rejected: number;
}

/// Scans accepted referrals for a qualifying lock/vesting action on the
/// referred token, created by the referral's accepted project owner, after
/// acceptance and before expiry. One pass per call — cheap to run on every
/// cron tick since it only looks at accepted referrals with no conversion
/// yet.
export async function reconcileConversions(): Promise<ReconcileResult> {
  const result: ReconcileResult = { checked: 0, verified: 0, rejected: 0 };

  const acceptedReferrals = await db.select().from(referrals).where(eq(referrals.status, "accepted"));

  for (const referral of acceptedReferrals) {
    if (!referral.projectOwner || !referral.acceptedAt) continue;
    result.checked++;

    const acceptedAtUnix = BigInt(Math.floor(referral.acceptedAt.getTime() / 1000));
    const expiresAtUnix = referral.expiresAt
      ? BigInt(Math.floor(referral.expiresAt.getTime() / 1000))
      : null;

    const candidatePositions = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.chainId, referral.chainId),
          eq(positions.token, referral.projectToken),
          eq(positions.creator, referral.projectOwner),
          gt(positions.createdAt, acceptedAtUnix)
        )
      );

    for (const position of candidatePositions) {
      if (expiresAtUnix && position.createdAt > expiresAtUnix) continue; // after window closed

      const [existing] = await db
        .select()
        .from(conversions)
        .where(
          and(
            eq(conversions.chainId, position.chainId),
            eq(conversions.managerAddress, position.managerAddress),
            eq(conversions.positionId, position.positionId)
          )
        )
        .limit(1);
      if (existing) continue; // already processed — one reward per position

      // Only one first-adoption reward per project per action category (§8 rule 6).
      const [alreadyRewardedCategory] = await db
        .select()
        .from(conversions)
        .where(and(eq(conversions.referralId, referral.id), eq(conversions.kind, position.kind), eq(conversions.status, "verified")))
        .limit(1);
      if (alreadyRewardedCategory) continue;

      let rejectionReason: string | null = null;

      if (position.kind === "lock") {
        const duration = (position.unlockTime ?? 0n) - position.createdAt;
        if (duration < MIN_DURATION_SECONDS) rejectionReason = "lock duration below 30-day minimum";
      } else if (position.kind === "vesting") {
        const duration = (position.endTime ?? 0n) - (position.startTime ?? position.createdAt);
        if (duration < MIN_DURATION_SECONDS) rejectionReason = "vesting duration below 30-day minimum";
      } else {
        continue;
      }

      if (BigInt(position.amount) <= 0n) rejectionReason = "dust amount";

      const status = rejectionReason ? "rejected" : "verified";
      const rewardPoints = rejectionReason ? 0 : (BASE_POINTS[position.kind] ?? 0);

      await db.insert(conversions).values({
        referralId: referral.id,
        kind: position.kind,
        chainId: position.chainId,
        managerAddress: position.managerAddress,
        positionId: position.positionId,
        status,
        rejectionReason,
        rewardPoints,
      });

      if (status === "verified") result.verified++;
      else result.rejected++;
    }

    // Staking lives in a separate table (one row per pool, not per
    // position) — matched and scored here rather than in the loop above.
    const candidatePools = await db
      .select()
      .from(stakingPools)
      .where(
        and(
          eq(stakingPools.chainId, referral.chainId),
          eq(stakingPools.creator, referral.projectOwner),
          or(eq(stakingPools.stakingToken, referral.projectToken), eq(stakingPools.rewardToken, referral.projectToken)),
          gt(stakingPools.createdAt, acceptedAtUnix)
        )
      );

    for (const pool of candidatePools) {
      if (expiresAtUnix && pool.createdAt > expiresAtUnix) continue;

      const [existing] = await db
        .select()
        .from(conversions)
        .where(
          and(
            eq(conversions.chainId, pool.chainId),
            eq(conversions.managerAddress, pool.poolAddress),
            eq(conversions.positionId, 0n)
          )
        )
        .limit(1);
      if (existing) continue;

      const [alreadyRewardedCategory] = await db
        .select()
        .from(conversions)
        .where(and(eq(conversions.referralId, referral.id), eq(conversions.kind, "staking"), eq(conversions.status, "verified")))
        .limit(1);
      if (alreadyRewardedCategory) continue;

      // Brief §9: "Creating an empty staking pool must not generate a
      // reward." rewardRate is only nonzero after notifyRewardAmount() has
      // actually funded the pool. Funding can happen any time after
      // deployment, so an unfunded pool isn't a final rejection — skip it
      // without recording anything and let the next tick re-check it.
      const funded = pool.rewardRate != null && BigInt(pool.rewardRate) > 0n;
      if (!funded) continue;

      await db.insert(conversions).values({
        referralId: referral.id,
        kind: "staking",
        chainId: pool.chainId,
        managerAddress: pool.poolAddress,
        positionId: 0n,
        status: "verified",
        rewardPoints: BASE_POINTS.staking,
      });

      result.verified++;
    }
  }

  return result;
}
