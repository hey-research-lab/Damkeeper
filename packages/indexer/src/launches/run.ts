import { createPublicClient, http } from "viem";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";
import { chainById } from "../chains";
import { PONS_SOURCES } from "./pons";
import { POOLS_TRADE_SOURCES } from "./poolstrade";
import type { LaunchSource } from "./types";

const ALL_SOURCES: LaunchSource[] = [...PONS_SOURCES, ...POOLS_TRADE_SOURCES];

// Same cap the existing Vercel cron indexer uses: Alchemy's free tier limits
// eth_getLogs to a 10-block window (fromBlock to fromBlock + 9n).
const MAX_BLOCK_RANGE = 9n;

// Robinhood Chain produces blocks fast enough that scanning from a factory's
// deploy block would take years to reach the tip at MAX_BLOCK_RANGE/tick.
// This product only needs *new* launches, so a missing checkpoint starts
// near the tip instead of from history — old launches before this point
// are simply not backfilled.
const INITIAL_BACKFILL_BLOCKS = 2000n;

// Measured ~10 blocks/sec (2026-10-17) — a single 9-block getLogs call per
// 60s tick would fall further behind every tick, forever. Loop multiple
// windows per tick instead; 150 windows (1350 blocks) comfortably covers
// one tick's ~600 new blocks with headroom for RPC jitter.
const MAX_WINDOWS_PER_TICK = 150;

export async function runLaunchIndexer() {
  for (const launchSource of ALL_SOURCES) {
    const chain = chainById(launchSource.chainId);
    if (!chain) continue;

    try {
      await indexSource(launchSource, chain);
    } catch (err) {
      console.error(`[launches/${launchSource.source}] run failed:`, err);
    }
  }
}

async function indexSource(
  launchSource: LaunchSource,
  chain: NonNullable<ReturnType<typeof chainById>>
) {
  const client = createPublicClient({ chain, transport: http() });
  const latestBlock = await client.getBlockNumber();

  const [checkpoint] = await db
    .select()
    .from(schema.chainCheckpoints)
    .where(
      and(
        eq(schema.chainCheckpoints.chainId, launchSource.chainId),
        eq(schema.chainCheckpoints.managerAddress, launchSource.factoryAddress)
      )
    )
    .limit(1);

  let fromBlock = checkpoint
    ? checkpoint.lastBlock + 1n
    : latestBlock > INITIAL_BACKFILL_BLOCKS
      ? latestBlock - INITIAL_BACKFILL_BLOCKS
      : launchSource.deployBlock;

  let totalIndexed = 0;
  let lastToBlock = fromBlock - 1n;
  let ranAny = false;

  for (let i = 0; i < MAX_WINDOWS_PER_TICK && fromBlock <= latestBlock; i++) {
    ranAny = true;
    const toBlock =
      fromBlock + MAX_BLOCK_RANGE < latestBlock ? fromBlock + MAX_BLOCK_RANGE : latestBlock;

    const logs = await client.getLogs({
      address: launchSource.factoryAddress as `0x${string}`,
      event: launchSource.event,
      fromBlock,
      toBlock,
    });

    const blockTimestamps = new Map<bigint, bigint>();

    for (const log of logs) {
      if (!log.blockNumber || !log.transactionHash || log.logIndex == null) continue;

      const decoded = await launchSource.extract(log, client);
      if (!decoded) continue;

      if (!blockTimestamps.has(log.blockNumber)) {
        const block = await client.getBlock({ blockNumber: log.blockNumber });
        blockTimestamps.set(log.blockNumber, block.timestamp);
      }

      await db
        .insert(schema.projectLaunches)
        .values({
          chainId: launchSource.chainId,
          tokenAddress: decoded.token.toLowerCase(),
          creatorAddress: decoded.creator.toLowerCase(),
          factoryAddress: launchSource.factoryAddress.toLowerCase(),
          source: launchSource.source,
          launchTxHash: log.transactionHash,
          launchBlock: log.blockNumber,
          logIndex: log.logIndex,
          launchedAt: blockTimestamps.get(log.blockNumber)!,
          pairAddress: decoded.pairAddress,
          status: "confirmed",
        })
        .onConflictDoNothing();
    }

    totalIndexed += logs.length;
    lastToBlock = toBlock;
    fromBlock = toBlock + 1n;
  }

  if (!ranAny) return; // already caught up, nothing new yet

  const lastBlockData = await client.getBlock({ blockNumber: lastToBlock });

  await db
    .insert(schema.chainCheckpoints)
    .values({
      chainId: launchSource.chainId,
      managerAddress: launchSource.factoryAddress,
      lastBlock: lastToBlock,
      lastBlockHash: lastBlockData.hash,
      confirmationTier: "l1_final",
    })
    .onConflictDoUpdate({
      target: [schema.chainCheckpoints.chainId, schema.chainCheckpoints.managerAddress],
      set: {
        lastBlock: lastToBlock,
        lastBlockHash: lastBlockData.hash,
        updatedAt: new Date(),
      },
    });

  console.log(
    `[launches/${launchSource.source}] scanned to block ${lastToBlock} (tip ${latestBlock}), indexed ${totalIndexed} launch(es)`
  );
}
