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

type Cell = { id: string; cell_number: number; kerong_lock_number: number | null; box_id: string };
type Box = { id: string; name: string; address: string; status: string; kerong_zone_id: number | null };

export default function CellsPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<{ ok: boolean; text: string } | null>(null);
  const [link, setLink] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [b, c] = await Promise.all([
      supabase.from('boxes').select('id,name,address,status,kerong_zone_id').order('created_at'),
      supabase.from('cells').select('id,cell_number,kerong_lock_number,box_id').order('cell_number'),
    ]);
    setBoxes((b.data as Box[]) || []);
    setCells((c.data as Cell[]) || []);
    setLoading(false);
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
