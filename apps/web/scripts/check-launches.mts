import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT chain_id, token_address, creator_address, source, status FROM project_launches LIMIT 10`;
console.log("launch rows:", rows.length);
console.log(JSON.stringify(rows, null, 2));
const cp = await sql`SELECT chain_id, manager_address, last_block, updated_at FROM chain_checkpoints`;
console.log("checkpoints:");
console.log(JSON.stringify(cp, null, 2));
