<template>
  <transition enter-active-class="transition duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm admin-modal-overlay" @click="emit('close')"></div>

      <section class="relative w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col glass admin-modal rounded-2xl" style="animation:modal-in 0.25s ease-out">
        <header class="px-6 py-5 border-b border-white/5 flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center">
              <i class="fas fa-cog text-indigo-400"></i>
            </div>
            <div>
              <h3 class="text-lg font-bold text-white">{{ $t('settings.title') }}</h3>
              <p class="text-xs text-slate-500">{{ $t('settings.subtitle') }}</p>
            </div>
          </div>
          <button @click="emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer" :aria-label="$t('common.close')">
            <i class="fas fa-times"></i>
          </button>
        </header>

        <form @submit.prevent="save" class="flex-1 min-h-0 flex flex-col">
          <div class="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_320px]">
            <div class="min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-white/5">
              <section class="space-y-4">
                <div>
                  <h4 class="text-sm font-semibold text-white">{{ $t('settings.statusPageInfo') }}</h4>
                  <p class="text-xs text-slate-500 mt-1">{{ $t('settings.statusPageInfoHint') }}</p>
                </div>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('settings.siteTitle') }}</span>
                  <input v-model.trim="settings.site_title" placeholder="Uptime Monitor" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none">
                </label>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('settings.siteDescription') }}</span>
                  <textarea v-model.trim="settings.site_description" rows="3" :placeholder="$t('settings.siteDescriptionPlaceholder')" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none resize-none"></textarea>
                </label>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('settings.logoUrl') }} <span class="text-xs font-normal text-slate-500">{{ $t('common.optional') }}</span></span>
                  <input v-model.trim="settings.site_logo_url" placeholder="https://example.com/logo.svg" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none">
                  <span class="text-xs text-slate-500">{{ $t('settings.logoUrlHint') }}</span>
                </label>
              </section>

              <section class="space-y-4">
                <div class="pt-2 border-t border-white/5">
                  <h4 class="text-sm font-semibold text-white mt-4">{{ $t('settings.accessControl') }}</h4>
                  <p class="text-xs text-slate-500 mt-1">{{ $t('settings.accessControlHint') }}</p>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button type="button" @click="settings.status_page_visibility = 'public'"
                    class="rounded-xl border px-4 py-3 text-left transition cursor-pointer"
                    :class="settings.status_page_visibility !== 'private' ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-600'">
                    <span class="flex items-center gap-2 text-sm font-semibold text-white">
                      <i class="fas fa-globe text-emerald-400"></i>
                      {{ $t('settings.visibilityPublic') }}
                    </span>
                    <span class="block text-xs text-slate-500 mt-1">{{ $t('settings.visibilityPublicHint') }}</span>
                  </button>
                  <button type="button" @click="settings.status_page_visibility = 'private'"
                    class="rounded-xl border px-4 py-3 text-left transition cursor-pointer"
                    :class="settings.status_page_visibility === 'private' ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-700 hover:border-slate-600'">
                    <span class="flex items-center gap-2 text-sm font-semibold text-white">
                      <i class="fas fa-lock text-emerald-400"></i>
                      {{ $t('settings.visibilityPrivate') }}
                    </span>
                    <span class="block text-xs text-slate-500 mt-1">{{ $t('settings.visibilityPrivateHint') }}</span>
                  </button>
                </div>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('settings.statusPassword') }} <span class="text-xs font-normal text-slate-500">{{ $t('settings.statusPasswordOptional') }}</span></span>
                  <input v-model.trim="statusPassword" type="password" autocomplete="new-password" :placeholder="$t('settings.statusPasswordPlaceholder')"
                    class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none">
                  <span class="text-xs text-slate-500">{{ $t('settings.statusPasswordHint') }}</span>
                </label>
              </section>

              <section class="space-y-4">
                <div class="pt-2 border-t border-white/5">
                  <h4 class="text-sm font-semibold text-white mt-4">{{ $t('settings.general') }}</h4>
                  <p class="text-xs text-slate-500 mt-1">{{ $t('settings.language') }} / {{ $t('settings.timezone') }}</p>
                </div>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('settings.language') }}</span>
                  <select v-model="settings.language" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none">
                    <option v-for="lang in languageOptions" :key="lang" :value="lang">{{ $t('languages.' + lang) }}</option>
                  </select>
                </label>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('settings.timezone') }}</span>
                  <select v-model="settings.timezone" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none">
                    <option v-for="tz in timezoneOptions" :key="tz.value" :value="tz.value">{{ $t('timezones.' + tz.key) }}</option>
                  </select>
                </label>
              </section>

              <section class="space-y-4">
                <div class="pt-2 border-t border-white/5">
                  <h4 class="text-sm font-semibold text-white mt-4">{{ $t('settings.alertTemplates') }}</h4>
                  <p class="text-xs text-slate-500 mt-1">{{ $t('settings.alertTemplatesHint') }}</p>
                </div>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('settings.alertTemplateDown') }}</span>
                  <textarea v-model.trim="settings.alert_template_down" rows="3" :placeholder="$t('settings.downTemplatePlaceholder')" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none resize-none"></textarea>
                </label>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('settings.alertTemplateUp') }}</span>
                  <textarea v-model.trim="settings.alert_template_up" rows="3" :placeholder="$t('settings.upTemplatePlaceholder')" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none resize-none"></textarea>
                </label>

                <label class="grid gap-2">
                  <span class="text-sm font-medium text-slate-300">{{ $t('settings.alertTemplateErrorRate') }}</span>
                  <textarea v-model.trim="settings.alert_template_error_rate" rows="3" :placeholder="$t('settings.errorRateTemplatePlaceholder')" class="w-full border border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-slate-800/80 text-white focus:border-emerald-500 outline-none resize-none"></textarea>
                </label>
              </section>
            </div>

            <aside class="min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/80 dark:bg-slate-950/20">
              <section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 p-4">
                <h4 class="text-sm font-semibold text-white">{{ $t('settings.scope') }}</h4>
                <ul class="mt-3 space-y-2 text-xs text-slate-400">
                  <li class="flex gap-2">
                    <i class="fas fa-desktop text-emerald-400 mt-0.5"></i>
                    <span>{{ $t('settings.scopeStatusPage') }}</span>
                  </li>
                  <li class="flex gap-2">
                    <i class="fas fa-bell text-emerald-400 mt-0.5"></i>
                    <span>{{ $t('settings.scopeTemplates') }}</span>
                  </li>
                  <li class="flex gap-2">
                    <i class="fas fa-file-import text-emerald-400 mt-0.5"></i>
                    <span>{{ $t('settings.scopeImport') }}</span>
                  </li>
                </ul>
              </section>

              <section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 p-4">
                <h4 class="text-sm font-semibold text-white">{{ $t('settings.variables') }}</h4>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span v-for="item in variables" :key="item" class="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950/40 px-2 py-1 text-xs font-mono text-slate-500 dark:text-slate-300">{{ item }}</span>
                </div>
              </section>

              <section class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 p-4 space-y-3">
                <div>
                  <h4 class="text-sm font-semibold text-white">{{ $t('settings.importTitle') }}</h4>
                  <p class="text-xs text-slate-500 mt-1">{{ $t('settings.importHint') }}</p>
                </div>

                <label class="flex items-center gap-3 rounded-xl border border-dashed border-slate-700 px-4 py-4 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition">
                  <span class="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <i class="fas" :class="importing ? 'fa-spinner fa-spin' : 'fa-upload'"></i>
                  </span>
                  <span class="min-w-0">
                    <span class="block text-sm font-semibold text-white">{{ importing ? $t('settings.importing') : $t('settings.chooseFile') }}</span>
                    <span class="block text-xs text-slate-500 truncate">{{ $t('settings.importBefore') }}</span>
                  </span>
                  <input type="file" accept=".json" @change="importMonitors" class="hidden" :disabled="importing">
                </label>
              </section>
            </aside>
          </div>

          <footer class="px-6 py-4 border-t border-white/5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/20">
            <p class="text-xs text-slate-500">{{ $t('settings.saveHint') }}</p>
            <div class="flex items-center justify-end gap-3">
              <button type="button" @click="emit('close')" class="px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" :disabled="saving" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                <i class="fas mr-1.5" :class="saving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                {{ saving ? $t('common.saving') : $t('settings.save') }}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../../composables/useAuth';
import { useToast } from '../../composables/useToast';
import { API_BASE, fetchT } from '../../utils/api';
import { setAppLanguage, setAppTimezone } from '../../main';

const { t } = useI18n();
const emit = defineEmits(['close', 'import-done']);
const { storedToken } = useAuth();
const { addToast } = useToast();

const sha256Hex = async (value) => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
};
const saving = ref(false);
const importing = ref(false);
const variables = ['{name}', '{url}', '{reason}', '{latency}', '{status}', '{error_rate}', '{threshold}', '{time}'];
const languageOptions = ['en', 'zh', 'zh-tw', 'ja', 'ko', 'de', 'fr', 'it', 'es'];
const timezoneOptions = [
    { value: 'UTC', key: 'utc' },
    { value: 'Asia/Shanghai', key: 'asiaShanghai' },
    { value: 'Asia/Tokyo', key: 'asiaTokyo' },
    { value: 'Asia/Seoul', key: 'asiaSeoul' },
    { value: 'Europe/Berlin', key: 'europeBerlin' },
    { value: 'Europe/Paris', key: 'europeParis' },
    { value: 'Europe/Rome', key: 'europeRome' },
    { value: 'Europe/Madrid', key: 'europeMadrid' },
    { value: 'America/New_York', key: 'americaNewYork' },
    { value: 'America/Los_Angeles', key: 'americaLosAngeles' },
    { value: 'Asia/Singapore', key: 'asiaSingapore' },
    { value: 'Asia/Kolkata', key: 'asiaKolkata' },
    { value: 'Australia/Sydney', key: 'australiaSydney' },
    { value: 'Europe/London', key: 'europeLondon' },
];
const settings = ref({
    site_title: 'Uptime Monitor',
    site_description: '',
    site_logo_url: '',
    alert_template_down: '',
    alert_template_up: '',
    alert_template_error_rate: '',
    language: 'en',
    timezone: 'UTC',
    status_page_visibility: 'public',
});
const statusPassword = ref('');

const authFetch = async (url, opts = {}) => fetchT(url, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${storedToken.value}` } });

const fetchSettings = async () => {
    try {
        const r = await fetchT(`${API_BASE}/settings`);
        if (r.ok) {
            const d = await r.json();
            settings.value = {
                site_title: d.site_title || 'Uptime Monitor',
                site_description: d.site_description || '',
                site_logo_url: d.site_logo_url || '',
                alert_template_down: d.alert_template_down || '',
                alert_template_up: d.alert_template_up || '',
                alert_template_error_rate: d.alert_template_error_rate || '',
                language: d.language || 'en',
                timezone: d.timezone || 'UTC',
                status_page_visibility: d.status_page_visibility === 'private' ? 'private' : 'public',
            };
            statusPassword.value = '';
        }
    } catch {
        addToast(t('settings.loadFailed'), 'error');
    }
};

const save = async () => {
    if (saving.value) return;
    if (settings.value.status_page_visibility === 'private' && !statusPassword.value) {
        addToast(t('settings.statusPasswordRequired'), 'error');
        return;
    }
    saving.value = true;
    try {
        const payload = { ...settings.value };
        if (statusPassword.value) payload.status_page_password = await sha256Hex(statusPassword.value);
        const r = await authFetch(`${API_BASE}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (r.ok) {
            addToast(t('settings.saved'), 'success');
            setAppLanguage(settings.value.language);
            setAppTimezone(settings.value.timezone);
            emit('close');
        } else {
            addToast(t('common.saveFailed'), 'error');
        }
    } catch {
        addToast(t('common.networkError'), 'error');
    } finally {
        saving.value = false;
    }
};

const importMonitors = async (e) => {
    const file = e.target.files[0];
    if (!file || importing.value) return;
    importing.value = true;
    try {
        const text = await file.text();
        const items = JSON.parse(text);
        if (!Array.isArray(items)) {
            addToast(t('settings.invalidFormat'), 'error');
            return;
        }

        let ok = 0;
        for (const item of items) {
            const r = await authFetch(`${API_BASE}/monitors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
            });
            if (r.ok) ok++;
        }
        addToast(t('settings.importResult', { ok, total: items.length }), 'success');
        emit('import-done');
        emit('close');
    } catch {
        addToast(t('settings.importFailed'), 'error');
    } finally {
        importing.value = false;
        e.target.value = '';
    }
};

fetchSettings();
</script>
