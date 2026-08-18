<template>
  <div class="min-h-screen flex flex-col text-slate-800 dark:text-slate-200 grid-bg">
    <StatusHeader :loading="loading" :isDark="isDark" :siteSettings="siteSettings" @toggle-theme="toggleTheme" />

    <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
      <!-- 返回 + 错误 -->
      <div class="flex items-center justify-between mb-6 fade-up">
        <router-link to="/" class="flex items-center gap-1.5 text-sm font-mono text-slate-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          {{ $t('monitorDetail.back') }}
        </router-link>
        <button v-if="monitor && !loading" @click="manualRefresh" class="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
          <svg class="w-3 h-3" :class="refreshing ? 'animate-spin' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
          {{ $t('monitorDetail.refresh') }}
        </button>
      </div>

      <!-- 加载占位 -->
      <div v-if="loading && !monitor" class="space-y-3 fade-up-d2">
        <div class="glass rounded-2xl h-24 animate-pulse"></div>
        <div class="glass rounded-2xl h-16 animate-pulse"></div>
        <div class="glass rounded-2xl h-64 animate-pulse"></div>
      </div>

      <!-- 未找到 -->
      <div v-else-if="notFound" class="text-center py-24 glass rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.06] fade-up-d2">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"/></svg>
        </div>
        <p class="text-slate-400 dark:text-slate-600 font-mono text-sm tracking-widest">{{ $t('monitorDetail.notFound') }}</p>
      </div>

      <template v-if="monitor">
        <!-- 状态头部卡 -->
        <div class="glass rounded-2xl px-6 py-5 mb-5 fade-up-d1">
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-3">
                <div class="relative shrink-0">
                  <div class="w-3 h-3 rounded-full"
                    :class="{
                      'bg-emerald-400': monitor.status === 'UP' && !monitor.paused,
                      'bg-red-400': monitor.status === 'DOWN',
                      'bg-yellow-400': monitor.status === 'RETRYING',
                      'bg-slate-400 dark:bg-slate-600': monitor.paused,
                    }"></div>
                  <div v-if="monitor.status === 'UP' && !monitor.paused" class="absolute inset-0 rounded-full bg-emerald-400/40 pulse-dot"></div>
                </div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white truncate">{{ monitor.name }}</h1>
                <span v-if="typeKey" class="type-badge shrink-0" :title="$t('monitorCard.type.' + typeKey)">
                  <span class="type-badge-icon"><i :class="typeIcon"></i></span>
                  <span class="type-badge-label">{{ typeLabel }}</span>
                </span>
                <span class="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold border" :class="statusBadgeClass(monitor.status, monitor.paused)">
                  {{ statusLabel }}
                </span>
              </div>

              <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <a :href="monitor.url" target="_blank" rel="noopener" class="text-[12px] sm:text-[13px] font-mono text-slate-500 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate max-w-full sm:max-w-[420px] flex items-center gap-1.5">
                  {{ monitor.url }}
                  <svg class="w-2.5 h-2.5 opacity-70 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                </a>
                <a v-if="monitor.cert_expiry && sslCheckUrl" :href="sslCheckUrl" target="_blank" rel="noopener"
                  class="flex items-center gap-1 text-[12px] font-mono text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors shrink-0"
                  :title="$t('monitorCard.sslCheck')">
                  <i class="fa-regular fa-flag"></i>
                </a>
                <span v-if="monitor.latency != null && !monitor.paused" class="flex items-center gap-1 text-[12px] font-mono font-medium" :class="latencyTextClass(monitor.latency)">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
                  {{ monitor.latency }}ms
                </span>
                <span class="text-[11px] font-mono text-slate-400 dark:text-slate-600">{{ $t('monitorDetail.lastCheck', { time: formatDate(monitor.last_check) }) }}</span>
              </div>

              <div v-if="monitor.cert_expiry || monitor.domain_expiry" class="mt-3 flex flex-wrap items-center gap-2">
                <span v-if="monitor.cert_expiry" class="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border" :class="getExpiryClass(monitor.cert_expiry)">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>
                  {{ $t('monitorDetail.sslExpiry', { days: formatExpiry(monitor.cert_expiry), date: formatExpiryDate(monitor.cert_expiry) }) }}
                </span>
                <span v-if="monitor.domain_expiry" class="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border" :class="getExpiryClass(monitor.domain_expiry)">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/></svg>
                  {{ $t('monitorDetail.domainExpiry', { days: formatExpiry(monitor.domain_expiry), date: formatExpiryDate(monitor.domain_expiry) }) }}
                </span>
                <span v-if="monitor.type === 'http' && monitor.check_ssl === 1" class="text-[11px] font-mono text-slate-400 dark:text-slate-600">{{ $t('monitorDetail.sslChecked') }}</span>
              </div>
            </div>

            <!-- uptime 统计四格 -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:w-[380px] shrink-0">
              <div v-for="s in stats" :key="s.label" class="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] px-3 py-2.5 text-center">
                <p class="text-[10px] font-mono text-slate-400 dark:text-slate-600">{{ s.label }}</p>
                <p class="text-lg font-bold mt-0.5" :class="s.value != null ? pctTextClass(s.value) : 'text-slate-300 dark:text-slate-700'">{{ s.value != null ? s.value + '%' : '—' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 90 天可用率 -->
        <div class="glass rounded-2xl px-6 py-5 mb-5 fade-up-d2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span class="w-1 h-4 rounded-full bg-emerald-500"></span>
              {{ $t('monitorDetail.uptime90') }}
            </h2>
            <span v-if="monitor.uptime_90d != null" class="text-sm font-mono font-semibold" :class="pctTextClass(monitor.uptime_90d)">{{ monitor.uptime_90d }}%</span>
          </div>
          <UptimeBar v-if="monitor.daily_stats && monitor.daily_stats.length > 0" :monitor="monitor" />
          <p v-else class="text-xs text-slate-400 dark:text-slate-600">{{ $t('monitorDetail.noData') }}</p>
        </div>

        <!-- 延迟趋势 -->
        <div class="glass rounded-2xl px-6 py-5 mb-5 fade-up-d3">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span class="w-1 h-4 rounded-full bg-sky-500"></span>
              {{ $t('monitorDetail.latencyTrend') }}
            </h2>
            <div class="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 p-0.5">
              <button v-for="r in ranges" :key="r.key" @click="selectRange(r.key)"
                class="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer"
                :class="range === r.key ? 'bg-sky-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-sky-500'">
                {{ r.label }}
              </button>
            </div>
          </div>
          <div v-if="seriesPoints.length >= 2" class="w-full">
            <svg :viewBox="chartViewBox" class="w-full h-44" preserveAspectRatio="none">
              <defs>
                <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgb(14 165 233)" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="rgb(14 165 233)" stop-opacity="0" />
                </linearGradient>
              </defs>
              <line v-for="gy in gridYs" :key="gy.y" :x1="0" :x2="W" :y1="gy.y" :y2="gy.y" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3" class="text-slate-400 dark:text-slate-500" />
              <path :d="chartArea" :fill="`url(#${gradId})`" />
              <path :d="chartLine" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
              <circle v-if="lastPoint" :cx="lastPoint.x" :cy="lastPoint.y" r="3" fill="#0ea5e9" />
            </svg>
            <div class="flex justify-between mt-1 text-[10px] font-mono text-slate-400 dark:text-slate-600">
              <span>{{ firstPointLabel }}</span>
              <span class="font-semibold text-sky-500">{{ $t('monitorDetail.now') }}</span>
            </div>
          </div>
          <p v-else class="text-xs text-slate-400 dark:text-slate-600">{{ $t('monitorDetail.noData') }}</p>
        </div>

        <!-- 最近检查日志 -->
        <div class="glass rounded-2xl px-6 py-5 mb-5 fade-up-d3">
          <h2 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
            <span class="w-1 h-4 rounded-full bg-violet-500"></span>
            {{ $t('monitorDetail.recentChecks') }}
            <span class="text-[11px] font-mono font-normal text-slate-400 dark:text-slate-600">{{ $t('monitorDetail.recentChecksCount', { count: logs.length }) }}</span>
          </h2>
          <div v-if="logs.length > 0" class="overflow-x-auto -mx-2 px-2">
            <table class="w-full text-left">
              <thead>
                <tr class="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-600 border-b border-slate-200 dark:border-white/[0.08]">
                  <th class="py-2 pr-3 font-medium">{{ $t('monitorDetail.colTime') }}</th>
                  <th class="py-2 pr-3 font-medium">{{ $t('monitorDetail.colStatus') }}</th>
                  <th class="py-2 pr-3 font-medium">{{ $t('monitorDetail.colCode') }}</th>
                  <th class="py-2 pr-3 font-medium">{{ $t('monitorDetail.colLatency') }}</th>
                  <th class="py-2 font-medium">{{ $t('monitorDetail.colReason') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in logs" :key="log.id" class="border-b border-slate-100 dark:border-white/[0.04] text-[12px] font-mono hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td class="py-2 pr-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ formatDateFull(log.created_at) }}</td>
                  <td class="py-2 pr-3">
                    <span v-if="!log.is_fail" class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                      {{ $t('monitorDetail.statusUp') }}
                    </span>
                    <span v-else class="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      {{ $t('monitorDetail.statusDown') }}
                    </span>
                  </td>
                  <td class="py-2 pr-3" :class="log.is_fail ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'">{{ log.status_code || '—' }}</td>
                  <td class="py-2 pr-3" :class="log.latency != null ? latencyTextClass(log.latency) : 'text-slate-400 dark:text-slate-600'">{{ log.latency != null ? log.latency + 'ms' : '—' }}</td>
                  <td class="py-2 text-slate-400 dark:text-slate-500 max-w-[260px] truncate" :title="log.reason">{{ log.reason || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-xs text-slate-400 dark:text-slate-600">{{ $t('monitorDetail.noData') }}</p>
        </div>

        <!-- 相关事件 -->
        <div v-if="incidents.length > 0" class="glass rounded-2xl px-6 py-5 mb-5 fade-up-d3">
          <h2 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-4">
            <span class="w-1 h-4 rounded-full bg-amber-500"></span>
            {{ $t('monitorDetail.relatedIncidents') }}
            <span class="text-[11px] font-mono font-normal text-slate-400 dark:text-slate-600">{{ incidents.length }}</span>
          </h2>
          <div class="space-y-2.5">
            <div v-for="inc in incidents" :key="inc.id"
              class="rounded-xl px-4 py-3 border flex items-start gap-3"
              :class="incidentClass(inc)">
              <svg v-if="inc.status === 'resolved'" class="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
              <svg v-else class="w-4 h-4 mt-0.5 shrink-0" :class="incidentIconClass(inc)" fill="currentColor" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-sm" :class="inc.status === 'resolved' ? 'text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600' : 'text-slate-900 dark:text-white'">{{ inc.title }}</p>
                  <span class="text-[10px] font-mono px-1.5 py-0.5 rounded" :class="incidentBadgeClass(inc)">{{ incidentStatusLabel(inc) }}</span>
                </div>
                <p v-if="inc.description" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ inc.description }}</p>
                <p class="text-[11px] font-mono text-slate-400 dark:text-slate-600 mt-1">
                  {{ formatDateFull(inc.created_at) }}
                  <template v-if="inc.resolved_at"> · {{ $t('monitorDetail.resolvedAt', { time: formatDateFull(inc.resolved_at) }) }}</template>
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>

    <StatusFooter :loading="loading" :refreshing="refreshing" @refresh="manualRefresh" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTheme } from '../composables/useTheme';
import { API_BASE, fetchT, withRetry } from '../utils/api';
import {
    formatDate, formatDateFull, getExpiryClass, formatExpiry, formatExpiryDate, latencyClass, statusBadgeClass,
} from '../utils/format';
import { getAppTimezone } from '../main';

import StatusHeader from '../components/status/StatusHeader.vue';
import StatusFooter from '../components/status/StatusFooter.vue';
import UptimeBar from '../components/status/UptimeBar.vue';

const { t } = useI18n();
const route = useRoute();
const { isDark, toggleTheme } = useTheme('theme');

const monitor = ref(null);
const logs = ref([]);
const latencySeries = ref([]);
const incidents = ref([]);
const loading = ref(true);
const refreshing = ref(false);
const notFound = ref(false);
const range = ref('24h');
const siteSettings = ref({ site_title: 'MonitorFlare', site_description: '', site_logo_url: '' });
const seriesCache = {};

const monitorId = computed(() => String(route.params.id));

const typeKey = computed(() => {
    const type = monitor.value?.type;
    if (type === 'http') {
        if (monitor.value?.check_ssl === 1) return 'ssl';
        return 'http';
    }
    if (type === 'dns') return 'dns';
    if (type === 'port') return 'port';
    return '';
});
const typeIcon = computed(() => ({
    ssl: 'fa-brands fa-expeditedssl',
    http: 'fa-solid fa-fingerprint',
    dns: 'fa-solid fa-globe',
    port: 'fa-solid fa-server',
}[typeKey.value] || 'fa-solid fa-fingerprint'));
const typeLabel = computed(() => ({
    ssl: 'SSL',
    http: 'HTTP/HTTPS',
    dns: 'DNS',
    port: 'TCP',
}[typeKey.value] || 'HTTP/HTTPS'));

const statusLabel = computed(() => {
    if (monitor.value?.paused) return t('status.paused');
    if (monitor.value?.status === 'UP') return t('status.up');
    if (monitor.value?.status === 'DOWN') return t('status.down');
    return t('status.retrying');
});

const sslCheckUrl = computed(() => {
    try {
        const host = new URL(monitor.value.url).hostname;
        if (!host) return '';
        return `https://csr.plus/check?domain=${encodeURIComponent(host)}`;
    } catch {
        return '';
    }
});

const stats = computed(() => [
    { label: t('monitorDetail.stat24h'), value: monitor.value?.uptime_24h },
    { label: t('monitorDetail.stat7d'), value: monitor.value?.uptime_7d },
    { label: t('monitorDetail.stat30d'), value: monitor.value?.uptime_30d },
    { label: t('monitorDetail.stat90d'), value: monitor.value?.uptime_90d },
]);

const ranges = computed(() => [
    { key: '24h', label: t('monitorDetail.range24h') },
    { key: '7d', label: t('monitorDetail.range7d') },
    { key: '30d', label: t('monitorDetail.range30d') },
]);

const selectRange = (key) => {
    if (range.value === key && seriesPoints.value.length > 0) return;
    range.value = key;
    loadSeries(key);
};

const loadSeries = async (r) => {
    if (seriesCache[r]) {
        latencySeries.value = seriesCache[r];
        return;
    }
    try {
        const res = await fetchT(`${API_BASE}/monitors/public/${monitorId.value}?range=${r}&limit=1`);
        if (res.ok) {
            const data = await res.json();
            seriesCache[r] = data.latency_series || [];
            latencySeries.value = seriesCache[r];
        }
    } catch { /* keep old */ }
};

const W = 800, H = 176, P = 8;

const seriesPoints = computed(() => {
    const pts = latencySeries.value.map((p, i) => {
        const x = P + (i / Math.max(latencySeries.value.length - 1, 1)) * (W - 2 * P);
        return { x, y: null, t: p.created_at, l: p.latency };
    });
    const lats = latencySeries.value.map(p => p.latency);
    const max = Math.max(...lats), min = Math.min(...lats);
    const rangeVal = max - min || 1;
    pts.forEach((p, i) => {
        p.y = H - P - ((latencySeries.value[i].latency - min) / rangeVal) * (H - 2 * P);
    });
    return pts;
});

const chartLine = computed(() => seriesPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '));
const chartArea = computed(() => {
    const pts = seriesPoints.value;
    if (pts.length === 0) return '';
    const first = pts[0], last = pts[pts.length - 1];
    return `M${first.x.toFixed(1)} ${first.y.toFixed(1)} L${pts.slice(1).map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')} L${last.x.toFixed(1)} ${H} L${first.x.toFixed(1)} ${H} Z`;
});
const chartViewBox = computed(() => `0 0 ${W} ${H}`);
const lastPoint = computed(() => seriesPoints.value.length > 0 ? seriesPoints.value[seriesPoints.value.length - 1] : null);
const firstPointLabel = computed(() => {
    const t0 = latencySeries.value[0]?.created_at;
    return t0 ? formatDateFull(t0) : '';
});
const gridYs = computed(() => [0.2, 0.4, 0.6, 0.8].map(f => ({ y: P + f * (H - 2 * P) })));
const gradId = `lat-grad-${monitorId.value}`;

const pctTextClass = (p) => {
    if (p >= 99.9) return 'text-emerald-600 dark:text-emerald-400';
    if (p >= 95) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
};
const latencyTextClass = (ms) => {
    const cls = latencyClass(ms);
    return cls.split(' ').filter(c => c.startsWith('text-')).join(' ');
};

const incidentClass = (inc) => {
    if (inc.status === 'resolved') return 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06]';
    if (inc.severity === 'critical') return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-500/20';
    if (inc.severity === 'warning') return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-500/20';
    return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/20';
};
const incidentIconClass = (inc) => {
    if (inc.severity === 'critical') return 'text-red-500';
    if (inc.severity === 'warning') return 'text-yellow-500';
    return 'text-blue-500';
};
const incidentBadgeClass = (inc) => {
    if (inc.status === 'resolved') return 'bg-slate-200/70 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400';
    if (inc.severity === 'critical') return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-300';
    if (inc.severity === 'warning') return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
    return 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300';
};
const incidentStatusLabel = (inc) => {
    if (inc.status === 'resolved') return t('monitorDetail.incidentResolved');
    if (inc.status === 'scheduled') return t('monitorDetail.incidentScheduled');
    if (inc.severity === 'critical') return t('monitorDetail.incidentCritical');
    if (inc.severity === 'warning') return t('monitorDetail.incidentWarning');
    return t('monitorDetail.incidentInfo');
};

const fetchDetail = async () => {
    loading.value = true;
    notFound.value = false;
    try {
        const res = await withRetry(() => fetchT(`${API_BASE}/monitors/public/${monitorId.value}?range=${range.value}&limit=50`));
        if (res.status === 404) {
            notFound.value = true;
            monitor.value = null;
            return;
        }
        if (res.ok) {
            const data = await res.json();
            monitor.value = data.monitor;
            logs.value = data.logs || [];
            incidents.value = data.incidents || [];
            seriesCache[range.value] = data.latency_series || [];
            latencySeries.value = seriesCache[range.value];
        }
    } catch {
        loading.value = false;
    } finally {
        loading.value = false;
    }
};

const fetchSettings = async () => {
    try {
        const r = await fetchT(`${API_BASE}/settings`);
        if (r.ok) {
            const d = await r.json();
            siteSettings.value = d;
            if (d.site_title) document.title = `${d.site_title} — ${monitor.value?.name || ''}`;
        }
    } catch {}
};

const manualRefresh = async () => {
    refreshing.value = true;
    await fetchDetail();
    setTimeout(() => { refreshing.value = false; }, 700);
};

let _timer;
onMounted(() => {
    fetchDetail();
    fetchSettings();
    _timer = setInterval(() => { fetchDetail(); }, 30000);
});
onUnmounted(() => clearInterval(_timer));
</script>
