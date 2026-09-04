/**
 * migrate.js — run all SQL migration files in order.
 *
 * Usage:
 *   npm run migrate
 *
 * Migrations are plain .sql files in server/migrations/.
 * Each file is applied once; already-applied files are skipped
 * via a migrations_log table that tracks what has run.
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const useDatabaseSsl =
  process.env.DATABASE_URL &&
  !/sslmode=disable/i.test(process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error(
    "\n❌  DATABASE_URL is not set. Copy .env.example → .env and fill it in.\n",
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production" && useDatabaseSsl
      ? { rejectUnauthorized: false }
      : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    // Create tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_log (
        id         SERIAL PRIMARY KEY,
        filename   TEXT        NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Find all .sql files sorted by name
    const migrationsDir = join(__dirname, "migrations");
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let applied = 0;
    for (const file of files) {
      const { rowCount } = await client.query(
        "SELECT 1 FROM migrations_log WHERE filename = $1",
        [file],
      );

      if (rowCount > 0) {
        console.log(`  ⏭  ${file} — already applied, skipping`);
        continue;
      }

      const sql = readFileSync(join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO migrations_log (filename) VALUES ($1)",
          [file],
        );
        await client.query("COMMIT");
        console.log(`  ✅  ${file} — applied`);
        applied++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    if (applied === 0) {
      console.log("\n✔  All migrations are up to date.\n");
    } else {
      console.log(`\n✔  ${applied} migration(s) applied successfully.\n`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("\n❌  Migration failed:", err.message, "\n");
  process.exit(1);
});
