'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function BoxesPage() {
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '', cells_count: '6' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBoxes(); }, []);

  async function loadBoxes() {
    const { data } = await supabase.from('boxes').select('*').order('created_at', { ascending: false });
    setBoxes(data || []);
    setLoading(false);
  }

  async function addBox() {
    if (!form.name || !form.address) return;
    setSaving(true);
    const { error } = await supabase.from('boxes').insert({
      name: form.name, address: form.address,
      lat: parseFloat(form.lat) || 41.311081, lng: parseFloat(form.lng) || 69.279737,
      cells_count: parseInt(form.cells_count) || 6, status: 'online',
    });
    setSaving(false);
    if (!error) { setShowModal(false); setForm({ name: '', address: '', lat: '', lng: '', cells_count: '6' }); loadBoxes(); }
  }

  async function toggleStatus(id: string, current: string) {
    await supabase.from('boxes').update({ status: current === 'online' ? 'offline' : 'online' }).eq('id', id);
    loadBoxes();
  }

  async function deleteBox(id: string) {
    if (!confirm('Удалить бокс?')) return;
    await supabase.from('boxes').delete().eq('id', id);
    loadBoxes();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold text-gray-900">Боксы</h2>
          <p className="text-sm text-gray-500 mt-1">{boxes.length} боксов</p></div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Добавить бокс</button>
      </div>

      {boxes.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Нет боксов. Добавьте первый!</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {boxes.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{b.name}</h3>
                <span className={`flex items-center gap-1.5 text-xs font-medium ${b.status==='online'?'text-emerald-600':'text-red-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${b.status==='online'?'bg-emerald-400':'bg-red-400'}`} />
                  {b.status==='online'?'Онлайн':'Оффлайн'}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-500">
                <div>📍 {b.address}</div>
                <div>📦 {b.cells_count} ячеек</div>
                <div>🌐 {b.lat?.toFixed(4)}, {b.lng?.toFixed(4)}</div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => toggleStatus(b.id, b.status)} className={`flex-1 text-xs py-1.5 rounded-lg font-medium ${b.status==='online'?'btn-danger':'btn-primary'}`}>
                  {b.status==='online'?'Отключить':'Включить'}
                </button>
                <button onClick={() => deleteBox(b.id)} className="btn-secondary text-xs py-1.5 text-red-500">Удалить</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold">Добавить бокс</h3>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Название</label>
                <input className="input" placeholder="ToolBox #2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Адрес</label>
                <input className="input" placeholder="ТЦ ..., этаж" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Широта</label>
                  <input type="number" step="0.000001" className="input" placeholder="41.311081" value={form.lat} onChange={e=>setForm({...form,lat:e.target.value})} /></div>
                <div><label className="text-sm font-medium text-gray-700 mb-1 block">Долгота</label>
                  <input type="number" step="0.000001" className="input" placeholder="69.279737" value={form.lng} onChange={e=>setForm({...form,lng:e.target.value})} /></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700 mb-1 block">Кол-во ячеек</label>
                <input type="number" className="input" placeholder="6" value={form.cells_count} onChange={e=>setForm({...form,cells_count:e.target.value})} /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={addBox} disabled={saving} className="btn-primary flex-1">{saving?'Сохранение...':'Сохранить'}</button>
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
