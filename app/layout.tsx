'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/', icon: '📊', label: 'Дашборд' },
  { href: '/boxes', icon: '📦', label: 'Боксы' },
  { href: '/tools', icon: '🔧', label: 'Инструменты' },
  { href: '/rentals', icon: '📋', label: 'Аренды' },
  { href: '/users', icon: '👥', label: 'Пользователи' },
  { href: '/settings', icon: '⚙️', label: 'Настройки' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="ru">
      <body className="bg-gray-50">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-gray-900 text-white flex flex-col fixed h-full">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg">T</div>
                <div>
                  <div className="font-semibold text-sm">ToolBox</div>
                  <div className="text-xs text-gray-400">Админ-панель</div>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {nav.map((item) => (
                <Link key={item.href} href={item.href}
                  className={`sidebar-link ${pathname === item.href ? 'active' : 'text-gray-400'}`}>
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">А</div>
                <div>
                  <div className="text-sm font-medium">Админ</div>
                  <div className="text-xs text-gray-500">admin@toolbox.uz</div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 ml-64">
            <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {nav.find(n => n.href === pathname)?.label || 'ToolBox Admin'}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative p-2 text-gray-400 hover:text-gray-600 transition">
                  🔔
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">3</span>
                </button>
              </div>
            </header>
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
