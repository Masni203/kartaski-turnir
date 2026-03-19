'use client';

import type { Match } from '@/lib/types';
import MatchCard from './MatchCard';

interface BracketProps {
  matches: Match[];
  onUpdateScore?: (matchId: string, score1: number, score2: number, status: 'in_progress' | 'finished') => void;
  editable?: boolean;
}

const phaseOrder = ['round_of_16', 'quarterfinal', 'semifinal', 'final'] as const;
const phaseLabels: Record<string, string> = {
  round_of_16: 'Osmina finala',
  quarterfinal: 'Cetvrtfinale',
  semifinal: 'Polufinale',
  final: 'Finale',
};

export default function Bracket({ matches, onUpdateScore, editable = false }: BracketProps) {
  const eliminationMatches = matches.filter(m => m.phase !== 'group');

  if (eliminationMatches.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Eliminacijska faza jos nije pocela
      </div>
    );
  }

  // Group matches by phase
  const phases = phaseOrder.filter(phase =>
    eliminationMatches.some(m => m.phase === phase)
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max p-4">
        {phases.map(phase => {
          const phaseMatches = eliminationMatches
            .filter(m => m.phase === phase)
            .sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0));

          return (
            <div key={phase} className="flex flex-col gap-4 min-w-[280px]">
              <h3 className="text-lg font-bold text-center text-blue-700 border-b-2 border-blue-200 pb-2">
                {phaseLabels[phase]}
              </h3>
              <div className="flex flex-col gap-4 justify-around flex-1">
                {phaseMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onUpdateScore={onUpdateScore}
                    editable={editable}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
