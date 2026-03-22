'use client';

import type { Tournament } from '@/lib/types';

interface TournamentHeaderProps {
  tournament: Tournament;
}

const statusConfig: Record<string, { label: string; dotColor: string; textColor: string; bgColor: string }> = {
  draft: { label: 'Priprema', dotColor: 'bg-gray-400', textColor: 'text-gray-300', bgColor: 'bg-gray-500/10 border-gray-500/20' },
  group_phase: { label: 'Grupna faza', dotColor: 'bg-blue-400', textColor: 'text-blue-300', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  elimination: { label: 'Eliminacije', dotColor: 'bg-orange-400', textColor: 'text-orange-300', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  finished: { label: 'Zavrseno', dotColor: 'bg-emerald-400', textColor: 'text-emerald-300', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
};

export default function TournamentHeader({ tournament }: TournamentHeaderProps) {
  const status = statusConfig[tournament.status] || statusConfig.draft;

  return (
    <div className="bg-emerald-950/40 border border-emerald-800/30 rounded-2xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
            {tournament.name}
          </h1>
          <p className="text-emerald-300/40 mt-1">{tournament.team_count ? `${tournament.team_count} ekipa` : 'Prijava ekipa u toku'}</p>
        </div>
        <span className={`inline-flex items-center gap-2 ${status.bgColor} border px-4 py-2 rounded-xl font-medium ${status.textColor}`}>
          <span className={`w-2 h-2 rounded-full ${status.dotColor}`} />
          {status.label}
        </span>
      </div>
    </div>
  );
}
