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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div></div>;

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">\u0410\u0440\u0435\u043d\u0434\u044b</h2>
        <p className="text-sm text-gray-500 mt-1">{rentals.length} \u0430\u0440\u0435\u043d\u0434</p></div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {rentals.length === 0 ? <div className="p-8 text-center text-gray-400">\u041d\u0435\u0442 \u0430\u0440\u0435\u043d\u0434</div> : (
          <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
            <th className="px-5 py-3">\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c</th><th className="px-5 py-3">\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442</th>
            <th className="px-5 py-3">\u0414\u043d\u0438</th><th className="px-5 py-3">\u0421\u0443\u043c\u043c\u0430</th><th className="px-5 py-3">\u0421\u0442\u0430\u0442\u0443\u0441</th>
          </tr></thead><tbody>
            {rentals.map((r: any) => (
              <tr key={r.id} className="table-row">
                <td className="px-5 py-3 text-sm">{r.users?.phone || '\u2014'}<br/><span className="text-xs text-gray-400">{r.users?.name}</span></td>
                <td className="px-5 py-3 text-sm font-medium">{r.tools?.name || '\u2014'}<br/><span className="text-xs text-gray-400">{r.tools?.brand}</span></td>
                <td className="px-5 py-3 text-sm">{r.days}</td>
                <td className="px-5 py-3 text-sm font-medium">{r.total_price?.toLocaleString()} \u0441\u045e\u043c</td>
                <td className="px-5 py-3"><span className={`badge ${r.status==='active'?'badge-blue':r.status==='completed'?'badge-green':'badge-red'}`}>
                  {r.status==='active'?'\u0410\u043a\u0442\u0438\u0432\u043d\u0430':r.status==='completed'?'\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430':'\u041f\u0440\u043e\u0441\u0440\u043e\u0447\u0435\u043d\u0430'}</span></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  );
}
