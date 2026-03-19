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

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Priprema', color: 'bg-gray-500' },
    group_phase: { label: 'Grupna faza', color: 'bg-blue-500' },
    elimination: { label: 'Eliminacije', color: 'bg-orange-500' },
    finished: { label: 'Zavrseno', color: 'bg-green-500' },
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Kartaski Turnir</h1>
        <p className="text-gray-600">Organizuj i prati kartaske turnire u realnom vremenu</p>
      </div>

      <div className="flex justify-center mb-8">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Novi turnir
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4">Kreiraj turnir</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ime turnira
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="npr. Turnir Bela 2025"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Broj ekipa
              </label>
              <select
                value={teamCount}
                onChange={e => setTeamCount(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={8}>8 ekipa (2 grupe)</option>
                <option value={12}>12 ekipa (3 grupe)</option>
                <option value={16}>16 ekipa (4 grupe)</option>
                <option value={24}>24 ekipa (6 grupa)</option>
                <option value={32}>32 ekipa (8 grupa)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? 'Kreiranje...' : 'Kreiraj'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-12">Ucitavanje...</div>
      ) : tournaments.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          Nema kreiranih turnira. Kreirajte prvi!
        </div>
      ) : (
        <div className="grid gap-4">
          {tournaments.map(t => {
            const status = statusLabels[t.status] || statusLabels.draft;
            return (
              <div key={t.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t.name}</h3>
                    <p className="text-sm text-gray-500">{t.team_count} ekipa &middot; {new Date(t.created_at).toLocaleDateString('sr-Latn')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-white text-sm ${status.color}`}>
                      {status.label}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/tournament/${t.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Pregledaj
                      </Link>
                      <Link
                        href={`/admin/tournament/${t.id}`}
                        className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                      >
                        Admin
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
