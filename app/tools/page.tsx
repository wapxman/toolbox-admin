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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">Инструменты</h2>
          <p className="text-sm text-gray-500 mt-1">{tools.length} инструментов</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
          <th className="px-5 py-3">Название</th><th className="px-5 py-3">Бренд</th>
          <th className="px-5 py-3">Категория</th><th className="px-5 py-3">Цена/день</th>
          <th className="px-5 py-3">Бокс</th><th className="px-5 py-3">Ячейка</th><th className="px-5 py-3">Статус</th>
        </tr></thead><tbody>
          {tools.map((t: any) => (
            <tr key={t.id} className="table-row">
              <td className="px-5 py-3 text-sm font-medium">{t.name}</td>
              <td className="px-5 py-3 text-sm text-gray-500">{t.brand || '—'}</td>
              <td className="px-5 py-3 text-sm text-gray-500">{t.category}</td>
              <td className="px-5 py-3 text-sm font-medium">{t.day_price?.toLocaleString()} сўм</td>
              <td className="px-5 py-3 text-sm text-gray-500">{t.cells?.boxes?.name || '—'}</td>
              <td className="px-5 py-3 text-sm">№{t.cells?.cell_number}</td>
              <td className="px-5 py-3"><span className={`badge ${t.cells?.status==='free'?'badge-green':'badge-red'}`}>
                {t.cells?.status==='free'?'Свободен':'Занят'}</span></td>
            </tr>
          ))}
        </tbody></table>
        {tools.length === 0 && <div className="p-8 text-center text-gray-400">Нет инструментов</div>}
      </div>
    </div>
  );
}
