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
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
        Sve ekipe su dodane! Mozete pokrenuti zrijeb.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-bold mb-3">Dodaj ekipu ({currentCount}/{maxTeams})</h3>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ime ekipe..."
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Dodaj'}
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <p className="text-gray-500 text-sm mt-2">Preostalo: {remaining} ekipa</p>
    </div>
  );
}
