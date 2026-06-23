-- 计划追踪热力图（Plan Tracker）建表 DDL
-- 实际部署时由 tracker-api.mjs 启动时 CREATE TABLE IF NOT EXISTS 自动建表，
-- 本文件仅作为 schema 参考和手动迁移备用。

CREATE TABLE IF NOT EXISTS plans (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  emoji       TEXT,
  color       TEXT,
  description TEXT,
  start_date  TEXT NOT NULL,
  due_date    TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_records (
  id          TEXT PRIMARY KEY,
  plan_id     TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  date_key    TEXT NOT NULL,
  progress    INTEGER NOT NULL DEFAULT 0,
  note        TEXT,
  attachment  TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE(plan_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_records_plan_date
  ON daily_records (plan_id, date_key);

CREATE TABLE IF NOT EXISTS milestones (
  id          TEXT PRIMARY KEY,
  plan_id     TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  date_key    TEXT NOT NULL,
  label       TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_milestones_plan_date
  ON milestones (plan_id, date_key);
