// GET /api/health — 部署探活
import { json } from '../lib/http.js';

export default async function onRequest({ request }) {
  const h = request.headers;
  const ipHeaders = {};
  for (const [k, v] of h.entries()) {
    if (/ip|forward|real|connect/i.test(k)) ipHeaders[k] = v;
  }
  return json({
    status: 'ok',
    service: 'ghosttrack-web',
    version: '2.2-edgeone',
    time: new Date().toISOString(),
    eo_object: typeof request.eo === 'object' && request.eo ? Object.keys(request.eo) : null,
    ip_headers: ipHeaders,
    all_header_names: [...h.keys()],
  });
}
