// 本地冒烟测试：node tools/smoke_test.mjs（需要 Node 18+，含真实网络调用）
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EF = join(ROOT, 'edge-functions');
let pass = 0, fail = 0, warn = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✅', name, extra); }
  else { fail++; console.log('  ❌', name, extra); }
};
const soft = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✅', name, extra); }
  else { warn++; console.log('  ⚠️', name, '(软断言/网络环境相关)', extra); }
};
const call = async (file, url) => {
  const mod = await import(pathToFileURL(join(EF, file)).href);
  const res = await mod.default({ request: new Request(url), params: {} });
  return res;
};

console.log('\n== 1. 静态检查 ==');
// 1a. import 边界：所有相对导入必须留在 edge-functions/ 内
{
  let bad = [];
  const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = join(d, e.name);
    if (e.isDirectory()) return walk(p);
    if (!/\.(js|mjs)$/.test(e.name)) return;
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(/(?:from|import)\s+['"](\.\.?\/[^'"]+)['"]/g)) {
      const resolved = resolve(dirname(p), m[1]);
      if (!resolved.startsWith(EF)) bad.push(`${e.name} -> ${m[1]}`);
    }
  });
  walk(EF);
  ok('import 边界（无跨出 edge-functions/ 的导入）', bad.length === 0, bad.join('; '));
}
// 1b. 体积
{
  let total = 0;
  const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = join(d, e.name);
    if (e.isDirectory()) return walk(p);
    total += statSync(p).size;
  });
  walk(EF);
  ok(`代码包体积 < 5MB（实际 ${(total / 1024).toFixed(0)}KB）`, total < 5 * 1024 * 1024);
}
// 1c. 必备文件
for (const f of ['edgeone.json', 'edge-functions/index.js', 'edge-functions/api/ip.js',
  'edge-functions/api/phone.js', 'edge-functions/api/username.js', 'edge-functions/api/health.js']) {
  ok(`存在 ${f}`, (() => { try { statSync(join(ROOT, f)); return true; } catch { return false; } })());
}

console.log('\n== 2. 路由：/ 与 /api/health ==');
{
  const res = await call('index.js', 'https://x.test/');
  const body = await res.text();
  ok('GET / → 200 + HTML', res.status === 200 && body.includes('<title>GhostTrack Web'));
  ok('HTML 含三个工具区块', body.includes('IP 追踪') && body.includes('手机号追踪') && body.includes('用户名排查'));
}
{
  const res = await call('api/health.js', 'https://x.test/api/health');
  const d = await res.json();
  ok('GET /api/health → ok', res.status === 200 && d.status === 'ok' && d.service === 'ghosttrack-web');
}

console.log('\n== 3. /api/phone（本地逻辑，真实 vendor 库）==');
{
  const res = await call('api/phone.js', 'https://x.test/api/phone?number=%2B8613800138000');
  const d = await res.json();
  ok('+8613800138000 → valid', d.parse_ok && d.valid === true);
  ok('  region=CN', d.region_code === 'CN' && d.country_zh === '中国');
  ok('  E.164', d.e164 === '+8613800138000');
  ok('  CN 运营商粗判=中国移动', d.carrier === '中国移动', `实际: ${d.carrier}`);
  ok('  时区=Asia/Shanghai', d.timezones?.[0]?.zone === 'Asia/Shanghai');
  ok('  type=手机号', d.type_zh === '手机号');
}
{
  const res = await call('api/phone.js', 'https://x.test/api/phone?number=%2B6281234567890');
  const d = await res.json();
  ok('+6281234567890 → valid ID', d.parse_ok && d.valid === true && d.region_code === 'ID' && ['印尼','印度尼西亚'].includes(d.country_zh));
  ok('  海外无运营商字段', d.carrier === null);
}
{
  const res = await call('api/phone.js', 'https://x.test/api/phone?number=%2B999123');
  const d = await res.json();
  ok('+999123 → parse_ok=false（不炸）', res.status === 200 && d.parse_ok === false);
}
{
  const res = await call('api/phone.js', 'https://x.test/api/phone');
  ok('缺 number → 400', res.status === 400);
}

console.log('\n== 4. /api/ip（真实网络）==');
{
  try {
    const res = await call('api/ip.js', 'https://x.test/api/ip?ip=8.8.8.8');
    const d = await res.json();
    soft('8.8.8.8 → success', res.status === 200 && d.success === true, `source=${d.source}`);
    soft('  关键字段', d.country === 'United States' || !!d.country, `country=${d.country}`);
    soft('  maps_url', typeof d.maps_url === 'string' && d.maps_url.includes('maps'));
  } catch (e) { soft('ipwho.is 可达', false, String(e).slice(0, 60)); }
}
{
  const res = await call('api/ip.js', 'https://x.test/api/ip?ip=not-an-ip');
  ok('非法 IP → 400', res.status === 400);
}

console.log('\n== 5. /api/username（真实网络，软断言）==');
{
  try {
    const res = await call('api/username.js', 'https://x.test/api/username?name=octocat');
    const d = await res.json();
    soft('octocat → 19 站点结果', res.status === 200 && d.summary.checked === 19, JSON.stringify(d.summary));
    soft('  GitHub 存在', d.results.find((r) => r.site === 'GitHub')?.state === 'found');
    soft('  死站已移除', !d.results.some((r) => ['Periscope', 'StumbleUpon', 'Ello', 'We Heart It'].includes(r.site)));
  } catch (e) { soft('username API 可用', false, String(e).slice(0, 60)); }
}
{
  const res = await call('api/username.js', 'https://x.test/api/username?name=bad%20name!');
  ok('非法用户名 → 400', res.status === 400);
}

console.log(`\n========== 结果: ${pass} 通过 / ${fail} 失败 / ${warn} 软警告 ==========`);
process.exit(fail > 0 ? 1 : 0);
