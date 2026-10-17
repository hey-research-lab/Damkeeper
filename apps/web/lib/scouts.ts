import { and, desc, eq } from "drizzle-orm";
import { createPublicClient, http } from "viem";
import { db } from "@/db/client";
import { projectLaunches } from "@/db/schema";
import { robinhoodMainnet, chainById } from "@/lib/chains";
import { ensureTokenMetadata } from "@/lib/token-metadata";

export interface LaunchView {
  chainId: number;
  tokenAddress: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  creatorAddress: string;
  factoryAddress: string;
  source: string;
  launchTxHash: string;
  launchBlock: string;
  launchedAt: string;
  pairAddress: string | null;
  status: string;
}

async function withTokenMeta(
  chainId: number,
  rows: (typeof projectLaunches.$inferSelect)[]
): Promise<LaunchView[]> {
  const chain = chainById(chainId);
  if (!chain || rows.length === 0) return rows.map((r) => toLaunchView(r, null, null));

  const client = createPublicClient({ chain, transport: http() });
  const metas = await Promise.all(
    rows.map((r) => ensureTokenMetadata(client, chainId, r.tokenAddress).catch(() => null))
  );

  return rows.map((r, i) => toLaunchView(r, metas[i]?.name ?? null, metas[i]?.symbol ?? null));
}

export async function listLaunches(params: { chainId?: number } = {}): Promise<LaunchView[]> {
  const chainId = params.chainId ?? robinhoodMainnet.id;

  const rows = await db
    .select()
    .from(projectLaunches)
    .where(eq(projectLaunches.chainId, chainId))
    .orderBy(desc(projectLaunches.launchBlock))
    .limit(100);

  return withTokenMeta(chainId, rows);
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

  if (!row) return null;
  const [view] = await withTokenMeta(chainId, [row]);
  return view;
}

function toLaunchView(
  l: typeof projectLaunches.$inferSelect,
  tokenName: string | null,
  tokenSymbol: string | null
): LaunchView {
  return {
    chainId: l.chainId,
    tokenAddress: l.tokenAddress,
    tokenName,
    tokenSymbol,
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
