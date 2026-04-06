'use client';
import { useState } from 'react';

export default function SettingsPage() {
  const [basePrice, setBasePrice] = useState(80000);
  const [discount3, setDiscount3] = useState(20);
  const [discount7, setDiscount7] = useState(35);
  const [penaltyMultiplier, setPenaltyMultiplier] = useState(1.5);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Настройки</h2>
        <p className="text-sm text-gray-500 mt-1">Цены, скидки и параметры системы</p>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">💰 Цены и скидки</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Базовая цена/день (сўм)</label>
            <input type="number" className="input" value={basePrice} onChange={(e) => setBasePrice(+e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Множитель штрафа</label>
            <input type="number" step="0.1" className="input" value={penaltyMultiplier} onChange={(e) => setPenaltyMultiplier(+e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Скидка от 3 дней (%)</label>
            <input type="number" className="input" value={discount3} onChange={(e) => setDiscount3(+e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Скидка от 7 дней (%)</label>
            <input type="number" className="input" value={discount7} onChange={(e) => setDiscount7(+e.target.value)} />
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Предпросмотр:</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center p-2 bg-white rounded-lg">
              <div className="text-gray-500">1 день</div>
              <div className="font-bold">{basePrice.toLocaleString()} сўм</div>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <div className="text-gray-500">3 дня <span className="text-emerald-600">−{discount3}%</span></div>
              <div className="font-bold">{Math.round(3 * basePrice * (1 - discount3 / 100)).toLocaleString()} сўм</div>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <div className="text-gray-500">7 дней <span className="text-emerald-600">−{discount7}%</span></div>
              <div className="font-bold">{Math.round(7 * basePrice * (1 - discount7 / 100)).toLocaleString()} сўм</div>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">🔗 Supabase</h3>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Project URL</label>
          <input className="input bg-gray-50" value="https://zwzmcihwtwgjajjjsbms.supabase.co" readOnly />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Anon Key</label>
          <input className="input" type="password" placeholder="eyJhbG..." />
        </div>
      </div>

      {/* MQTT */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">📡 MQTT / IoT</h3>
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Брокер</label>
          <input className="input" placeholder="mqtt://broker.hivemq.com" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Таймаут замка (сек)</label>
            <input type="number" className="input" defaultValue={30} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Heartbeat интервал (сек)</label>
            <input type="number" className="input" defaultValue={30} />
          </div>
        </div>
      </div>

      <button className="btn-primary w-full">Сохранить настройки</button>
    </div>
  );
}
