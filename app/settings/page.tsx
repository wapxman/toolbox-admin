'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Настройки читаются/сохраняются в app_settings (key='pricing').
// Бэкенд берёт их оттуда же при расчёте цены аренды и штрафа (кэш 60 сек).
const DEFAULTS = { discount3_pct: 20, discount7_pct: 35, overdue_multiplier: 1.5 };

export default function SettingsPage() {
  const [pricing, setPricing] = useState<typeof DEFAULTS>(DEFAULTS);
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
