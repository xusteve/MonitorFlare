/**
 * MonitorFlare — 日期与格式工具
 * 时区:统一使用 dayjs.tz(全局时区,可在设置中修改,默认 UTC)
 * 相对时间:dayjs relativeTime(按当前语言自动本地化)
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

/** 规范化 SQLite 无时区字符串 → 可解析 ISO */
const normalizeDate = (str) => {
    if (!str) return null;
    if (typeof str !== 'string') return str;
    if (!str.includes('Z') && !str.includes('+')) {
        return str.includes('T') ? str + 'Z' : str.replace(' ', 'T') + 'Z';
    }
    return str;
};

const getTz = () => localStorage.getItem('monitorflare_tz') || 'UTC';

/** 相对时间(按当前语言本地化) */
export const formatDate = (str) => {
    const s = normalizeDate(str);
    if (!s) return '-';
    const date = dayjs(s);
    if (!date.isValid()) return '-';
    const diff = Date.now() - date.valueOf();
    if (diff < 60_000) return dayjs().to(date); // just now / 刚刚
    if (diff < 3_600_000) return dayjs().to(date); // N minutes ago
    return date.tz(getTz()).format('HH:mm');
};

/** 完整日期时间(按用户时区) */
export const formatDateFull = (str) => {
    const s = normalizeDate(str);
    if (!s) return '-';
    const date = dayjs(s);
    if (!date.isValid()) return '-';
    return date.tz(getTz()).format('MM-DD HH:mm:ss');
};

/** 证书/域名剩余天数 */
export const getDaysRemaining = (dateStr) => {
    const s = normalizeDate(dateStr);
    if (!s) return null;
    const d = dayjs(s);
    if (!d.isValid()) return null;
    return Math.ceil((d.valueOf() - Date.now()) / 86400000);
};

/** 到期日期显示(按用户时区) */
export const formatExpiryDate = (dateStr) => {
    const s = normalizeDate(dateStr);
    if (!s) return '-';
    const date = dayjs(s);
    if (!date.isValid()) return '-';
    return date.tz(getTz()).format('YYYY-MM-DD');
};

/** 到期时间 CSS 类(深色/浅色兼容) */
export const getExpiryClass = (dateStr) => {
    const days = getDaysRemaining(dateStr);
    if (days === null) return 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60';
    if (days < 7)  return 'text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10';
    if (days < 30) return 'text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-400/30 bg-yellow-50 dark:bg-yellow-400/10';
    return 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10';
};

/** Admin 到期 CSS 类 */
export const getExpiryClassAdmin = (dateStr) => {
    if (!dateStr) return 'text-green-600 dark:text-green-400';
    const days = getDaysRemaining(dateStr);
    if (days < 7)  return 'text-red-600 dark:text-red-400 font-bold';
    if (days < 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
};

/** 到期天数短文本 */
export const formatExpiry = (dateStr) => {
    const days = getDaysRemaining(dateStr);
    if (days === null) return '';
    if (days < 0) return 'Expired';
    return `${days}d`;
};

/** 延迟颜色分级 */
export const latencyClass = (ms) => {
    if (ms < 100) return 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
    if (ms < 300) return 'text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20';
    if (ms < 800) return 'text-yellow-600 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-400/10 border-yellow-200 dark:border-yellow-400/20';
    return 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
};

/** 状态徽章类 */
export const statusBadgeClass = (status, paused) => {
    if (paused) return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    if (status === 'UP') return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20';
    if (status === 'DOWN') return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/25';
    return 'bg-yellow-50 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-400/25';
};
