import { isAddress } from "viem";
import { createReferral, listReferralsByScout } from "@/lib/referrals";

// GET /api/scouts/referrals?scout=&chainId= — a Scout's own referrals.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scout = searchParams.get("scout");
  const chainId = searchParams.get("chainId");

  if (!scout || !isAddress(scout)) {
    return Response.json({ error: "scout address is required" }, { status: 400 });
  }

  const list = await listReferralsByScout({
    scoutAddress: scout,
    chainId: chainId ? Number(chainId) : undefined,
  });

  return Response.json({ referrals: list });
}

// POST /api/scouts/referrals — a Scout creates a referral for a detected launch.
// First accepted referral wins (brief §8); this endpoint only creates the
// offchain record and shareable link — onchain acceptance is a separate step.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const projectToken = String(body?.projectToken ?? "");
  const scoutAddress = String(body?.scoutAddress ?? "");
  const chainId = body?.chainId ? Number(body.chainId) : undefined;

  if (!isAddress(projectToken) || !isAddress(scoutAddress)) {
    return Response.json({ error: "projectToken and scoutAddress must be valid addresses" }, { status: 400 });
  }

  try {
    const referral = await createReferral({ chainId, projectToken, scoutAddress });
    return Response.json({ referral });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create referral";
    return Response.json({ error: message }, { status: 400 });
  }
}
