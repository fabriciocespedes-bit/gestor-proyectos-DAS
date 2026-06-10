'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@projectos.app');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Credenciales inválidas' : error.message);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8 font-semibold text-zinc-100 text-lg">
          <span className="grid place-items-center w-7 h-7 rounded-md bg-brand text-white">◧</span>
          ProjectOS
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4"
        >
          <h1 className="text-base font-medium text-zinc-100">Inicia sesión</h1>

          <div>
            <label className="text-xs text-zinc-500">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm
                         text-zinc-100 outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm
                         text-zinc-100 outline-none focus:border-brand"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand hover:bg-brand-600 disabled:opacity-50
                       text-white text-sm py-2 font-medium"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-xs text-zinc-600 mt-4">
          Demo: admin@projectos.app · clave del seed
        </p>
      </div>
    </main>
  );
}
