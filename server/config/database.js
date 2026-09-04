/**
 * database.js — PostgreSQL connection pool
 * Uses Replit's pre-provisioned DATABASE_URL automatically.
 */
import pg from "pg";

const { Pool } = pg;

const useDatabaseSsl =
  process.env.DATABASE_URL &&
  !/sslmode=disable/i.test(process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error(
    "\n[DB] ❌  DATABASE_URL is not set.\n" +
      "    Local dev: copy .env.example → .env and fill in your Postgres connection string.\n" +
      "    Replit:    add DATABASE_URL in Tools → Secrets (or use the built-in Database tool).\n",
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production" && useDatabaseSsl
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected error on idle client:", err.message);
});

/**
 * Execute a query. All DB access goes through here.
 * @param {string} text - SQL string with $1, $2… placeholders
 * @param {Array}  params
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[DB] Slow query (${duration}ms):`, text.slice(0, 80));
    }
    return result;
  } catch (err) {
    console.error("[DB] Query error:", err.message, "|", text.slice(0, 80));
    throw err;
  }
}

export { pool };
