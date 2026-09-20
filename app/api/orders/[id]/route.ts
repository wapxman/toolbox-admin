// Серверный прокси к бэкенду: переходы статусов заказов с доставкой.
// Секрет ADMIN_API_SECRET живёт только на сервере админки, в браузер не уходит.
// Доступ — по той же cookie, что и /api/db (ставится после Basic-входа).
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

const BACKEND = (process.env.BACKEND_URL || 'https://toolbox-backend-eight.vercel.app').replace(/\/$/, '');

function isAuthorized(req: NextRequest): boolean {
  const PASS = (process.env.ADMIN_PASSWORD || '').trim();
  if (!PASS) return true;
  const expected = createHash('sha256').update(`taketool:${PASS}`, 'utf8').digest('hex');
  return req.cookies.get('taketool_admin')?.value === expected;
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
  }
  const secret = process.env.ADMIN_API_SECRET || '';
  if (!secret) {
    return Response.json({ error: 'ADMIN_API_SECRET не задан на сервере админки' }, { status: 500 });
  }
  const body = await req.text();
  const resp = await fetch(`${BACKEND}/api/admin/orders/${encodeURIComponent(ctx.params.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
    body,
  });
  const text = await resp.text();
  return new Response(text, { status: resp.status, headers: { 'content-type': 'application/json' } });
}
