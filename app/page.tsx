'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({ boxes: 0, tools: 0, users: 0, rentals: 0, activeRentals: 0 });
  const [boxes, setBoxes] = useState<any[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [boxRes, toolRes, userRes, rentalRes, activeRes, recentRes] = await Promise.all([
      supabase.from('boxes').select('*'),
      supabase.from('tools').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('rentals').select('*', { count: 'exact', head: true }),
      supabase.from('rentals').select('*', { count: 'exact', head: true }).in('status', ['active', 'overdue']),
      supabase.from('rentals').select('*, tools(name), users(phone)').order('created_at', { ascending: false }).limit(10),
    ]);
    setBoxes(boxRes.data || []);
    setRentals(recentRes.data || []);
    setStats({
      boxes: boxRes.data?.length || 0,
      tools: toolRes.count || 0,
      users: userRes.count || 0,
      rentals: rentalRes.count || 0,
      activeRentals: activeRes.count || 0,
    });
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div></div>;

  const statCards = [
    { label: '\u0411\u043e\u043a\u0441\u044b', value: stats.boxes, icon: '\ud83d\udce6' },
    { label: '\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b', value: stats.tools, icon: '\ud83d\udd27' },
    { label: '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438', value: stats.users, icon: '\ud83d\udc65' },
    { label: '\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0435 \u0430\u0440\u0435\u043d\u0434\u044b', value: stats.activeRentals, icon: '\ud83d\udccb' },
  ];

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">\u041e\u0431\u0437\u043e\u0440</h2>
        <p className="text-sm text-gray-500 mt-1">\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0438 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 ToolBox</p></div>

      <div className="grid grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <span className="text-2xl mb-2 block">{s.icon}</span>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-100">
          <div className="p-5 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 \u0430\u0440\u0435\u043d\u0434\u044b</h3>
          </div>
          {rentals.length === 0 ? (
            <div className="p-8 text-center text-gray-400">\u041d\u0435\u0442 \u0430\u0440\u0435\u043d\u0434 \u043f\u043e\u043a\u0430</div>
          ) : (
            <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-3">\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c</th>
              <th className="px-5 py-3">\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442</th>
              <th className="px-5 py-3">\u0414\u043d\u0438</th>
              <th className="px-5 py-3">\u0421\u0442\u0430\u0442\u0443\u0441</th>
            </tr></thead><tbody>
              {rentals.map((r: any) => (
                <tr key={r.id} className="table-row"><td className="px-5 py-3 text-sm">{r.users?.phone || '\u2014'}</td>
                  <td className="px-5 py-3 text-sm font-medium">{r.tools?.name || '\u2014'}</td>
                  <td className="px-5 py-3 text-sm">{r.days}</td>
                  <td className="px-5 py-3"><span className={`badge ${r.status==='active'?'badge-blue':r.status==='completed'?'badge-green':'badge-red'}`}>
                    {r.status==='active'?'\u0410\u043a\u0442\u0438\u0432\u043d\u0430':r.status==='completed'?'\u0417\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0430':'\u041f\u0440\u043e\u0441\u0440\u043e\u0447\u0435\u043d\u0430'}</span></td>
                </tr>
              ))}
            </tbody></table>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-5 border-b border-gray-50"><h3 className="font-semibold text-gray-900">\u0421\u0442\u0430\u0442\u0443\u0441 \u0431\u043e\u043a\u0441\u043e\u0432</h3></div>
          <div className="p-4 space-y-3">
            {boxes.length === 0 ? <div className="text-center text-gray-400 py-4">\u041d\u0435\u0442 \u0431\u043e\u043a\u0441\u043e\u0432</div> : boxes.map((b: any) => (
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
