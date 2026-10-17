import { createPublicClient, http, parseAbiItem, isHex, decodeEventLog } from "viem";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { referrals } from "@/db/schema";
import { getReferral } from "@/lib/referrals";
import { chainById } from "@/lib/chains";

const ReferralAccepted = parseAbiItem(
  "event ReferralAccepted(bytes32 indexed referralIdHash, address indexed projectToken, address indexed scout, address projectOwner, uint64 expiresAt)"
);

// POST /api/scouts/referrals/:id/confirm-acceptance
// Body: { txHash }. Reads the tx's receipt, finds the ReferralAccepted log
// from DamkeeperReferralRegistry, and checks it actually matches this
// referral's hash/token/scout before marking it accepted — never trusts the
// frontend's say-so about what happened onchain.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const txHash = String(body?.txHash ?? "");

  if (!isHex(txHash)) {
    return Response.json({ error: "txHash is required" }, { status: 400 });
  }

  const referral = await getReferral(id);
  if (!referral) return Response.json({ error: "referral not found" }, { status: 404 });
  if (referral.status === "accepted") return Response.json({ referral });

  const registryAddress = process.env.NEXT_PUBLIC_REFERRAL_REGISTRY_ADDRESS;
  if (!registryAddress) {
    return Response.json(
      { error: "DamkeeperReferralRegistry is not deployed/configured on this environment yet" },
      { status: 501 }
    );
  }

  const chain = chainById(referral.chainId);
  if (!chain) return Response.json({ error: "unsupported chainId" }, { status: 400 });

  const client = createPublicClient({ chain, transport: http() });

  const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` }).catch(() => null);
  if (!receipt || receipt.status !== "success") {
    return Response.json({ error: "transaction not found or not successful" }, { status: 400 });
  }

  const matchingLog = receipt.logs.find(
    (log) => log.address.toLowerCase() === registryAddress.toLowerCase()
  );
  if (!matchingLog) {
    return Response.json({ error: "no DamkeeperReferralRegistry event in this transaction" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = decodeEventLog({ abi: [ReferralAccepted], data: matchingLog.data, topics: matchingLog.topics });
  } catch {
    return Response.json({ error: "could not decode ReferralAccepted event" }, { status: 400 });
  }

  const args = decoded.args as unknown as {
    referralIdHash: string;
    projectToken: string;
    scout: string;
    projectOwner: string;
  };

  if (
    args.referralIdHash.toLowerCase() !== referral.referralIdHash.toLowerCase() ||
    args.projectToken.toLowerCase() !== referral.projectToken.toLowerCase() ||
    args.scout.toLowerCase() !== referral.scoutAddress.toLowerCase()
  ) {
    return Response.json({ error: "event does not match this referral" }, { status: 400 });
  }

  const [updated] = await db
    .update(referrals)
    .set({
      status: "accepted",
      projectOwner: args.projectOwner.toLowerCase(),
      acceptedAt: new Date(),
      acceptanceTxHash: txHash,
    })
    .where(eq(referrals.id, id))
    .returning();

  return Response.json({ referral: updated });
}
