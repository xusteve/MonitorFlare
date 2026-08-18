// ============================================================
// MonitorFlare — 自动初始化
// Worker 首次访问时自动创建 D1 表结构 + 默认设置
// 使一键部署无需手动执行 schema.sql
// ============================================================
import type { Bindings } from './types';

const INIT_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS monitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, url TEXT NOT NULL,
    type TEXT DEFAULT 'http', config TEXT,
    method TEXT DEFAULT 'GET',
    request_headers TEXT, request_body TEXT,
    interval INTEGER DEFAULT 300,
    status TEXT DEFAULT 'UP',
    retry_count INTEGER DEFAULT 0,
    last_check DATETIME, keyword TEXT, user_agent TEXT, tags TEXT,
    domain_expiry TEXT, cert_expiry TEXT, check_info_status TEXT,
    paused INTEGER DEFAULT 0,
    check_ssl INTEGER DEFAULT 1, check_domain INTEGER DEFAULT 1,
    alert_silence_uptime INTEGER DEFAULT 24,
    alert_silence_ssl INTEGER DEFAULT 24,
    alert_silence_domain INTEGER DEFAULT 24,
    alert_error_rate INTEGER DEFAULT 0,
    alert_after_failures INTEGER DEFAULT 1,
    last_alert_uptime TEXT, last_alert_ssl TEXT, last_alert_domain TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monitor_id INTEGER, status_code INTEGER, latency INTEGER,
    is_fail INTEGER DEFAULT 0, reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_logs_monitor_created ON logs(monitor_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_logs_fail_created ON logs(is_fail, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS notification_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    config TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, description TEXT,
    severity TEXT DEFAULT 'info', status TEXT DEFAULT 'active',
    type TEXT DEFAULT 'incident',
    scheduled_start DATETIME, scheduled_end DATETIME,
    affected_monitors TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS daily_uptime (
    monitor_id INTEGER NOT NULL, date TEXT NOT NULL,
    total_checks INTEGER DEFAULT 0, successful_checks INTEGER DEFAULT 0,
    avg_latency INTEGER DEFAULT 0,
    PRIMARY KEY (monitor_id, date)
  )`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE, token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, key_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
  )`,
  `CREATE INDEX IF NOT EXISTS idx_monitors_paused ON monitors(paused, id)`,
  `CREATE INDEX IF NOT EXISTS idx_incidents_active ON incidents(type, status, scheduled_start, scheduled_end)`,
];

const DEFAULT_SETTINGS: Record<string, string> = {
  site_title: 'MonitorFlare',
  site_description: 'Realtime monitoring & status page',
  site_logo_url: '/logo.svg',
  language: 'en',
  timezone: 'UTC',
  theme: 'dark',
  status_page_feed: '1',
  status_page_visibility: 'public',
  status_page_password: '',
  alert_template_down: 'Error: {reason}',
  alert_template_up: 'Response time: {latency}ms',
  alert_template_error_rate: 'Error rate alert: {error_rate}% in last 5 minutes, threshold {threshold}%',
};

let initPromise: Promise<boolean> | null = null;

export async function ensureInitialized(env: Bindings): Promise<boolean> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        // 探测 settings 表是否存在
        const probe = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").first();
        if (!probe) {
          for (const sql of INIT_STATEMENTS) {
            await env.DB.prepare(sql).run();
          }
        }
        // 确保默认设置存在(幂等)
        const stmt = env.DB.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
        await env.DB.batch(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => stmt.bind(k, v)));
        // 兼容旧库:补列
        await ensureColumn(env, 'monitors', 'type', "TEXT DEFAULT 'http'");
        await ensureColumn(env, 'monitors', 'config', 'TEXT');
        await ensureColumn(env, 'monitors', 'alert_after_failures', 'INTEGER DEFAULT 1');
        return true;
      } catch (e) {
        console.error('Init failed:', e);
        initPromise = null; // 允许重试
        return false;
      }
    })();
  }
  return initPromise;
}

async function ensureColumn(env: Bindings, table: string, column: string, ddl: string): Promise<void> {
  try {
    const cols = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    if (!cols.results.some(c => c.name === column)) {
      await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`).run();
    }
  } catch (e) {
    console.error(`ensureColumn ${table}.${column} failed:`, e);
  }
}

export async function getSetting(env: Bindings, key: string): Promise<string> {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value ?? '';
}

export async function getSettingsMap(env: Bindings): Promise<Record<string, string>> {
  const { results } = await env.DB.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  const map: Record<string, string> = {};
  for (const r of results || []) map[r.key] = r.value;
  return map;
}
