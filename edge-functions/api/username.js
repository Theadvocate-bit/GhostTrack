// GET /api/username?name=octocat — 用户名社媒排查（原版 24 站点：去 4 死站、去 1 重复 → 19 站点）
import { json, getQuery, safeFetch, BROWSER_UA } from '../lib/http.js';

const SITES = [
  ['Facebook',   'https://www.facebook.com/{}'],
  ['Twitter',    'https://www.twitter.com/{}'],
  ['Instagram',  'https://www.instagram.com/{}'],
  ['LinkedIn',   'https://www.linkedin.com/in/{}'],
  ['GitHub',     'https://www.github.com/{}'],
  ['Pinterest',  'https://www.pinterest.com/{}'],
  ['Tumblr',     'https://www.tumblr.com/{}'],
  ['YouTube',    'https://www.youtube.com/{}'],
  ['SoundCloud', 'https://soundcloud.com/{}'],
  ['Snapchat',   'https://www.snapchat.com/add/{}'],
  ['TikTok',     'https://www.tiktok.com/@{}'],
  ['Behance',    'https://www.behance.net/{}'],
  ['Medium',     'https://www.medium.com/@{}'],
  ['Quora',      'https://www.quora.com/profile/{}'],
  ['Flickr',     'https://www.flickr.com/people/{}'],
  ['Twitch',     'https://www.twitch.tv/{}'],
  ['Dribbble',   'https://www.dribbble.com/{}'],
  ['ProductHunt','https://www.producthunt.com/@{}'],
  ['Telegram',   'https://www.telegram.me/{}'],
];

export default async function onRequest({ request }) {
  if (request.method === 'OPTIONS') return json({ ok: true });
  const name = (getQuery(request).get('name') || '').trim();
  if (!name || !/^[\w.\-@]{1,64}$/.test(name)) {
    return json({ success: false, error: 'name 参数缺失或含非法字符（允许字母数字 _ . - @，≤64 字符）' }, 400);
  }

  const results = await Promise.all(SITES.map(async ([site, tpl]) => {
    const url = tpl.replace('{}', name);
    try {
      const r = await safeFetch(url, 8000, {
        redirect: 'follow',
        headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      });
      const st = r.status;
      const state = st >= 200 && st < 300 ? 'found'
        : (st === 404 || st === 405 ? 'not_found' : 'blocked_or_unknown');
      return { site, url, http_status: st, state };
    } catch (e) {
      return { site, url, http_status: null, state: 'error',
        error: String((e && e.message) || e).slice(0, 80) };
    }
  }));

  const count = (s) => results.filter((r) => r.state === s).length;
  return json({
    success: true,
    query: name,
    summary: {
      checked: results.length,
      found: count('found'),
      not_found: count('not_found'),
      blocked_or_unknown: count('blocked_or_unknown'),
      error: count('error'),
    },
    results,
    notes: [
      'EdgeOne 边缘节点为数据中心 IP：Instagram / Facebook / TikTok 等站点存在 200 误报（未注册用户也返回登录页）与 403 拦截，state 仅作参考',
      '已移除原版中的死站（Periscope / StumbleUpon / Ello / We Heart It）及重复的 Snapchat 条目',
    ],
  });
}
