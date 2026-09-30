// GET /api/phone?number=+8613800138000&region=CN — 手机号追踪
// 核心解析: libphonenumber-js（vendor 内置）；地理/时区: 国家级近似；运营商: 仅 CN 号段粗判
import { json, getQuery } from '../lib/http.js';
import { parsePhoneNumberFromString, validatePhoneNumberLength } from '../lib/libphonenumber.mjs';
import COUNTRY_ZH from '../lib/country_zh.mjs';
import COUNTRY_TZ from '../lib/country_tz.mjs';

const TYPE_ZH = {
  MOBILE: '手机号', FIXED_LINE: '固定电话', FIXED_LINE_OR_MOBILE: '固话/手机',
  PREMIUM_RATE: '付费电话', TOLL_FREE: '免费电话', SHARED_COST: '分摊付费',
  VOIP: '网络电话', PERSONAL_NUMBER: '个人号码', PAGER: '传呼机', UAN: '统一接入号',
  VOICEMAIL: '语音信箱',
};

// CN 号段粗粒度归属（三大运营商公开号段，非官方数据库，按首匹配）
const CN_CARRIER = [
  [/^13[4-9]/, '中国移动'], [/^14[78]/, '中国移动'], [/^15[0-2]/, '中国移动'],
  [/^15[7-9]/, '中国移动'], [/^172/, '中国移动'], [/^178/, '中国移动'],
  [/^18[23478]/, '中国移动'], [/^19[578]/, '中国移动'],
  [/^13[0-2]/, '中国联通'], [/^14[56]/, '中国联通'], [/^15[56]/, '中国联通'],
  [/^166/, '中国联通'], [/^17[56]/, '中国联通'], [/^185/, '中国联通'], [/^186/, '中国联通'],
  [/^196/, '中国联通'],
  [/^133/, '中国电信'], [/^149/, '中国电信'], [/^153/, '中国电信'], [/^17[347]/, '中国电信'],
  [/^180/, '中国电信'], [/^181/, '中国电信'], [/^189/, '中国电信'], [/^19[0139]/, '中国电信'],
  [/^192/, '中国广电'], [/^16[257]/, '虚拟运营商'], [/^17[01]/, '虚拟运营商'],
];

function cnCarrier(nationalNumber) {
  const s = String(nationalNumber);
  if (!/^1[3-9]\d{9}$/.test(s)) return null;
  for (const [re, name] of CN_CARRIER) if (re.test(s)) return name;
  return null;
}

function zoneInfo(zone) {
  if (!zone) return null;
  const out = { zone, utc_offset: null, current_time: null };
  try {
    const now = new Date();
    const p = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
      .formatToParts(now).find((x) => x.type === 'timeZoneName');
    if (p) out.utc_offset = p.value.replace('GMT', 'UTC');
    out.current_time = new Intl.DateTimeFormat('zh-CN', {
      timeZone: zone, dateStyle: 'medium', timeStyle: 'medium', hour12: false,
    }).format(now);
  } catch (_) { /* Intl 时区不可用时省略 */ }
  return out;
}

export default async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return json({ ok: true });
  const q = getQuery(request);
  const input = (q.get('number') || '').trim();
  const region = (q.get('region') || 'CN').trim().toUpperCase();
  if (!input) return json({ success: false, error: '缺少 number 参数，示例: ?number=+8613800138000' }, 400);

  const phone = parsePhoneNumberFromString(input, region);
  if (!phone || !phone.number) {
    return json({
      success: true, input, parse_ok: false, valid: false,
      error: '无法解析为有效电话号码（需含国家码或匹配默认区域 ' + region + '）',
    });
  }

  const valid = phone.isValid();
  const possible = phone.isPossible();
  const lengthError = valid ? null : (validatePhoneNumberLength(input, region) || null);
  const cc = phone.country; // ISO 3166 alpha-2
  const national = String(phone.nationalNumber);
  const carrier = cc === 'CN' ? cnCarrier(national) : null;

  return json({
    success: true,
    input,
    parse_ok: true,
    valid,
    possible,
    length_error: lengthError,
    region_code: cc ?? null,
    country_zh: cc ? (COUNTRY_ZH[cc] || cc) : null,
    country_calling_code: '+' + phone.countryCallingCode,
    national_number: national,
    e164: phone.number,                                   // E.164
    international: phone.formatInternational(),
    national_format: phone.formatNational(),
    uri: phone.getURI(),
    type: phone.getType() ?? null,
    type_zh: TYPE_ZH[phone.getType()] ?? '其他/未知',
    location: cc ? (COUNTRY_ZH[cc] || cc) : null,         // 国家级近似（原版为城市级 geocoder）
    carrier,
    carrier_note: cc === 'CN'
      ? 'CN 号段粗粒度判断，非官方归属数据库'
      : '海外号码暂不提供运营商识别',
    timezones: cc ? [zoneInfo(COUNTRY_TZ[cc])].filter(Boolean) : [],
    notes: [
      'location/时区为国家/地区级近似值（原版 Python 库为号段级城市数据）',
      '运营商仅支持中国大陆号段粗判',
    ],
  }, valid ? 200 : 200);
}
