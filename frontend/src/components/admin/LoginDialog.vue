<template>
  <transition enter-active-class="transition duration-500 ease-out" enter-from-class="opacity-0 lg:scale-95 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"></div>
      
      <div class="relative w-full max-w-md rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-lg ring-1 ring-white/5" style="animation:modal-in 0.28s cubic-bezier(0.16, 1, 0.3, 1)">
        
        <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

        <div class="p-7 relative z-10">
          <div class="flex items-start gap-4 mb-7">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <i class="fas fa-lock text-lg text-emerald-400"></i>
            </div>
            <div class="min-w-0">
              <h2 class="text-2xl font-bold text-white tracking-tight">{{ $t('login.title') }}</h2>
              <p class="text-slate-400 text-sm mt-1">{{ $t('login.subtitle') }}</p>
            </div>
          </div>

          <div class="relative group mb-6">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <i class="fas fa-key text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-300 text-sm"></i>
            </div>
            <input type="password" v-model="inputPassword" @keyup.enter="doLogin"
              class="block w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-white/5 rounded-xl text-white placeholder-slate-600 text-sm font-medium outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-900/80 transition-all duration-300 shadow-inner"
              :placeholder="$t('login.passwordPlaceholder')" autocomplete="current-password">
            <p v-if="loginError" class="mt-2 text-xs text-red-400 text-left">{{ $t(loginError) }}</p>
          </div>

          <button @click="doLogin" :disabled="loggingIn"
            class="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-[0_0_18px_rgba(16,185,129,0.22)] active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            <i class="fas" :class="loggingIn ? 'fa-circle-notch fa-spin' : 'fa-arrow-right'"></i>
            {{ loggingIn ? $t('login.verifying') : $t('login.enter') }}
          </button>

          <div class="mt-5 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div class="rounded-lg border border-white/5 bg-slate-950/30 px-3 py-2">
              <i class="fas fa-shield-alt text-emerald-500/80 mr-1"></i>
              {{ $t('login.protectedArea') }}
            </div>
            <div class="rounded-lg border border-white/5 bg-slate-950/30 px-3 py-2">
              <i class="fas fa-clock text-slate-400 mr-1"></i>
              {{ $t('login.sessionLogin') }}
            </div>
          </div>
        </div>

        <div class="bg-slate-950/30 border-t border-white/5 px-8 py-4 flex justify-between items-center text-xs text-slate-500 font-medium relative z-10">
          <span class="flex items-center gap-1.5">
            <i class="fas fa-server text-slate-500 text-sm"></i>
            {{ $t('login.brand') }}
          </span>
          <router-link to="/" class="hover:text-emerald-400 transition-colors duration-300 flex items-center gap-1 group">
            {{ $t('login.backToStatus') }}
            <i class="fas fa-chevron-right text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
          </router-link>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { useAuth } from '../../composables/useAuth';
const emit = defineEmits(['login']);
const { inputPassword, loginError, loggingIn, login } = useAuth();
const doLogin = () => login(() => emit('login'));
</script>

<style scoped>
@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
