'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function RentalsPage() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRentals(); }, []);

  async function loadRentals() {
    const { data } = await supabase.from('rentals').select('*, tools(name, brand), users(phone, name)').order('created_at', { ascending: false });
    setRentals(data || []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Аренды</h2>
        <p className="text-sm text-gray-500 mt-1">{rentals.length} аренд</p></div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {rentals.length === 0 ? <div className="p-8 text-center text-gray-400">Нет аренд</div> : (
          <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
            <th className="px-5 py-3">Пользователь</th><th className="px-5 py-3">Инструмент</th>
            <th className="px-5 py-3">Дни</th><th className="px-5 py-3">Сумма</th><th className="px-5 py-3">Статус</th>
          </tr></thead><tbody>
            {rentals.map((r: any) => (
              <tr key={r.id} className="table-row">
                <td className="px-5 py-3 text-sm">{r.users?.phone || '—'}<br/><span className="text-xs text-gray-400">{r.users?.name}</span></td>
                <td className="px-5 py-3 text-sm font-medium">{r.tools?.name || '—'}<br/><span className="text-xs text-gray-400">{r.tools?.brand}</span></td>
                <td className="px-5 py-3 text-sm">{r.days}</td>
                <td className="px-5 py-3 text-sm font-medium">{r.total_price?.toLocaleString()} сўм</td>
                <td className="px-5 py-3"><span className={`badge ${r.status==='active'?'badge-blue':r.status==='completed'?'badge-green':'badge-red'}`}>
                  {r.status==='active'?'Активна':r.status==='completed'?'Завершена':'Просрочена'}</span></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  );
}
