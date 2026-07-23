-- ============================================================
--  SmartEGE — initial schema
--  Run:  npm run migrate
-- ============================================================

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  google_id  TEXT        NOT NULL UNIQUE,
  email      TEXT        NOT NULL,
  name       TEXT,
  avatar     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);

-- ── subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER     NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  plan             TEXT        NOT NULL DEFAULT 'free'   CHECK (plan IN ('free', 'premium')),
  status           TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  ai_limit_per_day INTEGER     NOT NULL DEFAULT 20,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);

-- ── usage_logs ────────────────────────────────────────────────
-- One row per user per day — upserted on every AI request.
CREATE TABLE IF NOT EXISTS usage_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  date        DATE    NOT NULL DEFAULT CURRENT_DATE,
  ai_requests INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON usage_logs (user_id, date);

-- ── ai_cache ──────────────────────────────────────────────────
-- Deduplicates identical OpenAI calls to save cost.
-- cache_key = SHA-256 of (subject + taskText + level).
CREATE TABLE IF NOT EXISTS ai_cache (
  id         SERIAL PRIMARY KEY,
  cache_key  TEXT        NOT NULL UNIQUE,
  subject    TEXT,
  response   JSONB       NOT NULL,
  used_count INTEGER     NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache (cache_key);
