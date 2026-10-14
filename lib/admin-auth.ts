// Проверка админской сессии.
//
// ⚠️ Раньше cookie была равна SHA256("taketool:" + пароль) — постоянное
// значение без срока. Украли её однажды — доступ остаётся навсегда, отозвать
// одного сотрудника нельзя, и по записи не понять, кто её сделал.
//
// Теперь в cookie лежит «когда выдана» и подпись этого момента секретом,
// который знает только сервер. Срок проверяется при каждом запросе, подпись
// не даёт подделать дату. Сменили ADMIN_PASSWORD — все прежние сессии разом
// перестают подходить.
import { createHmac, timingSafeEqual } from 'crypto';

/** Сколько живёт сессия. Полгода — это не сессия, это пароль на бумажке. */
export const SESSION_DAYS = 30;

const COOKIE = 'taketool_admin';

function sign(payload: string, pass: string): string {
  return createHmac('sha256', `taketool-session:${pass}`).update(payload).digest('hex');
}

/** Значение cookie для только что вошедшего. */
export function issueSession(pass: string): string {
  const issuedAt = Date.now().toString(36);
  return `${issuedAt}.${sign(issuedAt, pass)}`;
}

/** Действительна ли сессия: подпись сходится и срок не вышел. */
export function verifySession(value: string | undefined, pass: string): boolean {
  if (!value || !pass) return false;

  const dot = value.indexOf('.');
  if (dot <= 0) return false;

  const issuedAt = value.slice(0, dot);
  const given = value.slice(dot + 1);
  const expected = sign(issuedAt, pass);

  // Сравнение за постоянное время: обычное === утекает длину общего префикса.
  const a = Buffer.from(given, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const ms = parseInt(issuedAt, 36);
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms < SESSION_DAYS * 24 * 3600 * 1000;
}

/** Достать и проверить сессию из запроса. */
export function isAuthorized(req: { cookies: { get(name: string): { value: string } | undefined } }): boolean {
  const pass = (process.env.ADMIN_PASSWORD || '').trim();
  // Пароль не задан: локально не запираем себя до настройки env, на проде —
  // закрываем. Пустая настройка не должна означать «открыто всем».
  if (!pass) return !process.env.VERCEL;
  return verifySession(req.cookies.get(COOKIE)?.value, pass);
}

export const AUTH_COOKIE = COOKIE;
