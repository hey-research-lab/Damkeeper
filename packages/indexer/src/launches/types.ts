import type { AbiEvent, Log, PublicClient } from "viem";

export interface DecodedLaunch {
  token: string;
  creator: string;
  pairAddress: string | null;
}

export interface LaunchSource {
  source: string;
  chainId: number;
  factoryAddress: string;
  deployBlock: bigint;
  event: AbiEvent;
  // Some protocols don't put the creator in the event itself (e.g. Pools.trade's
  // TokenCreated(address) only carries the token) — extract() gets a client so it
  // can fall back to reading the transaction sender when needed.
  extract: (log: Log, client: PublicClient) => Promise<DecodedLaunch | null>;
}
