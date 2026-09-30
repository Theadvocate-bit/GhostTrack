// GET /api/ip?ip=1.2.3.4 — IP 追踪（上游 ipwho.is，备源 ipapi.co）
import { json, getQuery, safeFetch } from '../lib/http.js';

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6 = /^[0-9a-fA-F:]{2,45}$/;

function validIp(ip) {
  const m = ip.match(IPV4);
  if (m) return m.slice(1).every((n) => +n <= 255);
  return IPV6.test(ip);
}

function clientIp(request) {
  const h = request.headers;
  const xff = (h.get('x-forwarded-for') || '').split(',')[0].trim();
  return xff || h.get('eo-connecting-ip') || h.get('x-real-ip') || '';
}

function pick(d, keys) {
  const out = {};
  for (const [k, alt] of keys) out[k] = d[k] !== undefined ? d[k] : alt;
  return out;
}

export default async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return json({ ok: true });
  const q = getQuery(request);
  const ip = (q.get('ip') || clientIp(request)).trim();
  if (!ip) return json({ success: false, error: '缺少 ip 参数，且无法识别访客 IP' }, 400);
  if (!validIp(ip)) return json({ success: false, error: '非法 IP 地址: ' + ip }, 400);

  // 主源 ipwho.is
  try {
    const r = await safeFetch('https://ipwho.is/' + ip, 9000);
    const d = await r.json();
    if (d && d.success !== false && d.ip) {
      const t = d.timezone || {};
      const c = d.connection || {};
      return json({
        success: true,
        source: 'ipwho.is',
        ip,
        ...pick(d, [['type', null], ['country', null], ['country_code', null], ['city', null],
          ['continent', null], ['continent_code', null], ['region', null], ['region_code', null],
          ['latitude', null], ['longitude', null], ['is_eu', null], ['postal', null],
          ['calling_code', null], ['capital', null], ['borders', null]]),
        maps_url: d.latitude != null && d.longitude != null
          ? 'https://www.google.com/maps/@' + d.latitude + ',' + d.longitude + ',8z' : null,
        flag_emoji: d.flag && d.flag.emoji ? d.flag.emoji : null,
        asn: c.asn ?? null, org: c.org ?? null, isp: c.isp ?? null, domain: c.domain ?? null,
        timezone: {
          id: t.id ?? null, abbr: t.abbr ?? null, is_dst: t.is_dst ?? null,
          offset: t.offset ?? null, utc: t.utc ?? null, current_time: t.current_time ?? null,
        },
      });
    }
  } catch (_) { /* 落到备源 */ }

  // 备源 ipapi.co
  try {
    const r = await safeFetch('https://ipapi.co/' + ip + '/json/', 9000);
    const d = await r.json();
    if (d && !d.error) {
      return json({
        success: true,
        source: 'ipapi.co',
        ip,
        type: ip.includes(':') ? 'IPv6' : 'IPv4',
        country: d.country_name ?? null, country_code: d.country_code ?? null,
        city: d.city ?? null, continent: null, continent_code: d.continent_code ?? null,
        region: d.region ?? null, region_code: d.region_code ?? null,
        latitude: d.latitude ?? null, longitude: d.longitude ?? null,
        maps_url: d.latitude != null && d.longitude != null
          ? 'https://www.google.com/maps/@' + d.latitude + ',' + d.longitude + ',8z' : null,
        is_eu: d.in_eu ?? null, postal: d.postal ?? null,
        calling_code: d.country_calling_code ?? null,
        capital: null, borders: null, flag_emoji: d.country_emoji ?? null,
        asn: d.asn ?? null, org: d.org ?? null, isp: d.org ?? null, domain: null,
        timezone: {
          id: d.timezone ?? null, abbr: null, is_dst: null,
          offset: d.utc_offset ?? null, utc: d.utc_offset ?? null,
          current_time: d.date_time_utc ?? null,
        },
        note: '主源 ipwho.is 不可用，已切换备源，部分字段缺失',
      });
    }
  } catch (_) { /* 双源皆败 */ }

  return json({ success: false, error: '上游查询失败（ipwho.is / ipapi.co 均不可达或被拦截）' }, 502);
}
