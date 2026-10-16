import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
// Reuses the single schema owned by apps/web/db rather than forking a copy —
// this worker and the web app read/write the same tables.
import * as schema from "../../../apps/web/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
export { schema };
