'use client';
// Акция «Колесо Фортуны»: шансы, потолок, срок бонуса и список выигрышей.
//
// ⚠️ ШАНСЫ ЖИВУТ ЗДЕСЬ, А НЕ В КОДЕ ПРИЛОЖЕНИЯ (решение владельца 13.10.2026).
// Это прямой расход компании, и менять его должен владелец без пересборки и
// без выкладки в магазины. Приложение весов вообще не видит — оно просит
// сервер прокрутить и получает готовый результат.
//
// ⚠️ WEIGHT — ЭТО ВЕС, А НЕ ПРОЦЕНТ. Сумма весов может быть любой: сервер
// делит каждый вес на общую сумму. Так добавление приза не требует
// пересчитывать остальные. Процент рядом считается для глаз.
// Вес 0 — приз на колесе виден, но не выпадает никогда.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Prize = { code: string; label: string; kind: 'bonus' | 'item'; amount: number; weight: number };
type Cfg = {
  enabled: boolean;
  max_pay_pct: number;
  expires_days: number;
  spins_per_user: number;
  /** Сколько всего призов разыгрываем. 0 — без ограничения. */
  winners_limit: number;
  /** До какого момента идёт акция (ISO с часовым поясом). Пусто — без срока. */
  ends_at: string;
  prizes: Prize[];
};

const EMPTY: Cfg = {
  enabled: true, max_pay_pct: 50, expires_days: 30, spins_per_user: 1,
  winners_limit: 1000, ends_at: '2026-12-31T23:59:59+05:00', prizes: [],
};

/** Ташкентское время для поля даты: в input[type=date] уходит только «ГГГГ-ММ-ДД»,
 *  а на сервер — конец этих суток по Ташкенту, иначе акция закроется на пять
 *  часов раньше обещанного. */
const dateOnly = (iso: string) => (iso || '').slice(0, 10);
const toEndOfDay = (d: string) => (d ? `${d}T23:59:59+05:00` : '');

export default function PromoPage() {
  const [cfg, setCfg] = useState<Cfg>(EMPTY);
  const [spins, setSpins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [s, sp] = await Promise.all([
      supabase.from('app_settings').select('value').eq('key', 'wheel').maybeSingle(),
      supabase.from('wheel_spins')
        .select('id, prize_label, kind, amount, status, created_at, users(phone, name)')
        .order('created_at', { ascending: false }).limit(100),
    ]);
    setCfg({ ...EMPTY, ...((s.data?.value as Cfg) || {}) });
    setSpins(sp.data || []);
    setLoading(false);
  }

  const total = cfg.prizes.reduce((a, p) => a + (Number(p.weight) || 0), 0);
  const chance = (w: number) => (total > 0 ? (100 * (Number(w) || 0)) / total : 0);

  function setPrize(i: number, patch: Partial<Prize>) {
    const next = [...cfg.prizes];
    next[i] = { ...next[i], ...patch };
    setCfg({ ...cfg, prizes: next });
  }

  function addPrize() {
    setCfg({
      ...cfg,
      prizes: [...cfg.prizes, { code: `prize_${Date.now()}`, label: '', kind: 'bonus', amount: 0, weight: 0 }],
    });
  }

  function removePrize(i: number) {
    setCfg({ ...cfg, prizes: cfg.prizes.filter((_, k) => k !== i) });
  }

  async function save() {
    // Проверки ДО записи: пустой набор или все нули означают, что колесо
    // физически не сможет ничего разыграть, и человек упрётся в ошибку.
    const live = cfg.prizes.filter((p) => Number(p.weight) > 0);
    if (cfg.enabled && live.length === 0) {
      setMsg({ ok: false, text: 'Нельзя включить акцию: ни у одного приза нет веса — выпадать нечему.' });
      return;
    }
    if (cfg.prizes.some((p) => !p.label.trim())) {
      setMsg({ ok: false, text: 'У приза пустое название — его увидит клиент на колесе.' });
      return;
    }
    if (cfg.max_pay_pct < 0 || cfg.max_pay_pct > 100) {
      setMsg({ ok: false, text: 'Потолок должен быть от 0 до 100 %.' });
      return;
    }
    // Срок в прошлом закроет акцию немедленно — это почти всегда опечатка в
    // годе, а не намерение, поэтому спрашиваем, а не делаем молча.
    if (cfg.enabled && cfg.ends_at && new Date(cfg.ends_at).getTime() < Date.now()) {
      if (!confirm('Дата окончания уже прошла — акция закроется сразу. Всё равно сохранить?')) return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'wheel', value: cfg, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSaving(false);
    setMsg(error
      ? { ok: false, text: `Не сохранилось: ${error.message}` }
      : { ok: true, text: 'Сохранено. Приложение подхватит в течение минуты.' });
  }

  async function markIssued(id: string) {
    await supabase.from('wheel_spins').update({ status: 'issued' }).eq('id', id);
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;

  const pending = spins.filter((s) => s.kind === 'item' && s.status === 'won');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Колесо Фортуны</h2>
          <p className="text-sm text-gray-500 mt-1">Шансы, потолок скидки и выигрыши</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${msg.ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-700'}`}>{msg.text}</div>
      )}

      {pending.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ждут выдачи в пункте: <b>{pending.length}</b> — ниже в списке отмечены кнопкой «Выдан».
        </div>
      )}

      {/* ---- общие настройки ---- */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" className="w-4 h-4" checked={cfg.enabled}
            onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
          <span className="text-sm font-medium">Акция включена</span>
        </label>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Потолок скидки, %</label>
            <input type="number" min={0} max={100} className="input" value={cfg.max_pay_pct}
              onChange={(e) => setCfg({ ...cfg, max_pay_pct: parseInt(e.target.value) || 0 })} />
            <p className="text-xs text-gray-400 mt-1">
              Сколько процентов аренды можно закрыть бонусом. 100 — бонус закрывает весь чек.
              Доставка не покрывается никогда.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Срок бонуса, дней</label>
            <input type="number" min={1} className="input" value={cfg.expires_days}
              onChange={(e) => setCfg({ ...cfg, expires_days: parseInt(e.target.value) || 1 })} />
            <p className="text-xs text-gray-400 mt-1">Через столько дней невостребованный бонус сгорает.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Прокруток на человека</label>
            <input type="number" min={0} className="input" value={cfg.spins_per_user}
              onChange={(e) => setCfg({ ...cfg, spins_per_user: parseInt(e.target.value) || 0 })} />
            <p className="text-xs text-gray-400 mt-1">Всего за всё время, а не в сутки.</p>
          </div>
        </div>

        {/* Эти два условия объявлены людям в правилах акции внутри приложения
            и требуются магазинами (Apple 5.3.2, Google Play Gamified Loyalty
            Programs). Меняя их здесь, вы меняете и то, что читает клиент. */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Сколько победителей</label>
            <input type="number" min={0} className="input" value={cfg.winners_limit}
              onChange={(e) => setCfg({ ...cfg, winners_limit: parseInt(e.target.value) || 0 })} />
            <p className="text-xs text-gray-400 mt-1">
              Разыграно: <b>{spins.length >= 100 ? '100+' : spins.length}</b> из {cfg.winners_limit || '∞'}.
              Когда призы кончатся, колесо закроется само. 0 — без ограничения.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Акция идёт до</label>
            <input type="date" className="input" value={dateOnly(cfg.ends_at)}
              onChange={(e) => setCfg({ ...cfg, ends_at: toEndOfDay(e.target.value) })} />
            <p className="text-xs text-gray-400 mt-1">
              Включительно, по ташкентскому времени. После этой даты прокрутка недоступна.
            </p>
          </div>
        </div>
      </div>

      {/* ---- призы ---- */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Призы и шансы</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Вес — доля в розыгрыше, не процент. Сумма весов: <b>{total}</b>. Вес 0 — приз виден, но не выпадает.
            </p>
          </div>
          <button onClick={addPrize} className="btn-secondary text-sm">+ Приз</button>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-400 px-1">
            <div className="col-span-4">Название (видит клиент)</div>
            <div className="col-span-2">Тип</div>
            <div className="col-span-2">Сумма, сум</div>
            <div className="col-span-1">Вес</div>
            <div className="col-span-2">Шанс</div>
            <div className="col-span-1" />
          </div>
          {cfg.prizes.map((p, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <input className="input col-span-4" value={p.label} placeholder="300 000 сум"
                onChange={(e) => setPrize(i, { label: e.target.value })} />
              <select className="input col-span-2" value={p.kind}
                onChange={(e) => setPrize(i, { kind: e.target.value as 'bonus' | 'item' })}>
                <option value="bonus">Бонус</option>
                <option value="item">Вещь</option>
              </select>
              <input type="number" className="input col-span-2" value={p.amount} disabled={p.kind === 'item'}
                onChange={(e) => setPrize(i, { amount: parseInt(e.target.value) || 0 })} />
              <input type="number" min={0} className="input col-span-1" value={p.weight}
                onChange={(e) => setPrize(i, { weight: parseInt(e.target.value) || 0 })} />
              <div className={`col-span-2 text-sm font-semibold ${chance(p.weight) === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                {chance(p.weight).toFixed(1)} %
              </div>
              <button onClick={() => removePrize(i)}
                className="col-span-1 text-red-500 text-xs hover:underline">убрать</button>
            </div>
          ))}
          {cfg.prizes.length === 0 && (
            <div className="text-sm text-gray-400 py-6 text-center">Призов нет. Добавьте хотя бы один.</div>
          )}
        </div>
      </div>

      {/* ---- выигрыши ---- */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Выигрыши ({spins.length})</h3>
        {spins.length === 0 ? (
          <div className="text-sm text-gray-400 py-6 text-center">Пока никто не крутил.</div>
        ) : (
          <div className="space-y-1">
            {spins.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.prize_label}</div>
                  <div className="text-xs text-gray-400">
                    {s.users?.phone || '—'} · {new Date(s.created_at).toLocaleString('ru-RU')}
                  </div>
                </div>
                {s.kind === 'item' ? (
                  s.status === 'issued'
                    ? <span className="text-xs text-emerald-600 font-medium">выдан</span>
                    : <button onClick={() => markIssued(s.id)} className="btn-secondary text-xs py-1">Выдан</button>
                ) : (
                  <span className="text-xs text-gray-400">бонус зачислен</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
