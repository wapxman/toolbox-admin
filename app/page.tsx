'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({ boxes: 0, tools: 0, users: 0, activeRentals: 0, revenueToday: 0, revenueWeek: 0, rentWeek: 0, salesWeek: 0, deliveryWeek: 0, inDelivery: 0, attention: 0 });
  const [boxes, setBoxes] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);

    const [boxRes, toolRes, userRes, activeRes, recentRes, payWeekRes, inDeliveryRes, attentionRes] = await Promise.all([
      supabase.from('boxes').select('*'),
      supabase.from('tools').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('rentals').select('*', { count: 'exact', head: true }).in('status', ['active', 'overdue']),
      supabase.from('rentals').select('*, tools(name), users(phone)').order('created_at', { ascending: false }).limit(10),
      // Выручка — из журнала успешных платежей (Payme + Click)
      supabase.from('transactions').select('amount, created_at, rentals(kind, items_price, discount, delivery_fee)')
        .eq('status', 'success').gte('created_at', weekStart.toISOString()),
      supabase.from('rentals').select('*', { count: 'exact', head: true }).eq('status', 'pending_delivery'),
      supabase.from('rentals').select('*', { count: 'exact', head: true }).or('refund_status.eq.pending,restock_pending.eq.true'),
    ]);
    setBoxes(boxRes.data || []);
    setRentals(recentRes.data || []);
    const payments = payWeekRes.data || [];
    // Разрез недели: аренда (цена минус скидка), продажи новых единиц, доставка/выезд курьера
    let rentWeek = 0, salesWeek = 0, deliveryWeek = 0;
    for (const p of payments as any[]) {
      const r = p.rentals || {};
      const goods = Math.max(0, (Number(r.items_price) || 0) - (Number(r.discount) || 0));
      const fee = Number(r.delivery_fee) || 0;
      if (r.kind === 'buy') salesWeek += goods;
      else if (r.kind === 'rent') rentWeek += r.items_price != null ? goods : Math.max(0, (Number(p.amount) || 0) - fee);
      deliveryWeek += fee;
    }
    setStats({
      rentWeek, salesWeek, deliveryWeek,
      inDelivery: inDeliveryRes.count || 0,
      attention: attentionRes.count || 0,
      boxes: boxRes.data?.length || 0,
      tools: toolRes.count || 0,
      users: userRes.count || 0,
      activeRentals: activeRes.count || 0,
      revenueWeek: payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
      revenueToday: payments
        .filter((p: any) => new Date(p.created_at) >= todayStart)
        .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
    });
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  const revenueCards = [
    { label: 'Аренда за 7 дней', value: `${stats.rentWeek.toLocaleString()} сўм`, icon: '🔧' },
    { label: 'Продажи за 7 дней', value: `${stats.salesWeek.toLocaleString()} сўм`, icon: '🛒' },
    { label: 'Доставка за 7 дней', value: `${stats.deliveryWeek.toLocaleString()} сўм`, icon: '🚚' },
    { label: 'Заказов в доставке/выдаче', value: stats.inDelivery, icon: '📬' },
    { label: 'Требуют внимания', value: stats.attention, icon: '⚠️' },
  ];
  const statCards = [
    { label: 'Боксы', value: stats.boxes, icon: '📦' },
    { label: 'Инструменты', value: stats.tools, icon: '🔧' },
    { label: 'Пользователи', value: stats.users, icon: '👥' },
    { label: 'Активные аренды', value: stats.activeRentals, icon: '📋' },
    { label: 'Выручка сегодня', value: `${stats.revenueToday.toLocaleString()} сўм`, icon: '💰' },
    { label: 'Выручка за 7 дней', value: `${stats.revenueWeek.toLocaleString()} сўм`, icon: '📈' },
  ];

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Обзор</h2>
        <p className="text-sm text-gray-500 mt-1">Статистика и управление Taketool</p></div>

      <div className="grid grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <span className="text-2xl mb-2 block">{s.icon}</span>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-4">
        {revenueCards.map((s, i) => (
          <div key={i} className="stat-card">
            <span className="text-2xl mb-2 block">{s.icon}</span>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100">
          <div className="p-5 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">Последние заказы</h3>
          </div>
          {rentals.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Нет аренд пока</div>
          ) : (
            <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-3">Пользователь</th>
              <th className="px-5 py-3">Инструмент</th>
              <th className="px-5 py-3">Дни</th>
              <th className="px-5 py-3">Статус</th>
            </tr></thead><tbody>
              {rentals.map((r: any) => (
                <tr key={r.id} className="table-row"><td className="px-5 py-3 text-sm">{r.users?.phone || '—'}</td>
                  <td className="px-5 py-3 text-sm font-medium">{r.tools?.name || '—'}</td>
                  <td className="px-5 py-3 text-sm">{r.days}</td>
                  <td className="px-5 py-3"><span className={`badge ${r.status==='active'?'badge-blue':r.status==='completed'?'badge-green':r.status==='pending_payment'?'badge-yellow':r.status==='cancelled'?'badge-gray':'badge-red'}`}>
                    {r.status==='active'?'Активна':r.status==='completed'?'Завершена':r.status==='pending_payment'?'Ждёт оплаты':r.status==='pending_delivery'?'В доставке':r.status==='cancelled'?'Отменена':'Просрочена'}</span></td>
                </tr>
              ))}
            </tbody></table>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-5 border-b border-gray-50"><h3 className="font-semibold text-gray-900">Статус боксов</h3></div>
          <div className="p-4 space-y-3">
            {boxes.length === 0 ? <div className="text-center text-gray-400 py-4">Нет боксов</div> : boxes.map((b: any) => (
              <div key={b.id} className="p-3 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{b.name}</span>
                  <span className={`w-2 h-2 rounded-full ${b.status==='online'?'bg-emerald-400':'bg-red-400'}`} />
                </div>
                <div className="text-xs text-gray-500">{b.address}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
