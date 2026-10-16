import { createPublicClient, http, parseAbiItem } from "viem";
import { robinhoodMainnet } from "../lib/chains";
const client = createPublicClient({ chain: robinhoodMainnet, transport: http() });
const TokenLaunched = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed curve, address indexed deployer, address pairToken, uint256 launchConfigId, uint256 graduationThreshold)"
);

for (const range of [9n, 100n, 1000n, 5000n, 10000n, 50000n]) {
  const latest = await client.getBlockNumber();
  try {
    const logs = await client.getLogs({
      address: "0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB",
      event: TokenLaunched,
      fromBlock: latest - range,
      toBlock: latest,
    });
    console.log(`range ${range}: OK, ${logs.length} logs`);
  } catch (err: any) {
    console.log(`range ${range}: FAILED - ${err?.shortMessage || err?.message}`);
  }
}
