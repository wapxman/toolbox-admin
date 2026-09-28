// Защита админки. Два способа войти:
//
//  1. Ссылка-ключ:  https://<домен>/?k=<ADMIN_TOKEN>  — открыть один раз с телефона.
//     Токен сразу вычищается из адреса, а доступ дальше держится на cookie,
//     так что пароль вводить не нужно вообще никогда.
//  2. Пароль (ADMIN_PASSWORD) через HTTP Basic — запасной путь с компьютера.
//     Проверяется только пароль, логин любой (не спотыкаемся о раскладку).
//
// После входа ставим HttpOnly-cookie с хэшем пароля: по ней серверный прокси
// /api/db пускает data-запросы. Сам /api/db из matcher'а исключён, потому что
// supabase-js затирает Basic-заголовок своим Authorization.
//
// ВАЖНО: /api/db ходит в Supabase СЕКРЕТНЫМ ключом в обход RLS — оттуда видны
// телефоны клиентов, коды из sms_codes и платежи, причём на запись. Поэтому на
// проде (VERCEL) при незаданных ADMIN_PASSWORD/ADMIN_TOKEN доступ ЗАКРЫВАЕТСЯ,
// а не открывается: пустой env не должен выставлять базу наружу.
import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'taketool_admin';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // полгода — чтобы телефон не разлогинивался

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Сравнение за постоянное время: обычное === утекает длину общего префикса.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function setPass(res: NextResponse, hash: string) {
  res.cookies.set(AUTH_COOKIE, hash, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function middleware(req: NextRequest) {
  const PASS = (process.env.ADMIN_PASSWORD || '').trim();
  const TOKEN = (process.env.ADMIN_TOKEN || '').trim();
  const onVercel = !!process.env.VERCEL;

  if (!PASS && !TOKEN) {
    // Локально — не запираем себя до настройки env. На проде — наоборот, закрываем.
    if (!onVercel) return NextResponse.next();
    return new NextResponse(
      'Админка не настроена: не заданы ADMIN_PASSWORD и ADMIN_TOKEN.',
      { status: 503 },
    );
  }

  const expected = await sha256Hex(`taketool:${PASS}`);

  // 1. Уже входили с этого устройства.
  if (req.cookies.get(AUTH_COOKIE)?.value === expected) return NextResponse.next();

  // 2. Ссылка-ключ: ?k=<токен> — ставим cookie и убираем токен из адреса,
  //    чтобы он не осел в истории браузера и в заголовке Referer.
  const k = req.nextUrl.searchParams.get('k');
  if (TOKEN && k && safeEqual(k, TOKEN)) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete('k');
    const res = NextResponse.redirect(clean);
    setPass(res, expected);
    return res;
  }

  // 3. Пароль через Basic Auth.
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const i = decoded.indexOf(':');
      const pass = decoded.slice(i + 1).trim(); // логин игнорируем, берём только пароль
      if (PASS && safeEqual(pass, PASS)) {
        const res = NextResponse.next();
        setPass(res, expected);
        return res;
      }
    } catch {
      // некорректный заголовок — попросим авторизацию ниже
    }
  }

  return new NextResponse('Требуется авторизация', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Taketool Admin"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
