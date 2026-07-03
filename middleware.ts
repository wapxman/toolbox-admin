// Защита админки паролем (HTTP Basic Auth).
// Без пароля никто не откроет ни страницы, ни прокси /api/db к базе.
// Логин/пароль берутся из env ADMIN_USER / ADMIN_PASSWORD (Vercel).
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const USER = process.env.ADMIN_USER || 'admin';
  const PASS = process.env.ADMIN_PASSWORD || '';

  // Если пароль не задан — не блокируем (чтобы не запереть себя до настройки env).
  if (!PASS) return NextResponse.next();

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const i = decoded.indexOf(':');
      const u = decoded.slice(0, i);
      const p = decoded.slice(i + 1);
      if (u === USER && p === PASS) return NextResponse.next();
    } catch {
      // некорректный заголовок — попросим авторизацию ниже
    }
  }

  return new NextResponse('Требуется авторизация', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ToolBox Admin"' },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
