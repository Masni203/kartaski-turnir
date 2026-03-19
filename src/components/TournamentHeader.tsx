'use client';

import type { Tournament } from '@/lib/types';

interface TournamentHeaderProps {
  tournament: Tournament;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Priprema', color: 'bg-gray-500' },
  group_phase: { label: 'Grupna faza', color: 'bg-blue-500' },
  elimination: { label: 'Eliminacije', color: 'bg-orange-500' },
  finished: { label: 'Zavrseno', color: 'bg-green-500' },
};

export default function TournamentHeader({ tournament }: TournamentHeaderProps) {
  const status = statusLabels[tournament.status] || statusLabels.draft;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{tournament.name}</h1>
          <p className="text-gray-500 mt-1">{tournament.team_count} ekipa</p>
        </div>
        <div>
          <span className={`inline-block px-4 py-2 rounded-full text-white font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>
    </div>
  );
}
