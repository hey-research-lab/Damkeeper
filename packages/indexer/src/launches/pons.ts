import { parseAbiItem } from "viem";
import type { LaunchSource } from "./types";

// Event param shapes matches what docs.ponsfamily.com/docs/v2 showed, and
// this exact ABI fragment is independently confirmed against wealthy-org/IFO
// (github.com/wealthy-org/IFO, src/server/pons/chain.ts), whose comment says
// the factory address is "cross-checked on-chain at sync time: the factory
// must report this exact fee escrow and hook, otherwise the reader refuses
// to run" — i.e. validated against the live contract, not just docs.
const TokenLaunched = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)"
);

// This is the address IFO uses (confirmed working — IFO's market page shows
// live Pons launches). docs.ponsfamily.com's "Active" factory
// (0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB) produced zero matches over
// ~10h of real-time scanning — either stale docs or a misread on our part.
export const PONS_SOURCES: LaunchSource[] = [
  {
    source: "pons_v2",
    chainId: 4663,
    factoryAddress: "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e",
    deployBlock: 0n, // unknown; relies on near-tip start, not backfill
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
