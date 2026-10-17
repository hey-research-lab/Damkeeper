import type { PublicClient, Chain, Transport } from "viem";
import { decodeAbiParameters } from "viem";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tokens } from "@/db/schema";

/**
 * Pons tokens expose branding (image, description, socials) through a
 * getTokenInfo() call, but the token contracts aren't verified, so there's
 * no ABI — layout reverse-engineered the same way wealthy-org/IFO did
 * (github.com/wealthy-org/IFO, src/server/pons/chain.ts): raw selector,
 * decoded as (creator, imageURI, description, socials[5]).
 */
const TOKEN_INFO_SELECTOR = "0xabb1dc44" as const;
const TOKEN_INFO_OUTPUT = [
  { type: "address" },
  { type: "string" },
  { type: "string" },
  {
    type: "tuple",
    components: [{ type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }],
  },
] as const;

/// Image URL only, cached onto the tokens row — Scouts just needs a logo for
/// the feed, not the full description/socials IFO reads.
export async function ensurePonsTokenImage(
  client: PublicClient<Transport, Chain>,
  chainId: number,
  address: string
): Promise<string | null> {
  const addr = address.toLowerCase();
  const [existing] = await db
    .select({ imageUrl: tokens.imageUrl })
    .from(tokens)
    .where(and(eq(tokens.chainId, chainId), eq(tokens.address, addr)))
    .limit(1);
  if (existing?.imageUrl) return existing.imageUrl;

  let imageUrl: string | null = null;
  try {
    const { data } = await client.call({ to: addr as `0x${string}`, data: TOKEN_INFO_SELECTOR });
    if (data) {
      const [, image] = decodeAbiParameters(TOKEN_INFO_OUTPUT, data);
      const cleaned = image.trim();
      if (cleaned && /^https?:\/\//.test(cleaned)) imageUrl = cleaned.slice(0, 300);
    }
  } catch {
    // Non-Pons token, or a non-standard getTokenInfo() — no logo, not fatal.
  }

  if (imageUrl) {
    await db
      .update(tokens)
      .set({ imageUrl })
      .where(and(eq(tokens.chainId, chainId), eq(tokens.address, addr)));
  }

  return imageUrl;
}
