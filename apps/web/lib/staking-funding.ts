import { createPublicClient, http } from "viem";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { stakingPools } from "@/db/schema";
import { stakingPoolAbi } from "@/lib/abi";
import { chainById } from "@/lib/chains";

/// Refreshes rewardRate/periodFinish for every known pool by reading the
/// contract directly — notifyRewardAmount() can be called any time after
/// deployment (including via the CLI, outside this web app), so there's no
/// reliable event-based write path to index instead.
export async function refreshStakingFunding(): Promise<{ checked: number; updated: number }> {
  const pools = await db.select().from(stakingPools);
  let updated = 0;

  for (const pool of pools) {
    const chain = chainById(pool.chainId);
    if (!chain) continue;

    try {
      const client = createPublicClient({ chain, transport: http() });
      const [rewardRate, periodFinish] = await Promise.all([
        client.readContract({
          address: pool.poolAddress as `0x${string}`,
          abi: stakingPoolAbi,
          functionName: "rewardRate",
        }),
        client.readContract({
          address: pool.poolAddress as `0x${string}`,
          abi: stakingPoolAbi,
          functionName: "periodFinish",
        }),
      ]);

      await db
        .update(stakingPools)
        .set({ rewardRate: rewardRate.toString(), periodFinish: BigInt(periodFinish.toString()) })
        .where(and(eq(stakingPools.chainId, pool.chainId), eq(stakingPools.poolAddress, pool.poolAddress)));

      updated++;
    } catch (err) {
      console.error(`Failed to refresh staking funding for ${pool.poolAddress}:`, err);
    }
  }

  return { checked: pools.length, updated };
}
