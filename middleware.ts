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
// телефоны клиентов, коды из sms_codes и платежи, причём на запись. Поэтому в
// боевой сборке при незаданных ADMIN_PASSWORD/ADMIN_TOKEN доступ ЗАКРЫВАЕТСЯ,
// а не открывается: пустой env не должен выставлять базу наружу. Признак —
// именно сборка (NODE_ENV), а не хостинг: раньше условием был Vercel, и та же
// админка, поднятая в другом месте, пускала к базе без пароля.
import { NextRequest, NextResponse } from 'next/server';
import { issueSession, verifySession, SESSION_DAYS, sessionSecret } from './lib/admin-auth';

const AUTH_COOKIE = 'taketool_admin';
// Срок сессии задаётся в lib/admin-auth: полгода — это не сессия, а пароль
// на бумажке. Cookie теперь подписана и содержит дату выдачи.
const COOKIE_MAX_AGE = 60 * 60 * 24 * SESSION_DAYS;


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
  // Чем подписываем сессию: пароль, а если его нет — токен. В режиме «только
  // ссылка» пароля нет, и подпись пустой строкой verifySession отвергала —
  // ссылка срабатывала один раз и переставала работать.
  const SECRET = sessionSecret();

  if (!SECRET) {
    // ⚠️ Решаем по сборке, а не по хостингу: ненастроенная боевая админка
    // обязана молчать, где бы её ни подняли. Для местной разработки оставляем
    // открытой, чтобы не запирать себя до настройки env.
    if (process.env.NODE_ENV !== 'production') return NextResponse.next();
    return new NextResponse(
      'Админка не настроена: не заданы ADMIN_PASSWORD и ADMIN_TOKEN.',
      { status: 503 },
    );
  }

  // 1. Уже входили с этого устройства — проверяем подпись и срок сессии.
  if (verifySession(req.cookies.get(AUTH_COOKIE)?.value, SECRET)) return NextResponse.next();

  // 2. Ссылка-ключ: ?k=<токен> — ставим cookie и убираем токен из адреса,
  //    чтобы он не осел в истории браузера и в заголовке Referer.
  const k = req.nextUrl.searchParams.get('k');
  if (TOKEN && k && safeEqual(k, TOKEN)) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete('k');
    const res = NextResponse.redirect(clean);
    setPass(res, issueSession(SECRET));
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
        setPass(res, issueSession(SECRET));
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
