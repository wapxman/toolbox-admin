'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/', icon: '📊', label: 'Дашборд' },
  { href: '/boxes', icon: '📦', label: 'Боксы' },
  { href: '/tools', icon: '🔧', label: 'Инструменты' },
  { href: '/rentals', icon: '📋', label: 'Аренды и заказы' },
  { href: '/orders', icon: '🚚', label: 'Доставка' },
  { href: '/users', icon: '👥', label: 'Пользователи' },
  { href: '/acquisition', icon: '📈', label: 'Привлечение' },
  { href: '/settings', icon: '⚙️', label: 'Настройки' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="ru">
      <body className="bg-gray-50">
        <div className="flex min-h-screen">
          {/* Боковое меню — только с планшета и шире. На телефоне оно съедало
              две трети экрана, поэтому там вместо него полоса ссылок сверху. */}
          <aside className="w-64 bg-gray-900 text-white hidden lg:flex flex-col fixed h-full">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg">T</div>
                <div>
                  <div className="font-semibold text-sm">Taketool</div>
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
                  <div className="text-xs text-gray-500">admin@taketool.uz</div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 lg:ml-64 min-w-0">
            <header className="bg-white border-b border-gray-100 px-4 lg:px-8 py-4 sticky top-0 z-10">
              <h1 className="text-lg font-semibold text-gray-900">
                {nav.find(n => n.href === pathname)?.label || 'Taketool Admin'}
              </h1>
              {/* Мобильная навигация: горизонтальная прокрутка вместо боковой панели */}
              <nav className="flex lg:hidden gap-2 mt-3 -mx-4 px-4 overflow-x-auto pb-1">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-1.5 whitespace-nowrap text-sm px-3 py-1.5 rounded-lg border transition ${
                      pathname === item.href
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'text-gray-600 border-gray-200'
                    }`}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </header>
            <div className="p-4 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
