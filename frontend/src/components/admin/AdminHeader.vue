<template>
  <header class="sticky top-0 z-40 border-b border-slate-200 dark:border-white/5"
    :style="isDark ? 'background:rgba(15,23,42,0.85);backdrop-filter:blur(16px)' : 'background:rgba(255,255,255,0.85);backdrop-filter:blur(16px)'">
    <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <img src="/logo.svg" alt="MonitorFlare" class="w-6 h-6 rounded-md object-contain">
        <span class="font-semibold text-slate-900 dark:text-white tracking-tight">MonitorFlare<span class="text-green-500">.</span>admin</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span v-if="lastRefreshed" class="hidden md:inline text-[10px] font-mono text-slate-400 dark:text-slate-600 mr-1">{{ lastRefreshed }}</span>
        <router-link to="/" class="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-500 hover:bg-green-500/10 transition-colors text-sm" :title="$t('adminHeader.statusPage')">
          <i class="fas fa-external-link-alt"></i>
        </router-link>
        <button @click="$emit('refresh')" class="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-500 hover:bg-green-500/10 transition-colors text-sm" :class="{ 'animate-spin': loading }" :title="$t('adminHeader.refresh')">
          <i class="fas fa-sync-alt"></i>
        </button>
        <!-- 语言切换 -->
        <div class="relative">
          <button @click="langOpen = !langOpen" class="flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all cursor-pointer" :title="$t('adminHeader.language')">
            <i class="fas fa-globe text-[11px]"></i>
            <span class="hidden sm:inline">{{ $t('languages.' + locale) }}</span>
            <i class="fas fa-chevron-down text-[8px]"></i>
          </button>
          <div v-if="langOpen" class="absolute right-0 mt-1.5 w-40 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50">
            <button v-for="l in langList" :key="l" @click="changeLang(l)"
              class="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] cursor-pointer"
              :class="{ 'font-bold text-green-600 dark:text-emerald-400': l === locale }">
              {{ $t('languages.' + l) }}
              <i v-if="l === locale" class="fas fa-check text-[9px]"></i>
            </button>
          </div>
        </div>
        <button @click="$emit('toggle-theme')" class="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-colors text-sm cursor-pointer">
          <i :class="isDark ? 'fas fa-sun' : 'fas fa-moon'"></i>
        </button>
        <div class="h-4 w-px bg-slate-200 dark:bg-white/10 mx-0.5"></div>
        <button @click="$emit('logout')" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
          <i class="fas fa-sign-out-alt"></i>
          <span class="hidden sm:inline">{{ $t('adminHeader.logout') }}</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { setAppLanguage } from '../../main';

defineProps({ isDark: Boolean, loading: Boolean, lastRefreshed: String });
defineEmits(['toggle-theme', 'refresh', 'logout']);

const { locale } = useI18n();
const langOpen = ref(false);
const langList = ['en', 'zh', 'zh-tw', 'ja', 'ko', 'de', 'fr', 'it', 'es'];

const changeLang = (l) => {
    setAppLanguage(l);
    locale.value = l;
    langOpen.value = false;
};
</script>
