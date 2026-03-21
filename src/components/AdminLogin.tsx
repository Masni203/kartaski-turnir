'use client';

import { useState } from 'react';

interface AdminLoginProps {
  onLogin: () => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem('admin_token', token);
        onLogin();
      } else {
        setError('Pogresna lozinka');
      }
    } catch {
      setError('Greska pri povezivanju');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f0d]">
      <div className="bg-emerald-950/60 backdrop-blur-xl border border-amber-500/15 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-3xl">
            🔒
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">Admin pristup</h1>
          <p className="text-emerald-300/40 text-sm mt-1">Unesite lozinku za pristup</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Lozinka..."
            className="w-full bg-emerald-950/50 border border-emerald-700/40 rounded-xl px-4 py-3 text-white placeholder-emerald-300/25 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/60 transition-all"
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 py-3 rounded-xl font-extrabold hover:from-amber-500 hover:to-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
          >
            {loading ? 'Provera...' : 'Prijavi se'}
          </button>
        </form>
      </div>
    </div>
  );
}
