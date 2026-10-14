'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const STATUS_LABELS: Record<string, string> = {
  active: 'Активна',
  completed: 'Завершена',
  pending_payment: 'Ждёт оплаты',
  pending_delivery: 'В доставке',
  cancelled: 'Отменена',
  overdue: 'Просрочена',
};

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'pending_payment', label: 'Ждут оплаты' },
  { key: 'pending_delivery', label: 'В доставке' },
  { key: 'penalty', label: 'Штрафы' },
  { key: 'overdue', label: 'Просроченные' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
];

function badgeClass(status: string) {
  return status === 'active' ? 'badge-blue'
    : status === 'completed' ? 'badge-green'
    : status === 'pending_payment' ? 'badge-yellow'
    : status === 'pending_delivery' ? 'badge-blue'
    : status === 'cancelled' ? 'badge-gray'
    : 'badge-red';
}

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => { loadRentals(); }, []);

  async function loadRentals() {
    const { data, error } = await supabase
      .from('rentals')
      .select('*, tools(name, brand, cell_id, cells(cell_number, boxes(name))), users(phone, name)')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    setRentals(data || []);
    setLoading(false);
  }

  // Действия над заказом идут ТОЛЬКО через сервер.
  //
  // ⚠️ Раньше эта страница правила базу напрямую: сама ставила статусы и
  // освобождала ячейки. Мимо проходили все правила — просрочка не считалась,
  // штраф не выставлялся, списанный бонус не возвращался, неоплаченный счёт на
  // продление оставался живым, а ноль изменённых строк выглядел как успех.
  // Сервер делает это одним согласованным переходом и отвечает конфликтом,
  // если заказ успел измениться.
  async function orderAction(r: any, action: string, ask: string) {
    if (!confirm(ask)) return null;
    setBusyId(r.id);
    const resp = await fetch(`/api/orders/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) alert(`Ошибка: ${j.error || resp.status}`);
    setBusyId(null);
    loadRentals();
    return resp.ok ? j : null;
  }

  // Завершить аренду вручную: инструмент принят сотрудником на месте.
  // Замок из админки не открываем — это делает точка/приложение.
  async function closeRental(r: any) {
    const j = await orderAction(r, 'close_rental',
      `Завершить аренду «${r.tools?.name}» (${r.users?.phone})? Ячейка станет свободной, за просрочку выставится счёт.`);
    if (j && j.overdue_fee > 0) {
      alert(`Аренда закрыта. Штраф ${Number(j.overdue_fee).toLocaleString('ru-RU')} сўм`
        + (j.penalty_order_number ? ` — счёт №${j.penalty_order_number}` : ''));
    }
  }

  // Аннулировать неоплаченный штраф: уведомление клиенту, снятие блокировки.
  async function waivePenalty(r: any) {
    await orderAction(r, 'waive_penalty',
      `Списать штраф ${r.total_price?.toLocaleString()} сўм (${r.users?.phone})? Клиент снова сможет арендовать.`);
  }

  // Отменить неоплаченный заказ: сервер вернёт списанный бонус и известит клиента.
  async function cancelRental(r: any) {
    await orderAction(r, 'cancel', `Отменить неоплаченную аренду «${r.tools?.name}»?`);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  const shown = filter === 'all' ? rentals : filter === 'penalty' ? rentals.filter((r) => r.kind === 'penalty') : rentals.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Аренды и заказы</h2>
        <p className="text-sm text-gray-500 mt-1">{shown.length} из {rentals.length} аренд</p></div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">Ошибка загрузки: {error}</div>}

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.key ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">
              {f.key === 'all' ? rentals.length : f.key === 'penalty' ? rentals.filter((r) => r.kind === 'penalty').length : rentals.filter((r) => r.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {shown.length === 0 ? <div className="p-8 text-center text-gray-400">Нет аренд</div> : (
          <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
            <th className="px-5 py-3">Пользователь</th><th className="px-5 py-3">Инструмент</th><th className="px-5 py-3">Тип</th>
            <th className="px-5 py-3">Бокс</th><th className="px-5 py-3">Срок</th>
            <th className="px-5 py-3">Сумма</th><th className="px-5 py-3">Статус</th><th className="px-5 py-3"></th>
          </tr></thead><tbody>
            {shown.map((r: any) => (
              <tr key={r.id} className="table-row">
                <td className="px-5 py-3 text-sm">{r.users?.phone || '—'}<br/><span className="text-xs text-gray-400">{r.users?.name}</span></td>
                <td className="px-5 py-3 text-sm font-medium">{r.tools?.name || '—'}<br/><span className="text-xs text-gray-400">{r.tools?.brand}</span></td>
                <td className="px-5 py-3 text-sm">{r.kind === 'buy' ? 'Покупка' : r.kind === 'courier_return' ? 'Возврат курьером' : r.kind === 'penalty' ? '⚠️ Штраф за просрочку' : 'Аренда'}<br/>
                  <span className="text-xs text-gray-400">{r.fulfillment === 'delivery' ? '🚚 доставка' : '📦 из бокса'}{r.order_number ? ` · №${r.order_number}` : ''}</span></td>
                <td className="px-5 py-3 text-sm">{r.tools?.cells?.boxes?.name || '—'}<br/>
                  <span className="text-xs text-gray-400">{r.tools?.cells?.cell_number != null ? `ячейка ${r.tools.cells.cell_number}` : ''}</span></td>
                <td className="px-5 py-3 text-sm">{fmtDate(r.started_at)} → {fmtDate(r.expected_end)}<br/>
                  <span className="text-xs text-gray-400">{r.days} дн.{r.overdue_fee > 0 ? ` · штраф ${r.overdue_fee.toLocaleString()}` : ''}</span></td>
                <td className="px-5 py-3 text-sm font-medium">{r.total_price?.toLocaleString()} сўм</td>
                <td className="px-5 py-3"><span className={`badge ${badgeClass(r.status)}`}>{STATUS_LABELS[r.status] || 'Просрочена'}</span></td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  {(r.status === 'active' || r.status === 'overdue') && (
                    <button onClick={() => closeRental(r)} disabled={busyId === r.id}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium disabled:opacity-50">
                      Завершить
                    </button>
                  )}
                  {r.status === 'pending_payment' && r.kind === 'penalty' && (
                    <button onClick={() => waivePenalty(r)} disabled={busyId === r.id}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium disabled:opacity-50">
                      Списать штраф
                    </button>
                  )}
                  {r.status === 'pending_payment' && r.kind !== 'penalty' && (
                    <button onClick={() => cancelRental(r)} disabled={busyId === r.id}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium disabled:opacity-50">
                      Отменить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  );
}
