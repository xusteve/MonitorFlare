// ── 网络增强：超时控制 + 自动重试 ──

export const API_BASE = '/api';
export const STATUS_TOKEN_KEY = 'monitorflare_status_token';

/**
 * 带超时的 fetch
 */
export const fetchT = (url, opts = {}, ms = 15000) => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    const headers = { ...(opts.headers || {}) };
    const token = localStorage.getItem(STATUS_TOKEN_KEY);
    if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...opts, headers, signal: c.signal }).finally(() => clearTimeout(t));
};

/**
 * 自动重试封装
 */
export const withRetry = async (fn, n = 2, base = 1500) => {
    for (let i = 0; i <= n; i++) {
        try { return await fn(); }
        catch (e) { if (i === n) throw e; await new Promise(r => setTimeout(r, base * (i + 1))); }
    }
};

/**
 * 判断响应是否为状态页锁定(私密模式未登录)
 */
export const isStatusLocked = async (res) => {
    if (res.status !== 401) return false;
    try {
        const d = await res.clone().json();
        return d?.error === 'status_page_locked';
    } catch {
        return false;
    }
};

/**
 * 状态页登录:密码换 token
 */
export const statusLogin = async (password) => {
    const res = await fetchT(`${API_BASE}/status/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });
    if (!res.ok) {
        let err = 'statusLock.wrongPassword';
        try { const d = await res.json(); if (d?.error === 'status_page_not_configured') err = 'statusLock.notConfigured'; } catch {}
        return { ok: false, error: err };
    }
    const d = await res.json();
    if (d?.token) localStorage.setItem(STATUS_TOKEN_KEY, d.token);
    return { ok: !!d?.token };
};

/**
 * 状态页退出:清除 token
 */
export const statusLogout = () => {
    localStorage.removeItem(STATUS_TOKEN_KEY);
};
