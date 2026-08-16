<template>
  <div class="min-h-screen flex flex-col text-slate-800 dark:text-slate-200 grid-bg">
    <StatusHeader :loading="loading" :isDark="isDark" :siteSettings="siteSettings" @toggle-theme="toggleTheme" />

    <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
      <!-- 英雄状态区 -->
      <HeroBanner v-if="monitors.length > 0" :monitors="monitors" :activeMonitors="activeMonitors"
        :allUp="allUp" :hasRetrying="hasRetrying" :hasDown="hasDown" :avgLatency="avgLatency" :error="error"
        @retry="fetchMonitors" />

      <!-- 加载占位 -->
      <div v-if="loading && monitors.length === 0" class="space-y-3 fade-up-d2">
        <div v-for="i in 4" :key="i" class="glass rounded-2xl h-20 animate-pulse"></div>
      </div>

      <!-- 无监控项 -->
      <div v-else-if="!loading && monitors.length === 0" class="text-center py-24 glass rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.06] fade-up-d2">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"/>
          </svg>
        </div>
        <p class="text-slate-400 dark:text-slate-600 font-mono text-sm tracking-widest">{{ $t('statusPage.noMonitorsConfigured') }}</p>
      </div>

      <!-- 事件公告 -->
      <div v-if="incidents.length > 0" class="mb-6 space-y-2 fade-up">
        <div v-for="inc in incidents" :key="inc.id"
          class="rounded-2xl px-5 py-4 border flex items-start gap-4"
          :class="{
            'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-500/20': inc.severity === 'critical',
            'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-500/20': inc.severity === 'warning',
            'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/20': inc.severity === 'info'
          }">
          <i class="fas text-lg mt-0.5" :class="{
            'fa-exclamation-circle text-red-500': inc.severity === 'critical',
            'fa-exclamation-triangle text-yellow-500': inc.severity === 'warning',
            'fa-info-circle text-blue-500': inc.severity === 'info'
          }"></i>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm text-slate-900 dark:text-white">{{ inc.title }}</p>
            <p v-if="inc.description" class="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{{ inc.description }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">{{ formatDate(inc.created_at) }}</p>
          </div>
        </div>
      </div>

      <!-- 监控列表 -->
      <div v-if="monitors.length > 0" class="fade-up-d1">
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-3">
            <div class="w-1 h-5 rounded-full bg-emerald-500"></div>
            <h2 class="text-sm font-bold text-slate-600 dark:text-slate-400">{{ $t('statusPage.serviceStatus') }}</h2>
          </div>
          <div class="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-600">
            <span class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
              {{ $t('statusPage.activeMonitors', { count: activeMonitors.length }) }}
            </span>
            <span v-if="lastUpdated" class="text-slate-400 dark:text-slate-500">·</span>
            <span v-if="lastUpdated" class="text-slate-400 dark:text-slate-500">{{ lastUpdated }}</span>
          </div>
        </div>

        <div class="space-y-6">
          <section v-for="section in monitorSections" :key="section.name" class="space-y-3">
            <div v-if="monitorSections.length > 1" class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-500 dark:text-slate-500 flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {{ section.name }}
              </h3>
              <span class="text-[11px] font-mono text-slate-400 dark:text-slate-600">{{ $t('statusPage.items', { count: section.items.length }) }}</span>
            </div>
            <MonitorCard v-for="(m, idx) in section.items" :key="m.id" :monitor="m" :index="idx" />
          </section>
        </div>
      </div>

      <!-- 订阅 / RSS -->
      <div v-if="monitors.length > 0" class="mt-10 fade-up-d3">
        <div class="glass rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <i class="fas fa-envelope-open-text text-emerald-500"></i>
              {{ $t('statusPage.subscribe') }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-500 mt-1">{{ $t('statusPage.subscribeHint') }}</p>
          </div>
          <form class="flex w-full sm:w-auto gap-2" @submit.prevent="subscribe">
            <input v-model="subEmail" type="email" :placeholder="$t('statusPage.emailPlaceholder')"
              class="flex-1 sm:w-64 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 px-4 py-2.5 text-sm text-slate-800 dark:text-white outline-none focus:border-emerald-500/60 placeholder-slate-400 dark:placeholder-slate-600">
            <button type="submit" :disabled="subscribing"
              class="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 transition-colors disabled:opacity-60 cursor-pointer">
              <i class="fas" :class="subscribing ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'"></i>
            </button>
          </form>
        </div>
        <div class="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-600">
          <span v-if="subMsg" :class="subOk ? 'text-emerald-500' : 'text-red-500'">{{ subMsg }}</span>
          <a :href="`${API_BASE}/feed.xml`" target="_blank" class="flex items-center gap-1.5 hover:text-emerald-500 transition-colors">
            <i class="fas fa-rss text-orange-500"></i> {{ $t('statusPage.rssFeed') }}
          </a>
        </div>
      </div>
    </main>

    <StatusFooter :loading="loading" :refreshing="refreshing" @refresh="manualRefresh" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTheme } from '../composables/useTheme';
import { API_BASE, fetchT, withRetry } from '../utils/api';
import { formatDate } from '../utils/format';
import { getAppTimezone } from '../main';

import StatusHeader from '../components/status/StatusHeader.vue';
import HeroBanner from '../components/status/HeroBanner.vue';
import MonitorCard from '../components/status/MonitorCard.vue';
import StatusFooter from '../components/status/StatusFooter.vue';

const { t } = useI18n();
const { isDark, toggleTheme } = useTheme('theme');

const monitors = ref([]);
const loading = ref(false);
const error = ref(null);
const lastUpdated = ref('');
const refreshing = ref(false);
const incidents = ref([]);
const siteSettings = ref({ site_title: 'MonitorFlare', site_description: '', site_logo_url: '' });
const subEmail = ref('');
const subMsg = ref('');
const subOk = ref(false);
const subscribing = ref(false);

const activeMonitors = computed(() => monitors.value.filter(m => m.paused !== 1 && m.status !== 'PAUSED'));
const allUp = computed(() => activeMonitors.value.length > 0 && activeMonitors.value.every(m => m.status === 'UP'));
const hasRetrying = computed(() => activeMonitors.value.some(m => m.status === 'RETRYING'));
const hasDown = computed(() => activeMonitors.value.some(m => m.status === 'DOWN'));
const avgLatency = computed(() => {
    const active = activeMonitors.value.filter(m => m.latency != null);
    if (active.length === 0) return null;
    return Math.round(active.reduce((sum, m) => sum + m.latency, 0) / active.length);
});
const monitorSections = computed(() => {
    const groups = new Map();
    for (const monitor of monitors.value) {
        const tag = (monitor.tags || '').split(',').map(x => x.trim()).filter(Boolean)[0] || t('statusPage.ungrouped');
        if (!groups.has(tag)) groups.set(tag, []);
        groups.get(tag).push(monitor);
    }
    return [...groups.entries()].map(([name, items]) => ({ name, items }));
});

const fetchMonitors = async () => {
    loading.value = true;
    error.value = null;
    try {
        const res = await withRetry(() => fetchT(`${API_BASE}/monitors/public/details`));
        if (res.ok) {
            const data = await res.json();
            monitors.value = data.monitors || [];
            lastUpdated.value = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: getAppTimezone() });
        } else {
            let errorMsg = t('statusPage.serverError', { status: res.status });
            try { const d = await res.json(); if (d?.error) errorMsg = t('statusPage.apiError', { error: d.error }); } catch {}
            error.value = errorMsg;
        }
    } catch {
        error.value = t('statusPage.connectionTimeout');
    } finally {
        loading.value = false;
    }
};

const manualRefresh = async () => {
    refreshing.value = true;
    await fetchMonitors();
    setTimeout(() => { refreshing.value = false; }, 700);
};

const fetchIncidents = async () => {
    try {
        const r = await withRetry(() => fetchT(`${API_BASE}/incidents`));
        if (r.ok) incidents.value = await r.json();
    } catch {}
};

const fetchSettings = async () => {
    try {
        const r = await fetchT(`${API_BASE}/settings`);
        if (r.ok) {
            const d = await r.json();
            siteSettings.value = d;
            if (d.site_title) document.title = d.site_title;
            const meta = document.querySelector('meta[name=description]');
            if (meta && d.site_description) meta.content = d.site_description;
        }
    } catch {}
};

const subscribe = async () => {
    if (!subEmail.value || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(subEmail.value)) {
        subOk.value = false;
        subMsg.value = t('statusPage.invalidEmail');
        return;
    }
    subscribing.value = true;
    try {
        const r = await fetchT(`${API_BASE}/api/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: subEmail.value }),
        });
        subOk.value = r.ok;
        subMsg.value = r.ok ? t('statusPage.subscribed') : t('common.actionFailed');
        if (r.ok) subEmail.value = '';
    } catch {
        subOk.value = false;
        subMsg.value = t('common.networkError');
    } finally {
        subscribing.value = false;
    }
};

let _timer;
onMounted(() => {
    fetchMonitors();
    fetchIncidents();
    fetchSettings();
    _timer = setInterval(fetchMonitors, 30000);
});
onUnmounted(() => clearInterval(_timer));
</script>
