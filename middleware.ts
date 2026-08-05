// Защита админки паролем (HTTP Basic Auth).
// Проверяется ТОЛЬКО пароль (ADMIN_PASSWORD) — логин можно вводить любой.
// Так надёжнее: не спотыкаемся о кириллицу/раскладку в имени пользователя.
//
// После успешного входа ставим HttpOnly-cookie с хэшем пароля: по ней серверный
// прокси /api/db пускает data-запросы. Сам /api/db из matcher'а исключён,
// потому что supabase-js затирает Basic-заголовок своим Authorization.
import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'taketool_admin';

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(req: NextRequest) {
  const PASS = (process.env.ADMIN_PASSWORD || '').trim();

  // Если пароль не задан — не блокируем (чтобы не запереть себя до настройки env).
  if (!PASS) return NextResponse.next();

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const i = decoded.indexOf(':');
      const pass = decoded.slice(i + 1).trim(); // логин игнорируем, берём только пароль
      if (pass === PASS) {
        const res = NextResponse.next();
        // Cookie-пропуск для /api/db: хэш пароля, сам пароль в cookie не кладём.
        res.cookies.set(AUTH_COOKIE, await sha256Hex(`taketool:${PASS}`), {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        });
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
