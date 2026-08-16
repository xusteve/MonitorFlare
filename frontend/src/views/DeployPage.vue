<template>
  <div class="min-h-screen flex flex-col text-slate-800 dark:text-slate-200 grid-bg">
    <!-- 简易顶栏 -->
    <header class="sticky top-0 z-40 border-b border-black/[0.06] dark:border-white/[0.04]"
      :style="isDark ? 'background:rgba(3,7,18,0.8);backdrop-filter:blur(24px)' : 'background:rgba(255,255,255,0.8);backdrop-filter:blur(24px)'">
      <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
            <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <path d="M3 12h4l2-7 3 14 2-7h7"/>
            </svg>
          </div>
          <span class="font-bold text-slate-900 dark:text-white tracking-tight">MonitorFlare</span>
        </router-link>
        <div class="flex items-center gap-3">
          <a href="https://monitorflare.csr.plus/" target="_blank" rel="noopener"
            class="text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-500 transition-colors">{{ $t('deployPage.docs') }}</a>
          <button @click="toggleTheme" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-all cursor-pointer">
            <i :class="isDark ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm'"></i>
          </button>
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-5xl w-full mx-auto px-6 py-14">
      <!-- Hero -->
      <div class="text-center mb-12 fade-up">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/25 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <svg class="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M3 12h4l2-7 3 14 2-7h7"/>
          </svg>
        </div>
        <h1 class="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">{{ $t('deployPage.title') }}</h1>
        <p class="text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-8">{{ $t('deployPage.subtitle') }}</p>

        <!-- CTA -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a v-if="deployApiUrl" :href="`${deployApiUrl}/deploy/start`"
            class="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
              <path d="M3 12h4l2-7 3 14 2-7h7"/>
            </svg>
            {{ $t('deployPage.ctaAuthorize') }}
          </a>
          <a :href="deployButtonUrl" target="_blank" rel="noopener"
            class="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all">
            <i class="fas fa-cloud-arrow-up"></i>
            {{ $t('deployPage.ctaGithub') }}
          </a>
        </div>
        <p class="text-xs text-slate-400 dark:text-slate-600 mt-4 font-mono">{{ $t('deployPage.freeHint') }}</p>
      </div>

      <!-- 三步说明 -->
      <div class="grid md:grid-cols-3 gap-4 mb-14 fade-up-d1">
        <div v-for="(s, i) in steps" :key="i" class="glass rounded-2xl p-5 border border-slate-200 dark:border-white/[0.06]">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-sm mb-3">{{ i + 1 }}</div>
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{{ $t(s.titleKey) }}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">{{ $t(s.descKey) }}</p>
        </div>
      </div>

      <!-- 功能亮点 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 fade-up-d2">
        <div v-for="(f, i) in features" :key="i" class="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.02] px-4 py-3.5 flex items-center gap-2.5">
          <i :class="`fas ${f.icon} text-emerald-500 text-sm`"></i>
          <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">{{ $t(f.textKey) }}</span>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-black/[0.06] dark:border-white/[0.04] py-6">
      <div class="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-600">
        <p>&copy; {{ new Date().getFullYear() }} MonitorFlare. {{ $t('deployPage.openSource') }}</p>
        <a href="https://monitorflare.csr.plus/" target="_blank" rel="noopener"
          class="flex items-center gap-1.5 text-slate-400 dark:text-slate-600 hover:text-emerald-500 transition-colors">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M3 12h4l2-7 3 14 2-7h7"/>
          </svg>
          {{ $t('footer.poweredByText', { name: 'MonitorFlare' }) }}
        </a>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useTheme } from '../composables/useTheme';

const { isDark, toggleTheme } = useTheme('theme');

// 官方 Deploy to Cloudflare 按钮(指向 GitHub 仓库,发布前替换为真实地址)
const deployButtonUrl = import.meta.env.VITE_DEPLOY_GITHUB_URL || 'https://deploy.workers.cloudflare.com/?url=https://github.com/yourname/monitorflare';
// Cloudflare OAuth 部署服务地址(可选,配置后显示"授权部署"主按钮)
const deployApiUrl = import.meta.env.VITE_DEPLOY_API_URL || '';

const steps = [
  { titleKey: 'deployPage.step1Title', descKey: 'deployPage.step1Desc' },
  { titleKey: 'deployPage.step2Title', descKey: 'deployPage.step2Desc' },
  { titleKey: 'deployPage.step3Title', descKey: 'deployPage.step3Desc' },
];

const features = [
  { icon: 'fa-server', textKey: 'deployPage.featZero' },
  { icon: 'fa-bolt', textKey: 'deployPage.featAuto' },
  { icon: 'fa-language', textKey: 'deployPage.featLang' },
  { icon: 'fa-mobile-screen', textKey: 'deployPage.featPwa' },
];
</script>
