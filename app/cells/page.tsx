'use client';
// Ячейки: бокс нарисован, клик по ячейке открывает замок.
//
// ЗАЧЕМ ОТДЕЛЬНАЯ СТРАНИЦА. Открыть ячейку раньше можно было только с машины,
// у которой есть SSH к мини-ПК точки, — то есть фактически одним человеком.
// Здесь это делается из обычного браузера, под тем же входом, что и вся
// админка, и видно, какой именно замок уйдёт на плату.
//
// ⚠️ РАЗВОДКА ЯЧЕЙКА → ЗАМОК БЕРЁТСЯ ИЗ ТАБЛИЦЫ `cells`, А НЕ ВШИТА.
// Она НЕпоследовательная (у боевого бокса 1→0, 2→2, 3→5, 4→3, 5→1, 6→4), и
// фоллбэк «cell_number − 1» даёт НЕВЕРНЫЕ замки: ячейка 3 ушла бы на замок 2
// вместо 5. Поэтому ячейка без заполненного kerong_lock_number здесь не
// кликается вовсе — лучше не открыть ничего, чем открыть чужую дверцу.
// Номер замка подписан на плитке: человек видит, что именно он нажимает.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Cell = {
  id: string; cell_number: number; kerong_lock_number: number | null; box_id: string;
  status: string; pending_rental_id: string | null;
};
type Box = { id: string; name: string; address: string; status: string; kerong_zone_id: number | null };
type Pending = { id: string; order_number: number; tools: any; users: any };

export default function CellsPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [pending, setPending] = useState<Record<string, Pending>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    // ⚠️ Статус ячейки грузим обязательно. Без него ячейка, ждущая приёмки, не
    // отличалась от свободной, и очередь приёмки было не из чего построить:
    // возврат в бокс оставлял pending_check навсегда, а штатной кнопки
    // «инструмент на месте» в админке не существовало вовсе.
    const [b, c] = await Promise.all([
      supabase.from('boxes').select('id,name,address,status,kerong_zone_id').order('created_at'),
      supabase.from('cells').select('id,cell_number,kerong_lock_number,box_id,status,pending_rental_id').order('cell_number'),
    ]);
    const cl = (c.data as Cell[]) || [];
    setBoxes((b.data as Box[]) || []);
    setCells(cl);

    // Заказы, по которым ждёт приёмка. Отдельным запросом, а не связью: имя
    // внешнего ключа — не то, на чём должен держаться экран.
    const ids = cl.filter((x) => x.status === 'pending_check' && x.pending_rental_id)
                  .map((x) => x.pending_rental_id as string);
    if (ids.length) {
      const { data } = await supabase
        .from('rentals')
        .select('id, order_number, tools(name), users(phone, name)')
        .in('id', ids);
      const map: Record<string, Pending> = {};
      for (const r of (data as any[]) || []) map[r.id] = r as Pending;
      setPending(map);
    } else {
      setPending({});
    }
    setLoading(false);
  }

  // Приёмка возврата. Подтверждает ТОТ заказ, который поставил ячейку на
  // проверку, — сервер сверяет это сам и отвечает конфликтом на чужой.
  async function acceptReturn(cell: Cell, action: 'return_verified' | 'return_missing') {
    const r = cell.pending_rental_id ? pending[cell.pending_rental_id] : null;
    const what = r ? `заказ №${r.order_number} (${r.tools?.name || 'инструмент'})` : 'возврат';
    const ask = action === 'return_verified'
      ? `Подтвердить, что инструмент лежит в ячейке ${cell.cell_number}? ${what} — ячейка станет свободной.`
      : `Инструмента НЕТ в ячейке ${cell.cell_number}? ${what} — ячейка и инструмент уйдут в обслуживание.`;
    if (!confirm(ask)) return;
    setBusy(cell.id);
    try {
      const resp = await fetch(`/api/orders/${cell.pending_rental_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const j = await resp.json().catch(() => ({}));
      setLog(resp.ok
        ? { ok: true, text: action === 'return_verified'
            ? `Ячейка ${cell.cell_number}: приёмка подтверждена, ячейка свободна.`
            : `Ячейка ${cell.cell_number}: отмечено, что инструмента нет — ячейка и инструмент выведены из оборота.` }
        : { ok: false, text: `Ячейка ${cell.cell_number}: ${j.error || resp.status}` });
    } catch (e: any) {
      setLog({ ok: false, text: `Ячейка ${cell.cell_number}: сбой запроса — ${e.message}` });
    }
    setBusy(null);
    await load();
  }

  async function checkLink() {
    setLink({ ok: true, text: 'Проверяю связь…' });
    try {
      const r = await fetch('/api/locks');
      const d = await r.json();
      setLink(d.ok ? { ok: true, text: 'Связь с платой есть' } : { ok: false, text: d.error || 'Связи нет' });
    } catch (e: any) {
      setLink({ ok: false, text: `Не удалось спросить: ${e.message}` });
    }
  }

  async function openCell(box: Box, cell: Cell) {
    if (cell.kerong_lock_number == null || box.kerong_zone_id == null) return;
    setBusy(cell.id);
    setLog({ ok: true, text: `Открываю ячейку ${cell.cell_number} (замок №${cell.kerong_lock_number})…` });
    try {
      const r = await fetch('/api/locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zoneId: box.kerong_zone_id, lockNumber: cell.kerong_lock_number }),
      });
      const d = await r.json();
      setLog(d.ok
        ? { ok: true, text: `Ячейка ${cell.cell_number}: команда принята платой. Проверьте глазами — ответ платы физического открытия не доказывает.` }
        : { ok: false, text: `Ячейка ${cell.cell_number}: не открылась. ${d.error || ''}` });
    } catch (e: any) {
      setLog({ ok: false, text: `Ячейка ${cell.cell_number}: сбой запроса — ${e.message}` });
    }
    setBusy(null);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ячейки</h2>
          <p className="text-sm text-gray-500 mt-1">Нажмите ячейку, чтобы открыть замок</p>
        </div>
        <button onClick={checkLink} className="btn-secondary text-sm">Проверить связь</button>
      </div>

      {link && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${link.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {link.text}
        </div>
      )}

      {/* Очередь приёмки. Открытый замок не доказывает, что инструмент
          положили, поэтому после возврата ячейка ждёт живого человека. Пока
          этой очереди не было, ячейки зависали в pending_check навсегда. */}
      {cells.some((c) => c.status === 'pending_check') && (
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Ждут приёмки</h3>
          <p className="text-sm text-gray-500 mb-4">
            Клиент заявил возврат и замок открылся. Посмотрите в ячейку и подтвердите — до этого она никому не выдаётся.
          </p>
          <div className="space-y-2">
            {cells.filter((c) => c.status === 'pending_check').map((c) => {
              const r = c.pending_rental_id ? pending[c.pending_rental_id] : null;
              const boxName = boxes.find((b) => b.id === c.box_id)?.name || '';
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900">
                      Ячейка {c.cell_number}
                      <span className="text-gray-400 font-normal"> · {boxName}</span>
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {r
                        ? `№${r.order_number} · ${r.tools?.name || 'инструмент'} · ${r.users?.phone || ''}`
                        : 'заказ не определён — подтвердить нельзя'}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => acceptReturn(c, 'return_verified')}
                      disabled={busy === c.id || !c.pending_rental_id}
                      className="btn-primary text-sm disabled:opacity-40"
                    >
                      Инструмент на месте
                    </button>
                    <button
                      onClick={() => acceptReturn(c, 'return_missing')}
                      disabled={busy === c.id || !c.pending_rental_id}
                      className="btn-secondary text-sm disabled:opacity-40"
                    >
                      Не найден
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {boxes.map((box) => {
        const own = cells.filter((c) => c.box_id === box.id);
        return (
          <div key={box.id} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">{box.name}</h3>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${box.status === 'online' ? 'text-emerald-600' : 'text-red-500'}`}>
                <span className={`w-2 h-2 rounded-full ${box.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                {box.status === 'online' ? 'Онлайн' : 'Оффлайн'}
              </span>
            </div>
            <div className="text-sm text-gray-500 mb-4">📍 {box.address}</div>

            {box.kerong_zone_id == null ? (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                У бокса не задан kerong_zone_id — открывать нечем.
              </div>
            ) : own.length === 0 ? (
              <div className="text-sm text-gray-400">У бокса нет ячеек в таблице cells.</div>
            ) : (
              // Сам «шкаф»: рамка и сетка 2×3, как бокс стоит физически.
              <div className="inline-grid grid-cols-2 gap-3 p-3 rounded-2xl border-2 border-gray-200 bg-gray-50">
                {own.map((c) => {
                  const dead = c.kerong_lock_number == null;
                  return (
                    <button
                      key={c.id}
                      onClick={() => openCell(box, c)}
                      disabled={dead || busy === c.id}
                      title={dead ? 'Не задан kerong_lock_number' : `Откроет замок №${c.kerong_lock_number}`}
                      className={`w-32 h-24 rounded-xl border flex flex-col items-center justify-center gap-1 transition
                        ${dead
                          ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 active:scale-95'}
                        ${busy === c.id ? 'opacity-50' : ''}`}
                    >
                      <span className="text-3xl font-bold text-gray-900">{c.cell_number}</span>
                      <span className="text-[11px] text-gray-400">
                        {dead ? 'замок не задан' : `замок №${c.kerong_lock_number}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {log && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${log.ok ? 'border-gray-200 bg-gray-50 text-gray-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {log.text}
        </div>
      )}
    </div>
  );
}
