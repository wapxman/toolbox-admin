'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const CATEGORIES = ['Перфораторы', 'Дрели', 'Шуруповёрты', 'Болгарки', 'Шлифмашины', 'Пылесосы', 'Лобзики', 'Циркулярные пилы', 'Краскопульты', 'Сварка'];
const CONDITIONS = [
  { value: 'good', label: 'Хорошее' },
  { value: 'fair', label: 'Удовлетворительное' },
  { value: 'needs_repair', label: 'Требует ремонта' },
];

const emptyForm = {
  name: '', brand: '', category: '', day_price: '', condition: 'good',
  description: '', photo_url: '', box_id: '', cell_choice: '',
};

export default function ToolsPage() {
  const [tools, setTools] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [toolsRes, boxesRes] = await Promise.all([
      supabase.from('tools').select('*, cells(id, cell_number, status, boxes(id, name))').order('created_at', { ascending: false }),
      supabase.from('boxes').select('id, name, cells(id, cell_number, tools(id))').order('name'),
    ]);
    setTools(toolsRes.data || []);
    setBoxes(boxesRes.data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(t: any) {
    setEditing(t);
    setForm({
      name: t.name || '', brand: t.brand || '', category: t.category || '',
      day_price: String(t.day_price ?? ''), condition: t.condition || 'good',
      description: t.description || '', photo_url: t.photo_url || '',
      box_id: t.cells?.boxes?.id || '', cell_choice: t.cells?.id || '',
    });
    setError('');
    setModalOpen(true);
  }

  // Свободные ячейки выбранного бокса (без инструмента) + опция «новая ячейка»
  function cellsForBox(boxId: string) {
    const box = boxes.find((b) => b.id === boxId);
    if (!box) return { free: [], nextNumber: 1 };
    const free = (box.cells || []).filter((c: any) => !c.tools || c.tools.length === 0);
    const nums = (box.cells || []).map((c: any) => c.cell_number);
    const nextNumber = nums.length ? Math.max(...nums) + 1 : 1;
    return { free, nextNumber };
  }

  async function handleSave() {
    setError('');
    if (!form.name.trim()) return setError('Укажите название инструмента');
    if (!form.category.trim()) return setError('Укажите категорию');
    const price = parseInt(form.day_price, 10);
    if (!price || price <= 0) return setError('Укажите корректную цену за день');

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        category: form.category.trim(),
        day_price: price,
        condition: form.condition,
        description: form.description.trim() || null,
        photo_url: form.photo_url.trim() || null,
      };

      if (editing) {
        // Редактирование — ячейку не меняем
        const { error: upErr } = await supabase.from('tools').update(payload).eq('id', editing.id);
        if (upErr) throw upErr;
      } else {
        // Добавление — нужна ячейка
        if (!form.box_id) { setSaving(false); return setError('Выберите бокс'); }
        let cellId = form.cell_choice;

        if (cellId === '__new__' || !cellId) {
          const { nextNumber } = cellsForBox(form.box_id);
          const { data: newCell, error: cellErr } = await supabase
            .from('cells')
            .insert({ box_id: form.box_id, cell_number: nextNumber, status: 'free' })
            .select('id')
            .single();
          if (cellErr) throw cellErr;
          cellId = newCell.id;
        }

        const { error: insErr } = await supabase.from('tools').insert({ ...payload, cell_id: cellId });
        if (insErr) throw insErr;
      }

      setModalOpen(false);
      setLoading(true);
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error: delErr } = await supabase.from('tools').delete().eq('id', deleteTarget.id);
      if (delErr) throw delErr;
      // Освобождаем ячейку
      if (deleteTarget.cell_id) {
        await supabase.from('cells').update({ status: 'free' }).eq('id', deleteTarget.cell_id);
      }
      setDeleteTarget(null);
      setLoading(true);
      await loadAll();
    } catch (e: any) {
      alert('Ошибка удаления: ' + (e.message || ''));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  const { free, nextNumber } = form.box_id ? cellsForBox(form.box_id) : { free: [], nextNumber: 1 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Инструменты</h2>
          <p className="text-sm text-gray-500 mt-1">{tools.length} инструментов</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>➕ Добавить инструмент</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full"><thead><tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
          <th className="px-5 py-3">Название</th><th className="px-5 py-3">Бренд</th>
          <th className="px-5 py-3">Категория</th><th className="px-5 py-3">Цена/день</th>
          <th className="px-5 py-3">Бокс</th><th className="px-5 py-3">Ячейка</th><th className="px-5 py-3">Статус</th>
          <th className="px-5 py-3 text-right">Действия</th>
        </tr></thead><tbody>
          {tools.map((t: any) => (
            <tr key={t.id} className="table-row">
              <td className="px-5 py-3 text-sm font-medium">{t.name}</td>
              <td className="px-5 py-3 text-sm text-gray-500">{t.brand || '—'}</td>
              <td className="px-5 py-3 text-sm text-gray-500">{t.category}</td>
              <td className="px-5 py-3 text-sm font-medium">{t.day_price?.toLocaleString()} сўм</td>
              <td className="px-5 py-3 text-sm text-gray-500">{t.cells?.boxes?.name || '—'}</td>
              <td className="px-5 py-3 text-sm">№{t.cells?.cell_number ?? '—'}</td>
              <td className="px-5 py-3"><span className={`badge ${t.cells?.status==='free'?'badge-green':'badge-red'}`}>
                {t.cells?.status==='free'?'Свободен':'Занят'}</span></td>
              <td className="px-5 py-3 text-right whitespace-nowrap">
                <button className="text-sm text-gray-500 hover:text-brand px-2" onClick={() => openEdit(t)}>✏️</button>
                <button className="text-sm text-gray-500 hover:text-red-500 px-2" onClick={() => setDeleteTarget(t)}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody></table>
        {tools.length === 0 && <div className="p-8 text-center text-gray-400">Нет инструментов</div>}
      </div>

      {/* Модалка добавления/редактирования */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !saving && setModalOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editing ? 'Редактировать инструмент' : 'Новый инструмент'}</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => !saving && setModalOpen(false)}>✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Перфоратор Bosch GBH 2-26" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Бренд</label>
                  <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Bosch" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Категория *</label>
                  <input className="input" list="cat-list" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Перфораторы" />
                  <datalist id="cat-list">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Цена/день (сум) *</label>
                  <input className="input" type="number" value={form.day_price} onChange={(e) => setForm({ ...form, day_price: e.target.value })} placeholder="80000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Состояние</label>
                  <select className="input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                    {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {!editing && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Бокс *</label>
                    <select className="input" value={form.box_id} onChange={(e) => setForm({ ...form, box_id: e.target.value, cell_choice: '' })}>
                      <option value="">— выберите —</option>
                      {boxes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ячейка</label>
                    <select className="input" value={form.cell_choice} onChange={(e) => setForm({ ...form, cell_choice: e.target.value })} disabled={!form.box_id}>
                      {free.map((c: any) => <option key={c.id} value={c.id}>Ячейка №{c.cell_number} (свободна)</option>)}
                      <option value="__new__">➕ Новая ячейка №{nextNumber}</option>
                    </select>
                  </div>
                </div>
              )}

              {editing && (
                <div className="text-xs text-gray-400">
                  Ячейка: {editing.cells?.boxes?.name} — №{editing.cells?.cell_number} (нельзя изменить здесь)
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Профессиональный перфоратор для бетона..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ссылка на фото (URL)</label>
                <input className="input" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setModalOpen(false)} disabled={saving}>Отмена</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Сохранение...' : editing ? 'Сохранить' : 'Добавить'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Подтверждение удаления */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">Удалить инструмент?</h3>
            <p className="text-sm text-gray-500 mb-5">«{deleteTarget.name}» будет удалён безвозвратно. Ячейка освободится.</p>
            <div className="flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Отмена</button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Удаление...' : 'Удалить'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
