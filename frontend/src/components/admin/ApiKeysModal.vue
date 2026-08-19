<template>
  <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm admin-modal-overlay" @click="emit('close')"></div>

      <section class="relative w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col glass admin-modal rounded-2xl" style="animation:modal-in 0.25s ease-out">
        <header class="px-6 py-5 border-b border-white/5 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
              <i class="fas fa-key text-emerald-400"></i>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">{{ $t('apiKeys.title') }}</h3>
              <p class="text-xs text-slate-500">{{ $t('apiKeys.subtitle') }}</p>
            </div>
          </div>
          <button @click="emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer" :aria-label="$t('common.close')">
            <i class="fas fa-times"></i>
          </button>
        </header>

        <div class="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6">
          <!-- 创建 key -->
          <section class="space-y-3">
            <h4 class="text-sm font-semibold text-white">{{ $t('apiKeys.createTitle') }}</h4>
            <div class="flex gap-2">
              <input v-model.trim="newKeyName" :placeholder="$t('apiKeys.namePlaceholder')"
                class="flex-1 border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none">
              <button @click="createKey" :disabled="creating || !newKeyName"
                class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2">
                <i class="fas" :class="creating ? 'fa-spinner fa-spin' : 'fa-plus'"></i>
                {{ $t('apiKeys.create') }}
              </button>
            </div>

            <!-- 新建 key 明文展示(仅一次) -->
            <div v-if="newKey" class="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <p class="text-xs font-semibold text-emerald-400">{{ $t('apiKeys.keyCreatedOnce') }}</p>
              <div class="flex items-center gap-2">
                <code class="flex-1 font-mono text-sm text-emerald-300 bg-slate-950/50 rounded-lg px-3 py-2 break-all">{{ newKey }}</code>
                <button @click="copyNewKey" class="px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold transition cursor-pointer" :title="$t('apiKeys.copy')">
                  <i class="fas" :class="copied ? 'fa-check' : 'fa-copy'"></i>
                </button>
              </div>
              <p class="text-[11px] text-slate-500">{{ $t('apiKeys.keyCreatedHint') }}</p>
            </div>
          </section>

          <!-- 现有 key 列表 -->
          <section class="space-y-3">
            <h4 class="text-sm font-semibold text-white">{{ $t('apiKeys.listTitle') }}</h4>
            <div v-if="keys.length === 0" class="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl">
              {{ $t('apiKeys.noKeys') }}
            </div>
            <div v-else class="space-y-2">
              <div v-for="k in keys" :key="k.id" class="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-white truncate">{{ k.name }}</p>
                  <p class="text-[11px] font-mono text-slate-500 mt-0.5">
                    {{ $t('apiKeys.createdAt', { time: formatDate(k.created_at) }) }}
                    <template v-if="k.last_used_at"> · {{ $t('apiKeys.lastUsed', { time: formatDate(k.last_used_at) }) }}</template>
                  </p>
                </div>
                <button @click="deleteKey(k)" :disabled="deletingId === k.id" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition cursor-pointer disabled:opacity-60">
                  <i class="fas" :class="deletingId === k.id ? 'fa-spinner fa-spin' : 'fa-trash-alt'"></i>
                  {{ $t('apiKeys.delete') }}
                </button>
              </div>
            </div>
          </section>

          <!-- 用法示例 -->
          <section class="space-y-3">
            <h4 class="text-sm font-semibold text-white">{{ $t('apiKeys.usageTitle') }}</h4>
            <p class="text-xs text-slate-500">{{ $t('apiKeys.usageHint') }}</p>
            <div class="rounded-xl bg-slate-950/60 border border-slate-800 p-4 overflow-x-auto">
              <pre class="text-[11px] font-mono text-slate-300 leading-relaxed">{{ usageExample }}</pre>
            </div>
          </section>
        </div>
      </section>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../../composables/useAuth';
import { useToast } from '../../composables/useToast';
import { API_BASE, fetchT } from '../../utils/api';
import { formatDate } from '../../utils/format';

const { t } = useI18n();
const emit = defineEmits(['close']);
const { storedToken } = useAuth();
const { addToast } = useToast();

const keys = ref([]);
const newKeyName = ref('');
const newKey = ref('');
const creating = ref(false);
const deletingId = ref(null);
const copied = ref(false);

const authFetch = async (url, opts = {}) => fetchT(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${storedToken.value}` } });

const usageExample = computed(() => {
    const o = location.origin;
    return `# ${t('apiKeys.usageComment1')}
curl -H "Authorization: Bearer ut_your_key" \\
  ${o}/api/v1/monitors

# ${t('apiKeys.usageComment2')}
curl -H "Authorization: Bearer ut_your_key" \\
  "${o}/api/v1/logs?monitor_id=1&limit=100&offset=0&since=2026-01-01"

# ${t('apiKeys.usageComment3')}
curl -H "Authorization: Bearer ut_your_key" ${o}/api/v1/incidents

# ${t('apiKeys.usageComment4')}
curl -H "Authorization: Bearer ut_your_key" "${o}/api/v1/uptime?days=90"

# ${t('apiKeys.usageComment5')}
curl -H "Authorization: Bearer ut_your_key" ${o}/api/v1/export`;
});

const fetchKeys = async () => {
    try {
        const r = await authFetch(`${API_BASE}/api-keys`);
        if (r.ok) keys.value = await r.json();
    } catch {}
};

const createKey = async () => {
    if (!newKeyName.value || creating.value) return;
    creating.value = true;
    try {
        const r = await authFetch(`${API_BASE}/api-keys`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newKeyName.value }),
        });
        if (r.ok) {
            const d = await r.json();
            newKey.value = d.key || '';
            newKeyName.value = '';
            copied.value = false;
            await fetchKeys();
            addToast(t('apiKeys.created'), 'success');
        } else {
            addToast(t('common.actionFailed'), 'error');
        }
    } catch {
        addToast(t('common.networkError'), 'error');
    } finally {
        creating.value = false;
    }
};

const copyNewKey = async () => {
    try {
        await navigator.clipboard.writeText(newKey.value);
        copied.value = true;
        addToast(t('apiKeys.copied'), 'success');
        setTimeout(() => { copied.value = false; }, 2000);
    } catch {
        addToast(t('apiKeys.copyFailed'), 'error');
    }
};

const deleteKey = async (k) => {
    if (deletingId.value) return;
    deletingId.value = k.id;
    try {
        const r = await authFetch(`${API_BASE}/api-keys/${k.id}`, { method: 'DELETE' });
        if (r.ok) {
            keys.value = keys.value.filter(x => x.id !== k.id);
            addToast(t('apiKeys.deleted'), 'success');
        } else {
            addToast(t('common.actionFailed'), 'error');
        }
    } catch {
        addToast(t('common.networkError'), 'error');
    } finally {
        deletingId.value = null;
    }
};

onMounted(fetchKeys);
</script>
