// ============================================================
// MonitorFlare — 告警文案多语言
// 支持: en / zh / ja / ko / de / fr / it / es
// 英文走专业简洁风格,中文保留轻松风格,其余语言中性专业
// ============================================================

export const SUPPORTED_LANGS = ['en', 'zh', 'zh-tw', 'ja', 'ko', 'de', 'fr', 'it', 'es'] as const;
export type Lang = typeof SUPPORTED_LANGS[number];

export function isSupportedLang(lang: string | null | undefined): Lang {
  const l = (lang || '').toLowerCase();
  if (l.startsWith('zh-tw') || l.startsWith('zh_tw') || l.startsWith('zh-hant')) return 'zh-tw';
  const base = l.slice(0, 2);
  return (SUPPORTED_LANGS as readonly string[]).includes(base) ? base as Lang : 'en';
}

interface AlertCopy {
  downTitle: string;
  upTitle: string;
  downLabel: string;
  upLabel: string;
  footer: string;
}

const COPY: Record<Lang, AlertCopy> = {
  en: {
    downTitle: 'Service Down',
    upTitle: 'Service Recovered',
    downLabel: 'DOWN',
    upLabel: 'UP',
    footer: 'MonitorFlare',
  },
  zh: {
    downTitle: '服务故障报警',
    upTitle: '服务恢复通知',
    downLabel: '故障 (DOWN)',
    upLabel: '正常 (UP)',
    footer: 'MonitorFlare',
  },
  'zh-tw': {
    downTitle: '服務故障警報',
    upTitle: '服務恢復通知',
    downLabel: '故障 (DOWN)',
    upLabel: '正常 (UP)',
    footer: 'MonitorFlare',
  },
  ja: {
    downTitle: 'サービス障害発生',
    upTitle: 'サービス復旧',
    downLabel: '障害 (DOWN)',
    upLabel: '正常 (UP)',
    footer: 'MonitorFlare',
  },
  ko: {
    downTitle: '서비스 장애 발생',
    upTitle: '서비스 복구됨',
    downLabel: '장애 (DOWN)',
    upLabel: '정상 (UP)',
    footer: 'MonitorFlare',
  },
  de: {
    downTitle: 'Dienst nicht erreichbar',
    upTitle: 'Dienst wiederhergestellt',
    downLabel: 'AUSFALL (DOWN)',
    upLabel: 'OK (UP)',
    footer: 'MonitorFlare',
  },
  fr: {
    downTitle: 'Service en panne',
    upTitle: 'Service rétabli',
    downLabel: 'PANNE (DOWN)',
    upLabel: 'OK (UP)',
    footer: 'MonitorFlare',
  },
  it: {
    downTitle: 'Servizio non disponibile',
    upTitle: 'Servizio ripristinato',
    downLabel: 'GIÙ (DOWN)',
    upLabel: 'OK (UP)',
    footer: 'MonitorFlare',
  },
  es: {
    downTitle: 'Servicio caído',
    upTitle: 'Servicio restablecido',
    downLabel: 'CAÍDO (DOWN)',
    upLabel: 'OK (UP)',
    footer: 'MonitorFlare',
  },
};

export interface AlertMessage {
  title: string;
  statusText: string;
  time: string;
  isDown: boolean;
  detail: string;
  monitorName: string;
  monitorUrl: string;
  footer: string;
  lang: Lang;
}

export function buildAlertMessage(
  monitor: { name: string; url: string },
  type: 'DOWN' | 'UP',
  detail: string,
  time: string,
  lang: Lang,
): AlertMessage {
  const isDown = type === 'DOWN';
  const copy = COPY[lang];
  return {
    title: isDown ? copy.downTitle : copy.upTitle,
    statusText: isDown ? copy.downLabel : copy.upLabel,
    time,
    isDown,
    detail,
    monitorName: monitor.name,
    monitorUrl: monitor.url,
    footer: copy.footer,
    lang,
  };
}
