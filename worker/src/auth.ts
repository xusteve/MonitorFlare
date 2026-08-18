// ============================================================
// MonitorFlare — 认证
// 登录方式: API Key(默认) / Magic Link / Google OAuth / GitHub OAuth / Cloudflare Access
// ============================================================
import type { Bindings } from './types';
import {
  base64UrlDecode, base64UrlEncode, getAuthSecret, hmacSha256,
  randomToken, safeEqual, sha256,
} from './utils';

// ---------- 会话 token(与上游兼容) ----------
export async function createSessionToken(env: Bindings): Promise<{ token: string; expires_at: string }> {
  const secret = getAuthSecret(env);
  if (!secret) throw new Error('Admin auth is not configured');
  const configuredTtl = Number(env.SESSION_TTL_HOURS);
  const ttlHours = Number.isFinite(configuredTtl) && configuredTtl > 0
    ? Math.max(1, Math.min(configuredTtl, 168))
    : 12;
  const expiresAt = new Date(Date.now() + ttlHours * 3_600_000);
  const payload = base64UrlEncode(JSON.stringify({ exp: expiresAt.toISOString(), sub: 'admin' }));
  const signature = await hmacSha256(secret, payload);
  return { token: `v1.${payload}.${signature}`, expires_at: expiresAt.toISOString() };
}

export async function verifySessionToken(env: Bindings, token: string): Promise<boolean> {
  const secret = getAuthSecret(env);
  if (!secret || !token.startsWith('v1.')) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [, payload, signature] = parts;
  const expected = await hmacSha256(secret, payload);
  if (!await safeEqual(signature, expected)) return false;
  try {
    const data = JSON.parse(base64UrlDecode(payload)) as { exp?: string };
    return !!data.exp && new Date(data.exp).getTime() > Date.now();
  } catch {
    return false;
  }
}

export async function verifyAdminCredential(env: Bindings, credential: string): Promise<boolean> {
  const candidates = [env.ADMIN_API_KEY, env.ADMIN_PASSWORD].filter(Boolean) as string[];
  for (const candidate of candidates) {
    if (await safeEqual(credential, candidate)) return true;
  }
  return false;
}

// ---------- Magic Link(一次性邮件登录) ----------
export interface MagicLinkPayload {
  email: string;
  exp: number;
  nonce: string;
}

export async function createMagicLinkToken(env: Bindings, email: string): Promise<string> {
  const secret = env.MAGIC_LINK_SECRET || getAuthSecret(env);
  if (!secret) throw new Error('Magic link is not configured (MAGIC_LINK_SECRET)');
  const payload: MagicLinkPayload = { email, exp: Date.now() + 10 * 60_000, nonce: randomToken(8) };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSha256(secret, encoded);
  return `ml.${encoded}.${signature}`;
}

export async function verifyMagicLinkToken(env: Bindings, token: string): Promise<string | null> {
  const secret = env.MAGIC_LINK_SECRET || getAuthSecret(env);
  if (!secret || !token.startsWith('ml.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payload, signature] = parts;
  const expected = await hmacSha256(secret, payload);
  if (!await safeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(base64UrlDecode(payload)) as MagicLinkPayload;
    if (!data.email || data.exp < Date.now()) return null;
    return data.email;
  } catch {
    return null;
  }
}

// ---------- OAuth state 签名 ----------
export async function createOAuthState(env: Bindings): Promise<string> {
  const secret = getAuthSecret(env) || 'oauth';
  const payload = base64UrlEncode(JSON.stringify({ nonce: randomToken(12), exp: Date.now() + 10 * 60_000 }));
  const sig = await hmacSha256(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifyOAuthState(env: Bindings, state: string): Promise<boolean> {
  const secret = getAuthSecret(env) || 'oauth';
  const idx = state.lastIndexOf('.');
  if (idx <= 0) return false;
  const payload = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = await hmacSha256(secret, payload);
  if (!await safeEqual(sig, expected)) return false;
  try {
    const data = JSON.parse(base64UrlDecode(payload)) as { exp: number };
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

// ---------- 状态页访问 token(私密模式) ----------
// 签名密钥派生自 AUTH_SECRET + 密码哈希 → 改密码即所有已发 token 失效
const STATUS_TOKEN_TTL_MS = 7 * 24 * 3_600_000;

async function statusPageSecret(env: Bindings, passwordHash: string): Promise<string> {
  const secret = getAuthSecret(env) || 'status-page';
  return hmacSha256(secret, `status:${passwordHash}`);
}

export async function hashStatusPassword(password: string): Promise<string> {
  const bytes = await sha256(password);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createStatusToken(env: Bindings, passwordHash: string): Promise<{ token: string; expires_at: string }> {
  const secret = await statusPageSecret(env, passwordHash);
  const expiresAt = new Date(Date.now() + STATUS_TOKEN_TTL_MS);
  const payload = base64UrlEncode(JSON.stringify({ exp: expiresAt.toISOString(), sub: 'status' }));
  const signature = await hmacSha256(secret, payload);
  return { token: `sp.${payload}.${signature}`, expires_at: expiresAt.toISOString() };
}

export async function verifyStatusToken(env: Bindings, token: string, passwordHash: string): Promise<boolean> {
  if (!token.startsWith('sp.')) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [, payload, signature] = parts;
  const secret = await statusPageSecret(env, passwordHash);
  const expected = await hmacSha256(secret, payload);
  if (!await safeEqual(signature, expected)) return false;
  try {
    const data = JSON.parse(base64UrlDecode(payload)) as { exp?: string; sub?: string };
    return data.sub === 'status' && !!data.exp && new Date(data.exp).getTime() > Date.now();
  } catch {
    return false;
  }
}

// ---------- Cloudflare Access JWT 校验(RS256 + JWKS) ----------
export async function verifyCfAccessToken(env: Bindings, jwt: string): Promise<boolean> {
  if (!env.CF_ACCESS_AUD) return false;
  try {
    const [header, payload, signature] = jwt.split('.');
    if (!header || !payload || !signature) return false;
    const headerObj = JSON.parse(base64UrlDecode(header)) as { alg?: string; kid?: string };
    if (headerObj.alg !== 'RS256' || !headerObj.kid) return false;
    const payloadObj = JSON.parse(base64UrlDecode(payload)) as { aud?: string | string[]; exp?: number };
    const aud = Array.isArray(payloadObj.aud) ? payloadObj.aud : [payloadObj.aud];
    if (!aud.includes(env.CF_ACCESS_AUD)) return false;
    if (!payloadObj.exp || payloadObj.exp * 1000 < Date.now()) return false;

    // 从 CF Access 获取 JWKS 并验证签名
    const team = (env.CF_ACCESS_AUD.split('.')[0]) || '';
    const jwksRes = await fetch(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
    if (!jwksRes.ok) return false;
    const jwks = await jwksRes.json<{ keys: { kid?: string; n?: string; e?: string; alg?: string }[] }>();
    const key = jwks.keys.find(k => k.kid === headerObj.kid && k.n && k.e);
    if (!key) return false;

    const spki = await convertRsaKeyToSpki(key.n!, key.e!);
    const cryptoKey = await crypto.subtle.importKey(
      'spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = base64UrlToBytes(signature);
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', cryptoKey,
      sigBytes, new TextEncoder().encode(`${header}.${payload}`)
    );
    return valid;
  } catch {
    return false;
  }
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// RSA n/e → SPKI DER
async function convertRsaKeyToSpki(nB64: string, eB64: string): Promise<ArrayBuffer> {
  const nBytes = [...base64UrlToBytes(nB64)];
  const eBytes = [...base64UrlToBytes(eB64)];
  const n = prependZero(nBytes);
  const e = prependZero(eBytes);
  // DER 编码: SEQUENCE { SEQUENCE { OID rsaEncryption, NULL }, BIT STRING { SEQUENCE { INTEGER n, INTEGER e } } }
  const rsaOid = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01];
  const algSeq = derSequence([0x06, 0x09, ...rsaOid.slice(2), 0x05, 0x00]);
  const intN = derInteger(n);
  const intE = derInteger(e);
  const pubKeySeq = derSequence([...intN, ...intE]);
  const bitString = [0x03, ...derLength(pubKeySeq.length + 1), 0x00, ...pubKeySeq];
  const spki = derSequence([...algSeq, ...bitString]);
  return Uint8Array.from(spki).buffer as ArrayBuffer;
}

function derSequence(content: number[]): number[] {
  return [0x30, ...derLength(content.length), ...content];
}

function derInteger(bytes: number[]): number[] {
  return [0x02, ...derLength(bytes.length), ...bytes];
}

function derLength(len: number): number[] {
  if (len < 0x80) return [len];
  if (len < 0x100) return [0x81, len];
  return [0x82, len >> 8, len & 0xff];
}

function prependZero(bytes: number[]): number[] {
  return (bytes[0] & 0x80) ? [0x00, ...bytes] : bytes;
}

// ---------- 第三方 API 密钥 ----------
export async function hashApiKey(key: string): Promise<string> {
  return base64UrlEncode(await sha256(key));
}

export async function verifyApiKey(env: Bindings, key: string): Promise<boolean> {
  const hash = await hashApiKey(key);
  const row = await env.DB.prepare('SELECT id FROM api_keys WHERE key_hash = ?').bind(hash).first<{ id: number }>();
  if (row) {
    await env.DB.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), row.id).run();
    return true;
  }
  return false;
}
