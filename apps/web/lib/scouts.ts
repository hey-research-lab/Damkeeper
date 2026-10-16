import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projectLaunches } from "@/db/schema";
import { robinhoodMainnet } from "@/lib/chains";

export interface LaunchView {
  chainId: number;
  tokenAddress: string;
  creatorAddress: string;
  factoryAddress: string;
  source: string;
  launchTxHash: string;
  launchBlock: string;
  launchedAt: string;
  pairAddress: string | null;
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

  return rows.map(toLaunchView);
}

export async function getLaunch(params: {
  tokenAddress: string;
  chainId?: number;
}): Promise<LaunchView | null> {
  const chainId = params.chainId ?? robinhoodMainnet.id;

  const [row] = await db
    .select()
    .from(projectLaunches)
    .where(
      and(
        eq(projectLaunches.chainId, chainId),
        eq(projectLaunches.tokenAddress, params.tokenAddress.toLowerCase())
      )
    )
    .limit(1);

  return row ? toLaunchView(row) : null;
}

function toLaunchView(l: typeof projectLaunches.$inferSelect): LaunchView {
  return {
    chainId: l.chainId,
    tokenAddress: l.tokenAddress,
    creatorAddress: l.creatorAddress,
    factoryAddress: l.factoryAddress,
    source: l.source,
    launchTxHash: l.launchTxHash,
    launchBlock: l.launchBlock.toString(),
    launchedAt: l.launchedAt.toString(),
    pairAddress: l.pairAddress,
    status: l.status,
  };
}
