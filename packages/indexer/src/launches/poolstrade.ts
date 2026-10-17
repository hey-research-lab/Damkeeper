import { parseAbiItem } from "viem";
import type { LaunchSource } from "./types";

// ponytail: best-effort signature from docs.bitquery.io/docs/blockchain/robinhood/pools-trade-api/
// (checked 2026-10-17) — Pools.trade (Uniswap's launchpad on Robinhood Chain) has a
// more complex contract surface than Pons (two launch-entry contracts, "current" and
// "original" paths) and the source itself says it's "inconsistent about which fields
// are indexed" for the full TokenLaunched event. Tracking the simpler TokenCreated(address)
// from the launch-entry contracts instead — single param, lower risk of a wrong topic hash.
// Verify against a working RPC/explorer before trusting this in production; a wrong
// signature just means zero matches, same failure mode as the first Pons attempt.
const TokenCreated = parseAbiItem("event TokenCreated(address token)");

async function extractFromTx(log: Parameters<LaunchSource["extract"]>[0], client: Parameters<LaunchSource["extract"]>[1]) {
  const args = (log as unknown as { args: Record<string, unknown> }).args;
  const token = args.token as string | undefined;
  if (!token || !log.transactionHash) return null;

  // TokenCreated(address) doesn't carry the creator — use the tx sender instead.
  const tx = await client.getTransaction({ hash: log.transactionHash });
  return { token, creator: tx.from, pairAddress: null };
}

export const POOLS_TRADE_SOURCES: LaunchSource[] = [
  {
    source: "pools_trade_current",
    chainId: 4663,
    factoryAddress: "0x0000ffffBE8EFE702c8703AE3477Ff5De3D319c0",
    deployBlock: 0n, // unknown — relies on near-tip start, not backfill
    event: TokenCreated,
    extract: extractFromTx,
  },
  {
    source: "pools_trade_original",
    chainId: 4663,
    factoryAddress: "0x00004C4ccc709EF590F7C81102C0689f0263D4e9",
    deployBlock: 0n,
    event: TokenCreated,
    extract: extractFromTx,
  },
];
