// ============================================================
// MonitorFlare — 监测引擎
// 支持: http(HTTP/HTTPS) / dns(DoH 解析比对) / port(TCP 连通性)
// ============================================================
import type { Bindings, CheckResult, Monitor } from './types';

// ---------- HTTP 监测 ----------
async function checkHTTP(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    let headers: Record<string, string> = {
      'User-Agent': monitor.user_agent || 'MonitorFlare/1.0',
    };
    if (monitor.request_headers) {
      try {
        headers = { ...headers, ...JSON.parse(monitor.request_headers) as Record<string, string> };
      } catch { /* ignore */ }
    }
    const fetchOptions: RequestInit = {
      method: monitor.method || 'GET',
      headers,
      cf: { cacheTtl: 0, cacheEverything: false } as RequestInitCfProperties,
    };
    if (['POST', 'PUT', 'PATCH'].includes(monitor.method || 'GET') && monitor.request_body) {
      fetchOptions.body = monitor.request_body;
      if (!headers['Content-Type']) {
        (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
      }
    }
    const response = await fetch(monitor.url, fetchOptions);
    const latency = Date.now() - startTime;
    if (!response.ok) {
      return { ok: false, statusCode: response.status, latency, reason: `HTTP ${response.status}` };
    }
    if (monitor.keyword) {
      const text = await response.text();
      if (!text.includes(monitor.keyword)) {
        return { ok: false, statusCode: response.status, latency, reason: `Keyword "${monitor.keyword}" not found` };
      }
    }
    return { ok: true, statusCode: response.status, latency, reason: '' };
  } catch (e: unknown) {
    const latency = Date.now() - startTime;
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    let reason = errorMsg;
    if (errorMsg.includes('handshake') || errorMsg.includes('certificate') || errorMsg.includes('SSL') || errorMsg.includes('TLS')) {
      reason = `SSL Error: ${errorMsg}`;
    } else if (errorMsg.includes('time') || errorMsg.includes('timeout')) {
      reason = 'Timeout';
    } else if (errorMsg.includes('fetch failed') || errorMsg.includes('getaddrinfo')) {
      reason = 'DNS resolution failed';
    }
    return { ok: false, statusCode: 0, latency, reason };
  }
}

// ---------- DNS 监测(DoH) ----------
interface DnsConfig {
  record_type?: string;  // A / AAAA / CNAME / MX / TXT / NS
  expected?: string;     // 期望值,逗号分隔;留空 = 仅检查记录存在
  resolver?: 'cloudflare' | 'google';
}

interface DohAnswer {
  name?: string;
  type?: number;
  data?: string;
}

function parseDnsConfig(monitor: Monitor): DnsConfig {
  try { return (monitor.config ? JSON.parse(monitor.config) : {}) as DnsConfig; } catch { return {}; }
}

function extractRecordValue(ans: DohAnswer): string {
  return (ans.data || '').replace(/\.$/, '').toLowerCase();
}

async function checkDNS(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const cfg = parseDnsConfig(monitor);
    const recordType = (cfg.record_type || 'A').toUpperCase();
    let hostname: string;
    try {
      hostname = new URL(monitor.url).hostname;
    } catch {
      hostname = monitor.url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    }
    const resolver = cfg.resolver === 'google'
      ? 'https://dns.google/resolve'
      : 'https://cloudflare-dns.com/dns-query';
    const url = `${resolver}?name=${encodeURIComponent(hostname)}&type=${recordType}`;
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/dns-json' },
      cf: { cacheTtl: 0, cacheEverything: false } as RequestInitCfProperties,
    });
    const latency = Date.now() - startTime;
    if (!resp.ok) {
      return { ok: false, statusCode: resp.status, latency, reason: `DoH ${resp.status}` };
    }
    const data = await resp.json<{ Status?: number; Answer?: DohAnswer[]; Comment?: string }>();
    if (data.Status !== 0) {
      return { ok: false, statusCode: 0, latency, reason: `DNS status ${data.Status} (${data.Comment || 'NXDOMAIN or error'})` };
    }
    const answers = (data.Answer || []).filter(a => (a.type || 0) > 0);
    if (answers.length === 0) {
      return { ok: false, statusCode: 0, latency, reason: `No ${recordType} record found` };
    }
    const values = answers.map(extractRecordValue);
    if (cfg.expected) {
      const expectedList = cfg.expected.split(',').map(s => s.trim().toLowerCase().replace(/\.$/, '')).filter(Boolean);
      const matched = values.some(v => expectedList.includes(v));
      if (!matched) {
        return { ok: false, statusCode: 0, latency, reason: `Expected [${expectedList.join(', ')}] got [${values.join(', ')}]` };
      }
    }
    return { ok: true, statusCode: 0, latency, reason: '', detail: `${recordType}: ${values.join(', ')}` };
  } catch (e: unknown) {
    const latency = Date.now() - startTime;
    return { ok: false, statusCode: 0, latency, reason: e instanceof Error ? e.message : 'DNS check error' };
  }
}

// ---------- 端口监测(TCP connect) ----------
interface PortConfig {
  port?: number;
  timeout?: number;       // 毫秒,默认 5000
}

type SocketLike = {
  opened?: Promise<void>;
  closed?: Promise<void>;
  readable?: ReadableStream;
  close: () => void;
};

async function checkPort(monitor: Monitor): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const cfg = (() => { try { return (monitor.config ? JSON.parse(monitor.config) : {}) as PortConfig; } catch { return {}; } })();
    let hostname: string;
    try {
      hostname = new URL(monitor.url).hostname;
    } catch {
      hostname = monitor.url.replace(/^https?:\/\//, '').split('/')[0];
    }
    const port = Number(cfg.port) || 443;
    const timeoutMs = Number(cfg.timeout) || 5000;

    // Workers TCP Socket API(cloudflare:sockets)
    const mod = await import('cloudflare:sockets');
    const connect = mod.connect as unknown as (opts: { hostname: string; port: number }) => SocketLike;
    const result = await new Promise<{ ok: boolean; err?: string }>((resolve) => {
      let socket: SocketLike | null = null;
      const timer = setTimeout(() => {
        try { socket?.close(); } catch { /* ignore */ }
        resolve({ ok: false, err: 'Timeout' });
      }, timeoutMs);
      let settled = false;
      const done = (r: { ok: boolean; err?: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(r);
      };
      try {
        socket = connect({ hostname, port });
        socket.opened?.then(() => done({ ok: true })).catch((err: unknown) => done({ ok: false, err: err instanceof Error ? err.message : 'connect error' }));
        socket.closed?.catch((err: unknown) => {
          if (!settled) done({ ok: false, err: err instanceof Error ? err.message : 'closed' });
        });
        socket.readable?.getReader().read().then(() => done({ ok: true })).catch((err: unknown) => {
          if (!settled) done({ ok: false, err: err instanceof Error ? err.message : 'read error' });
        });
      } catch (err) {
        done({ ok: false, err: err instanceof Error ? err.message : 'connect failed' });
      }
    });
    const latency = Date.now() - startTime;
    if (result.ok) {
      return { ok: true, statusCode: 0, latency, reason: '', detail: `Port ${port} open` };
    }
    return { ok: false, statusCode: 0, latency, reason: `Port ${port} unreachable: ${result.err || 'refused'}` };
  } catch (e: unknown) {
    const latency = Date.now() - startTime;
    return { ok: false, statusCode: 0, latency, reason: e instanceof Error ? e.message : 'Port check error' };
  }
}

// ---------- 统一分发 ----------
export async function performCheck(monitor: Monitor, _env: Bindings): Promise<CheckResult> {
  switch (monitor.type) {
    case 'dns':  return await checkDNS(monitor);
    case 'port': return await checkPort(monitor);
    case 'http':
    default:     return await checkHTTP(monitor);
  }
}

// ---------- 域名 / 证书信息更新(crt.sh + rdap.org) ----------
export async function updateDomainCertInfo(env: Bindings, monitor: Monitor): Promise<void> {
  try {
    const urlObj = new URL(monitor.url);
    const domain = urlObj.hostname;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return;

    let certExpiry: string | null = null;
    try {
      const browserUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const fetchCerts = async (searchDomain: string): Promise<Record<string, unknown>[]> => {
        try {
          const res = await fetch(`https://crt.sh/?q=${searchDomain}&output=json`, { headers: { 'User-Agent': browserUA } });
          if (!res.ok) return [];
          try { return JSON.parse(await res.text()) as Record<string, unknown>[]; } catch { return []; }
        } catch { return []; }
      };

      let certs = await fetchCerts(domain);
      if (domain.split('.').length > 2) {
        const parts = domain.split('.');
        const rootDomain = parts.slice(parts.length - 2).join('.');
        const [rootCerts, wildcardCerts] = await Promise.all([
          fetchCerts(rootDomain),
          fetchCerts(`%25.${rootDomain}`),
        ]);
        certs = [...certs, ...rootCerts, ...wildcardCerts];
      }

      if (certs.length > 0) {
        const nowMs = Date.now();
        const parseExpiry = (s: string) => new Date(s.replace(' ', 'T')).getTime();
        const validCerts = certs.filter(c => { const exp = parseExpiry(c.not_after as string); return !isNaN(exp) && exp > nowMs; });
        const source = validCerts.length > 0 ? validCerts : certs;
        const sorted = source
          .filter(c => c.not_after)
          .sort((a, b) => parseExpiry(a.not_after as string) - parseExpiry(b.not_after as string));
        if (sorted.length > 0) {
          certExpiry = new Date(parseExpiry(sorted[0].not_after as string)).toISOString();
        }
      }
    } catch { /* cert check failed, keep old */ }

    let domainExpiry: string | null = null;
    try {
      const rdapRes = await fetch(`https://rdap.org/domain/${domain}`);
      if (rdapRes.ok) {
        const rdapData = await rdapRes.json<{ events?: { eventAction: string; eventDate: string }[] }>();
        const expEvent = (rdapData.events || []).find(e => e.eventAction.includes('expiration'));
        if (expEvent?.eventDate) domainExpiry = expEvent.eventDate;
      }
    } catch { /* rdap failed, keep old */ }

    await env.DB.prepare('UPDATE monitors SET cert_expiry = ?, domain_expiry = ? WHERE id = ?')
      .bind(certExpiry, domainExpiry, monitor.id).run();
  } catch (e) {
    console.error('updateDomainCertInfo failed:', e);
  }
}
