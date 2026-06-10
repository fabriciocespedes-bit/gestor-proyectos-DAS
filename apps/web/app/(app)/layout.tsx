'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const NAV = [
  { href: '/dashboard', label: 'Inicio', icon: '◉' },
  { href: '/today', label: 'Mi día', icon: '☀' },
  { href: '/capacity', label: 'Capacidad', icon: '▤' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 border-b border-zinc-800 flex items-center px-3 gap-3 shrink-0">
        <div className="flex items-center gap-2 font-semibold text-zinc-100">
          <span className="grid place-items-center w-6 h-6 rounded-md bg-brand text-white text-xs">◧</span>
          ProjectOS
        </div>
        <div className="flex-1" />
        <button
          onClick={async () => {
            await supabase().auth.signOut();
            router.push('/login');
            router.refresh();
          }}
          className="text-sm text-zinc-400 hover:text-zinc-100"
        >
          Salir
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 border-r border-zinc-800 p-3 flex flex-col gap-1 text-sm shrink-0">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-2 py-1.5 rounded-md flex items-center gap-2 ${
                  active ? 'bg-zinc-900 text-zinc-100' : 'hover:bg-zinc-900 text-zinc-400'
                }`}
              >
                <span>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </aside>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
