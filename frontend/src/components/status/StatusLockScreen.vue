<template>
  <div class="min-h-[60vh] flex items-center justify-center py-16">
    <div class="w-full max-w-md mx-auto">
      <div class="glass rounded-2xl px-8 py-10 text-center fade-up">
        <div class="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
          <svg class="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
          </svg>
        </div>

        <h1 class="text-xl font-bold text-slate-900 dark:text-white mb-1">{{ title }}</h1>
        <p class="text-sm text-slate-500 dark:text-slate-500 mb-6">{{ $t('statusLock.hint') }}</p>

        <form @submit.prevent="submit" class="space-y-3">
          <input v-model="password" type="password" :placeholder="$t('statusLock.passwordPlaceholder')" autocomplete="current-password"
            class="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 px-4 py-3 text-sm text-slate-800 dark:text-white outline-none focus:border-emerald-500/60 placeholder-slate-400 dark:placeholder-slate-600">
          <button type="submit" :disabled="loggingIn"
            class="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-3 transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
            <svg v-if="loggingIn" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            {{ loggingIn ? $t('statusLock.loggingIn') : $t('statusLock.login') }}
          </button>
        </form>

        <p v-if="error" class="mt-3 text-xs text-red-500 dark:text-red-400">{{ errorText }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { statusLogin } from '../../utils/api';

const props = defineProps({
    title: { type: String, default: 'MonitorFlare' },
});
const emit = defineEmits(['unlocked']);

const { t } = useI18n();
const password = ref('');
const loggingIn = ref(false);
const errorKey = ref('');

const errorText = computed(() => errorKey.value ? t(errorKey.value) : '');

const submit = async () => {
    if (!password.value || loggingIn.value) return;
    loggingIn.value = true;
    errorKey.value = '';
    try {
        const r = await statusLogin(password.value);
        if (r.ok) {
            password.value = '';
            emit('unlocked');
        } else {
            errorKey.value = r.error;
        }
    } catch {
        errorKey.value = 'statusLock.requestFailed';
    } finally {
        loggingIn.value = false;
    }
};
</script>
