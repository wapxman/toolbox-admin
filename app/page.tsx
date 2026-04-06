'use client';
import { useState } from 'react';

const stats = [
  { label: 'Выручка сегодня', value: '1 240 000', suffix: 'сўм', change: '+12%', up: true, icon: '💰' },
  { label: 'Активные аренды', value: '18', change: '+3', up: true, icon: '📋' },
  { label: 'Инструменты в аренде', value: '24', suffix: '/ 36', change: '67%', up: false, icon: '🔧' },
  { label: 'Пользователи', value: '156', change: '+8 за неделю', up: true, icon: '👥' },
];

const recentRentals = [
  { id: 'R-001', user: '+998 90 123 45 67', tool: 'Дрель Bosch GSB 13 RE', box: 'ToolBox #1', days: 3, price: '192 000', status: 'active' },
  { id: 'R-002', user: '+998 91 987 65 43', tool: 'Шуруповёрт Makita DF331D', box: 'ToolBox #2', days: 1, price: '80 000', status: 'active' },
  { id: 'R-003', user: '+998 93 111 22 33', tool: 'Болгарка DeWalt DWE4057', box: 'ToolBox #1', days: 7, price: '364 000', status: 'completed' },
  { id: 'R-004', user: '+998 90 555 66 77', tool: 'Перфоратор Bosch GBH 2-26', box: 'ToolBox #1', days: 2, price: '160 000', status: 'overdue' },
  { id: 'R-005', user: '+998 94 444 33 22', tool: 'Лобзик Makita 4329', box: 'ToolBox #2', days: 5, price: '320 000', status: 'active' },
];

const boxStatus = [
  { name: 'ToolBox #1', location: 'ТЦ Samarqand Darvoza', tools: 12, rented: 8, online: true },
  { name: 'ToolBox #2', location: 'Строймаркет Чиланзар', tools: 8, rented: 5, online: true },
  { name: 'ToolBox #3', location: 'ТЦ Mega Planet', tools: 5, rented: 0, online: false },
];

const statusBadge = (s: string) => {
  if (s === 'active') return <span className="badge badge-blue">Активна</span>;
  if (s === 'completed') return <span className="badge badge-green">Завершена</span>;
  if (s === 'overdue') return <span className="badge badge-red">Просрочена</span>;
  return <span className="badge badge-gray">{s}</span>;
};

export default function Dashboard() {
  const [period, setPeriod] = useState('today');

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Обзор</h2>
          <p className="text-sm text-gray-500 mt-1">Статистика и управление ToolBox</p>
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {['today', 'week', 'month'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${period === p ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {p === 'today' ? 'Сегодня' : p === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-xs font-semibold ${s.up ? 'text-emerald-600' : 'text-gray-500'}`}>
                {s.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {s.value} <span className="text-sm font-normal text-gray-400">{s.suffix}</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent rentals */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Последние аренды</h3>
            <button className="text-sm text-brand font-medium hover:underline">Все аренды →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Пользователь</th>
                  <th className="px-5 py-3">Инструмент</th>
                  <th className="px-5 py-3">Бокс</th>
                  <th className="px-5 py-3">Сумма</th>
                  <th className="px-5 py-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {recentRentals.map((r) => (
                  <tr key={r.id} className="table-row">
                    <td className="px-5 py-3 text-sm font-mono text-gray-500">{r.id}</td>
                    <td className="px-5 py-3 text-sm">{r.user}</td>
                    <td className="px-5 py-3 text-sm font-medium">{r.tool}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{r.box}</td>
                    <td className="px-5 py-3 text-sm font-medium">{r.price}</td>
                    <td className="px-5 py-3">{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Box status */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-5 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">Статус боксов</h3>
          </div>
          <div className="p-4 space-y-3">
            {boxStatus.map((b, i) => (
              <div key={i} className="p-3 rounded-lg border border-gray-100 hover:border-brand/30 transition">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{b.name}</span>
                  <span className={`w-2 h-2 rounded-full ${b.online ? 'bg-emerald-400' : 'bg-red-400'}`} />
                </div>
                <div className="text-xs text-gray-500 mb-2">{b.location}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    {b.rented}/{b.tools} в аренде
                  </div>
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${(b.rented / b.tools) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick revenue chart placeholder */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Выручка за неделю</h3>
        <div className="flex items-end gap-3 h-40">
          {[65, 40, 85, 55, 70, 90, 75].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-brand/10 rounded-t-md relative" style={{ height: `${h}%` }}>
                <div className="absolute inset-0 bg-brand rounded-t-md" style={{ height: `${h}%` }} />
              </div>
              <span className="text-[10px] text-gray-400">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
