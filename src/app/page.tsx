'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Tournament } from '@/lib/types';
import CardSuits from '@/components/CardSuits';

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
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
        body: JSON.stringify({ name: name.trim() }),
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

  const statusConfig: Record<string, { label: string; dotColor: string; textColor: string; iconBg: string; emoji: string }> = {
    draft: { label: 'Priprema', dotColor: 'bg-gray-400', textColor: 'text-gray-400', iconBg: 'bg-white/5 border-white/10', emoji: '📋' },
    group_phase: { label: 'Grupna faza', dotColor: 'bg-blue-400', textColor: 'text-blue-400', iconBg: 'bg-blue-500/10 border-blue-500/20', emoji: '🃏' },
    elimination: { label: 'Eliminacije', dotColor: 'bg-orange-400', textColor: 'text-orange-400', iconBg: 'bg-orange-500/10 border-orange-500/20', emoji: '⚔️' },
    finished: { label: 'Zavrseno', dotColor: 'bg-emerald-400', textColor: 'text-emerald-400', iconBg: 'bg-amber-500/10 border-amber-500/20', emoji: '🏆' },
  };

  const stats = {
    total: tournaments.length,
    active: tournaments.filter(t => t.status === 'group_phase' || t.status === 'elimination').length,
    finished: tournaments.filter(t => t.status === 'finished').length,
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d] relative">
      <CardSuits />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 pt-12 pb-6 sm:pt-16 sm:pb-8 text-center">
          {/* Card fan decoration */}
          <div className="group flex justify-center mb-8">
            <div className="w-14 h-20 sm:w-20 sm:h-28 bg-gradient-to-br from-[#f5f0e6] to-[#e8e0d0] rounded-xl shadow-2xl shadow-black/40 -rotate-12 flex items-center justify-center text-2xl sm:text-3xl border border-amber-200/40 -mr-3 transition-transform duration-500 group-hover:-translate-y-2 group-hover:-rotate-[16deg] relative">
              <span className="absolute top-1 left-1.5 text-[8px] sm:text-xs text-red-600 font-bold">♥</span>
              <span className="text-red-600">♥</span>
            </div>
            <div className="w-14 h-20 sm:w-20 sm:h-28 bg-gradient-to-br from-[#f5f0e6] to-[#e8e0d0] rounded-xl shadow-2xl shadow-black/40 -rotate-4 flex items-center justify-center text-2xl sm:text-3xl border border-amber-200/40 -mr-3 relative z-10 transition-transform duration-500 group-hover:-translate-y-3 group-hover:-rotate-[6deg]">
              <span className="absolute top-1 left-1.5 text-[8px] sm:text-xs text-slate-800 font-bold">♠</span>
              <span className="text-slate-800">♠</span>
            </div>
            <div className="w-14 h-20 sm:w-20 sm:h-28 bg-gradient-to-br from-[#f5f0e6] to-[#e8e0d0] rounded-xl shadow-2xl shadow-black/40 rotate-4 flex items-center justify-center text-2xl sm:text-3xl border border-amber-200/40 -mr-3 relative z-20 transition-transform duration-500 group-hover:-translate-y-3 group-hover:rotate-[6deg]">
              <span className="absolute top-1 left-1.5 text-[8px] sm:text-xs text-red-600 font-bold">♦</span>
              <span className="text-red-600">♦</span>
            </div>
            <div className="w-14 h-20 sm:w-20 sm:h-28 bg-gradient-to-br from-[#f5f0e6] to-[#e8e0d0] rounded-xl shadow-2xl shadow-black/40 rotate-12 flex items-center justify-center text-2xl sm:text-3xl border border-amber-200/40 relative z-30 transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[16deg]">
              <span className="absolute top-1 left-1.5 text-[8px] sm:text-xs text-slate-800 font-bold">♣</span>
              <span className="text-slate-800">♣</span>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent mb-3 drop-shadow-[0_0_24px_rgba(212,168,83,0.3)]">
            Turnir Bela
          </h1>
          <p className="text-emerald-200/50 text-lg max-w-lg mx-auto tracking-wide">
            Organizuj turnir u beli, prati rezultate uzivo i saznaj ko je najbolji za stolom
          </p>

          {/* Decorative chips */}
          <div className="flex justify-center gap-4 mt-6">
            <div className="flex items-center gap-2 bg-emerald-900/30 border border-amber-500/15 rounded-lg px-4 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
              <span className="text-red-400 text-sm">♥</span>
              <span className="text-xs text-white/40 font-medium">Adut</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-900/30 border border-amber-500/15 rounded-lg px-4 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
              <span className="text-white/60 text-sm">♠</span>
              <span className="text-xs text-white/40 font-medium">Bela</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-900/30 border border-amber-500/15 rounded-lg px-4 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
              <span className="text-amber-400 text-sm">🏆</span>
              <span className="text-xs text-white/40 font-medium">Turnir</span>
            </div>
          </div>
        </div>
      </div>

      <main className="relative max-w-4xl mx-auto px-4 pb-16">
        {/* CTA Button */}
        <div className="flex justify-center mb-10">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full sm:w-auto bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 px-8 py-4 rounded-2xl font-extrabold text-lg hover:from-amber-500 hover:to-yellow-400 transition-all duration-300 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 border border-amber-400/50 animate-glow-border"
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-2xl leading-none">🃏</span>
              Novi turnir
            </span>
          </button>
        </div>

        {/* Create form — smooth expand/collapse */}
        <div
          className={`max-w-md mx-auto mb-10 overflow-hidden transition-all duration-500 ease-in-out ${
            showCreate ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-emerald-950/60 backdrop-blur-xl border border-amber-500/15 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <span className="text-amber-400">♦</span>
              Kreiraj turnir
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-emerald-200/70 mb-1.5">
                  Ime turnira
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="npr. Turnir Bela 2026"
                  className="w-full bg-emerald-950/50 border border-emerald-700/40 rounded-xl px-4 py-3 text-white placeholder-emerald-300/25 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/60 transition-all"
                  tabIndex={showCreate ? 0 : -1}
                />
              </div>
              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="w-full bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 py-3 rounded-xl font-extrabold hover:from-amber-500 hover:to-yellow-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
                tabIndex={showCreate ? 0 : -1}
              >
                {creating ? 'Kreiranje...' : 'Kreiraj turnir'}
              </button>
            </form>
          </div>
        </div>

        {/* Stats bar */}
        {tournaments.length > 0 && (
          <div className="max-w-md mx-auto mb-8 animate-fade-in">
            <div className="bg-emerald-950/30 border border-amber-500/10 rounded-xl flex">
              <div className="flex-1 text-center py-3">
                <div className="text-2xl font-extrabold text-white">{stats.total}</div>
                <div className="text-xs text-emerald-300/40 mt-0.5">Ukupno</div>
              </div>
              <div className="flex-1 text-center py-3 border-x border-amber-500/10">
                <div className="text-2xl font-extrabold text-blue-400">{stats.active}</div>
                <div className="text-xs text-emerald-300/40 mt-0.5">Aktivni</div>
              </div>
              <div className="flex-1 text-center py-3">
                <div className="text-2xl font-extrabold text-emerald-400">{stats.finished}</div>
                <div className="text-xs text-emerald-300/40 mt-0.5">Zavrseni</div>
              </div>
            </div>
          </div>
        )}

        {/* Tournament list */}
        {loading ? (
          <div className="grid gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-emerald-950/30 border border-emerald-800/20 rounded-2xl p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-20">
            <div className="group flex justify-center mb-6">
              <div className="w-12 h-18 bg-gradient-to-br from-[#f5f0e6]/20 to-[#e8e0d0]/10 rounded-lg -rotate-12 flex items-center justify-center text-2xl border border-amber-200/10 -mr-2">
                <span className="text-red-400/30">♥</span>
              </div>
              <div className="w-12 h-18 bg-gradient-to-br from-[#f5f0e6]/20 to-[#e8e0d0]/10 rounded-lg rotate-0 flex items-center justify-center text-2xl border border-amber-200/10 -mr-2 relative z-10">
                <span className="text-white/20">♠</span>
              </div>
              <div className="w-12 h-18 bg-gradient-to-br from-[#f5f0e6]/20 to-[#e8e0d0]/10 rounded-lg rotate-12 flex items-center justify-center text-2xl border border-amber-200/10 relative z-20">
                <span className="text-red-400/30">♦</span>
              </div>
            </div>
            <p className="text-lg font-semibold text-white/40 mb-2">Jos nema turnira</p>
            <p className="text-sm text-emerald-300/30 mb-6">Kreirajte prvi turnir i pozovite ekipe za sto</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
            >
              Kreiraj turnir +
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {tournaments.map((t, i) => {
              const status = statusConfig[t.status] || statusConfig.draft;
              return (
                <Link
                  key={t.id}
                  href={`/tournament/${t.id}`}
                  className="animate-slide-up block bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-5 hover:bg-emerald-950/50 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 group"
                  style={{ animationDelay: `${i * 0.06}s`, opacity: 0 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${status.iconBg} rounded-xl flex items-center justify-center border text-xl`}>
                        {status.emoji}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-amber-200 transition-colors">
                          {t.name}
                        </h3>
                        <p className="text-sm text-emerald-300/35 mt-0.5">
                          {t.team_count ? `${t.team_count} ekipa` : 'Priprema'} &middot; {new Date(t.created_at).toLocaleDateString('sr-Latn')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
                        <span className={`text-xs font-medium ${status.textColor}`}>{status.label}</span>
                      </div>
                      <span className="text-amber-500/30 group-hover:text-amber-400/60 group-hover:translate-x-1 transition-all duration-300 text-sm">
                        &#8250;
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 pt-6 border-t border-amber-500/10 text-center">
          <p className="text-white/15 text-xs tracking-widest uppercase">
            ♠ ♥ ♦ ♣ &middot; Turnir Bela
          </p>
          <p className="text-[10px] text-white/[0.08] mt-1">Napravljeno za kartase</p>
        </div>
      </main>
    </div>
  );
}
