'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Настройки читаются/сохраняются в app_settings (key='pricing').
// Бэкенд берёт их оттуда же при расчёте цены аренды и штрафа (кэш 60 сек).
const DEFAULTS = { discount3_pct: 20, discount7_pct: 35, overdue_multiplier: 1.5 };
const DELIVERY_DEFAULTS = { fee: 50000, city: 'Ташкент', same_day_min_hours: 2, days_ahead: 2,
  slots: [{ start: '10:00', end: '14:00' }, { start: '14:00', end: '18:00' }, { start: '18:00', end: '22:00' }] };

export default function SettingsPage() {
  const [pricing, setPricing] = useState<typeof DEFAULTS>(DEFAULTS);
  const [delivery, setDelivery] = useState<any>(DELIVERY_DEFAULTS);
  const [slotsText, setSlotsText] = useState('10:00-14:00, 14:00-18:00, 18:00-22:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [demoPrice, setDemoPrice] = useState(80000);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await supabase
      .from('app_settings').select('value').eq('key', 'pricing').maybeSingle();
    if (error) setError(`Ошибка загрузки: ${error.message}`);
    if (data?.value) setPricing({ ...DEFAULTS, ...data.value });
    const { data: d } = await supabase.from('app_settings').select('value').eq('key', 'delivery').maybeSingle();
    if (d?.value) {
      const v = { ...DELIVERY_DEFAULTS, ...d.value };
      setDelivery(v);
      setSlotsText((v.slots || []).map((x: any) => `${x.start}-${x.end}`).join(', '));
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true); setMsg(''); setError('');
    const { error } = await supabase.from('app_settings')
      .upsert({ key: 'pricing', value: pricing, updated_at: new Date().toISOString() });
    if (error) setError(`Ошибка сохранения: ${error.message}`);
    else setMsg('Сохранено. Бэкенд подхватит в течение минуты (кэш 60 сек).');
    setSaving(false);
  }

  async function saveDelivery() {
    setSaving(true); setMsg(''); setError('');
    const slots = slotsText.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
      const [start, end] = x.split('-').map((y) => y.trim());
      return { start, end };
    });
    const re = /^\d{2}:\d{2}$/;
    if (slots.length === 0 || slots.some((x) => !re.test(x.start) || !re.test(x.end))) {
      setError('Интервалы задаются как «10:00-14:00, 14:00-18:00»'); setSaving(false); return;
    }
    const value = { ...delivery, fee: Number(delivery.fee), same_day_min_hours: Number(delivery.same_day_min_hours), days_ahead: Number(delivery.days_ahead), slots };
    const { error } = await supabase.from('app_settings')
      .upsert({ key: 'delivery', value, updated_at: new Date().toISOString() });
    if (error) setError(`Ошибка сохранения: ${error.message}`);
    else setMsg('Доставка сохранена. Приложение увидит изменения в течение минуты.');
    setSaving(false);
  }

  function calc(days: number) {
    if (days >= 7) return Math.round(days * demoPrice * (1 - pricing.discount7_pct / 100));
    if (days >= 3) return Math.round(days * demoPrice * (1 - pricing.discount3_pct / 100));
    return days * demoPrice;
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h2 className="text-2xl font-bold text-gray-900">Настройки</h2>
        <p className="text-sm text-gray-500 mt-1">Цены и скидки — применяются бэкендом при создании и возврате аренды</p></div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}
      {msg && <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{msg}</div>}

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">💰 Скидки и штрафы</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Скидка от 3 дней (%)</label>
            <input type="number" min={0} max={90} className="input" value={pricing.discount3_pct}
              onChange={(e) => setPricing({ ...pricing, discount3_pct: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Скидка от 7 дней (%)</label>
            <input type="number" min={0} max={90} className="input" value={pricing.discount7_pct}
              onChange={(e) => setPricing({ ...pricing, discount7_pct: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Множитель штрафа</label>
            <input type="number" min={1} step={0.1} className="input" value={pricing.overdue_multiplier}
              onChange={(e) => setPricing({ ...pricing, overdue_multiplier: Number(e.target.value) })} />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Штраф за просрочку = дни просрочки × (цена/день по аренде) × множитель.
          Цена за день задаётся у каждого инструмента на странице «Инструменты».
        </p>
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Сохраняю…' : 'Сохранить настройки'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">🚚 Доставка</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Стоимость (сўм)</label>
            <input type="number" min={0} step={1000} className="input" value={delivery.fee}
              onChange={(e) => setDelivery({ ...delivery, fee: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Мин. часов до интервала</label>
            <input type="number" min={0} className="input" value={delivery.same_day_min_hours}
              onChange={(e) => setDelivery({ ...delivery, same_day_min_hours: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Дней вперёд</label>
            <input type="number" min={1} max={7} className="input" value={delivery.days_ahead}
              onChange={(e) => setDelivery({ ...delivery, days_ahead: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Интервалы</label>
          <input className="input" value={slotsText} onChange={(e) => setSlotsText(e.target.value)} placeholder="10:00-14:00, 14:00-18:00, 18:00-22:00" />
        </div>
        <p className="text-xs text-gray-400">Одна цена на любую точку города — и за доставку, и за вызов курьера при возврате аренды.</p>
        <button onClick={saveDelivery} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? 'Сохраняю…' : 'Сохранить доставку'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">🧮 Предпросмотр расчёта</h3>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Цена инструмента (сўм/день)</label>
          <input type="number" min={0} step={1000} className="input max-w-[200px]" value={demoPrice}
            onChange={(e) => setDemoPrice(Number(e.target.value))} />
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[1, 3, 7].map((d) => (
            <div key={d} className="p-3 rounded-lg bg-gray-50">
              <div className="text-gray-500 text-xs mb-1">{d} {d === 1 ? 'день' : 'дней'}</div>
              <div className="font-semibold">{calc(d).toLocaleString()} сўм</div>
              {d >= 3 && (
                <div className="text-xs text-emerald-600 mt-0.5">
                  −{d >= 7 ? pricing.discount7_pct : pricing.discount3_pct}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
