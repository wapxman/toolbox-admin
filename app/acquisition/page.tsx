'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// Страница «Привлечение»: клики по трекинг-ссылкам скачивания (таблица app_clicks,
// пишет /dl на taketool.uz) + воронка до регистраций и оплаченных заказов.
//
// Честная граница данных: клики мы считаем сами и точно, с разбивкой по каналам.
// Установки живут в Play Console / App Store Connect и по API сюда не приходят.
// Регистрации и заказы — наши, но к каналу пока не привязаны (для этого нужен
// Install Referrer в приложении). Поэтому нижние ступени показываем как «всего
// за период», а не как «из Instagram» — иначе цифра врала бы.

const PRESETS: Record<string, { label: string; source: string; medium: string }> = {
  'ig-bio': { label: 'Instagram — ссылка в профиле', source: 'instagram', medium: 'bio' },
  'ig-story': { label: 'Instagram — сторис', source: 'instagram', medium: 'story' },
  'ig-reels': { label: 'Instagram — reels', source: 'instagram', medium: 'reels' },
  'ig-ads': { label: 'Instagram — платная реклама', source: 'instagram', medium: 'cpc' },
  tg: { label: 'Telegram — посты', source: 'telegram', medium: 'social' },
  'tg-ads': { label: 'Telegram — реклама', source: 'telegram', medium: 'cpc' },
  fb: { label: 'Facebook', source: 'facebook', medium: 'social' },
  yt: { label: 'YouTube', source: 'youtube', medium: 'video' },
  site: { label: 'Сайт taketool.uz', source: 'taketool.uz', medium: 'site' },
  qr: { label: 'QR — наклейки', source: 'qr', medium: 'offline' },
  card: { label: 'QR — визитки', source: 'qr', medium: 'offline' },
  box: { label: 'QR — на боксе', source: 'qr', medium: 'offline' },
};

const PLATFORM_LABEL: Record<string, string> = {
  android: 'Android', ios: 'iPhone', desktop: 'Компьютер', other: 'Прочее',
};

// Считает SQL-функция acquisition_stats(days_back) — см. миграцию
// sms_log_and_acquisition_stats. Раньше страница выгружала сами клики и
// складывала их в браузере, но Supabase REST отдаёт максимум 1000 строк на
// запрос: всё, что выше 1000 кликов за период, молча пропадало (01.10.2026
// панель показывала 1000 вместо 1667). Агрегат считается на сервере и лимита
// строк не касается.
type Channel = {
  name: string; clicks: number; uniq: number;
  android: number; ios: number; other: number;
};
type Stats = {
  total: number; uniq: number; to_store: number;
  channels: Channel[];
  by_day: { day: string; source: string; clicks: number }[];
  cities: { city: string; clicks: number }[];
};
const EMPTY_STATS: Stats = { total: 0, uniq: 0, to_store: 0, channels: [], by_day: [], cities: [] };

export default function Acquisition() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [users, setUsers] = useState(0);
  const [orders, setOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    const [statsRes, userRes, orderRes] = await Promise.all([
      supabase.rpc('acquisition_stats', { days_back: days }),
      supabase.from('users').select('*', { count: 'exact', head: true })
        .gte('created_at', since).is('deleted_at', null),
      supabase.from('rentals').select('*', { count: 'exact', head: true })
        .gte('created_at', since).not('paid_at', 'is', null),
    ]);

    // Молча показать нули при сбое нельзя: это читается как «кликов нет».
    setFailed(statsRes.error ? statsRes.error.message : null);
    setStats((statsRes.data as Stats) || EMPTY_STATS);
    setUsers(userRes.count || 0);
    setOrders(orderRes.count || 0);
    setLoading(false);
  }

  // Из агрегата собираем только то, что нужно графику: строка на день,
  // в ней по колонке на источник (recharts складывает их в стопку).
  const agg = useMemo(() => {
    const sources = Array.from(new Set(stats.by_day.map((r) => r.source)));
    const byDay = new Map<string, Record<string, number>>();
    for (const r of stats.by_day) {
      if (!byDay.has(r.day)) byDay.set(r.day, {});
      byDay.get(r.day)![r.source] = r.clicks;
    }
    const chart = Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, vals]) => ({
        day: day.slice(5).split('-').reverse().join('.'),
        ...sources.reduce((o, s) => ({ ...o, [s]: vals[s] || 0 }), {}),
      }));

    return {
      total: stats.total,
      uniq: stats.uniq,
      toStore: stats.to_store,
      channels: stats.channels,
      chart,
      sources,
      cities: stats.cities.slice(0, 6).map((c) => [c.city, c.clicks] as [string, number]),
    };
  }, [stats]);

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Загрузка...</div></div>;
  }

  const COLORS = ['#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed', '#0891b2', '#be185d'];
  const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—');

  const funnel = [
    { label: 'Клики по ссылкам', value: agg.total, note: `${agg.uniq} уникальных устройств`, solid: true },
    { label: 'Ушли в магазин', value: agg.toStore, note: `${pct(agg.toStore, agg.total)} от кликов`, solid: true },
    { label: 'Установки', value: null, note: 'только в Play Console / App Store Connect', solid: false },
    { label: 'Регистрации', value: users, note: 'всего за период, без разбивки по каналам', solid: true },
    { label: 'Оплаченные заказы', value: orders, note: 'всего за период, без разбивки по каналам', solid: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Привлечение</h2>
          <p className="text-sm text-gray-500 mt-1">Откуда скачивают Taketool и что происходит дальше</p>
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 self-start">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-sm rounded-md transition ${days === d ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {d} дней
            </button>
          ))}
        </div>
      </div>

      {failed && (
        <div className="bg-red-50 border border-red-200 text-red-900 text-sm rounded-lg px-4 py-3">
          Не удалось посчитать статистику: {failed}. Цифры ниже — нули, а не «кликов нет».
        </div>
      )}

      {/* Воронка */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        {funnel.map((f, i) => (
          <div key={i} className={`bg-white rounded-xl border p-5 ${f.solid ? 'border-gray-100' : 'border-dashed border-gray-300'}`}>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Шаг {i + 1}</div>
            <div className={`text-3xl font-bold ${f.solid ? 'text-gray-900' : 'text-gray-300'}`}>
              {f.value === null ? '—' : f.value.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-gray-700 mt-1">{f.label}</div>
            <div className="text-xs text-gray-400 mt-1 leading-snug">{f.note}</div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-900 text-sm rounded-lg px-4 py-3 leading-relaxed">
        <b>Как читать воронку.</b> Клики и переходы в магазин — наши данные, точные и по каналам.
        Установки Google и Apple по API не отдают: смотрите их в Play Console (Источники трафика,
        разбивка по <code className="bg-blue-100 px-1 rounded">utm_source</code>) и в App Store Connect
        (Аналитика → Кампании). Регистрации и заказы — из нашей базы, но пока это итог по всем каналам:
        связать конкретную установку с каналом можно только через Install Referrer в приложении.
      </div>

      {/* График по дням */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Клики по дням</h3>
        {agg.chart.length === 0 ? (
          <div className="py-12 text-center text-gray-400">Кликов за период нет</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={agg.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip />
              <Legend />
              {agg.sources.map((s, i) => (
                <Bar key={s} dataKey={s} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === agg.sources.length - 1 ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Каналы */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">Каналы</h3>
          </div>
          {agg.channels.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Пока ни одного клика</div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Источник / канал</th>
                  <th className="px-5 py-3">Клики</th>
                  <th className="px-5 py-3">Устройств</th>
                  <th className="px-5 py-3">Android</th>
                  <th className="px-5 py-3">iPhone</th>
                  <th className="px-5 py-3">Доля</th>
                </tr>
              </thead>
              <tbody>
                {agg.channels.map((c) => (
                  <tr key={c.name} className="table-row">
                    <td className="px-5 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-5 py-3 text-sm font-semibold">{c.clicks}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{c.uniq}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{c.android}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{c.ios}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{pct(c.clicks, agg.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* География */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="p-5 border-b border-gray-50"><h3 className="font-semibold text-gray-900">Города</h3></div>
          <div className="p-4 space-y-2">
            {agg.cities.length === 0 ? (
              <div className="text-center text-gray-400 py-4">Нет данных</div>
            ) : agg.cities.map(([city, n]) => (
              <div key={city} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100">
                <span className="text-sm font-medium">{city}</span>
                <span className="text-sm text-gray-500">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Готовые ссылки */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="p-5 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900">Ссылки для размещения</h3>
          <p className="text-sm text-gray-500 mt-1">
            Одна ссылка на канал. Сама определяет Android/iPhone и уводит в нужный магазин, попутно считая клик.
          </p>
        </div>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Object.entries(PRESETS).map(([key, p]) => {
            const url = `https://taketool.uz/dl/${key}`;
            const got = agg.channels.find((c) => c.name === `${p.source} / ${p.medium}`)?.clicks || 0;
            return (
              <div key={key} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">{p.label}</div>
                  <code className="block text-xs text-gray-500 truncate">{url}</code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 whitespace-nowrap">{got} кл.</span>
                  <button onClick={() => copy(url, key)}
                    className="text-xs px-2.5 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition">
                    {copied === key ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-5 pb-5 text-xs text-gray-500 leading-relaxed">
          Нужен свой канал — соберите ссылку руками:{' '}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded">
            https://taketool.uz/dl?utm_source=blogger&utm_medium=post&utm_campaign=sep
          </code>{' '}
          — метки появятся в таблице выше сами, заводить их заранее не нужно.
        </div>
      </div>
    </div>
  );
}
