import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);
const result = await sql`
  DELETE FROM chain_checkpoints
  WHERE chain_id = 4663 AND lower(manager_address) = lower('0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB')
`;
console.log("deleted:", result);
