import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projectLaunches } from "@/db/schema";
import { robinhoodMainnet } from "@/lib/chains";

export interface LaunchView {
  chainId: number;
  tokenAddress: string;
  creatorAddress: string;
  source: string;
  launchTxHash: string;
  launchBlock: string;
  launchedAt: string;
  status: string;
}

export async function listLaunches(params: { chainId?: number } = {}): Promise<LaunchView[]> {
  const chainId = params.chainId ?? robinhoodMainnet.id;

  const rows = await db
    .select()
    .from(projectLaunches)
    .where(eq(projectLaunches.chainId, chainId))
    .orderBy(desc(projectLaunches.launchBlock))
    .limit(100);

  return rows.map((l) => ({
    chainId: l.chainId,
    tokenAddress: l.tokenAddress,
    creatorAddress: l.creatorAddress,
    source: l.source,
    launchTxHash: l.launchTxHash,
    launchBlock: l.launchBlock.toString(),
    launchedAt: l.launchedAt.toString(),
    status: l.status,
  }));
}
