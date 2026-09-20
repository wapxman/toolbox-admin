'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Заказы с доставкой: аренда/покупка курьером и вызовы курьера за инструментом.
// Переходы статусов идут через бэкенд (/api/orders/:id → PATCH /api/admin/orders/:id),
// потому что они открывают ячейку, шлют уведомления и меняют связанные записи.

const DELIVERY_LABELS: Record<string, string> = {
  paid: 'Оплачен, ждёт сборки',
  packed: 'Собран',
  dispatched: 'Курьер в пути',
  delivered: 'Доставлен',
  picked_up: 'Забран у клиента',
};
const KIND_LABELS: Record<string, string> = {
  rent: 'Аренда', buy: 'Покупка', courier_return: 'Возврат курьером',
};

const FILTERS = [
  { key: 'work', label: 'В работе' },
  { key: 'done', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
  { key: 'all', label: 'Все' },
];

function fmtDT(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function address(r: any) {
  const p = [r.delivery_address];
  if (r.delivery_entrance) p.push(`под. ${r.delivery_entrance}`);
  if (r.delivery_floor) p.push(`эт. ${r.delivery_floor}`);
  if (r.delivery_apt) p.push(`кв. ${r.delivery_apt}`);
  return p.filter(Boolean).join(', ');
}
function badge(r: any) {
  if (r.status === 'cancelled') return 'badge-gray';
  if (r.status === 'completed' || r.status === 'active') return 'badge-green';
  if (r.delivery_status === 'dispatched') return 'badge-blue';
  if (r.delivery_status === 'packed') return 'badge-yellow';
  return 'badge-red';
}
function statusText(r: any) {
  if (r.status === 'cancelled') return 'Отменён';
  if (r.status === 'pending_payment') return 'Ждёт оплаты';
  if (r.status === 'completed') return r.kind === 'courier_return' ? 'Забран у клиента' : 'Доставлен';
  if (r.status === 'active') return 'Доставлен, аренда идёт';
  return DELIVERY_LABELS[r.delivery_status] || r.status;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('work');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [courier, setCourier] = useState<{ id: string; name: string; phone: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase
      .from('rentals')
      .select('*, tools(name, brand, cells(cell_number, boxes(name))), users(phone, name)')
      .eq('fulfillment', 'delivery')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) setError(error.message);
    setOrders(data || []);
    setLoading(false);
  }

  async function act(r: any, action: string, extra: any = {}) {
    setBusyId(r.id);
    try {
      const resp = await fetch(`/api/orders/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) alert(`Ошибка: ${j.error || resp.status}`);
      else if (action === 'open_cell') alert('Ячейка открыта');
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setBusyId(null);
      load();
    }
  }

  function confirmAct(r: any, action: string, text: string) {
    if (confirm(text)) act(r, action);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  const inWork = (r: any) => r.status === 'pending_delivery';
  const shown = orders.filter((r) =>
    filter === 'all' ? true
    : filter === 'work' ? inWork(r)
    : filter === 'cancelled' ? r.status === 'cancelled'
    : (r.status === 'completed' || r.status === 'active'));

  const btn = 'text-xs px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-50 whitespace-nowrap';

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Заказы с доставкой</h2>
        <p className="text-sm text-gray-500 mt-1">{shown.length} из {orders.length}. Порядок: Собран → Передан курьеру → Доставлен. При отмене оплаченного заказа деньги возвращаются вручную в кассе Payme/Click.</p></div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">Ошибка загрузки: {error}</div>}

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.key ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {shown.length === 0 ? <div className="p-8 text-center text-gray-400">Нет заказов</div> : (
          <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
            <th className="px-4 py-3">№</th><th className="px-4 py-3">Что</th><th className="px-4 py-3">Клиент</th>
            <th className="px-4 py-3">Куда и когда</th><th className="px-4 py-3">Сумма</th>
            <th className="px-4 py-3">Статус</th><th className="px-4 py-3"></th>
          </tr></thead><tbody>
            {shown.map((r: any) => (
              <tr key={r.id} className="table-row align-top">
                <td className="px-4 py-3 text-sm font-medium">{r.order_number}<br/>
                  <span className="text-xs text-gray-400">{fmtDT(r.created_at)}</span></td>
                <td className="px-4 py-3 text-sm">
                  <span className={`badge ${r.kind === 'buy' ? 'badge-blue' : r.kind === 'courier_return' ? 'badge-yellow' : 'badge-green'}`}>{KIND_LABELS[r.kind] || r.kind}</span>
                  <div className="font-medium mt-1">{r.tools?.name || '—'}</div>
                  <div className="text-xs text-gray-400">{r.kind === 'rent' ? `${r.days} дн. · ` : ''}{r.tools?.cells?.boxes?.name} · ячейка {r.tools?.cells?.cell_number ?? '—'}</div>
                </td>
                <td className="px-4 py-3 text-sm">{r.recipient_phone || r.users?.phone || '—'}<br/><span className="text-xs text-gray-400">{r.users?.name}</span></td>
                <td className="px-4 py-3 text-sm max-w-[260px]">{address(r) || '—'}<br/>
                  <span className="text-xs font-medium text-gray-700">{r.delivery_slot_label}</span>
                  {r.delivery_comment && <div className="text-xs text-gray-400">💬 {r.delivery_comment}</div>}
                  {r.courier_name && <div className="text-xs text-gray-500 mt-1">🚗 {r.courier_name} {r.courier_phone}</div>}
                </td>
                <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{r.total_price?.toLocaleString()} сўм<br/>
                  <span className="text-xs text-gray-400">{r.payment_provider}</span></td>
                <td className="px-4 py-3"><span className={`badge ${badge(r)}`}>{statusText(r)}</span></td>
                <td className="px-4 py-3 text-right">
                  {inWork(r) && (
                    <div className="flex flex-col gap-1 items-end">
                      {r.kind !== 'courier_return' && r.delivery_status === 'paid' && (
                        <>
                          <button className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`} disabled={busyId === r.id}
                            onClick={() => act(r, 'open_cell')}>Открыть ячейку</button>
                          <button className={`${btn} bg-amber-50 text-amber-700 hover:bg-amber-100`} disabled={busyId === r.id}
                            onClick={() => confirmAct(r, 'packed', 'Инструмент забрали из бокса и заказ собран?')}>Собран</button>
                        </>
                      )}
                      {(r.delivery_status === 'packed' || (r.kind === 'courier_return' && r.delivery_status === 'paid')) && (
                        <button className={`${btn} bg-blue-50 text-blue-700 hover:bg-blue-100`} disabled={busyId === r.id}
                          onClick={() => setCourier({ id: r.id, name: r.courier_name || '', phone: r.courier_phone || '' })}>Передан курьеру</button>
                      )}
                      {r.delivery_status === 'dispatched' && r.kind !== 'courier_return' && (
                        <button className={`${btn} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`} disabled={busyId === r.id}
                          onClick={() => confirmAct(r, 'delivered', r.kind === 'rent' ? 'Инструмент передан клиенту? Срок аренды начнётся сейчас.' : 'Покупка передана клиенту?')}>Доставлен</button>
                      )}
                      {r.delivery_status === 'dispatched' && r.kind === 'courier_return' && (
                        <button className={`${btn} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`} disabled={busyId === r.id}
                          onClick={() => confirmAct(r, 'picked_up', 'Курьер забрал инструмент у клиента? Аренда завершится, штраф за просрочку посчитается автоматически.')}>Забрал у клиента</button>
                      )}
                      {['paid', 'packed'].includes(r.delivery_status) && (
                        <button className={`${btn} bg-red-50 text-red-600 hover:bg-red-100`} disabled={busyId === r.id}
                          onClick={() => confirmAct(r, 'cancel', `Отменить заказ №${r.order_number}? Деньги (${r.total_price?.toLocaleString()} сўм) нужно вернуть вручную в кассе ${r.payment_provider}.`)}>Отменить</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>

      {courier && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCourier(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Передать курьеру</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя курьера</label>
              <input className="input" value={courier.name} onChange={(e) => setCourier({ ...courier, name: e.target.value })} placeholder="Азиз" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон курьера</label>
              <input className="input" value={courier.phone} onChange={(e) => setCourier({ ...courier, phone: e.target.value })} placeholder="+998 90 000 00 00" />
            </div>
            <p className="text-xs text-gray-400">Клиент получит уведомление с именем и телефоном курьера.</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setCourier(null)}>Отмена</button>
              <button className="btn-primary" onClick={() => {
                const r = orders.find((o) => o.id === courier.id);
                setCourier(null);
                if (r) act(r, 'dispatched', { courier_name: courier.name.trim(), courier_phone: courier.phone.trim() });
              }}>Отправить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
