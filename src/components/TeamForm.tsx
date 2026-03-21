'use client';

import { useState } from 'react';

interface TeamFormProps {
  tournamentId: string;
  maxTeams: number;
  currentCount: number;
  onTeamAdded: () => void;
}

export default function TeamForm({ tournamentId, maxTeams, currentCount, onTeamAdded }: TeamFormProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const remaining = maxTeams - currentCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Greska');
      }

      setName('');
      onTeamAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greska pri dodavanju');
    } finally {
      setLoading(false);
    }
  };

  if (remaining <= 0) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-emerald-300">
        Sve ekipe su dodane! Mozete pokrenuti zreb.
      </div>
    );
  }

  return (
    <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-2xl p-5">
      <h3 className="font-bold mb-4 text-white">Dodaj ekipu ({currentCount}/{maxTeams})</h3>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ime ekipe..."
          className="flex-1 bg-emerald-950/50 border border-emerald-700/40 rounded-xl px-4 py-3 text-white placeholder-emerald-300/25 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/60 transition-all"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 px-6 py-3 rounded-xl font-bold hover:from-amber-500 hover:to-yellow-400 disabled:opacity-50 transition-all"
        >
          {loading ? '...' : 'Dodaj'}
        </button>
      </form>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      <div className="mt-3 w-full bg-emerald-950/50 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2 rounded-full transition-all"
          style={{ width: `${(currentCount / maxTeams) * 100}%` }}
        />
      </div>
      <p className="text-emerald-300/35 text-xs mt-1.5">Preostalo: {remaining} ekipa</p>
    </div>
  );
}
