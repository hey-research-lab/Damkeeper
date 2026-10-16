import { db } from "@/db/client";
import { projectLaunches } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// GET /api/scouts/launches/:tokenAddress?chainId=
export async function GET(
  request: Request,
  { params }: { params: Promise<{ tokenAddress: string }> }
) {
  const { tokenAddress } = await params;
  const { searchParams } = new URL(request.url);
  const chainId = searchParams.get("chainId");

  if (!chainId) {
    return Response.json({ error: "chainId is required" }, { status: 400 });
  }

  const [launch] = await db
    .select()
    .from(projectLaunches)
    .where(
      and(
        eq(projectLaunches.chainId, Number(chainId)),
        eq(projectLaunches.tokenAddress, tokenAddress.toLowerCase())
      )
    )
    .limit(1);

  if (!launch) {
    return Response.json({ error: "launch not found" }, { status: 404 });
  }

  return Response.json({
    launch: {
      chainId: launch.chainId,
      tokenAddress: launch.tokenAddress,
      creatorAddress: launch.creatorAddress,
      factoryAddress: launch.factoryAddress,
      source: launch.source,
      launchTxHash: launch.launchTxHash,
      launchBlock: launch.launchBlock.toString(),
      launchedAt: launch.launchedAt.toString(),
      pairAddress: launch.pairAddress,
      status: launch.status,
    },
  });
}
