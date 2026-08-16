-- ============================================================
-- MonitorFlare Schema
-- 全新数据库使用此完整 SQL;已有数据库请使用文件末尾的迁移语句
-- ============================================================

CREATE TABLE IF NOT EXISTS monitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'http',              -- http / dns / port
  config TEXT,                           -- 类型专属 JSON 配置
  method TEXT DEFAULT 'GET',
  request_headers TEXT,                  -- JSON 格式自定义请求头
  request_body TEXT,                     -- POST 请求体
  interval INTEGER DEFAULT 300,
  status TEXT DEFAULT 'UP',              -- UP / DOWN / RETRYING / PAUSED
  retry_count INTEGER DEFAULT 0,
  last_check DATETIME,
  keyword TEXT,
  user_agent TEXT,
  tags TEXT,                             -- 逗号分隔标签
  domain_expiry TEXT,
  cert_expiry TEXT,
  check_info_status TEXT,
  paused INTEGER DEFAULT 0,
  check_ssl INTEGER DEFAULT 1,
  check_domain INTEGER DEFAULT 1,
  alert_silence_uptime INTEGER DEFAULT 24,
  alert_silence_ssl INTEGER DEFAULT 24,
  alert_silence_domain INTEGER DEFAULT 24,
  alert_error_rate INTEGER DEFAULT 0,    -- 错误率阈值告警(百分比,0=关闭)
  alert_after_failures INTEGER DEFAULT 1,-- 连续失败 N 次才告警
  last_alert_uptime TEXT,
  last_alert_ssl TEXT,
  last_alert_domain TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monitor_id INTEGER,
  status_code INTEGER,
  latency INTEGER,
  is_fail INTEGER DEFAULT 0,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_monitor_created ON logs(monitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_fail_created ON logs(is_fail, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                    -- dingtalk / wecom / feishu / telegram / webhook / email / slack / discord / ntfy
  name TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  config TEXT NOT NULL DEFAULT '{}',     -- JSON 配置
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'info',          -- info / warning / critical
  status TEXT DEFAULT 'active',          -- active / resolved
  type TEXT DEFAULT 'incident',          -- incident / maintenance
  scheduled_start DATETIME,
  scheduled_end DATETIME,
  affected_monitors TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_uptime (
  monitor_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  total_checks INTEGER DEFAULT 0,
  successful_checks INTEGER DEFAULT 0,
  avg_latency INTEGER DEFAULT 0,
  PRIMARY KEY (monitor_id, date)
);

-- 订阅者(状态页邮件订阅)
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,                   -- 退订 token
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 第三方 API 密钥
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_monitors_paused ON monitors(paused, id);
CREATE INDEX IF NOT EXISTS idx_incidents_active ON incidents(type, status, scheduled_start, scheduled_end);

-- 预置默认配置
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_title', 'MonitorFlare');
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_description', 'Realtime monitoring & status page');
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_logo_url', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');
INSERT OR IGNORE INTO settings (key, value) VALUES ('timezone', 'UTC');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');
INSERT OR IGNORE INTO settings (key, value) VALUES ('status_page_feed', '1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('alert_template_down', 'Error: {reason}');
INSERT OR IGNORE INTO settings (key, value) VALUES ('alert_template_up', 'Response time: {latency}ms');
INSERT OR IGNORE INTO settings (key, value) VALUES ('alert_template_error_rate', 'Error rate alert: {error_rate}% in last 5 minutes, threshold {threshold}%');

-- ============================================================
-- 迁移语句(已有 uptime-monitor 数据库升级)
-- ============================================================
-- ALTER TABLE monitors ADD COLUMN type TEXT DEFAULT 'http';
-- ALTER TABLE monitors ADD COLUMN config TEXT;
-- ALTER TABLE monitors ADD COLUMN alert_after_failures INTEGER DEFAULT 1;
-- CREATE TABLE IF NOT EXISTS subscriptions (...);
-- CREATE TABLE IF NOT EXISTS api_keys (...);
-- INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');
-- INSERT OR IGNORE INTO settings (key, value) VALUES ('timezone', 'UTC');
