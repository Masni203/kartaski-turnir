'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Tournament } from '@/lib/types';

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [teamCount, setTeamCount] = useState(8);
  const [creating, setCreating] = useState(false);

  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      const data = await res.json();
      setTournaments(Array.isArray(data) ? data : []);
    } catch {
      console.error('Greska pri ucitavanju turnira');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), teamCount }),
      });

      if (res.ok) {
        setName('');
        setShowCreate(false);
        fetchTournaments();
      }
    } finally {
      setCreating(false);
    }
  };

  const statusConfig: Record<string, { label: string; gradient: string }> = {
    draft: { label: 'Priprema', gradient: 'from-gray-500 to-gray-600' },
    group_phase: { label: 'Grupna faza', gradient: 'from-blue-500 to-cyan-500' },
    elimination: { label: 'Eliminacije', gradient: 'from-orange-500 to-red-500' },
    finished: { label: 'Zavrseno', gradient: 'from-green-500 to-emerald-500' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
          <div className="text-6xl mb-4">🃏</div>
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-300 via-cyan-200 to-blue-300 bg-clip-text text-transparent mb-3">
            Kartaski Turnir
          </h1>
          <p className="text-blue-300/70 text-lg max-w-md mx-auto">
            Organizuj i prati kartaske turnire u realnom vremenu
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pb-16">
        {/* Create button */}
        <div className="flex justify-center mb-10">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="group relative bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-blue-500 hover:to-cyan-500 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            <span className="flex items-center gap-2">
              <span className="text-2xl leading-none">+</span>
              Novi turnir
            </span>
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="animate-fade-in max-w-md mx-auto mb-10">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-5">Kreiraj turnir</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-1.5">
                    Ime turnira
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="npr. Turnir Bela 2025"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200 mb-1.5">
                    Broj ekipa
                  </label>
                  <select
                    value={teamCount}
                    onChange={e => setTeamCount(Number(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  >
                    <option value={8} className="bg-slate-800">8 ekipa (2 grupe)</option>
                    <option value={12} className="bg-slate-800">12 ekipa (3 grupe)</option>
                    <option value={16} className="bg-slate-800">16 ekipa (4 grupe)</option>
                    <option value={24} className="bg-slate-800">24 ekipa (6 grupa)</option>
                    <option value={32} className="bg-slate-800">32 ekipa (8 grupa)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creating || !name.trim()}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 transition-all shadow-lg shadow-green-500/20"
                >
                  {creating ? 'Kreiranje...' : 'Kreiraj turnir'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tournament list */}
        {loading ? (
          <div className="text-center text-blue-300/50 py-16 text-lg">Ucitavanje...</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">🏆</div>
            <p className="text-blue-300/40 text-lg">Nema kreiranih turnira. Kreirajte prvi!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tournaments.map((t, i) => {
              const status = statusConfig[t.status] || statusConfig.draft;
              return (
                <div
                  key={t.id}
                  className="animate-fade-in bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all group"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">
                        {t.name}
                      </h3>
                      <p className="text-sm text-blue-300/50 mt-0.5">
                        {t.team_count} ekipa &middot; {new Date(t.created_at).toLocaleDateString('sr-Latn')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`bg-gradient-to-r ${status.gradient} px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-lg`}>
                        {status.label}
                      </span>
                      <Link
                        href={`/tournament/${t.id}`}
                        className="bg-white/10 hover:bg-white/20 text-blue-200 px-4 py-1.5 rounded-full text-sm font-medium transition-all border border-white/10"
                      >
                        Pregledaj
                      </Link>
                      <Link
                        href={`/admin/tournament/${t.id}`}
                        className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-4 py-1.5 rounded-full text-sm font-medium transition-all border border-orange-500/20"
                      >
                        Admin
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
