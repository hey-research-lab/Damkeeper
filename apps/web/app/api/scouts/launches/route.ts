import { db } from "@/db/client";
import { projectLaunches } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// GET /api/scouts/launches?chainId=
// Discovery feed per brief §7.1 / §18 — read-only, no auth required.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");

  const rows = await db
    .select()
    .from(projectLaunches)
    .where(chainId ? eq(projectLaunches.chainId, Number(chainId)) : undefined)
    .orderBy(desc(projectLaunches.launchBlock))
    .limit(100);

  return Response.json({
    launches: rows.map((l) => ({
      chainId: l.chainId,
      tokenAddress: l.tokenAddress,
      creatorAddress: l.creatorAddress,
      factoryAddress: l.factoryAddress,
      source: l.source,
      launchTxHash: l.launchTxHash,
      launchBlock: l.launchBlock.toString(),
      launchedAt: l.launchedAt.toString(),
      status: l.status,
    })),
  });
}
