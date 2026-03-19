'use client';

import type { Tournament } from '@/lib/types';

interface TournamentHeaderProps {
  tournament: Tournament;
}

const statusConfig: Record<string, { label: string; gradient: string; glow: string }> = {
  draft: { label: 'Priprema', gradient: 'from-gray-500 to-gray-600', glow: 'shadow-gray-500/20' },
  group_phase: { label: 'Grupna faza', gradient: 'from-blue-500 to-cyan-500', glow: 'shadow-blue-500/20' },
  elimination: { label: 'Eliminacije', gradient: 'from-orange-500 to-red-500', glow: 'shadow-orange-500/20' },
  finished: { label: 'Zavrseno', gradient: 'from-green-500 to-emerald-500', glow: 'shadow-green-500/20' },
};

export default function TournamentHeader({ tournament }: TournamentHeaderProps) {
  const status = statusConfig[tournament.status] || statusConfig.draft;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{tournament.name}</h1>
          <p className="text-blue-300/50 mt-1">{tournament.team_count} ekipa</p>
        </div>
        <span className={`inline-block bg-gradient-to-r ${status.gradient} px-5 py-2 rounded-full text-white font-bold shadow-lg ${status.glow}`}>
          {status.label}
        </span>
      </div>
    </div>
  );
}
