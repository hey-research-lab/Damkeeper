import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT * FROM conversions ORDER BY detected_at DESC LIMIT 5`;
console.log(JSON.stringify(rows, null, 2));
