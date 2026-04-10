'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ToolsPage() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTools(); }, []);

  async function loadTools() {
    const { data } = await supabase.from('tools').select('*, cells(cell_number, status, boxes(name))').order('created_at', { ascending: false });
    setTools(data || []);
    setLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u044b</h2>
          <p className="text-sm text-gray-500 mt-1">{tools.length} \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u043e\u0432</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
          <th className="px-5 py-3">\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435</th><th className="px-5 py-3">\u0411\u0440\u0435\u043d\u0434</th>
          <th className="px-5 py-3">\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f</th><th className="px-5 py-3">\u0426\u0435\u043d\u0430/\u0434\u0435\u043d\u044c</th>
          <th className="px-5 py-3">\u0411\u043e\u043a\u0441</th><th className="px-5 py-3">\u042f\u0447\u0435\u0439\u043a\u0430</th><th className="px-5 py-3">\u0421\u0442\u0430\u0442\u0443\u0441</th>
        </tr></thead><tbody>
          {tools.map((t: any) => (
            <tr key={t.id} className="table-row">
              <td className="px-5 py-3 text-sm font-medium">{t.name}</td>
              <td className="px-5 py-3 text-sm text-gray-500">{t.brand || '\u2014'}</td>
              <td className="px-5 py-3 text-sm text-gray-500">{t.category}</td>
              <td className="px-5 py-3 text-sm font-medium">{t.day_price?.toLocaleString()} \u0441\u045e\u043c</td>
              <td className="px-5 py-3 text-sm text-gray-500">{t.cells?.boxes?.name || '\u2014'}</td>
              <td className="px-5 py-3 text-sm">\u2116{t.cells?.cell_number}</td>
              <td className="px-5 py-3"><span className={`badge ${t.cells?.status==='free'?'badge-green':'badge-red'}`}>
                {t.cells?.status==='free'?'\u0421\u0432\u043e\u0431\u043e\u0434\u0435\u043d':'\u0417\u0430\u043d\u044f\u0442'}</span></td>
            </tr>
          ))}
        </tbody></table>
        {tools.length === 0 && <div className="p-8 text-center text-gray-400">\u041d\u0435\u0442 \u0438\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442\u043e\u0432</div>}
      </div>
    </div>
  );
}
