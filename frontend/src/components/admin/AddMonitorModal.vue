<template>
  <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm admin-modal-overlay" @click="$emit('close')"></div>
      <div class="relative w-full max-w-2xl glass admin-modal rounded-2xl shadow-2xl flex flex-col overflow-hidden" style="animation:modal-in 0.25s ease-out">
        <!-- 头部 -->
        <div class="px-8 py-5 border-b border-white/5 bg-gradient-to-r from-green-900/15 to-transparent">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-green-500/15 rounded-xl flex items-center justify-center"><i class="fas fa-satellite-dish text-green-400"></i></div>
              <div><h3 class="text-lg font-bold text-white">{{ $t('monitorForm.title') }}</h3><p class="text-xs text-slate-500 mt-0.5">{{ $t('monitorForm.subtitle') }}</p></div>
            </div>
            <button @click="$emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"><i class="fas fa-times text-lg"></i></button>
          </div>
        </div>
        <!-- 表单 -->
        <div class="px-8 py-6 space-y-6 overflow-y-auto max-h-[65vh]">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><i class="fas fa-info-circle text-green-500"></i> {{ $t('configModal.basicInfo') }}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.name') }} <span class="text-red-400">*</span></label>
                <input v-model="newMonitor.name" :placeholder="$t('monitorForm.namePlaceholder')" autofocus class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none placeholder-slate-600">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.url') }} <span class="text-red-400">*</span></label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500"><i class="fas fa-link text-xs"></i></span>
                  <input v-model="newMonitor.url" :placeholder="$t('monitorForm.urlPlaceholder')" @keyup.enter="$emit('submit')" class="input-field w-full border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none font-mono placeholder-slate-600">
                </div>
              </div>
            </div>
          </div>
          <!-- 监控类型 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><i class="fas fa-cubes text-green-500"></i> {{ $t('monitorForm.type') }}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label v-for="tp in monitorTypes" :key="tp.value"
                class="flex flex-col items-center justify-center py-3 rounded-xl border-2 cursor-pointer transition-all text-center"
                :class="newMonitor.type === tp.value ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-slate-700 text-slate-400 hover:border-green-500/40'">
                <input type="radio" :value="tp.value" v-model="newMonitor.type" class="sr-only">
                <span class="text-sm font-bold">{{ $t(tp.labelKey) }}</span>
                <span class="text-[11px] opacity-80 mt-0.5">{{ $t(tp.descKey) }}</span>
              </label>
            </div>
            <div v-if="newMonitor.type === 'dns'" class="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.dnsRecordType') }}</label>
                <select v-model="newMonitor.record_type" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none">
                  <option value="A">A</option><option value="AAAA">AAAA</option><option value="CNAME">CNAME</option><option value="MX">MX</option><option value="TXT">TXT</option><option value="NS">NS</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.dnsExpected') }}</label>
                <input v-model="newMonitor.expected" :placeholder="$t('monitorForm.dnsExpectedPlaceholder')" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600">
              </div>
            </div>
            <div v-if="newMonitor.type === 'port'" class="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.port') }}</label>
                <input v-model="newMonitor.port" type="number" min="1" max="65535" :placeholder="$t('monitorForm.portPlaceholder')" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none font-mono placeholder-slate-600">
              </div>
            </div>
          </div>
          <!-- 监测频率 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><i class="fas fa-clock text-cyan-400"></i> {{ $t('configModal.frequency') }}</h4>
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <label v-for="opt in [{value:60,label:$t('monitorForm.minutes',{count:1})},{value:180,label:$t('monitorForm.minutes',{count:3})},{value:300,label:$t('monitorForm.minutes',{count:5})},{value:600,label:$t('monitorForm.minutes',{count:10})},{value:900,label:$t('monitorForm.minutes',{count:15})},{value:1800,label:$t('monitorForm.minutes',{count:30})}]" :key="opt.value"
                class="flex flex-col items-center justify-center py-2.5 rounded-xl border-2 cursor-pointer transition-all text-center"
                :class="Number(newMonitor.interval) === opt.value ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-slate-700 text-slate-400 hover:border-green-500/40'">
                <input type="radio" :value="opt.value" v-model="newMonitor.interval" class="sr-only">
                <span class="text-sm font-bold">{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <!-- 高级选项 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><i class="fas fa-cog text-slate-400"></i> {{ $t('monitorForm.advanced') }}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.method') }}</label>
                <select v-model="newMonitor.method" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none">
                  <option value="GET">GET</option><option value="POST">POST</option><option value="HEAD">HEAD</option><option value="PUT">PUT</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.keyword') }} <span class="text-xs font-normal text-slate-500">{{ $t('common.optional') }}</span></label>
                <input v-model="newMonitor.keyword" :placeholder="$t('monitorForm.keywordRequired')" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.userAgent') }} <span class="text-xs font-normal text-slate-500">{{ $t('common.optional') }}</span></label>
                <input v-model="newMonitor.user_agent" placeholder="Uptime-Monitor/1.0" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none font-mono placeholder-slate-600">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.tags') }} <span class="text-xs font-normal text-slate-500">{{ $t('monitorForm.tagsHint') }}</span></label>
                <input v-model="newMonitor.tags" placeholder="prod,web,api" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600">
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.requestHeaders') }} <span class="text-xs font-normal text-slate-500">{{ $t('monitorForm.headersHint') }}</span></label>
              <input v-model="newMonitor.request_headers" placeholder='{"Authorization":"Bearer xxx"}' class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none font-mono placeholder-slate-600">
            </div>
            <div v-if="['POST','PUT','PATCH'].includes(newMonitor.method)" class="mt-4">
              <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('monitorForm.requestBody') }}</label>
              <textarea v-model="newMonitor.request_body" placeholder='{"key":"value"}' rows="3" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none font-mono placeholder-slate-600 resize-none"></textarea>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-slate-300 mb-2">{{ $t('configModal.errorRate') }} <span class="text-xs font-normal text-slate-500">{{ $t('monitorForm.errorRateZero') }}</span></label>
              <input type="number" v-model="newMonitor.alert_error_rate" min="0" max="100" placeholder="0" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600">
            </div>
          </div>
          <!-- 检测功能 -->
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2"><i class="fas fa-shield-alt text-slate-400"></i> {{ $t('configModal.detection') }}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-green-500/50 cursor-pointer select-none transition-colors bg-slate-900/50">
                <input type="checkbox" v-model="newMonitor.check_ssl" class="w-5 h-5 rounded accent-green-500">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-yellow-500/15 rounded-lg flex items-center justify-center"><i class="fas fa-lock text-yellow-400 text-xs"></i></div>
                  <div><span class="text-sm font-medium text-slate-300">{{ $t('monitorForm.ssl') }}</span><p class="text-xs text-slate-500">{{ $t('monitorForm.sslDesc') }}</p></div>
                </div>
              </label>
              <label class="flex items-center gap-3 p-4 rounded-xl border border-slate-700 hover:border-green-500/50 cursor-pointer select-none transition-colors bg-slate-900/50">
                <input type="checkbox" v-model="newMonitor.check_domain" class="w-5 h-5 rounded accent-green-500">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center"><i class="fas fa-globe text-blue-400 text-xs"></i></div>
                  <div><span class="text-sm font-medium text-slate-300">{{ $t('monitorForm.domain') }}</span><p class="text-xs text-slate-500">{{ $t('monitorForm.domainDesc') }}</p></div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <!-- 底部 -->
        <div class="px-8 py-5 border-t border-white/5 bg-slate-900/30 flex items-center justify-between">
          <p class="text-xs text-slate-600 hidden sm:block"><i class="fas fa-keyboard mr-1"></i> {{ $t('monitorForm.enterHint') }}</p>
          <div class="flex gap-3 ml-auto">
            <button @click="$emit('close')" class="px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 rounded-xl transition-colors cursor-pointer border border-slate-700">{{ $t('common.cancel') }}</button>
            <button @click="$emit('submit')" :disabled="submitting" class="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer">
              <i v-if="submitting" class="fas fa-spinner fa-spin text-xs"></i>
              <i v-else class="fas fa-rocket text-xs"></i>
              {{ submitting ? $t('monitorForm.creating') : $t('monitorForm.create') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({ newMonitor: Object, submitting: Boolean });
defineEmits(['close', 'submit']);

const monitorTypes = [
    { value: 'http', labelKey: 'monitorForm.typeHttp', descKey: 'monitorForm.typeHttpDesc' },
    { value: 'dns', labelKey: 'monitorForm.typeDns', descKey: 'monitorForm.typeDnsDesc' },
    { value: 'port', labelKey: 'monitorForm.typePort', descKey: 'monitorForm.typePortDesc' },
];
</script>
