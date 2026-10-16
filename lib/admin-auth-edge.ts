// Web Crypto only: middleware runs in Edge, where Node's crypto is unavailable.
// Preserve the HMAC format used by lib/admin-auth.ts in the Node API routes.
export const SESSION_DAYS = 30;
const encoder = new TextEncoder();

async function sessionKey(secret: string) {
  return crypto.subtle.importKey('raw', encoder.encode(`taketool-session:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function sessionSecret(): string {
  return (process.env.ADMIN_PASSWORD || '').trim() || (process.env.ADMIN_TOKEN || '').trim();
}

export async function issueSession(secret: string): Promise<string> {
  const issuedAt = Date.now().toString(36);
  const signature = await crypto.subtle.sign('HMAC', await sessionKey(secret), encoder.encode(issuedAt));
  const hex = Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
  return `${issuedAt}.${hex}`;
}

export async function verifySession(value: string | undefined, secret: string): Promise<boolean> {
  if (!value || !secret) return false;
  const match = /^([0-9a-z]+)\.([0-9a-f]{64})$/.exec(value);
  if (!match) return false;
  const ms = parseInt(match[1], 36);
  const age = Date.now() - ms;
  if (!Number.isSafeInteger(ms) || age < 0 || age >= SESSION_DAYS * 86400000) return false;
  const signature = Uint8Array.from(match[2].match(/../g)!, b => parseInt(b, 16));
  return crypto.subtle.verify('HMAC', await sessionKey(secret), signature, encoder.encode(match[1]));
}

