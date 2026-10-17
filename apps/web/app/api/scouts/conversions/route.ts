import { isAddress } from "viem";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { conversions, referrals } from "@/db/schema";

// GET /api/scouts/conversions?scout= — a Scout's verified/rejected conversions
// across all their referrals, with the points those conversions earned.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scout = searchParams.get("scout");

  if (!scout || !isAddress(scout)) {
    return Response.json({ error: "scout address is required" }, { status: 400 });
  }

  const scoutReferrals = await db
    .select({ id: referrals.id, projectToken: referrals.projectToken })
    .from(referrals)
    .where(eq(referrals.scoutAddress, scout.toLowerCase()));

  if (scoutReferrals.length === 0) {
    return Response.json({ conversions: [], pointsTotal: 0 });
  }

  const referralTokenById = new Map(scoutReferrals.map((r) => [r.id, r.projectToken]));
  const rows = await db
    .select()
    .from(conversions)
    .where(inArray(conversions.referralId, scoutReferrals.map((r) => r.id)));

  const pointsTotal = rows.reduce((sum, c) => sum + (c.status === "verified" ? c.rewardPoints : 0), 0);

  return Response.json({
    pointsTotal,
    conversions: rows.map((c) => ({
      id: c.id,
      referralId: c.referralId,
      projectToken: referralTokenById.get(c.referralId) ?? null,
      kind: c.kind,
      status: c.status,
      rejectionReason: c.rejectionReason,
      rewardPoints: c.rewardPoints,
      detectedAt: c.detectedAt.toISOString(),
    })),
  });
}
