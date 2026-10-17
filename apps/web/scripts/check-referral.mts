import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT referral_code, status, project_owner, accepted_at, acceptance_tx_hash FROM referrals WHERE referral_code = 'gLcNAZHx6Kst'`;
console.log(JSON.stringify(rows, null, 2));
