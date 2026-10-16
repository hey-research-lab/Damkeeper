import { createPublicClient, http } from "viem";
import { robinhoodMainnet } from "../lib/chains";
const client = createPublicClient({ chain: robinhoodMainnet, transport: http() });
const latest = await client.getBlockNumber();
console.log("latest block:", latest.toString());
