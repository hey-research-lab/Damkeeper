import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const DAM_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4";

// Order matters: conversions reference referrals, so delete those first.
const convDeleted = await sql`
  DELETE FROM conversions
  WHERE referral_id IN (SELECT id FROM referrals WHERE project_token = ${DAM_TOKEN})
  RETURNING id
`;
const refDeleted = await sql`
  DELETE FROM referrals WHERE project_token = ${DAM_TOKEN} RETURNING id
`;
const launchDeleted = await sql`
  DELETE FROM project_launches WHERE token_address = ${DAM_TOKEN} AND source = 'manual_test' RETURNING token_address
`;

console.log("conversions deleted:", convDeleted.length);
console.log("referrals deleted:", refDeleted.length);
console.log("launches deleted:", launchDeleted.length);
