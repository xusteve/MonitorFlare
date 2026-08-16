// ============================================================
// MonitorFlare — 通知渠道 provider 注册表
// 渠道: dingtalk / wecom / feishu / telegram / webhook / email / slack / discord / ntfy
// 邮件 provider: resend / sendgrid / mailgun / postmark / ses
// ============================================================
import type { Bindings, NotificationChannel } from './types';
import type { AlertMessage } from './i18n';

export const CHANNEL_TYPES = [
  'dingtalk', 'wecom', 'feishu', 'telegram', 'webhook',
  'email', 'slack', 'discord', 'ntfy',
] as const;

export const EMAIL_PROVIDERS = ['resend', 'sendgrid', 'mailgun', 'postmark', 'ses'] as const;

type Cfg = Record<string, string>;

// ---------- 邮件 HTML 模板 ----------
function buildEmailHtml(msg: AlertMessage): string {
  const isDown = msg.isDown;
  const statusColor = isDown ? '#f43f5e' : '#10b981';
  const t = msg.time;
  return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #1e293b">
  <div style="padding:28px;background:linear-gradient(135deg,${isDown ? '#4c0519' : '#064e3b'},#0f172a);border-bottom:1px solid #1e293b">
    <h2 style="margin:0;color:#f8fafc;font-size:18px">${msg.title}</h2>
  </div>
  <div style="padding:28px;color:#cbd5e1;line-height:1.8;font-size:15px">
    <p style="margin:0 0 12px"><strong>Name:</strong> <span style="color:#f1f5f9">${msg.monitorName}</span></p>
    <p style="margin:0 0 12px"><strong>URL:</strong> <a href="${msg.monitorUrl}" style="color:#38bdf8">${msg.monitorUrl}</a></p>
    <p style="margin:0 0 12px"><strong>Status:</strong> <span style="color:${statusColor};font-weight:700">${msg.statusText}</span></p>
    <div style="margin:16px 0;padding:16px;background:#1e293b;border-radius:12px;border-left:4px solid ${statusColor}">
      <p style="margin:0;font-size:14px;color:#94a3b8"><strong>Detail:</strong> ${msg.detail}</p>
    </div>
  </div>
  <div style="padding:16px 28px;background:#0b1120;text-align:center;font-size:12px;color:#475569">
    ${t} · ${msg.footer}
  </div>
</div>`;
}

function buildMarkdown(msg: AlertMessage): string {
  return [
    `### ${msg.title}`,
    ``,
    `- **Name:** ${msg.monitorName}`,
    `- **URL:** ${msg.monitorUrl}`,
    `- **Status:** ${msg.statusText}`,
    `- **Detail:** ${msg.detail}`,
    ``,
    `${msg.time} · ${msg.footer}`,
  ].join('\n');
}

// ---------- 钉钉 ----------
async function sendDingTalk(cfg: Cfg, msg: AlertMessage): Promise<boolean> {
  const { access_token, secret } = cfg;
  if (!access_token || !secret) return false;
  const timestamp = Date.now();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}\n${secret}`));
  const signEncoded = encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(signature))));
  const webhookUrl = `https://oapi.dingtalk.com/robot/send?access_token=${access_token}&timestamp=${timestamp}&sign=${signEncoded}`;
  const resp = await fetch(webhookUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown', markdown: { title: msg.title, text: buildMarkdown(msg) } }),
  });
  const result = await resp.json<{ errcode: number }>();
  return result.errcode === 0;
}

// ---------- 企业微信 ----------
async function sendWeCom(cfg: Cfg, msg: AlertMessage): Promise<boolean> {
  const { key } = cfg;
  if (!key) return false;
  const content = [
    `### ${msg.title}`,
    ``,
    `> **Name:** <font color="comment">${msg.monitorName}</font>`,
    `> **URL:** ${msg.monitorUrl}`,
    `> **Status:** ${msg.statusText}`,
    `> **Detail:** <font color="comment">${msg.detail}</font>`,
    `<font color="comment">${msg.time} · ${msg.footer}</font>`,
  ].join('\n');
  const resp = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown', markdown: { content } }),
  });
  const result = await resp.json<{ errcode: number }>();
  return result.errcode === 0;
}

// ---------- 飞书 ----------
async function sendFeishu(cfg: Cfg, msg: AlertMessage): Promise<boolean> {
  const { webhook_url, secret } = cfg;
  if (!webhook_url) return false;
  let target = webhook_url;
  if (secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}\n${secret}`));
    const signEncoded = encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(signature))));
    target = `${webhook_url}${webhook_url.includes('?') ? '&' : '?'}timestamp=${timestamp}&sign=${signEncoded}`;
  }
  const resp = await fetch(target, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text: `${msg.title}\n${msg.monitorName} ${msg.monitorUrl} ${msg.statusText}\n${msg.detail}\n${msg.time}` } }),
  });
  return resp.ok;
}

// ---------- Telegram ----------
async function sendTelegram(cfg: Cfg, msg: AlertMessage): Promise<boolean> {
  const { bot_token, chat_id } = cfg;
  if (!bot_token || !chat_id) return false;
  const text = `<b>${msg.title}</b>\n<b>Name:</b> ${msg.monitorName}\n<b>URL:</b> ${msg.monitorUrl}\n<b>Status:</b> ${msg.statusText}\n<b>Detail:</b> ${msg.detail}\n${msg.time}`;
  const resp = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  const result = await resp.json<{ ok: boolean }>();
  return result.ok === true;
}

// ---------- 自定义 Webhook ----------
async function sendWebhook(cfg: Cfg, msg: AlertMessage): Promise<boolean> {
  const { url, method, headers: headersStr } = cfg;
  if (!url) return false;
  const payload = {
    event: msg.isDown ? 'monitor.down' : 'monitor.up',
    monitor: { name: msg.monitorName, url: msg.monitorUrl },
    status: msg.statusText, detail: msg.detail, timestamp: msg.time,
  };
  let parsedHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (headersStr) { try { parsedHeaders = { ...parsedHeaders, ...JSON.parse(headersStr) }; } catch { /* ignore */ } }
  const resp = await fetch(url, { method: (method || 'POST').toUpperCase(), headers: parsedHeaders, body: JSON.stringify(payload) });
  return resp.ok;
}

// ---------- Slack(Incoming Webhook) ----------
async function sendSlack(cfg: Cfg, msg: AlertMessage): Promise<boolean> {
  const { webhook_url } = cfg;
  if (!webhook_url) return false;
  const color = msg.isDown ? '#f43f5e' : '#10b981';
  const payload = {
    attachments: [{
      color,
      title: msg.title,
      fields: [
        { title: 'Name', value: msg.monitorName, short: true },
        { title: 'URL', value: msg.monitorUrl, short: true },
        { title: 'Status', value: msg.statusText, short: true },
        { title: 'Detail', value: msg.detail, short: false },
      ],
      footer: `${msg.time} · ${msg.footer}`,
    }],
  };
  const resp = await fetch(webhook_url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return resp.ok;
}

// ---------- Discord(Webhook) ----------
async function sendDiscord(cfg: Cfg, msg: AlertMessage): Promise<boolean> {
  const { webhook_url } = cfg;
  if (!webhook_url) return false;
  const color = msg.isDown ? 0xf43f5e : 0x10b981;
  const payload = {
    embeds: [{
      title: msg.title,
      color,
      fields: [
        { name: 'Name', value: msg.monitorName, inline: true },
        { name: 'URL', value: msg.monitorUrl, inline: true },
        { name: 'Status', value: msg.statusText, inline: true },
        { name: 'Detail', value: msg.detail, inline: false },
      ],
      footer: { text: `${msg.time} · ${msg.footer}` },
    }],
  };
  const resp = await fetch(webhook_url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  return resp.ok;
}

// ---------- ntfy ----------
async function sendNtfy(cfg: Cfg, msg: AlertMessage): Promise<boolean> {
  const { topic, server, token } = cfg;
  if (!topic) return false;
  const base = (server || 'https://ntfy.sh').replace(/\/$/, '');
  const headers: Record<string, string> = { 'Title': msg.title, 'Tags': msg.isDown ? 'rotating_light' : 'white_check_mark' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const body = `${msg.monitorName} ${msg.monitorUrl}\n${msg.statusText}\n${msg.detail}\n${msg.time}`;
  const resp = await fetch(`${base}/${topic}`, { method: 'POST', headers, body });
  return resp.ok;
}

// ---------- 邮件 provider ----------
// AWS SigV4 签名(用于 SES)
async function signV4(secret: string, date: string, region: string, service: string, canonicalRequest: string): Promise<string> {
  const enc = new TextEncoder();
  const hmac = async (key: CryptoKey | Uint8Array | ArrayBuffer, data: string | Uint8Array | ArrayBuffer): Promise<ArrayBuffer> => {
    const k = key instanceof CryptoKey ? key : await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return crypto.subtle.sign('HMAC', k, typeof data === 'string' ? enc.encode(data) : data);
  };
  const dateKey = await hmac(enc.encode('AWS4' + secret), date);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, service);
  const signingKey = await hmac(serviceKey, 'aws4_request');
  const stringToSign = `AWS4-HMAC-SHA256\n${date}\n${date}/${region}/${service}/aws4_request\n${await sha256Hex(canonicalRequest)}`;
  const signature = await hmac(signingKey, stringToSign);
  return [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendEmail(cfg: Cfg, msg: AlertMessage): Promise<boolean> {
  const provider = (cfg.provider || 'resend') as string;
  const to = (cfg.to_email || '').split(',').map(s => s.trim()).filter(Boolean);
  const from = cfg.from_email || 'MonitorFlare <noreply@resend.dev>';
  if (!cfg.api_key || to.length === 0) return false;
  const subject = msg.title;
  const html = buildEmailHtml(msg);

  switch (provider) {
    case 'sendgrid': {
      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.api_key}` },
        body: JSON.stringify({ personalizations: [{ to: to.map(email => ({ email })) }], from: { email: from.replace(/^.*<|>$/g, '') }, subject, content: [{ type: 'text/html', value: html }] }),
      });
      return resp.ok;
    }
    case 'mailgun': {
      const domain = cfg.domain || 'mg.example.com';
      const body = new URLSearchParams();
      body.set('from', from); body.set('to', to.join(','));
      body.set('subject', subject); body.set('html', html);
      const resp = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + btoa(`api:${cfg.api_key}`), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return resp.ok;
    }
    case 'postmark': {
      const resp = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Postmark-Server-Token': cfg.api_key },
        body: JSON.stringify({ From: from, To: to.join(','), Subject: subject, HtmlBody: html }),
      });
      return resp.ok;
    }
    case 'ses': {
      // AWS SES 通过 SigV4 签名的查询 API
      const region = cfg.region || 'us-east-1';
      const secretKey = cfg.api_secret || '';
      const amzDate = new Date();
      const dateStamp = amzDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const shortDate = dateStamp.slice(0, 8);
      const params = new URLSearchParams();
      params.set('Action', 'SendEmail');
      params.set('Version', '2010-12-01');
      params.set('Source', from);
      to.forEach((email, i) => { params.set(`Destination.ToAddresses.member.${i + 1}`, email); });
      params.set('Message.Subject.Data', subject);
      params.set('Message.Body.Html.Data', html);
      const canonicalQuery = [...params.entries()].map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).sort().join('&');
      const canonicalRequest = `POST\n/\n${canonicalQuery}\ncontent-type:application/x-www-form-urlencoded\nhost:email.${region}.amazonaws.com\nx-amz-date:${dateStamp}\n\ncontent-type;host;x-amz-date\n${await sha256Hex('')}`;
      const signature = await signV4(secretKey, shortDate, region, 'ses', canonicalRequest);
      const authHeader = `AWS4-HMAC-SHA256 Credential=${cfg.api_key}/${shortDate}/${region}/ses/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`;
      const resp = await fetch(`https://email.${region}.amazonaws.com/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Amz-Date': dateStamp, 'Authorization': authHeader },
        body: canonicalQuery,
      });
      return resp.ok;
    }
    case 'resend':
    default: {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.api_key}` },
        body: JSON.stringify({ from, to, subject, html }),
      });
      return resp.ok;
    }
  }
}

// ---------- 分发器 ----------
export async function sendToChannel(
  channel: NotificationChannel,
  msg: AlertMessage,
  _env: Bindings,
): Promise<boolean> {
  let cfg: Cfg = {};
  try { cfg = JSON.parse(channel.config) as Cfg; } catch { return false; }
  try {
    switch (channel.type) {
      case 'dingtalk': return await sendDingTalk(cfg, msg);
      case 'wecom':    return await sendWeCom(cfg, msg);
      case 'feishu':   return await sendFeishu(cfg, msg);
      case 'telegram': return await sendTelegram(cfg, msg);
      case 'webhook':  return await sendWebhook(cfg, msg);
      case 'email':    return await sendEmail(cfg, msg);
      case 'slack':    return await sendSlack(cfg, msg);
      case 'discord':  return await sendDiscord(cfg, msg);
      case 'ntfy':     return await sendNtfy(cfg, msg);
      default: return false;
    }
  } catch (e) {
    console.error(`Failed to send via ${channel.type} (${channel.name}):`, e);
    return false;
  }
}
