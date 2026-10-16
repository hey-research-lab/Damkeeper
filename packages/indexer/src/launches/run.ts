import { createPublicClient, http } from "viem";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../db";
import { chainById } from "../chains";
import { PONS_SOURCES, TokenLaunched } from "./pons";

// Same cap the existing Vercel cron indexer uses: Alchemy's free tier limits
// eth_getLogs to a 10-block window (fromBlock to fromBlock + 9n).
const MAX_BLOCK_RANGE = 9n;

export async function runLaunchIndexer() {
  for (const launchSource of PONS_SOURCES) {
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
  launchSource: (typeof PONS_SOURCES)[number],
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

  const fromBlock = checkpoint ? checkpoint.lastBlock + 1n : launchSource.deployBlock;
  if (fromBlock > latestBlock) return; // nothing new yet

  const toBlock =
    fromBlock + MAX_BLOCK_RANGE < latestBlock ? fromBlock + MAX_BLOCK_RANGE : latestBlock;

  const logs = await client.getLogs({
    address: launchSource.factoryAddress,
    event: TokenLaunched,
    fromBlock,
    toBlock,
  });

  // TokenLaunched carries no timestamp, so fetch each distinct block's time.
  // The range is capped at 10 blocks, so this is at most 10 extra RPC calls.
  const blockTimestamps = new Map<bigint, bigint>();

  for (const log of logs) {
    const { token, deployer, pairToken } = log.args;
    if (!token || !deployer || !log.blockNumber) continue;

    if (!blockTimestamps.has(log.blockNumber)) {
      const block = await client.getBlock({ blockNumber: log.blockNumber });
      blockTimestamps.set(log.blockNumber, block.timestamp);
    }

    await db
      .insert(schema.projectLaunches)
      .values({
        chainId: launchSource.chainId,
        tokenAddress: token.toLowerCase(),
        creatorAddress: deployer.toLowerCase(),
        factoryAddress: launchSource.factoryAddress.toLowerCase(),
        source: launchSource.source,
        launchTxHash: log.transactionHash!,
        launchBlock: log.blockNumber,
        logIndex: log.logIndex!,
        launchedAt: blockTimestamps.get(log.blockNumber)!,
        pairAddress: pairToken ?? null,
        status: "confirmed",
      })
      .onConflictDoNothing();
  }

  const lastBlockData = await client.getBlock({ blockNumber: toBlock });

  await db
    .insert(schema.chainCheckpoints)
    .values({
      chainId: launchSource.chainId,
      managerAddress: launchSource.factoryAddress,
      lastBlock: toBlock,
      lastBlockHash: lastBlockData.hash,
      confirmationTier: "l1_final",
    })
    .onConflictDoUpdate({
      target: [schema.chainCheckpoints.chainId, schema.chainCheckpoints.managerAddress],
      set: {
        lastBlock: toBlock,
        lastBlockHash: lastBlockData.hash,
        updatedAt: new Date(),
      },
    });

  if (logs.length > 0) {
    console.log(`[launches/${launchSource.source}] indexed ${logs.length} launch(es) up to block ${toBlock}`);
  }
}
