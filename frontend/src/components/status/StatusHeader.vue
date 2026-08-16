<template>
  <header class="sticky top-0 z-40 border-b border-black/[0.06] dark:border-white/[0.04] transition-colors duration-300"
    :style="isDark ? 'background:rgba(3,7,18,0.8);backdrop-filter:blur(24px) saturate(1.5)' : 'background:rgba(255,255,255,0.8);backdrop-filter:blur(24px) saturate(1.5)'">
    <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-3 group">
        <div class="relative">
          <img v-if="siteSettings.site_logo_url" :src="siteSettings.site_logo_url" alt="Logo" class="w-8 h-8 rounded-lg object-contain transition-opacity group-hover:opacity-80" @error="siteSettings.site_logo_url = '/logo.svg'">
          <img v-else src="/logo.svg" alt="Logo" class="w-8 h-8 rounded-lg object-contain transition-opacity group-hover:opacity-80">
        </div>
        <div>
          <span class="font-bold text-slate-900 dark:text-white tracking-tight text-[15px] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{{ siteSettings.site_title || 'MonitorFlare' }}</span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 font-mono -mt-0.5 tracking-wider truncate max-w-[200px]">{{ siteSettings.site_description || $t('statusHeader.statusPage') }}</p>
        </div>
      </router-link>
      <div class="flex items-center gap-4">
        <!-- LIVE 指示 -->
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs">
          <div class="relative">
            <span v-if="!loading" class="w-1.5 h-1.5 rounded-full bg-emerald-400 block"></span>
            <span v-if="!loading" class="pulse-ring bg-emerald-400/30 block"></span>
            <svg v-else class="w-3 h-3 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
          <span class="font-mono text-slate-500 dark:text-slate-400">{{ loading ? $t('statusHeader.syncing') : $t('statusHeader.live') }}</span>
        </div>
        <!-- 语言切换 -->
        <div class="relative">
          <button @click="langOpen = !langOpen" class="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all cursor-pointer">
            <i class="fas fa-globe text-[11px]"></i>
            <span>{{ $t('languages.' + locale) }}</span>
            <i class="fas fa-chevron-down text-[8px]"></i>
          </button>
          <div v-if="langOpen" class="absolute right-0 mt-1.5 w-40 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl overflow-hidden z-50">
            <button v-for="l in langList" :key="l" @click="changeLang(l)"
              class="w-full flex items-center justify-between px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] cursor-pointer"
              :class="{ 'font-bold text-emerald-600 dark:text-emerald-400': l === locale }">
              {{ $t('languages.' + l) }}
              <i v-if="l === locale" class="fas fa-check text-[9px]"></i>
            </button>
          </div>
        </div>
        <!-- 主题切换 -->
        <button @click="$emit('toggle-theme')" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all duration-300 cursor-pointer">
          <svg v-if="isDark" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
          </svg>
        </button>
        <!-- 管理后台 -->
        <router-link to="/admin" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all duration-300" :title="$t('statusHeader.admin')">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"/>
          </svg>
        </router-link>
        <!-- GitHub 链接 -->
        <a href="https://github.com/xusteve/MonitorFlare" target="_blank" rel="noopener" :title="$t('footer.github')" :aria-label="$t('footer.github')"
          class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all duration-300">
          <i class="fa-brands fa-github text-[15px]"></i>
        </a>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { setAppLanguage } from '../../main';

defineProps({
    loading: Boolean,
    isDark: Boolean,
    siteSettings: Object,
});
defineEmits(['toggle-theme']);

const { locale } = useI18n();
const langOpen = ref(false);
const langList = ['en', 'zh', 'zh-tw', 'ja', 'ko', 'de', 'fr', 'it', 'es'];

const changeLang = (l) => {
    setAppLanguage(l);
    locale.value = l;
    langOpen.value = false;
};
</script>
