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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Пользователи</h2>
        <p className="text-sm text-gray-500 mt-1">{users.length} пользователей</p></div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {users.length === 0 ? <div className="p-8 text-center text-gray-400">Нет пользователей</div> : (
          <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
            <th className="px-5 py-3">Имя</th><th className="px-5 py-3">Телефон</th>
            <th className="px-5 py-3">Регистрация</th><th className="px-5 py-3">Статус</th><th className="px-5 py-3">Действия</th>
          </tr></thead><tbody>
            {users.map((u: any) => (
              <tr key={u.id} className="table-row">
                <td className="px-5 py-3 text-sm font-medium">{u.name}</td>
                <td className="px-5 py-3 text-sm">{u.phone}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                <td className="px-5 py-3"><span className={`badge ${u.is_blocked?'badge-red':'badge-green'}`}>{u.is_blocked?'Заблокирован':'Активен'}</span></td>
                <td className="px-5 py-3"><button onClick={() => toggleBlock(u.id, u.is_blocked)} className="text-xs text-gray-500 hover:text-gray-700">
                  {u.is_blocked?'Разблокировать':'Заблокировать'}</button></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  );
}
