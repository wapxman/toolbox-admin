'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Заказы, которые требуют действий сотрудника: доставка (аренда/покупка курьером),
// покупка с самовывозом (положить новую единицу в ячейку), вызов курьера за инструментом,
// возврат денег по отменённым и возврат инструмента в бокс.
// Переходы идут через бэкенд (/api/orders/:id → PATCH /api/admin/orders/:id):
// они открывают ячейки, шлют уведомления и правят склад/ячейки.

const KIND_LABELS: Record<string, string> = { rent: 'Аренда', buy: 'Покупка', courier_return: 'Возврат курьером' };

const FILTERS = [
  { key: 'work', label: 'В работе' },
  { key: 'attention', label: 'Требуют внимания' },
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
function statusText(r: any) {
  if (r.status === 'cancelled') return 'Отменён';
  if (r.status === 'pending_payment') return 'Ждёт оплаты';
  if (r.status === 'completed') return r.kind === 'courier_return' ? 'Забран у клиента' : (r.fulfillment === 'pickup' ? 'Выдан из ячейки' : 'Доставлен');
  if (r.status === 'active' || r.status === 'overdue') return 'Доставлен, аренда идёт';
  switch (r.delivery_status) {
    case 'paid': return r.kind === 'buy' && r.fulfillment === 'pickup' ? 'Оплачен, положить в ячейку' : 'Оплачен, ждёт сборки';
    case 'ready': return `Готов к выдаче, ячейка ${r.pickup_cell?.cell_number ?? '?'}`;
    case 'packed': return 'Собран';
    case 'dispatched': return 'Курьер в пути';
    default: return r.status;
  }
}
function badge(r: any) {
  if (r.status === 'cancelled') return 'badge-gray';
  if (['completed', 'active', 'overdue'].includes(r.status)) return 'badge-green';
  if (r.delivery_status === 'dispatched' || r.delivery_status === 'ready') return 'badge-blue';
  if (r.delivery_status === 'packed') return 'badge-yellow';
  return 'badge-red';
}
const needsAttention = (r: any) => r.refund_status === 'pending' || r.restock_pending === true;

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [cells, setCells] = useState<any[]>([]);
  const [filter, setFilter] = useState('work');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [courier, setCourier] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [readyFor, setReadyFor] = useState<{ id: string; cellId: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [o, c] = await Promise.all([
      supabase.from('rentals')
        .select('*, tools(name, brand, sale_stock, cells(cell_number, boxes(name))), users(phone, name), pickup_cell:cells!rentals_pickup_cell_id_fkey(cell_number, boxes(name))')
        .or('fulfillment.eq.delivery,kind.eq.buy,refund_status.eq.pending,restock_pending.eq.true')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('cells').select('id, cell_number, status, boxes(name)').order('cell_number'),
    ]);
    if (o.error) setError(o.error.message);
    setOrders(o.data || []);
    setCells(c.data || []);
    setLoading(false);
  }

  async function act(r: any, action: string, extra: any = {}) {
    setBusyId(r.id);
    try {
      const resp = await fetch(`/api/orders/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) alert(`Ошибка: ${j.error || resp.status}`);
      else if (action === 'open_cell') alert(`Ячейка ${j.cell_number ?? ''} открыта`);
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    } finally {
      setBusyId(null);
      load();
    }
  }
  function confirmAct(r: any, action: string, text: string) { if (confirm(text)) act(r, action); }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  const inWork = (r: any) => r.status === 'pending_delivery';
  const shown = orders.filter((r) =>
    filter === 'all' ? true
    : filter === 'work' ? inWork(r) || needsAttention(r)
    : filter === 'attention' ? needsAttention(r)
    : filter === 'cancelled' ? r.status === 'cancelled'
    : ['completed', 'active', 'overdue'].includes(r.status));

  const btn = 'text-xs px-2.5 py-1.5 rounded-lg font-medium disabled:opacity-50 whitespace-nowrap';
  const freeCells = cells.filter((c) => c.status === 'free');

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Доставка и выдача</h2>
        <p className="text-sm text-gray-500 mt-1">
          Курьером: Собран → Передан курьеру → Доставлен. Покупка из бокса: положить новую единицу в свободную ячейку → «Готов к выдаче», клиент откроет её сам.
          Возврат курьером: Передан курьеру → Забрал у клиента → «Инструмент в боксе». Отменённые после оплаты ждут возврата денег в кассе Payme/Click.
        </p></div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">Ошибка загрузки: {error}</div>}

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === f.key ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.label}
            {f.key === 'attention' && orders.filter(needsAttention).length > 0 && (
              <span className="ml-1.5 text-xs bg-red-500 text-white rounded-full px-1.5">{orders.filter(needsAttention).length}</span>
            )}
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
                  <span className="ml-1 text-xs text-gray-500">{r.fulfillment === 'delivery' ? '🚚 курьером' : '📦 из бокса'}</span>
                  <div className="font-medium mt-1">{r.tools?.name || '—'}</div>
                  <div className="text-xs text-gray-400">
                    {r.kind === 'rent' ? `${r.days} дн. · ${r.tools?.cells?.boxes?.name} · ячейка ${r.tools?.cells?.cell_number ?? '—'}` : ''}
                    {r.kind === 'buy' ? `новая единица · остаток на складе: ${r.tools?.sale_stock ?? '—'}` : ''}
                    {r.kind === 'courier_return' ? `экземпляр из ячейки ${r.tools?.cells?.cell_number ?? '—'}` : ''}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{r.recipient_phone || r.users?.phone || '—'}<br/><span className="text-xs text-gray-400">{r.users?.name}</span></td>
                <td className="px-4 py-3 text-sm max-w-[260px]">
                  {r.fulfillment === 'delivery' ? (address(r) || '—') : `Бокс ${r.pickup_cell?.boxes?.name || r.tools?.cells?.boxes?.name || ''}`}<br/>
                  <span className="text-xs font-medium text-gray-700">{r.delivery_slot_label}</span>
                  {r.delivery_comment && <div className="text-xs text-gray-400">💬 {r.delivery_comment}</div>}
                  {r.courier_name && <div className="text-xs text-gray-500 mt-1">🚗 {r.courier_name} {r.courier_phone}</div>}
                </td>
                <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">{r.total_price?.toLocaleString()} сўм<br/>
                  <span className="text-xs text-gray-400">{r.payment_provider}</span></td>
                <td className="px-4 py-3">
                  <span className={`badge ${badge(r)}`}>{statusText(r)}</span>
                  {r.refund_status === 'pending' && <div className="mt-1"><span className="badge badge-red">💸 вернуть деньги</span></div>}
                  {r.refund_status === 'done' && <div className="mt-1"><span className="badge badge-gray">деньги возвращены</span></div>}
                  {r.restock_pending && <div className="mt-1"><span className="badge badge-red">📦 инструмент вне бокса</span></div>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-col gap-1 items-end">
                    {inWork(r) && r.kind === 'rent' && r.delivery_status === 'paid' && (
                      <>
                        <button className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`} disabled={busyId === r.id} onClick={() => act(r, 'open_cell')}>Открыть ячейку</button>
                        <button className={`${btn} bg-amber-50 text-amber-700 hover:bg-amber-100`} disabled={busyId === r.id}
                          onClick={() => confirmAct(r, 'packed', 'Инструмент забрали из бокса и заказ собран?')}>Собран</button>
                      </>
                    )}
                    {inWork(r) && r.kind === 'buy' && r.fulfillment === 'delivery' && r.delivery_status === 'paid' && (
                      <button className={`${btn} bg-amber-50 text-amber-700 hover:bg-amber-100`} disabled={busyId === r.id}
                        onClick={() => confirmAct(r, 'packed', 'Новая единица взята со склада и упакована?')}>Собран</button>
                    )}
                    {inWork(r) && r.kind === 'buy' && r.fulfillment === 'pickup' && r.delivery_status === 'paid' && (
                      <button className={`${btn} bg-amber-50 text-amber-700 hover:bg-amber-100`} disabled={busyId === r.id}
                        onClick={() => setReadyFor({ id: r.id, cellId: freeCells[0]?.id || '' })}>Положил в ячейку…</button>
                    )}
                    {inWork(r) && r.delivery_status === 'ready' && (
                      <button className={`${btn} bg-gray-100 text-gray-700 hover:bg-gray-200`} disabled={busyId === r.id} onClick={() => act(r, 'open_cell')}>Открыть ячейку</button>
                    )}
                    {inWork(r) && (r.delivery_status === 'packed' || (r.kind === 'courier_return' && r.delivery_status === 'paid')) && (
                      <button className={`${btn} bg-blue-50 text-blue-700 hover:bg-blue-100`} disabled={busyId === r.id}
                        onClick={() => setCourier({ id: r.id, name: r.courier_name || '', phone: r.courier_phone || '' })}>Передан курьеру</button>
                    )}
                    {inWork(r) && r.delivery_status === 'dispatched' && r.kind !== 'courier_return' && (
                      <button className={`${btn} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`} disabled={busyId === r.id}
                        onClick={() => confirmAct(r, 'delivered', r.kind === 'rent' ? 'Инструмент передан клиенту? Срок аренды начнётся сейчас.' : 'Покупка передана клиенту?')}>Доставлен</button>
                    )}
                    {inWork(r) && r.delivery_status === 'dispatched' && r.kind === 'courier_return' && (
                      <button className={`${btn} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`} disabled={busyId === r.id}
                        onClick={() => confirmAct(r, 'picked_up', 'Курьер забрал инструмент у клиента? Аренда завершится, штраф за просрочку посчитается автоматически.')}>Забрал у клиента</button>
                    )}
                    {inWork(r) && ['paid', 'packed', 'ready'].includes(r.delivery_status) && (
                      <button className={`${btn} bg-red-50 text-red-600 hover:bg-red-100`} disabled={busyId === r.id}
                        onClick={() => confirmAct(r, 'cancel', `Отменить заказ №${r.order_number}? Деньги (${r.total_price?.toLocaleString()} сўм) нужно будет вернуть вручную в кассе ${r.payment_provider}.`)}>Отменить</button>
                    )}
                    {r.restock_pending && (
                      <button className={`${btn} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`} disabled={busyId === r.id}
                        onClick={() => confirmAct(r, 'restocked', r.kind === 'buy' ? 'Новая единица убрана из ячейки на склад? Остаток +1, ячейка освободится.' : 'Инструмент положен обратно в свою ячейку? Ячейка освободится.')}>
                        {r.kind === 'buy' ? 'Вернул на склад' : 'Инструмент в боксе'}</button>
                    )}
                    {r.refund_status === 'pending' && (
                      <button className={`${btn} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`} disabled={busyId === r.id}
                        onClick={() => confirmAct(r, 'refunded', `Деньги ${r.total_price?.toLocaleString()} сўм возвращены клиенту в кассе ${r.payment_provider}?`)}>Деньги возвращены</button>
                    )}
                  </div>
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
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Имя курьера</label>
              <input className="input" value={courier.name} onChange={(e) => setCourier({ ...courier, name: e.target.value })} placeholder="Азиз" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Телефон курьера</label>
              <input className="input" value={courier.phone} onChange={(e) => setCourier({ ...courier, phone: e.target.value })} placeholder="+998 90 000 00 00" /></div>
            <p className="text-xs text-gray-400">Клиент получит уведомление с именем и телефоном курьера.</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setCourier(null)}>Отмена</button>
              <button className="btn-primary" onClick={() => {
                const r = orders.find((o) => o.id === courier.id); setCourier(null);
                if (r) act(r, 'dispatched', { courier_name: courier.name.trim(), courier_phone: courier.phone.trim() });
              }}>Отправить</button>
            </div>
          </div>
        </div>
      )}

      {readyFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setReadyFor(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900">Готов к выдаче</h3>
            <p className="text-sm text-gray-500">В какую свободную ячейку положили новую единицу? Клиент получит уведомление и откроет её из приложения.</p>
            <select className="input" value={readyFor.cellId} onChange={(e) => setReadyFor({ ...readyFor, cellId: e.target.value })}>
              {freeCells.length === 0 && <option value="">Нет свободных ячеек</option>}
              {freeCells.map((c) => <option key={c.id} value={c.id}>{c.boxes?.name} — ячейка {c.cell_number}</option>)}
            </select>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setReadyFor(null)}>Отмена</button>
              <button className="btn-primary" disabled={!readyFor.cellId} onClick={() => {
                const r = orders.find((o) => o.id === readyFor.id); const cellId = readyFor.cellId; setReadyFor(null);
                if (r) act(r, 'ready', { cell_id: cellId });
              }}>Подтвердить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
