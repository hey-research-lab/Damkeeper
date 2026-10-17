import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const DAM_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4";

const referrals = await sql`SELECT id, status, project_owner, accepted_at FROM referrals WHERE project_token = ${DAM_TOKEN} ORDER BY created_at DESC LIMIT 3`;
console.log("referrals:", JSON.stringify(referrals, null, 2));

const positions = await sql`SELECT chain_id, manager_address, position_id, kind, token, creator, created_at, unlock_time FROM positions WHERE token = ${DAM_TOKEN} ORDER BY created_at DESC LIMIT 5`;
console.log("positions:", JSON.stringify(positions, null, 2));
