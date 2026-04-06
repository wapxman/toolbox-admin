'use client';

const users = [
  { id: 1, phone: '+998 90 123 45 67', name: 'Бахтиёр Т.', rentals: 5, spent: 960000, joined: '3 апр 2026', status: 'active' },
  { id: 2, phone: '+998 91 987 65 43', name: 'Алишер М.', rentals: 2, spent: 240000, joined: '5 апр 2026', status: 'active' },
  { id: 3, phone: '+998 93 111 22 33', name: 'Дильшод К.', rentals: 8, spent: 1520000, joined: '1 апр 2026', status: 'active' },
  { id: 4, phone: '+998 90 555 66 77', name: 'Рустам А.', rentals: 1, spent: 160000, joined: '4 апр 2026', status: 'blocked' },
  { id: 5, phone: '+998 94 444 33 22', name: 'Нодир Х.', rentals: 3, spent: 480000, joined: '2 апр 2026', status: 'active' },
];

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Пользователи</h2>
          <p className="text-sm text-gray-500 mt-1">{users.length} пользователей</p>
        </div>
        <input type="text" placeholder="Поиск по номеру..." className="input max-w-xs" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/50">
              <th className="px-5 py-3">Телефон</th>
              <th className="px-5 py-3">Имя</th>
              <th className="px-5 py-3">Аренды</th>
              <th className="px-5 py-3">Потрачено</th>
              <th className="px-5 py-3">Дата регистрации</th>
              <th className="px-5 py-3">Статус</th>
              <th className="px-5 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="table-row">
                <td className="px-5 py-3 text-sm font-medium">{u.phone}</td>
                <td className="px-5 py-3 text-sm">{u.name}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{u.rentals}</td>
                <td className="px-5 py-3 text-sm font-medium">{u.spent.toLocaleString()} сўм</td>
                <td className="px-5 py-3 text-sm text-gray-500">{u.joined}</td>
                <td className="px-5 py-3">
                  <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>
                    {u.status === 'active' ? 'Активен' : 'Заблокирован'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <button className={`text-xs font-medium ${u.status === 'active' ? 'text-red-500 hover:underline' : 'text-brand hover:underline'}`}>
                    {u.status === 'active' ? 'Блокировать' : 'Разблокировать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
