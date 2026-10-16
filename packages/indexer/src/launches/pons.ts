import { parseAbiItem } from "viem";

// Robinhood Chain mainnet (4663) factory addresses, per docs.ponsfamily.com
// (checked 2026-10-17). Re-verify on-chain before relying on this in
// production — third-party sources (Mobula, Bitquery) disagree with each
// other about which factory is currently active.
export const PONS_SOURCES = [
  {
    source: "pons_v2_active",
    chainId: 4663,
    factoryAddress: "0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB",
    // First block to scan from if no checkpoint exists yet. Unverified —
    // confirm the factory's actual deployment block before backfilling.
    deployBlock: 8991118n,
  },
  {
    source: "pons_legacy",
    chainId: 4663,
    factoryAddress: "0x0c37a24F5D23A486FA692d1500881d698B1F77a4",
    deployBlock: 8600612n,
  },
] as const;

// ponytail: event signature is a best guess (standard launchpad shape), not
// confirmed against Pons' real ABI — the topic hash pulled from docs was
// garbled in transit. Verify against docs.ponsfamily.com or the deployed
// contract's ABI on robinhoodchain.blockscout.com before running this against
// mainnet; wrong signature just means zero matches, not wrong data.
export const TokenLaunched = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed creator, uint256 timestamp)"
);
