import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const DAM_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4";
const CREATOR = "0x9178b573219c55586bbaf51ecb24acfb27bb7681"; // the wallet testing this
const now = Math.floor(Date.now() / 1000);
const fakeTxHash = "0x" + "e2e5".padEnd(64, "0"); // clearly a test tx, not a real launch

const rows = await sql`
  INSERT INTO project_launches (
    chain_id, token_address, creator_address, factory_address, source,
    launch_tx_hash, launch_block, log_index, launched_at, status
  ) VALUES (
    4663, ${DAM_TOKEN}, ${CREATOR}, ${CREATOR}, 'manual_test',
    ${fakeTxHash}, 0, 0, ${now}, 'confirmed'
  )
  ON CONFLICT DO NOTHING
  RETURNING *
`;
console.log(JSON.stringify(rows, null, 2));
