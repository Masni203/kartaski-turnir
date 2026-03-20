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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-2xl font-bold text-white">Admin pristup</h1>
          <p className="text-blue-200 text-sm mt-1">Unesite lozinku za pristup</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Lozinka..."
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Provera...' : 'Prijavi se'}
          </button>
        </form>
      </div>
    </div>
  );
}
