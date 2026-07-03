import { createClient } from '@supabase/supabase-js';

// Клиент админки ходит НЕ напрямую в Supabase, а через серверный прокси /api/db,
// который подставляет секретный ключ на сервере (в обход RLS). Так секретный ключ
// не попадает в браузер, а публичный anon-ключ больше не нужен.
function proxyUrl() {
  if (typeof window !== 'undefined') return `${window.location.origin}/api/db`;
  // на сервере/сборке — заглушка (реальные запросы идут из браузера)
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return `${site}/api/db`;
}

// ключ-заглушка: прокси всё равно перезапишет его серверным секретом
export const supabase = createClient(proxyUrl(), 'proxy');
