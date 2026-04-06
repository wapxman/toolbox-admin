'use client';
import { useState } from 'react';

const initialBoxes = [
  { id: 1, name: 'ToolBox #1', address: 'ТЦ Samarqand Darvoza, 2 этаж', lat: 41.311081, lng: 69.279737, cells: 12, online: true, lastPing: '30 сек назад' },
  { id: 2, name: 'ToolBox #2', address: 'Строймаркет Чиланзар, вход', lat: 41.285960, lng: 69.204539, cells: 8, online: true, lastPing: '15 сек назад' },
  { id: 3, name: 'ToolBox #3', address: 'ТЦ Mega Planet, 1 этаж', lat: 41.340920, lng: 69.285637, cells: 6, online: false, lastPing: '2 часа назад' },
];

export default function BoxesPage() {
  const [boxes] = useState(initialBoxes);
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Боксы</h2>
          <p className="text-sm text-gray-500 mt-1">{boxes.length} боксов</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Добавить бокс</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {boxes.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{b.name}</h3>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${b.online ? 'text-emerald-600' : 'text-red-500'}`}>
                <span className={`w-2 h-2 rounded-full ${b.online ? 'bg-emerald-400' : 'bg-red-400'}`} />
                {b.online ? 'Онлайн' : 'Оффлайн'}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">📍 {b.address}</div>
              <div className="flex items-center gap-2">📦 {b.cells} ячеек</div>
              <div className="flex items-center gap-2">📡 Пинг: {b.lastPing}</div>
              <div className="flex items-center gap-2">🌐 {b.lat.toFixed(4)}, {b.lng.toFixed(4)}</div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="btn-secondary flex-1 text-xs py-1.5">Изменить</button>
              <button className={`flex-1 text-xs py-1.5 rounded-lg font-medium ${b.online ? 'btn-danger' : 'btn-primary'}`}>
                {b.online ? 'Отключить' : 'Включить'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Добавить бокс</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Название</label><input className="input" placeholder="ToolBox #4" /></div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Адрес</label><input className="input" placeholder="ТЦ ..., этаж" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Широта</label><input type="number" step="0.000001" className="input" placeholder="41.311081" /></div>
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Долгота</label><input type="number" step="0.000001" className="input" placeholder="69.279737" /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Кол-во ячеек</label><input type="number" className="input" placeholder="12" /></div>
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
