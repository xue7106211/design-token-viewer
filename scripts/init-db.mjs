import { readFile } from "fs/promises";
import path from "path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const migrationPath = path.join(process.cwd(), "drizzle", "0000_lightweight_collaboration.sql");
const sqlText = await readFile(migrationPath, "utf-8");
const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql.unsafe(sqlText);
  console.log("Database initialized: token_documents, change_logs, snapshots.");
} finally {
  await sql.end();
}
