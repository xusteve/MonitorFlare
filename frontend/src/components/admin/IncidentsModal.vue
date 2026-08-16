<template>
  <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm admin-modal-overlay" @click="emit('close')"></div>

      <section class="relative w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col glass admin-modal rounded-2xl" style="animation:modal-in 0.25s ease-out">
        <header class="px-6 py-5 border-b border-white/5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center">
              <i class="fas fa-flag text-orange-400"></i>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">{{ $t('incidents.title') }}</h3>
              <p class="text-xs text-slate-500">{{ $t('incidents.subtitle') }}</p>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 sm:justify-end">
            <div class="flex items-center gap-2 text-xs text-slate-400">
              <span class="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20">{{ $t('incidents.active', { count: activeCount }) }}</span>
              <span class="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">{{ $t('incidents.maintenance', { count: maintenanceCount }) }}</span>
            </div>
            <button @click="emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer" :aria-label="$t('common.close')">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </header>

        <div class="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_360px]">
          <form @submit.prevent="create" class="min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-white/5">
            <section class="space-y-3">
              <div>
                <h4 class="text-sm font-semibold text-white">{{ $t('incidents.publish') }}</h4>
                <p class="text-xs text-slate-500 mt-1">{{ $t('incidents.publishHint') }}</p>
              </div>

              <div class="grid sm:grid-cols-2 gap-3">
                <button type="button" @click="form.type = 'incident'" class="text-left rounded-xl border px-4 py-3 transition cursor-pointer"
                  :class="[
                    form.type === 'incident'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                      : 'border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:border-orange-500/40'
                  ]">
                  <i class="fas fa-exclamation-triangle mb-2"></i>
                  <span class="block text-sm font-semibold">{{ $t('incidents.incidentType') }}</span>
                  <span class="block text-xs mt-1 opacity-80">{{ $t('incidents.incidentTypeDesc') }}</span>
                </button>
                <button type="button" @click="form.type = 'maintenance'" class="text-left rounded-xl border px-4 py-3 transition cursor-pointer"
                  :class="[
                    form.type === 'maintenance'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:border-cyan-500/40'
                  ]">
                  <i class="fas fa-wrench mb-2"></i>
                  <span class="block text-sm font-semibold">{{ $t('incidents.maintenanceType') }}</span>
                  <span class="block text-xs mt-1 opacity-80">{{ $t('incidents.maintenanceTypeDesc') }}</span>
                </button>
              </div>
            </section>

            <section class="grid gap-4">
              <label class="grid gap-2">
                <span class="text-sm font-medium text-slate-300">{{ form.type === 'maintenance' ? $t('incidents.maintenanceTitle') : $t('incidents.incidentTitle') }}</span>
                <input v-model.trim="form.title" :placeholder="form.type === 'maintenance' ? $t('incidents.maintenancePlaceholder') : $t('incidents.incidentPlaceholder')" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800 text-white outline-none focus:border-emerald-500">
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-slate-300">{{ $t('incidents.description') }} <span class="text-xs font-normal text-slate-500">{{ $t('common.optional') }}</span></span>
                <textarea v-model.trim="form.description" rows="4" :placeholder="$t('incidents.descriptionPlaceholder')" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800 text-white outline-none resize-none focus:border-emerald-500"></textarea>
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-slate-300">{{ $t('incidents.severity') }}</span>
                <select v-model="form.severity" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800 text-white outline-none focus:border-emerald-500">
                  <option value="info">{{ $t('incidents.info') }}</option>
                  <option value="warning">{{ $t('incidents.warning') }}</option>
                  <option value="critical">{{ $t('incidents.critical') }}</option>
                </select>
              </label>
            </section>

            <section v-if="form.type === 'maintenance'" class="space-y-4 rounded-xl border border-cyan-200 dark:border-cyan-500/20 bg-cyan-50/80 dark:bg-cyan-500/5 p-4">
              <div class="grid sm:grid-cols-2 gap-3">
                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('incidents.startTime') }}</span>
                  <input type="datetime-local" v-model="form.scheduled_start" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800 text-white outline-none focus:border-emerald-500">
                </label>
                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('incidents.endTime') }}</span>
                  <input type="datetime-local" v-model="form.scheduled_end" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800 text-white outline-none focus:border-emerald-500">
                </label>
              </div>

              <div>
                <div class="flex items-center justify-between gap-3 mb-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('incidents.affectedMonitors') }}</span>
                  <span class="text-xs text-slate-500">{{ $t('incidents.selected', { count: form.affected_ids.length }) }}</span>
                </div>
                <div v-if="props.monitors.length > 0" class="grid sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  <label v-for="m in props.monitors" :key="m.id" class="flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer text-sm transition"
                    :class="[
                      form.affected_ids.includes(m.id)
                        ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
                        : 'border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 hover:border-slate-500'
                    ]">
                    <input type="checkbox" :value="m.id" v-model="form.affected_ids" class="sr-only">
                    <span class="w-2 h-2 rounded-full shrink-0" :class="m.status === 'UP' ? 'bg-emerald-400' : 'bg-red-400'"></span>
                    <span class="truncate">{{ m.name }}</span>
                  </label>
                </div>
                <p v-else class="rounded-lg border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-3 py-3 text-sm text-slate-500">{{ $t('incidents.noMonitors') }}</p>
              </div>
            </section>

            <div class="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <button type="button" @click="resetForm" class="px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer">
                {{ $t('common.clear') }}
              </button>
              <button type="submit" :disabled="submitting" class="sm:ml-auto px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                :class="form.type === 'maintenance' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-orange-600 hover:bg-orange-500'">
                <i class="fas mr-1.5" :class="submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
                {{ submitting ? $t('incidents.publishing') : $t('incidents.publishBtn') }}
              </button>
            </div>
          </form>

          <aside class="min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/80 dark:bg-slate-950/20">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h4 class="text-sm font-semibold text-white">{{ $t('incidents.records') }}</h4>
                <p class="text-xs text-slate-500 mt-1">{{ $t('incidents.recent', { count: incidents.length }) }}</p>
              </div>
              <button @click="fetchIncidents" class="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer">
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
                {{ $t('common.refresh') }}
              </button>
            </div>

            <div v-if="loading && incidents.length === 0" class="space-y-3">
              <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 animate-pulse"></div>
            </div>

            <div v-else-if="incidents.length === 0" class="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/30 p-8 text-center">
              <i class="fas fa-flag text-2xl text-slate-600"></i>
              <p class="mt-3 text-sm font-semibold text-white">{{ $t('incidents.noRecords') }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ $t('incidents.noRecordsHint') }}</p>
            </div>

            <div v-else class="space-y-3">
              <article v-for="inc in incidents" :key="inc.id" class="rounded-xl border p-4 space-y-3"
                :class="incidentCardClass(inc)">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <i class="fas text-sm" :class="incidentIconClass(inc)"></i>
                      <span class="text-sm font-semibold text-white truncate">{{ inc.title }}</span>
                    </div>
                    <p v-if="inc.description" class="text-xs text-slate-400 mt-2 line-clamp-2">{{ inc.description }}</p>
                  </div>
                  <span class="shrink-0 text-[11px] px-2 py-1 rounded-full" :class="[
                    inc.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400'
                  ]">
                    {{ inc.status === 'active' ? $t('incidents.statusActive') : $t('incidents.statusResolved') }}
                  </span>
                </div>

                <dl class="grid gap-1.5 text-[11px] text-slate-500">
                  <div class="flex justify-between gap-3">
                    <dt>{{ $t('common.type') }}</dt>
                    <dd class="text-slate-300">{{ inc.type === 'maintenance' ? $t('incidents.maintenanceType') : severityLabel(inc.severity) }}</dd>
                  </div>
                  <div v-if="inc.type === 'maintenance'" class="flex justify-between gap-3">
                    <dt>{{ $t('incidents.window') }}</dt>
                    <dd class="text-right text-slate-300">{{ maintenanceWindow(inc) }}</dd>
                  </div>
                  <div v-if="inc.type === 'maintenance'" class="flex justify-between gap-3">
                    <dt>{{ $t('incidents.impact') }}</dt>
                    <dd class="text-right text-slate-300 truncate max-w-[190px]">{{ affectedLabel(inc) }}</dd>
                  </div>
                  <div class="flex justify-between gap-3">
                    <dt>{{ $t('incidents.publishTime') }}</dt>
                    <dd class="text-slate-300">{{ formatDateFull(inc.created_at) }}</dd>
                  </div>
                </dl>

                <div class="flex items-center justify-end gap-2">
                  <button v-if="inc.status === 'active'" @click="resolve(inc)" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer">
                    {{ $t('incidents.resolve') }}
                  </button>
                  <button @click="remove(inc)" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-300 hover:bg-red-500/20 transition cursor-pointer">
                    {{ $t('incidents.delete') }}
                  </button>
                </div>
              </article>
            </div>
          </aside>
        </div>
      </section>
    </div>
  </transition>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../../composables/useAuth';
import { useToast } from '../../composables/useToast';
import { API_BASE, fetchT } from '../../utils/api';
import { formatDateFull } from '../../utils/format';

const { t } = useI18n();
const props = defineProps({
    monitors: { type: Array, default: () => [] },
});
const emit = defineEmits(['close']);
const { storedToken } = useAuth();
const { addToast } = useToast();

const incidents = ref([]);
const loading = ref(false);
const submitting = ref(false);
const defaultForm = () => ({
    title: '',
    description: '',
    severity: 'info',
    type: 'incident',
    scheduled_start: '',
    scheduled_end: '',
    affected_ids: [],
});
const form = ref(defaultForm());

const activeCount = computed(() => incidents.value.filter(inc => inc.status === 'active').length);
const maintenanceCount = computed(() => incidents.value.filter(inc => inc.type === 'maintenance' && inc.status === 'active').length);

const authFetch = async (url, opts = {}) => fetchT(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${storedToken.value}` } });

const resetForm = () => {
    form.value = defaultForm();
};

const validateForm = () => {
    if (!form.value.title) {
        addToast(t('incidents.fillTitle'), 'error');
        return false;
    }
    if (form.value.type === 'maintenance') {
        if (!form.value.scheduled_start || !form.value.scheduled_end) {
            addToast(t('incidents.fillTime'), 'error');
            return false;
        }
        if (new Date(form.value.scheduled_end).getTime() <= new Date(form.value.scheduled_start).getTime()) {
            addToast(t('incidents.endAfterStart'), 'error');
            return false;
        }
        if (form.value.affected_ids.length === 0) {
            addToast(t('incidents.selectMonitors'), 'error');
            return false;
        }
    }
    return true;
};

const fetchIncidents = async () => {
    loading.value = true;
    try {
        const r = await authFetch(`${API_BASE}/incidents/all`);
        if (r.ok) incidents.value = await r.json();
    } catch {
        addToast(t('incidents.loadFailed'), 'error');
    } finally {
        loading.value = false;
    }
};

const create = async () => {
    if (!validateForm() || submitting.value) return;
    const payload = {
        title: form.value.title,
        description: form.value.description,
        severity: form.value.severity,
        type: form.value.type,
    };

    if (form.value.type === 'maintenance') {
        payload.scheduled_start = new Date(form.value.scheduled_start).toISOString();
        payload.scheduled_end = new Date(form.value.scheduled_end).toISOString();
        payload.affected_monitors = form.value.affected_ids.join(',');
    }

    submitting.value = true;
    try {
        const r = await authFetch(`${API_BASE}/incidents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (r.ok) {
            addToast(t('incidents.published'), 'success');
            resetForm();
            fetchIncidents();
        } else {
            addToast(t('incidents.publishFailed'), 'error');
        }
    } catch {
        addToast(t('common.networkError'), 'error');
    } finally {
        submitting.value = false;
    }
};

const resolve = async (inc) => {
    try {
        const r = await authFetch(`${API_BASE}/incidents/${inc.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'resolved' }),
        });
        if (r.ok) {
            addToast(t('incidents.resolved'), 'success');
            fetchIncidents();
        }
    } catch {
        addToast(t('common.actionFailed'), 'error');
    }
};

const remove = async (inc) => {
    if (!confirm(t('incidents.deleteConfirm', { title: inc.title }))) return;
    try {
        const r = await authFetch(`${API_BASE}/incidents/${inc.id}`, { method: 'DELETE' });
        if (r.ok) {
            addToast(t('incidents.deleted'), 'success');
            fetchIncidents();
        }
    } catch {
        addToast(t('common.deleteFailed'), 'error');
    }
};

const severityLabel = (severity) => ({ critical: t('incidents.severityCritical'), warning: t('incidents.severityWarning'), info: t('incidents.severityInfo') }[severity] || t('incidents.severityInfo'));

const incidentIconClass = (inc) => {
    if (inc.type === 'maintenance') return 'fa-wrench text-cyan-400';
    if (inc.severity === 'critical') return 'fa-exclamation-circle text-red-400';
    if (inc.severity === 'warning') return 'fa-exclamation-triangle text-yellow-400';
    return 'fa-info-circle text-blue-400';
};

const incidentCardClass = (inc) => {
    if (inc.status !== 'active') return 'border-slate-200 bg-white/70 opacity-75 dark:border-slate-700/50 dark:bg-slate-900/30';
    if (inc.type === 'maintenance') return 'border-cyan-200 bg-cyan-50/80 dark:border-cyan-500/25 dark:bg-cyan-500/5';
    if (inc.severity === 'critical') return 'border-red-200 bg-red-50/80 dark:border-red-500/25 dark:bg-red-500/5';
    if (inc.severity === 'warning') return 'border-yellow-200 bg-yellow-50/80 dark:border-yellow-500/25 dark:bg-yellow-500/5';
    return 'border-blue-200 bg-blue-50/80 dark:border-blue-500/25 dark:bg-blue-500/5';
};

const maintenanceWindow = (inc) => {
    if (!inc.scheduled_start || !inc.scheduled_end) return '-';
    return t('incidents.range', { start: formatDateFull(inc.scheduled_start), end: formatDateFull(inc.scheduled_end) });
};

const affectedLabel = (inc) => {
    if (!inc.affected_monitors) return t('incidents.unspecified');
    const ids = inc.affected_monitors.split(',').map(id => id.trim()).filter(Boolean);
    const names = ids.map(id => props.monitors.find(m => String(m.id) === id)?.name).filter(Boolean);
    return names.length > 0 ? names.join('、') : t('incidents.monitorCount', { count: ids.length });
};

fetchIncidents();
</script>
