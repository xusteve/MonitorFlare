// ============================================================
// MonitorFlare — 通用工具函数
// ============================================================
import type { Bindings } from './types';

const textEncoder = new TextEncoder();

export function base64UrlEncode(input: string | ArrayBuffer | Uint8Array): string {
  const bytes = typeof input === 'string' ? textEncoder.encode(input)
    : input instanceof Uint8Array ? input
    : new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', textEncoder.encode(value)));
}

export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = ha.length ^ hb.length;
  for (let i = 0; i < Math.max(ha.length, hb.length); i++) {
    diff |= (ha[i] || 0) ^ (hb[i] || 0);
  }
  return diff === 0;
}

export async function hmacSha256(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return base64UrlEncode(await crypto.subtle.sign('HMAC', key, textEncoder.encode(value)));
}

export function getAuthSecret(env: Bindings): string | null {
  return env.ADMIN_API_KEY || env.ADMIN_PASSWORD || null;
}

export function getAllowedOrigins(env: Bindings): string[] {
  return (env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

export function isLocalOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function toSqlDateTime(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let binary = '';
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

// 邮件地址基础校验
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function maskSecret(val: string): string {
  if (val.length <= 8) return '****';
  return val.slice(0, 4) + '****' + val.slice(-4);
}

export function maskChannelConfig(channel: { config: string }): { config: string } {
  try {
    const cfg = JSON.parse(channel.config) as Record<string, unknown>;
    const masked: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (typeof v === 'string' && ['secret', 'token', 'access_token', 'bot_token', 'api_key', 'key', 'password'].some(s => k.toLowerCase().includes(s))) {
        masked[k] = maskSecret(v);
      } else {
        masked[k] = v;
      }
    }
    return { ...channel, config: JSON.stringify(masked) };
  } catch {
    return channel;
  }
}

// 时区化时间格式化(用于告警消息)
export function formatTimeInTz(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
