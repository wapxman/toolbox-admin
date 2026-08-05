'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const STATUS_LABELS: Record<string, string> = {
  active: 'Активна',
  completed: 'Завершена',
  pending_payment: 'Ждёт оплаты',
  cancelled: 'Отменена',
  overdue: 'Просрочена',
};

const FILTERS = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'pending_payment', label: 'Ждут оплаты' },
  { key: 'overdue', label: 'Просроченные' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
];

function badgeClass(status: string) {
  return status === 'active' ? 'badge-blue'
    : status === 'completed' ? 'badge-green'
    : status === 'pending_payment' ? 'badge-yellow'
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

  // Завершить аренду вручную (инструмент принят на месте): статус, дата, ячейка → free.
  // Замок из админки не открываем — это делает точка/приложение.
  async function closeRental(r: any) {
    if (!confirm(`Завершить аренду «${r.tools?.name}» (${r.users?.phone})? Ячейка станет свободной.`)) return;
    setBusyId(r.id);
    const { error: e1 } = await supabase.from('rentals')
      .update({ status: 'completed', actual_end: new Date().toISOString() })
      .eq('id', r.id);
    if (!e1 && r.tools?.cell_id) {
      await supabase.from('cells').update({ status: 'free' }).eq('id', r.tools.cell_id);
    }
    if (e1) alert(`Ошибка: ${e1.message}`);
    setBusyId(null);
    loadRentals();
  }

  // Отменить неоплаченную аренду. Ячейка не резервируется до оплаты — трогать её не нужно.
  async function cancelRental(r: any) {
    if (!confirm(`Отменить неоплаченную аренду «${r.tools?.name}»?`)) return;
    setBusyId(r.id);
    const { error: e } = await supabase.from('rentals')
      .update({ status: 'cancelled' }).eq('id', r.id).eq('status', 'pending_payment');
    if (e) alert(`Ошибка: ${e.message}`);
    setBusyId(null);
    loadRentals();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  const shown = filter === 'all' ? rentals : rentals.filter((r) => r.status === filter);

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Аренды</h2>
        <p className="text-sm text-gray-500 mt-1">{shown.length} из {rentals.length} аренд</p></div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">Ошибка загрузки: {error}</div>}

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.key ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">
              {f.key === 'all' ? rentals.length : rentals.filter((r) => r.status === f.key).length}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {shown.length === 0 ? <div className="p-8 text-center text-gray-400">Нет аренд</div> : (
          <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
            <th className="px-5 py-3">Пользователь</th><th className="px-5 py-3">Инструмент</th>
            <th className="px-5 py-3">Бокс</th><th className="px-5 py-3">Срок</th>
            <th className="px-5 py-3">Сумма</th><th className="px-5 py-3">Статус</th><th className="px-5 py-3"></th>
          </tr></thead><tbody>
            {shown.map((r: any) => (
              <tr key={r.id} className="table-row">
                <td className="px-5 py-3 text-sm">{r.users?.phone || '—'}<br/><span className="text-xs text-gray-400">{r.users?.name}</span></td>
                <td className="px-5 py-3 text-sm font-medium">{r.tools?.name || '—'}<br/><span className="text-xs text-gray-400">{r.tools?.brand}</span></td>
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
                  {r.status === 'pending_payment' && (
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
