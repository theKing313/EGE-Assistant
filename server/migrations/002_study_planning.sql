-- ============================================================
--  SmartEGE — study history, review list, analytics events
--  Reuses users + subscriptions. Does not duplicate usage_logs.
-- ============================================================

CREATE TABLE IF NOT EXISTS study_tasks (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  task_key      TEXT        NOT NULL,
  subject       TEXT,
  task_type     TEXT,
  task_number   TEXT,
  task_id       TEXT,
  topic         TEXT,
  hint_level    TEXT,
  hint_source   TEXT        CHECK (hint_source IS NULL OR hint_source IN ('json', 'ai')),
  ai_used       BOOLEAN     NOT NULL DEFAULT FALSE,
  status        TEXT        NOT NULL DEFAULT 'viewed'
                CHECK (status IN ('viewed', 'in_progress', 'completed')),
  needs_review  BOOLEAN     NOT NULL DEFAULT FALSE,
  source_url    TEXT,
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  UNIQUE (user_id, task_key)
);

CREATE INDEX IF NOT EXISTS idx_study_tasks_user_updated
  ON study_tasks (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_tasks_user_status
  ON study_tasks (user_id, status);

CREATE INDEX IF NOT EXISTS idx_study_tasks_user_review
  ON study_tasks (user_id, needs_review)
  WHERE needs_review = TRUE;

CREATE INDEX IF NOT EXISTS idx_study_tasks_user_completed
  ON study_tasks (user_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- Anonymous product events (no emails / names / task text).
CREATE TABLE IF NOT EXISTS analytics_events (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER     REFERENCES users (id) ON DELETE SET NULL,
  event_name  TEXT        NOT NULL,
  properties  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
