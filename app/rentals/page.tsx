'use client';
import { useState } from 'react';

const rentals = [
  { id: 'R-001', user: '+998 90 123 45 67', tool: 'Дрель Bosch GSB 13 RE', box: 'ToolBox #1', days: 3, price: 192000, start: '7 апр 14:00', end: '10 апр 14:00', status: 'active' },
  { id: 'R-002', user: '+998 91 987 65 43', tool: 'Шуруповёрт Makita DF331D', box: 'ToolBox #2', days: 1, price: 80000, start: '7 апр 10:00', end: '8 апр 10:00', status: 'active' },
  { id: 'R-003', user: '+998 93 111 22 33', tool: 'Болгарка DeWalt DWE4057', box: 'ToolBox #1', days: 7, price: 364000, start: '1 апр 09:00', end: '8 апр 09:00', status: 'completed' },
  { id: 'R-004', user: '+998 90 555 66 77', tool: 'Перфоратор Bosch GBH 2-26', box: 'ToolBox #1', days: 2, price: 160000, start: '3 апр 16:00', end: '5 апр 16:00', status: 'overdue' },
  { id: 'R-005', user: '+998 94 444 33 22', tool: 'Лобзик Makita 4329', box: 'ToolBox #2', days: 5, price: 320000, start: '5 апр 12:00', end: '10 апр 12:00', status: 'active' },
  { id: 'R-006', user: '+998 97 888 99 00', tool: 'Шлифмашина Bosch GEX 125', box: 'ToolBox #2', days: 1, price: 80000, start: '6 апр 08:00', end: '7 апр 08:00', status: 'completed' },
];

const statusMap: Record<string, { label: string; cls: string }> = {
  active: { label: 'Активна', cls: 'badge-blue' },
  completed: { label: 'Завершена', cls: 'badge-green' },
  overdue: { label: 'Просрочена', cls: 'badge-red' },
  pending: { label: 'Ожидает', cls: 'badge-yellow' },
};

export default function RentalsPage() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? rentals : rentals.filter(r => r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Аренды</h2>
          <p className="text-sm text-gray-500 mt-1">{rentals.length} всего, {rentals.filter(r => r.status === 'active').length} активных</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
            {[['all', 'Все'], ['active', 'Активные'], ['overdue', 'Просроченные'], ['completed', 'Завершённые']].map(([k, v]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter === k ? 'bg-brand text-white' : 'text-gray-500'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/50">
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Пользователь</th>
              <th className="px-5 py-3">Инструмент</th>
              <th className="px-5 py-3">Бокс</th>
              <th className="px-5 py-3">Период</th>
              <th className="px-5 py-3">Сумма</th>
              <th className="px-5 py-3">Статус</th>
              <th className="px-5 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="table-row">
                <td className="px-5 py-3 text-sm font-mono text-gray-500">{r.id}</td>
                <td className="px-5 py-3 text-sm">{r.user}</td>
                <td className="px-5 py-3 text-sm font-medium">{r.tool}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{r.box}</td>
                <td className="px-5 py-3 text-xs text-gray-500">{r.start} → {r.end}</td>
                <td className="px-5 py-3 text-sm font-medium">{r.price.toLocaleString()} сўм</td>
                <td className="px-5 py-3"><span className={`badge ${statusMap[r.status].cls}`}>{statusMap[r.status].label}</span></td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button className="text-xs text-brand hover:underline">Детали</button>
                    {r.status === 'overdue' && <button className="text-xs text-red-500 hover:underline">Закрыть</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
