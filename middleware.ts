// Защита админки паролем (HTTP Basic Auth).
// Проверяется ТОЛЬКО пароль (ADMIN_PASSWORD) — логин можно вводить любой.
// Так надёжнее: не спотыкаемся о кириллицу/раскладку в имени пользователя.
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const PASS = (process.env.ADMIN_PASSWORD || '').trim();

  // Если пароль не задан — не блокируем (чтобы не запереть себя до настройки env).
  if (!PASS) return NextResponse.next();

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const i = decoded.indexOf(':');
      const pass = decoded.slice(i + 1).trim(); // логин игнорируем, берём только пароль
      if (pass === PASS) return NextResponse.next();
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
