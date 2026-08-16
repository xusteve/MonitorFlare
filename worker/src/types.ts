// ============================================================
// MonitorFlare — 类型定义
// ============================================================

export type MonitorType = 'http' | 'dns' | 'port';

export interface Monitor {
  id: number;
  name: string;
  url: string;
  type: MonitorType;
  config: string | null;
  method: string;
  request_headers: string | null;
  request_body: string | null;
  interval: number;
  status: 'UP' | 'DOWN' | 'RETRYING' | 'PAUSED';
  retry_count: number;
  last_check: string | null;
  keyword: string | null;
  user_agent: string | null;
  tags: string | null;
  domain_expiry: string | null;
  cert_expiry: string | null;
  check_info_status: string | null;
  paused: number;
  check_ssl: number;
  check_domain: number;
  alert_silence_uptime: number;
  alert_silence_ssl: number;
  alert_silence_domain: number;
  alert_error_rate: number;
  alert_after_failures: number;
  last_alert_uptime: string | null;
  last_alert_ssl: string | null;
  last_alert_domain: string | null;
  sort_order: number;
  created_at: string;
}

export interface Log {
  id: number;
  monitor_id: number;
  status_code: number;
  latency: number;
  is_fail: number;
  reason: string | null;
  created_at: string;
}

export type ChannelType =
  | 'dingtalk' | 'wecom' | 'feishu' | 'telegram'
  | 'webhook' | 'email' | 'slack' | 'discord' | 'ntfy';

export type EmailProvider = 'resend' | 'sendgrid' | 'mailgun' | 'postmark' | 'ses';

export interface NotificationChannel {
  id: number;
  type: ChannelType;
  name: string;
  enabled: number;
  config: string;
  created_at: string;
}

export interface Incident {
  id: number;
  title: string;
  description: string | null;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'resolved';
  type: 'incident' | 'maintenance';
  scheduled_start: string | null;
  scheduled_end: string | null;
  affected_monitors: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface Subscription {
  id: number;
  email: string;
  token: string;
  created_at: string;
}

export interface ApiKey {
  id: number;
  name: string;
  key_hash: string;
  created_at: string;
  last_used_at: string | null;
}

export type Bindings = {
  DB: D1Database;
  R2?: R2Bucket;
  DINGTALK_ACCESS_TOKEN: string;
  DINGTALK_SECRET: string;
  ADMIN_PASSWORD?: string;
  ADMIN_API_KEY?: string;
  MAGIC_LINK_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  CF_ACCESS_AUD?: string;
  ALLOWED_ORIGIN?: string;
  SESSION_TTL_HOURS?: string;
  BASE_URL?: string;
};

// 检查结果
export interface CheckResult {
  ok: boolean;
  statusCode: number;   // HTTP 状态码;DNS/Port 用 0/1 语义
  latency: number;      // 毫秒
  reason: string;       // 失败原因(空串表示成功)
  detail?: string;      // 附加信息(如 DNS 记录值)
}
