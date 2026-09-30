// GET / — 网页 UI（替代原终端菜单；EdgeOne 文件即路由，根路径由此文件服务）
import { html } from './lib/http.js';

const PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GhostTrack Web · EdgeOne Makers</title>
<style>
:root{--bg:#0d1117;--card:#161b22;--bd:#30363d;--tx:#e6edf3;--dim:#8b949e;--ac:#58a6ff;--ok:#3fb950;--warn:#d29922;--bad:#f85149}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--tx);font:15px/1.6 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;max-width:860px;margin:0 auto;padding:32px 20px 60px}
h1{font-size:26px;margin-bottom:4px}
h1 .v{color:var(--ac);font-size:14px;font-weight:400}
.sub{color:var(--dim);font-size:13px;margin-bottom:28px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:20px;margin-bottom:18px}
.card h2{font-size:17px;margin-bottom:4px}
.card p.hint{color:var(--dim);font-size:13px;margin-bottom:12px}
.row{display:flex;gap:10px;flex-wrap:wrap}
input,select{background:#0d1117;border:1px solid var(--bd);border-radius:6px;color:var(--tx);padding:9px 12px;font-size:14px;flex:1;min-width:180px}
select{flex:0 0 110px}
button{background:var(--ac);color:#04121f;border:0;border-radius:6px;padding:9px 22px;font-size:14px;font-weight:600;cursor:pointer}
button:hover{filter:brightness(1.1)}
table{width:100%;border-collapse:collapse;margin-top:14px;font-size:14px}
td{padding:6px 8px;border-bottom:1px solid #21262d;vertical-align:top}
td.k{color:var(--dim);white-space:nowrap;width:130px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}
.chip{border:1px solid var(--bd);border-radius:20px;padding:4px 12px;font-size:13px}
.chip.found{border-color:var(--ok);color:var(--ok)}
.chip.not_found{border-color:var(--bd);color:var(--dim)}
.chip.blocked_or_unknown{border-color:var(--warn);color:var(--warn)}
.chip.error{border-color:var(--bad);color:var(--bad)}
.err{color:var(--bad);margin-top:12px;font-size:14px}
.docs{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:20px}
.docs h2{font-size:17px;margin-bottom:10px}
.docs code{background:#0d1117;border:1px solid var(--bd);border-radius:4px;padding:1px 6px;font-size:13px;word-break:break-all}
.docs table td{font-size:13px}
.note{color:var(--dim);font-size:12px;margin-top:10px}
footer{color:var(--dim);font-size:12px;margin-top:26px;text-align:center}
a{color:var(--ac);text-decoration:none}
</style>
</head>
<body>
<h1>GhostTrack <span class="v">v2.2 · EdgeOne Makers 版</span></h1>
<div class="sub">OSINT 信息收集工具的边缘函数移植 —— IP 追踪 / 手机号追踪 / 用户名排查 · 仅查询公开数据</div>

<div class="card">
  <h2>🌐 IP 追踪</h2>
  <p class="hint">查询 IP 归属地 / ASN / ISP / 时区。留空 = 查询你自己的出口 IP</p>
  <div class="row"><input id="ip" placeholder="例如 8.8.8.8"><button onclick="runIp()">查询</button></div>
  <div id="ipOut"></div>
</div>

<div class="card">
  <h2>📱 手机号追踪</h2>
  <p class="hint">号码有效性 / 归属地(国家级) / 运营商(CN 粗判) / 时区。国际格式需带 + 号</p>
  <div class="row"><select id="region"><option value="CN" selected>CN +86</option><option value="ID">ID +62</option><option value="US">US +1</option><option value="HK">HK +852</option><option value="TW">TW +886</option></select><input id="phone" placeholder="例如 +8613800138000"><button onclick="runPhone()">查询</button></div>
  <div id="phoneOut"></div>
</div>

<div class="card">
  <h2>👤 用户名排查</h2>
  <p class="hint">并发探测 19 个社媒平台是否注册该用户名（数据中心 IP 误报率高，结果仅供参考）</p>
  <div class="row"><input id="uname" placeholder="例如 octocat"><button onclick="runUser()">排查</button></div>
  <div id="userOut"></div>
</div>

<div class="docs">
  <h2>📡 API</h2>
  <table>
    <tr><td class="k">GET /api/health</td><td>探活</td></tr>
    <tr><td class="k">GET /api/ip</td><td><code>?ip=8.8.8.8</code>（可省略 = 访客 IP）</td></tr>
    <tr><td class="k">GET /api/phone</td><td><code>?number=+8613800138000&amp;region=CN</code></td></tr>
    <tr><td class="k">GET /api/username</td><td><code>?name=octocat</code></td></tr>
  </table>
  <p class="note">curl 示例：<code>curl "https://&lt;your-domain&gt;/api/ip?ip=1.1.1.1"</code></p>
</div>

<footer>移植自 <a href="https://github.com/HunxByts/GhostTrack" target="_blank" rel="noopener">HunxByts/GhostTrack</a> · 数据来源：ipwho.is / Google libphonenumber 元数据 · 仅供学习研究</footer>

<script>
function kvTable(obj) {
  var h = '<table>';
  for (var k in obj) {
    if (obj[k] === null || obj[k] === undefined) continue;
    var v = typeof obj[k] === 'object' ? JSON.stringify(obj[k]) : String(obj[k]);
    h += '<tr><td class="k">' + k + '</td><td>' + v + '</td></tr>';
  }
  return h + '</table>';
}
function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function out(id, htmlStr) { document.getElementById(id).innerHTML = htmlStr; }
function showErr(id, msg) { out(id, '<div class="err">✗ ' + esc(msg) + '</div>'); }

async function runIp() {
  var ip = document.getElementById('ip').value.trim();
  out('ipOut', '<p class="hint">查询中…</p>');
  try {
    var r = await fetch('/api/ip' + (ip ? '?ip=' + encodeURIComponent(ip) : ''));
    var d = await r.json();
    if (!d.success) return showErr('ipOut', d.error || '查询失败');
    out('ipOut', kvTable({
      'IP': d.ip, '类型': d.type, '国家': (d.country_zh || '') + ' ' + (d.country || ''),
      '城市': d.city, '地区': d.region, '经纬度': d.latitude + ', ' + d.longitude,
      '地图': d.maps_url ? '<a href="' + d.maps_url + '" target="_blank" rel="noopener">Google Maps</a>' : '',
      '邮编': d.postal, '大洲': d.continent, '欧盟': d.is_eu,
      'ASN': d.asn, 'ISP': d.isp, '组织': d.org,
      '时区': (d.timezone && d.timezone.id) || '',
      '当前时间': (d.timezone && d.timezone.current_time) || '',
      '数据源': d.source
    }));
  } catch (e) { showErr('ipOut', String(e)); }
}

async function runPhone() {
  var n = document.getElementById('phone').value.trim();
  var region = document.getElementById('region').value;
  if (!n) return showErr('phoneOut', '请输入电话号码');
  out('phoneOut', '<p class="hint">解析中…</p>');
  try {
    var r = await fetch('/api/phone?number=' + encodeURIComponent(n) + '&region=' + region);
    var d = await r.json();
    if (d.success === false) return showErr('phoneOut', d.error || '查询失败');
    if (!d.parse_ok) return showErr('phoneOut', d.error || '无法解析');
    var tz = d.timezones && d.timezones[0] ? d.timezones[0] : {};
    out('phoneOut', kvTable({
      '有效号码': d.valid ? '✅ 是' : '❌ 否', '位数合理': d.possible ? '✅' : '❌',
      '国家/地区': (d.country_zh || '') + ' (' + (d.region_code || '?') + ')',
      '国际格式': d.international, 'E.164': d.e164, '本地格式': d.national_format,
      '号码类型': d.type_zh, '运营商': d.carrier || '—（' + d.carrier_note + '）',
      '归属地': d.location + '（国家级近似）',
      '时区': tz.zone || '', '当地时间': tz.current_time || '', 'UTC 偏移': tz.utc_offset || ''
    }));
  } catch (e) { showErr('phoneOut', String(e)); }
}

var STATE_ZH = { found: '✓ 存在', not_found: '✗ 未注册', blocked_or_unknown: '⚠ 被拦/未知', error: '✗ 错误' };
async function runUser() {
  var name = document.getElementById('uname').value.trim();
  if (!name) return showErr('userOut', '请输入用户名');
  out('userOut', '<p class="hint">并发探测 19 个平台，约需 2-8 秒…</p>');
  try {
    var r = await fetch('/api/username?name=' + encodeURIComponent(name));
    var d = await r.json();
    if (d.success === false) return showErr('userOut', d.error || '查询失败');
    var chips = d.results.map(function (x) {
      return '<span class="chip ' + x.state + '" title="' + esc(x.url) + '">' + x.site + ' · ' + STATE_ZH[x.state] + '</span>';
    }).join('');
    out('userOut',
      '<p class="hint">存在 ' + d.summary.found + ' / 未注册 ' + d.summary.not_found + ' / 被拦或未知 ' + d.summary.blocked_or_unknown + ' / 出错 ' + d.summary.error + '</p>' +
      '<div class="chips">' + chips + '</div>');
  } catch (e) { showErr('userOut', String(e)); }
}
['ip','phone','uname'].forEach(function(id){
  document.getElementById(id).addEventListener('keydown', function(e){ if(e.key==='Enter'){ ({ip:runIp,phone:runPhone,uname:runUser})[id](); } });
});
</script>
</body>
</html>`;

export default async function onRequest() {
  return html(PAGE);
}
