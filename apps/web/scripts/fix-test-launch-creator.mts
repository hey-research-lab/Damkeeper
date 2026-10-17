import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

const DAM_TOKEN = "0x70ecc8a7af0c97bd5b5a420ffd35b5e693f4e4b4";
// A dummy address distinct from the scout wallet — just needs to not equal
// the scout address so the self-referral guard doesn't trip. The real
// on-chain acceptance (projectOwner) will still be whatever wallet signs,
// separate from this field.
const DUMMY_CREATOR = "0x000000000000000000000000000000000000e2";

const rows = await sql`
  UPDATE project_launches
  SET creator_address = ${DUMMY_CREATOR}, factory_address = ${DUMMY_CREATOR}
  WHERE token_address = ${DAM_TOKEN} AND source = 'manual_test'
  RETURNING *
`;
console.log(JSON.stringify(rows, null, 2));
