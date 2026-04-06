'use client';
import { useState } from 'react';

const initialTools = [
  { id: 1, name: 'Дрель Bosch GSB 13 RE', category: 'Дрели', price: 80000, box: 'ToolBox #1', cell: 1, status: 'rented', image: null },
  { id: 2, name: 'Шуруповёрт Makita DF331D', category: 'Шуруповёрты', price: 80000, box: 'ToolBox #1', cell: 2, status: 'available', image: null },
  { id: 3, name: 'Болгарка DeWalt DWE4057', category: 'Болгарки', price: 80000, box: 'ToolBox #1', cell: 3, status: 'rented', image: null },
  { id: 4, name: 'Перфоратор Bosch GBH 2-26', category: 'Перфораторы', price: 80000, box: 'ToolBox #1', cell: 4, status: 'available', image: null },
  { id: 5, name: 'Лобзик Makita 4329', category: 'Пилы', price: 80000, box: 'ToolBox #2', cell: 1, status: 'maintenance', image: null },
  { id: 6, name: 'Шлифмашина Bosch GEX 125', category: 'Шлифовка', price: 80000, box: 'ToolBox #2', cell: 2, status: 'available', image: null },
];

const categories = ['Все', 'Дрели', 'Шуруповёрты', 'Болгарки', 'Перфораторы', 'Пилы', 'Шлифовка'];

export default function ToolsPage() {
  const [tools] = useState(initialTools);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Все');
  const [showModal, setShowModal] = useState(false);
  const [editTool, setEditTool] = useState<any>(null);

  const filtered = tools.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'Все' || t.category === category;
    return matchSearch && matchCat;
  });

  const statusBadge = (s: string) => {
    if (s === 'available') return <span className="badge badge-green">Свободен</span>;
    if (s === 'rented') return <span className="badge badge-blue">В аренде</span>;
    return <span className="badge badge-yellow">Обслуживание</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Инструменты</h2>
          <p className="text-sm text-gray-500 mt-1">{tools.length} инструментов</p>
        </div>
        <button onClick={() => { setEditTool(null); setShowModal(true); }} className="btn-primary">
          + Добавить инструмент
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input type="text" placeholder="Поиск по названию..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="input max-w-xs" />
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${category === c ? 'bg-brand text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50/50">
              <th className="px-5 py-3">Фото</th>
              <th className="px-5 py-3">Название</th>
              <th className="px-5 py-3">Категория</th>
              <th className="px-5 py-3">Цена/день</th>
              <th className="px-5 py-3">Бокс</th>
              <th className="px-5 py-3">Ячейка</th>
              <th className="px-5 py-3">Статус</th>
              <th className="px-5 py-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="table-row">
                <td className="px-5 py-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                    {t.image ? '📷' : '🔧'}
                  </div>
                </td>
                <td className="px-5 py-3 text-sm font-medium">{t.name}</td>
                <td className="px-5 py-3 text-sm text-gray-500">{t.category}</td>
                <td className="px-5 py-3 text-sm font-medium">{t.price.toLocaleString()} сўм</td>
                <td className="px-5 py-3 text-sm text-gray-500">{t.box}</td>
                <td className="px-5 py-3 text-sm text-gray-500">#{t.cell}</td>
                <td className="px-5 py-3">{statusBadge(t.status)}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditTool(t); setShowModal(true); }}
                      className="text-xs text-brand hover:underline">Изменить</button>
                    <button className="text-xs text-red-500 hover:underline">Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">{editTool ? 'Редактировать' : 'Добавить'} инструмент</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Название</label>
                <input className="input" defaultValue={editTool?.name} placeholder="Дрель Bosch GSB 13 RE" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Категория</label>
                  <select className="input" defaultValue={editTool?.category}>
                    {categories.filter(c => c !== 'Все').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Цена/день (сўм)</label>
                  <input type="number" className="input" defaultValue={editTool?.price || 80000} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Бокс</label>
                  <select className="input"><option>ToolBox #1</option><option>ToolBox #2</option></select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Ячейка</label>
                  <input type="number" className="input" defaultValue={editTool?.cell || 1} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Фото инструмента</label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-brand/50 transition cursor-pointer">
                  <div className="text-3xl mb-2">📷</div>
                  <p className="text-sm text-gray-500">Нажмите или перетащите фото</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG до 5MB</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-primary flex-1">Сохранить</button>
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
