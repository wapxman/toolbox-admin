'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function toggleBlock(id: string, blocked: boolean) {
    await supabase.from('users').update({ is_blocked: !blocked }).eq('id', id);
    loadUsers();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div></div>;

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438</h2>
        <p className="text-sm text-gray-500 mt-1">{users.length} \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439</p></div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {users.length === 0 ? <div className="p-8 text-center text-gray-400">\u041d\u0435\u0442 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439</div> : (
          <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
            <th className="px-5 py-3">\u0418\u043c\u044f</th><th className="px-5 py-3">\u0422\u0435\u043b\u0435\u0444\u043e\u043d</th>
            <th className="px-5 py-3">\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u044f</th><th className="px-5 py-3">\u0421\u0442\u0430\u0442\u0443\u0441</th><th className="px-5 py-3">\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044f</th>
          </tr></thead><tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="table-row">
                <td className="px-5 py-3 text-sm font-medium">{u.name}</td>
                <td className="px-5 py-3 text-sm">{u.phone}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                <td className="px-5 py-3"><span className={`badge ${u.is_blocked?'badge-red':'badge-green'}`}>{u.is_blocked?'\u0417\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d':'\u0410\u043a\u0442\u0438\u0432\u0435\u043d'}</span></td>
                <td className="px-5 py-3"><button onClick={() => toggleBlock(u.id, u.is_blocked)} className="text-xs text-gray-500 hover:text-gray-700">
                  {u.is_blocked?'\u0420\u0430\u0437\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u0442\u044c':'\u0417\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u0442\u044c'}</button></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  );
}
