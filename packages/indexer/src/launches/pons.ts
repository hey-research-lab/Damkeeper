import { parseAbiItem } from "viem";
import type { LaunchSource } from "./types";

// Verified against docs.ponsfamily.com/docs/v2 "Indexing launches and
// trades" sample on 2026-10-17 — exact parameter names/types/indexing.
const TokenLaunched = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)"
);

// Robinhood Chain mainnet (4663) factory address, per docs.ponsfamily.com
// (checked 2026-10-17). The legacy factory (0x0c37a24F...) only serves
// tokens launched before the current version and accepts no new launches,
// so it's not worth polling.
export const PONS_SOURCES: LaunchSource[] = [
  {
    source: "pons_v2_active",
    chainId: 4663,
    factoryAddress: "0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB",
    deployBlock: 8991118n,
    event: TokenLaunched,
    extract: async (log) => {
      const args = (log as unknown as { args: Record<string, unknown> }).args;
      const token = args.token as string | undefined;
      const deployer = args.deployer as string | undefined;
      const pairToken = args.pairToken as string | undefined;
      if (!token || !deployer) return null;
      return { token, creator: deployer, pairAddress: pairToken ?? null };
    },
  },
];
