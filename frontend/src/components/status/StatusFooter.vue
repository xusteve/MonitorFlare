<template>
  <footer class="border-t border-black/[0.06] dark:border-white/[0.04] py-8 mt-8">
    <div class="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-500">
      <div class="flex items-center gap-2">
        <div class="w-1 h-1 rounded-full bg-emerald-500/40"></div>
        <p>&copy; {{ new Date().getFullYear() }} <a :href="footerUrl" target="_blank" class="hover:text-slate-700 dark:hover:text-slate-400 transition-colors">{{ footerAuthor }}</a>. {{ $t('footer.allRightsReserved') }}</p>
      </div>
      <a href="https://csr.plus/monitorflare" target="_blank" rel="noopener"
        class="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <path d="M3 12h4l2-7 3 14 2-7h7"/>
        </svg>
        {{ $t('footer.poweredByText', { name: 'MonitorFlare' }) }}
      </a>
      <a href="https://github.com/nianshu2022/Uptime-Monitor" target="_blank" rel="noopener"
        class="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <path d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a1.05 1.05 0 01-1.35.276l-.693-.318a1.05 1.05 0 00-1.049.002l-.64.294a1.05 1.05 0 01-1.327-.315l-.507-.73a1.045 1.045 0 01.195-1.449l.72-.6a1.05 1.05 0 00.375-.83V3.03m0 0h.75m-7.5 2.25h2.25m-3 3h2.25M12 3.75v.75M8.25 9.75h6.75M19.5 3.75v5.25a.75.75 0 01-.75.75H15m6 5.25H5.25M21 3.75v14.25a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V3.75m18 0v0A2.25 2.25 0 0018.75 1.5H5.25A2.25 2.25 0 003 3.75m18 0v0"/>
        </svg>
        {{ $t('footer.credit') }}
      </a>
      <a href="https://github.com/xusteve/MonitorFlare" target="_blank" rel="noopener" :title="$t('footer.github')" :aria-label="$t('footer.github')"
        class="flex items-center text-[11px] text-slate-400 dark:text-slate-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
        <i class="fa-brands fa-github text-sm"></i>
      </a>
      <div class="flex items-center gap-5 font-mono">
        <button @click="$emit('refresh')" :disabled="loading" class="flex items-center gap-1.5 text-slate-500 dark:text-slate-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-40" :title="$t('footer.refresh')">
          <svg :class="{'refresh-spin': refreshing}" class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183"/></svg>
          {{ $t('footer.refresh') }}
        </button>
        <span class="flex items-center gap-1.5 text-slate-500 dark:text-slate-500">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"/></svg>
          {{ $t('footer.cloudflareEdge') }}
        </span>
        <router-link to="/admin" class="flex items-center gap-1.5 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"/></svg>
          {{ $t('footer.admin') }}
        </router-link>
      </div>
    </div>
  </footer>
</template>

<script setup>
defineProps({
    loading: Boolean,
    refreshing: Boolean,
});
defineEmits(['refresh']);

// 从 Vite 环境变量读取，回退默认值
const footerAuthor = import.meta.env.VITE_FOOTER_AUTHOR || 'MonitorFlare';
const footerUrl = import.meta.env.VITE_FOOTER_URL || '#';
</script>
