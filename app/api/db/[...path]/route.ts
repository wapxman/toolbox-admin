// Серверный прокси к Supabase REST.
// Клиент админки (supabase-js) шлёт запросы сюда, а мы форвардим их в Supabase
// с СЕКРЕТНЫМ ключом (в обход RLS). Ключ живёт только на сервере, в браузер не попадает.
import { NextRequest } from 'next/server';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://zwzmcihwtwgjajjjsbms.supabase.co';

const SECRET = process.env.SUPABASE_SECRET_KEY || '';

// заголовки запроса, которые нужно пробрасывать в Supabase
const FWD_REQ = ['content-type', 'accept', 'prefer', 'range', 'range-unit'];
// заголовки ответа, которые нужно вернуть клиенту
const FWD_RESP = ['content-type', 'content-range', 'range-unit'];

async function proxy(req: NextRequest, ctx: { params: { path: string[] } }) {
  if (!SECRET) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_SECRET_KEY не задан на сервере админки' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }

  const path = (ctx.params.path || []).join('/');
  const target = `${SUPABASE_URL}/${path}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    apikey: SECRET,
    Authorization: `Bearer ${SECRET}`,
  };
  for (const h of FWD_REQ) {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  }

  const method = req.method;
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text();

  const resp = await fetch(target, { method, headers, body });
  const text = await resp.text();

  const outHeaders = new Headers();
  for (const h of FWD_RESP) {
    const v = resp.headers.get(h);
    if (v) outHeaders.set(h, v);
  }

  // Статусы без тела (204 No Content, 304 Not Modified) не могут иметь body —
  // иначе Response бросит ошибку. Отдаём пустой ответ.
  if (resp.status === 204 || resp.status === 304 || !text) {
    return new Response(null, { status: resp.status, headers: outHeaders });
  }
  return new Response(text, { status: resp.status, headers: outHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const HEAD = proxy;

export const dynamic = 'force-dynamic';
