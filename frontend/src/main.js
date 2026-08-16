import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createI18n } from 'vue-i18n';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/zh-tw';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/de';
import 'dayjs/locale/fr';
import 'dayjs/locale/it';
import 'dayjs/locale/es';

import en from './locales/en.json';
import zh from './locales/zh.json';
import zhTw from './locales/zh-tw.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import es from './locales/es.json';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

// 从 localStorage 读取语言偏好,默认跟随浏览器
function detectLocale() {
  const saved = localStorage.getItem('monitorflare_lang');
  if (saved) return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  const supported = ['en', 'zh', 'zh-tw', 'ja', 'ko', 'de', 'fr', 'it', 'es'];
  if (/^zh[-_](tw|hk|mo|hant)/.test(nav)) return 'zh-tw';
  const base = nav.slice(0, 2);
  return supported.includes(base) ? base : 'en';
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, zh, 'zh-tw': zhTw, ja, ko, de, fr, it, es },
});

// 全局时区(默认 UTC,可在设置中修改)
const storedTz = localStorage.getItem('monitorflare_tz') || 'UTC';
dayjs.tz.setDefault(storedTz);

// 导出切换语言/时区的辅助函数
export function setAppLanguage(lang) {
  i18n.global.locale.value = lang;
  localStorage.setItem('monitorflare_lang', lang);
  const dayjsLocale = { en: 'en', zh: 'zh-cn', 'zh-tw': 'zh-tw', ja: 'ja', ko: 'ko', de: 'de', fr: 'fr', it: 'it', es: 'es' }[lang] || 'en';
  dayjs.locale(dayjsLocale);
}

export function setAppTimezone(tz) {
  localStorage.setItem('monitorflare_tz', tz);
  dayjs.tz.setDefault(tz);
}

export function getAppTimezone() {
  return localStorage.getItem('monitorflare_tz') || 'UTC';
}

import '@fontsource/plus-jakarta-sans/latin-300.css';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/plus-jakarta-sans/latin-700.css';
import '@fontsource/plus-jakarta-sans/latin-800.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';

// 全局样式
import './styles/base.css';

// Font Awesome
import '@fortawesome/fontawesome-free/css/all.min.css';

const app = createApp(App);
app.use(router);
app.use(i18n);
app.mount('#app');
