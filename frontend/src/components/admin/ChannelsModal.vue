<template>
  <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm admin-modal-overlay" @click="$emit('close')"></div>
      <div class="relative w-full max-w-5xl max-h-[88vh] overflow-hidden flex flex-col glass admin-modal rounded-2xl shadow-2xl" style="animation:modal-in 0.25s ease-out">
        <div class="px-5 sm:px-6 py-5 border-b border-white/5 bg-gradient-to-r from-green-900/15 to-transparent">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                <i class="fas fa-bell text-green-400"></i>
              </div>
              <div class="min-w-0">
                <h3 class="text-lg font-bold text-white">{{ $t('channels.title') }}</h3>
                <p class="text-xs text-slate-500 mt-0.5">{{ $t('channels.subtitle') }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2 sm:justify-end">
              <div class="hidden sm:flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-xs">
                <span class="text-slate-500">{{ $t('common.enabled') }}</span>
                <span class="font-mono font-bold text-green-400">{{ enabledCount }}</span>
                <span class="text-slate-600">/</span>
                <span class="font-mono text-slate-400">{{ channels.length }}</span>
              </div>
              <button @click="startCreate()" class="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition-colors cursor-pointer">
                <i class="fas fa-plus text-xs"></i> {{ $t('channels.addChannel') }}
              </button>
              <button @click="$emit('close')" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer" :aria-label="$t('common.close')">
                <i class="fas fa-times text-lg"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-5 sm:p-6">
          <div class="grid gap-5 lg:grid-cols-5">
            <section class="order-2 lg:order-2 lg:col-span-2 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-500">{{ $t('channels.channelList') }}</h4>
                  <p class="text-xs text-slate-600 mt-1">{{ $t('channels.channelListHint') }}</p>
                </div>
                <button @click="fetchChannels" :disabled="channelsLoading" class="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-green-400 hover:border-green-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:opacity-50 transition-colors cursor-pointer">
                  <i class="fas fa-sync-alt text-[10px]" :class="{ 'fa-spin': channelsLoading }"></i> {{ $t('channels.refresh') }}
                </button>
              </div>

              <div v-if="channelError" class="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 flex items-center gap-3">
                <i class="fas fa-exclamation-circle text-orange-400 shrink-0"></i>
                <p class="text-sm text-orange-300 flex-1">{{ channelError }}</p>
                <button @click="fetchChannels" class="text-xs font-semibold text-orange-300 hover:text-orange-200 cursor-pointer">{{ $t('common.retry') }}</button>
              </div>

              <div v-if="channelsLoading && channels.length === 0" class="space-y-3">
                <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-slate-800/50 animate-pulse"></div>
              </div>

              <div v-else-if="channels.length === 0" class="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-12 text-center">
                <div class="mx-auto mb-4 w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center">
                  <i class="fas fa-bell-slash text-slate-500"></i>
                </div>
                <h4 class="text-base font-bold text-white">{{ $t('channels.noChannelsTitle') }}</h4>
                <p class="text-sm text-slate-500 mt-1 mb-5">{{ $t('channels.noChannelsDesc') }}</p>
                <button @click="startCreate()" class="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition-colors cursor-pointer">
                  <i class="fas fa-plus text-xs"></i> {{ $t('channels.addFirstChannel') }}
                </button>
              </div>

              <div v-else class="space-y-3">
                <article v-for="ch in channels" :key="ch.id"
                  class="rounded-xl border px-4 py-4 transition-all"
                  :class="editing?.id === ch.id ? 'border-green-500/50 bg-green-500/10 shadow-lg shadow-green-500/5' : 'border-slate-700 bg-slate-900/35 hover:border-slate-600 hover:bg-slate-900/55'">
                  <div class="flex flex-col gap-4">
                    <div class="flex items-center gap-3 min-w-0 flex-1 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                      role="button" tabindex="0" @click="editCh(ch)" @keydown.enter.prevent="editCh(ch)" @keydown.space.prevent="editCh(ch)"
                      :aria-label="$t('channels.editAria', { name: ch.name })">
                      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" :class="getTypeInfo(ch.type).bg">
                        <i :class="getTypeInfo(ch.type).iconClass"></i>
                      </div>
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2">
                          <h5 class="text-sm font-bold text-white truncate">{{ ch.name }}</h5>
                          <span class="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">{{ getTypeInfo(ch.type).label }}</span>
                          <span v-if="isEnabled(ch)" class="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-green-400">
                            <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            {{ $t('common.enabled') }}
                          </span>
                          <span v-else class="inline-flex items-center gap-1 rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                            <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            {{ $t('common.disabled') }}
                          </span>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">{{ getTypeInfo(ch.type).desc }}</p>
                      </div>
                    </div>

                    <div class="flex items-center justify-between gap-2 shrink-0">
                      <button @click.stop="toggleCh(ch)" :disabled="togglingId === ch.id"
                        class="relative w-14 h-9 rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:opacity-60"
                        :class="isEnabled(ch) ? 'bg-green-600' : 'bg-slate-700'"
                        role="switch" :aria-checked="isEnabled(ch)" :aria-label="isEnabled(ch) ? $t('channels.disableAria', { name: ch.name }) : $t('channels.enableAria', { name: ch.name })" :title="isEnabled(ch) ? $t('channels.disableTitle') : $t('channels.enableTitle')">
                        <span class="absolute top-1 w-7 h-7 rounded-full bg-white shadow transition-all" :class="isEnabled(ch) ? 'left-6' : 'left-1'"></span>
                      </button>
                      <button @click.stop="testCh(ch)" :disabled="testingId === ch.id" class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-400 hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:opacity-60 transition-colors cursor-pointer" :aria-label="$t('channels.testAria', { name: ch.name })">
                        <i class="fas text-[10px]" :class="testingId === ch.id ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
                        {{ $t('channels.test') }}
                      </button>
                      <button @click.stop="editCh(ch)" class="w-9 h-9 rounded-lg flex items-center justify-center text-blue-500/80 hover:text-blue-400 hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 transition-colors cursor-pointer" :aria-label="$t('channels.editAria', { name: ch.name })" :title="$t('common.edit')">
                        <i class="fas fa-pen text-xs"></i>
                      </button>
                      <button @click.stop="deleteCh(ch)" :disabled="deletingId === ch.id" class="w-9 h-9 rounded-lg flex items-center justify-center text-red-500/80 hover:text-red-400 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50 transition-colors cursor-pointer" :aria-label="$t('channels.deleteAria', { name: ch.name })" :title="$t('common.delete')">
                        <i class="fas text-xs" :class="deletingId === ch.id ? 'fa-spinner fa-spin' : 'fa-trash'"></i>
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <aside class="order-1 lg:order-1 lg:col-span-3">
              <div v-if="!editing" class="rounded-2xl border border-slate-700 bg-slate-900/30 p-5">
                <div class="w-11 h-11 rounded-xl bg-green-500/15 flex items-center justify-center mb-4">
                  <i class="fas fa-route text-green-400"></i>
                </div>
                <h4 class="text-base font-bold text-white">{{ $t('channels.selectOrAdd') }}</h4>
                <p class="text-sm text-slate-500 mt-1 mb-5">{{ $t('channels.selectHint') }}</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button v-for="item in channelTypeOptions" :key="item.key" @click="startCreate(item.key)"
                    class="rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-3 text-left hover:border-green-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition-colors cursor-pointer">
                    <i :class="item.iconClass"></i>
                    <span class="block text-xs font-semibold text-slate-300 mt-2">{{ item.label }}</span>
                  </button>
                </div>
              </div>

              <div v-else class="rounded-2xl border border-slate-700 bg-slate-900/30 overflow-hidden">
                <div class="px-5 py-4 border-b border-slate-700/70 bg-slate-900/35">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="currentEditingInfo.bg">
                        <i :class="currentEditingInfo.iconClass"></i>
                      </div>
                      <div class="min-w-0">
                        <h4 class="text-base font-bold text-white">{{ editing.id ? $t('channels.editChannel') : $t('channels.addChannel') }}</h4>
                        <p class="text-xs text-slate-500 mt-0.5">{{ $t('channels.configFor', { type: currentEditingInfo.label }) }}</p>
                      </div>
                    </div>
                    <button @click="editing = null" class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer" :title="$t('channels.collapseForm')" :aria-label="$t('channels.collapseForm')">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>

                <div class="p-5 space-y-5">
                  <div v-if="!editing.id">
                    <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.channelType') }}</label>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button v-for="item in channelTypeOptions" :key="item.key" @click="selectType(item.key)"
                        class="rounded-xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 cursor-pointer"
                        :class="editing.type === item.key ? 'border-green-500 bg-green-900/20' : 'border-slate-700 bg-slate-900/40 hover:border-green-500/40'">
                        <i :class="item.iconClass"></i>
                        <span class="block text-xs font-semibold mt-2" :class="editing.type === item.key ? 'text-green-400' : 'text-slate-300'">{{ item.label }}</span>
                        <span v-if="item.badge" class="block text-[10px] text-slate-500 mt-0.5">{{ item.badge }}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.channelName') }} <span class="text-red-400">*</span></label>
                    <input v-model="editing.name" :placeholder="$t('channels.channelNamePlaceholder')" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white focus:border-green-500 outline-none placeholder-slate-600">
                  </div>

                  <template v-if="editing.type === 'dingtalk'">
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.accessToken') }}</label>
                      <input v-model="editing.config.access_token" :placeholder="editing.id ? $t('channels.keepSecretPlaceholder') : $t('channels.accessTokenPlaceholder')" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.secret') }} <span class="text-slate-600">{{ $t('common.optional') }}</span></label>
                      <input v-model="editing.config.secret" :placeholder="editing.id ? $t('channels.keepSecretPlaceholder') : $t('channels.secretPlaceholder')" type="password" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                  </template>

                  <template v-if="editing.type === 'wecom'">
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.webhookKey') }}</label>
                      <input v-model="editing.config.key" :placeholder="editing.id ? $t('channels.keepSecretPlaceholder') : $t('channels.webhookKeyPlaceholder')" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                  </template>

                  <template v-if="editing.type === 'feishu'">
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.webhookUrl') }}</label>
                      <input v-model="editing.config.webhook_url" type="url" placeholder="https://open.feishu.cn/..." class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.secret') }} <span class="text-slate-600">{{ $t('common.optional') }}</span></label>
                      <input v-model="editing.config.secret" type="password" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                  </template>

                  <template v-if="editing.type === 'telegram'">
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.botToken') }}</label>
                      <input v-model="editing.config.bot_token" type="password" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.chatId') }}</label>
                      <input v-model="editing.config.chat_id" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                  </template>

                  <template v-if="editing.type === 'webhook'">
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.webhookUrl') }}</label>
                      <input v-model="editing.config.url" type="url" placeholder="https://your-server.com/webhook" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.method') }}</label>
                      <select v-model="editing.config.method" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none font-mono">
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.headers') }}</label>
                      <input v-model="editing.config.headers" placeholder='{"Authorization":"Bearer xxx"}' class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                  </template>

                  <template v-if="editing.type === 'email'">
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.emailProvider') }}</label>
                      <select v-model="editing.config.provider" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none font-mono">
                        <option v-for="p in emailProviders" :key="p.value" :value="p.value">{{ p.label }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.apiKey') }}</label>
                      <input v-model="editing.config.api_key" type="password" :placeholder="editing.id ? $t('channels.keepSecretPlaceholder') : ''" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                    <div v-if="editing.config.provider === 'mailgun'">
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.domain') }}</label>
                      <input v-model="editing.config.domain" placeholder="mg.example.com" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                    <template v-if="editing.config.provider === 'ses'">
                      <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.secretKey') }}</label>
                        <input v-model="editing.config.api_secret" type="password" :placeholder="editing.id ? $t('channels.keepSecretPlaceholder') : ''" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.region') }}</label>
                        <input v-model="editing.config.region" placeholder="us-east-1" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                      </div>
                    </template>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.fromEmail') }}</label>
                      <input v-model="editing.config.from_email" placeholder="Uptime Monitor <notify@yourdomain.com>" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.toEmail') }}</label>
                      <input v-model="editing.config.to_email" type="email" placeholder="admin@example.com" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                  </template>

                  <template v-if="editing.type === 'slack'">
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.webhookUrl') }}</label>
                      <input v-model="editing.config.webhook_url" type="url" placeholder="https://hooks.slack.com/services/..." class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                  </template>

                  <template v-if="editing.type === 'discord'">
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.webhookUrl') }}</label>
                      <input v-model="editing.config.webhook_url" type="url" placeholder="https://discord.com/api/webhooks/..." class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                  </template>

                  <template v-if="editing.type === 'ntfy'">
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.server') }}</label>
                      <input v-model="editing.config.server" placeholder="https://ntfy.sh" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.topic') }}</label>
                      <input v-model="editing.config.topic" placeholder="uptime-alerts" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-400 mb-2">{{ $t('channels.accessToken') }} <span class="text-slate-600">{{ $t('common.optional') }}</span></label>
                      <input v-model="editing.config.token" type="password" class="input-field w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-800/80 text-white outline-none placeholder-slate-600 font-mono">
                    </div>
                  </template>
                </div>

                <div class="px-5 py-4 border-t border-slate-700/70 bg-slate-900/35 flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <button @click="editing = null" class="px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer">
                    {{ $t('common.cancel') }}
                  </button>
                  <button @click="saveCh" :disabled="saving" class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition-colors disabled:opacity-50 cursor-pointer">
                    <i class="fas text-xs" :class="saving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                    {{ saving ? $t('common.saving') : (editing.id ? $t('channels.saveChanges') : $t('channels.addChannel')) }}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '../../composables/useAuth';
import { useToast } from '../../composables/useToast';
import { API_BASE, fetchT } from '../../utils/api';

const { t } = useI18n();
const emit = defineEmits(['close']);
const { storedToken } = useAuth();
const { addToast } = useToast();

const channels = ref([]);
const channelsLoading = ref(false);
const channelError = ref('');
const editing = ref(null);
const saving = ref(false);
const testingId = ref(null);
const togglingId = ref(null);
const deletingId = ref(null);

const emailProviders = [
    { value: 'resend', label: 'Resend' },
    { value: 'sendgrid', label: 'SendGrid' },
    { value: 'mailgun', label: 'Mailgun' },
    { value: 'postmark', label: 'Postmark' },
    { value: 'ses', label: 'AWS SES' },
];

const typeInfo = computed(() => ({
    wecom: { iconClass: 'fab fa-weixin text-green-400 text-lg', label: t('channelTypes.wecom'), desc: t('channelTypes.wecomDesc'), bg: 'bg-green-900/40' },
    feishu: { iconClass: 'fas fa-paper-plane text-purple-400 text-lg', label: t('channelTypes.feishu'), desc: t('channelTypes.feishuDesc'), bg: 'bg-purple-900/40' },
    dingtalk: { iconClass: 'fas fa-comment-dots text-blue-400 text-lg', label: t('channelTypes.dingtalk'), desc: t('channelTypes.dingtalkDesc'), bg: 'bg-blue-900/40' },
    webhook: { iconClass: 'fas fa-link text-orange-400 text-lg', label: t('channelTypes.webhook'), desc: t('channelTypes.webhookDesc'), bg: 'bg-orange-900/40' },
    telegram: { iconClass: 'fab fa-telegram text-sky-400 text-lg', label: t('channelTypes.telegram'), desc: t('channelTypes.telegramDesc'), badge: t('channelTypes.overseas'), bg: 'bg-sky-900/40' },
    email: { iconClass: 'fas fa-envelope text-rose-400 text-lg', label: t('channelTypes.email'), desc: t('channelTypes.emailDesc'), badge: t('channelTypes.overseas'), bg: 'bg-rose-900/40' },
    slack: { iconClass: 'fab fa-slack text-fuchsia-400 text-lg', label: t('channelTypes.slack'), desc: t('channelTypes.slackDesc'), badge: t('channelTypes.overseas'), bg: 'bg-fuchsia-900/40' },
    discord: { iconClass: 'fab fa-discord text-indigo-400 text-lg', label: t('channelTypes.discord'), desc: t('channelTypes.discordDesc'), badge: t('channelTypes.overseas'), bg: 'bg-indigo-900/40' },
    ntfy: { iconClass: 'fas fa-bullhorn text-lime-400 text-lg', label: t('channelTypes.ntfy'), desc: t('channelTypes.ntfyDesc'), badge: t('channelTypes.overseas'), bg: 'bg-lime-900/40' },
}));

const fallbackTypeInfo = () => ({ iconClass: 'fas fa-bell text-slate-400 text-lg', label: t('channels.unknownChannel'), desc: t('channels.customChannel'), bg: 'bg-slate-700' });
const channelTypeOptions = computed(() => Object.entries(typeInfo.value).map(([key, info]) => ({ key, ...info })));
const enabledCount = computed(() => channels.value.filter(ch => isEnabled(ch)).length);
const currentEditingInfo = computed(() => editing.value ? getTypeInfo(editing.value.type) : fallbackTypeInfo());

const getTypeInfo = (type) => typeInfo.value[type] || { ...fallbackTypeInfo(), label: type || t('channels.unknownChannel') };
const isEnabled = (ch) => ch.enabled === true || Number(ch.enabled) === 1;

const authFetch = async (url, options = {}) => {
    const headers = { ...options.headers, 'Authorization': `Bearer ${storedToken.value}` };
    return fetchT(url, { ...options, headers });
};

const fetchChannels = async () => {
    channelsLoading.value = true;
    channelError.value = '';
    try {
        const res = await authFetch(`${API_BASE}/notification-channels`);
        if (res?.ok) channels.value = await res.json();
        else channelError.value = t('channels.loadFailed');
    } catch {
        channelError.value = t('channels.loadFailed');
    } finally {
        channelsLoading.value = false;
    }
};

const baseConfig = (type) => {
    if (type === 'webhook') return { method: 'POST' };
    if (type === 'email') return { provider: 'resend' };
    return {};
};

const startCreate = (type = 'wecom') => {
    editing.value = { type, name: '', config: baseConfig(type) };
};

const selectType = (type) => {
    if (!editing.value || editing.value.id) return;
    editing.value = { type, name: editing.value.name, config: baseConfig(type) };
};

const saveCh = async () => {
    const ch = editing.value;
    if (!ch.name || !ch.type) { addToast(t('channels.fillName'), 'error'); return; }
    saving.value = true;
    try {
        const url = ch.id ? `${API_BASE}/notification-channels/${ch.id}` : `${API_BASE}/notification-channels`;
        const body = ch.id
            ? { type: ch.type, name: ch.name, config: ch.config }
            : { type: ch.type, name: ch.name, config: ch.config, enabled: 1 };
        const res = await authFetch(url, { method: ch.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
            addToast(ch.id ? t('channels.updated') : t('channels.added'), 'success');
            editing.value = null;
            await fetchChannels();
        } else {
            const d = await res.json();
            addToast(d.error || t('channels.operationFailed'), 'error');
        }
    } catch {
        addToast(t('common.networkError'), 'error');
    } finally {
        saving.value = false;
    }
};

const editCh = (ch) => {
    let parsedConfig = {};
    try { parsedConfig = typeof ch.config === 'string' ? JSON.parse(ch.config) : (ch.config || {}); } catch {}
    const secretKeys = ['secret', 'token', 'access_token', 'bot_token', 'key', 'api_key'];
    const cleanConfig = {};
    for (const [k, v] of Object.entries(parsedConfig)) {
        const isSecret = secretKeys.some(s => k.toLowerCase().includes(s));
        cleanConfig[k] = (isSecret || (typeof v === 'string' && v.includes('****'))) ? '' : v;
    }
    if (ch.type === 'email' && !cleanConfig.provider) cleanConfig.provider = 'resend';
    editing.value = { id: ch.id, type: ch.type, name: ch.name, config: cleanConfig };
};

const deleteCh = async (ch) => {
    if (!confirm(t('channels.deleteConfirm', { name: ch.name }))) return;
    deletingId.value = ch.id;
    try {
        const res = await authFetch(`${API_BASE}/notification-channels/${ch.id}`, { method: 'DELETE' });
        if (res.ok) {
            addToast(t('channels.deleted'), 'success');
            if (editing.value?.id === ch.id) editing.value = null;
            await fetchChannels();
        } else {
            addToast(t('channels.deleteFailed'), 'error');
        }
    } catch {
        addToast(t('channels.deleteFailed'), 'error');
    } finally {
        deletingId.value = null;
    }
};

const toggleCh = async (ch) => {
    togglingId.value = ch.id;
    try {
        const enabled = isEnabled(ch) ? 0 : 1;
        const res = await authFetch(`${API_BASE}/notification-channels/${ch.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
        if (res.ok) ch.enabled = enabled;
        else addToast(t('channels.operationFailed'), 'error');
    } catch {
        addToast(t('channels.operationFailed'), 'error');
    } finally {
        togglingId.value = null;
    }
};

const testCh = async (ch) => {
    testingId.value = ch.id;
    addToast(t('channels.testing'), 'info');
    try {
        const res = await authFetch(`${API_BASE}/notification-channels/${ch.id}/test`, { method: 'POST' });
        const d = await res.json();
        addToast(d.success ? t('channels.testSent') : t('channels.testFailed'), d.success ? 'success' : 'error');
    } catch {
        addToast(t('channels.testFailed'), 'error');
    } finally {
        testingId.value = null;
    }
};

fetchChannels();
</script>
