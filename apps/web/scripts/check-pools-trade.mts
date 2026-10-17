import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT source, COUNT(*) as count FROM project_launches GROUP BY source`;
console.log("launches by source:", JSON.stringify(rows, null, 2));
