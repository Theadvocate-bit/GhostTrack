// GET /api/health — 部署探活
import { json } from '../lib/http.js';

export default async function onRequest() {
  return json({
    status: 'ok',
    service: 'ghosttrack-web',
    version: '2.2-edgeone',
    time: new Date().toISOString(),
  });
}
