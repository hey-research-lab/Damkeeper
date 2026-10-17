import { getReferral } from "@/lib/referrals";

// GET /api/scouts/referrals/:id
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const referral = await getReferral(id);
  if (!referral) return Response.json({ error: "referral not found" }, { status: 404 });
  return Response.json({ referral });
}
