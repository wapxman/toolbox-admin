// Серверный прокси к бэкенду: открытие замков и проверка связи с платой.
//
// Секрет ADMIN_API_SECRET живёт ТОЛЬКО на сервере админки и в браузер не уходит
// (прод-значение лежит в env Vercel-проекта toolbox-admin; локальный .env
// намеренно девовый, прод его не принимает). Доступ — по той же cookie, что у
// /api/db и /api/orders: ставится после входа в админку.
//
// Образец взят у app/api/orders/[id]/route.ts, чтобы не заводить второй способ
// ходить в бэкенд с секретом.
//
// ⚠️ Бэкенд отвечает fail-closed: при неверном или отсутствующем секрете роут
// отдаёт 404 «Not found» — ровно то же, что при несуществующем роуте. Поэтому
// 404 здесь НЕ значит «такого URL нет», и сообщение об ошибке это проговаривает,
// иначе следующий разбор уйдёт искать опечатку в пути вместо секрета.
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

const BACKEND = (process.env.BACKEND_URL || 'https://toolbox-backend-eight.vercel.app').replace(/\/$/, '');

function isAuthorized(req: NextRequest): boolean {
  const PASS = (process.env.ADMIN_PASSWORD || '').trim();
  if (!PASS) return true;
  const expected = createHash('sha256').update(`taketool:${PASS}`, 'utf8').digest('hex');
  return req.cookies.get('taketool_admin')?.value === expected;
}

function explain(status: number, raw: string): string {
  if (status === 404) {
    return 'Бэкенд ответил 404. У служебных роутов замков это fail-closed: так же он отвечает ' +
           'на НЕВЕРНЫЙ ADMIN_API_SECRET. Проверьте переменную в Vercel-проекте toolbox-admin.';
  }
  if (status === 500) {
    return 'Бэкенд не смог достучаться до платы. Обычно это LCS на точке: мини-ПК выключен, ' +
           'Ethernet отключён или KERONG_LCS_URL в env бэкенда указывает на мёртвый туннель.';
  }
  return raw.slice(0, 300);
}

// GET /api/locks — проверка связи бэкенд → плата (без открытия чего-либо).
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
  const secret = process.env.ADMIN_API_SECRET || '';
  if (!secret) return Response.json({ ok: false, error: 'ADMIN_API_SECRET не задан на сервере админки' }, { status: 500 });
  try {
    const resp = await fetch(`${BACKEND}/api/locks/status`, { headers: { 'X-Admin-Secret': secret } });
    const text = await resp.text();
    if (!resp.ok) return Response.json({ ok: false, status: resp.status, error: explain(resp.status, text) }, { status: 200 });
    return Response.json({ ok: true, status: resp.status, data: JSON.parse(text || '{}') });
  } catch (e: any) {
    return Response.json({ ok: false, error: `Бэкенд недоступен: ${e.message}` }, { status: 200 });
  }
}

// POST /api/locks — открыть один замок. Тело: { zoneId, lockNumber }.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
  const secret = process.env.ADMIN_API_SECRET || '';
  if (!secret) return Response.json({ ok: false, error: 'ADMIN_API_SECRET не задан на сервере админки' }, { status: 500 });

  const body = await req.json().catch(() => ({} as any));
  const zoneId = body?.zoneId;
  const lockNumber = body?.lockNumber;

  // ⚠️ Нумерация замков 0-based: проверяем на null/undefined, а НЕ на
  // «пустоту», иначе lockNumber = 0 (это ячейка 1) отвергался бы как не
  // заданный. Та же проверка стоит в бэкенде по той же причине.
  if (zoneId == null || lockNumber == null) {
    return Response.json({ ok: false, error: 'Не переданы zoneId и lockNumber' }, { status: 400 });
  }

  try {
    const resp = await fetch(`${BACKEND}/api/locks/open`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Secret': secret },
      body: JSON.stringify({ zoneId, lockNumber }),
    });
    const text = await resp.text();
    if (!resp.ok) return Response.json({ ok: false, status: resp.status, error: explain(resp.status, text) }, { status: 200 });
    return Response.json({ ok: true, status: resp.status, data: JSON.parse(text || '{}') });
  } catch (e: any) {
    return Response.json({ ok: false, error: `Бэкенд недоступен: ${e.message}` }, { status: 200 });
  }
}
