'use client';

import type { Match } from '@/lib/types';
import { getGroupColor, type GroupColor } from '@/lib/groupColors';

interface MatchCardProps {
  match: Match;
  onUpdateScore?: (matchId: string, score1: number, score2: number, status: 'in_progress' | 'finished' | 'pending') => void;
  editable?: boolean;
  highlight?: boolean;
}

const phaseLabels: Record<string, string> = {
  group: 'Grupa',
  round_of_16: 'Osmina finala',
  quarterfinal: 'Cetvrtfinale',
  semifinal: 'Polufinale',
  final: 'Finale',
};

export default function MatchCard({ match, onUpdateScore, editable = false, highlight = false }: MatchCardProps) {
  const team1Name = match.team1?.name || 'TBD';
  const team2Name = match.team2?.name || 'TBD';
  const isFinished = match.status === 'finished';
  const isInProgress = match.status === 'in_progress';

  const color: GroupColor | null = match.group_label ? getGroupColor(match.group_label) : null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const s1 = parseInt(formData.get('score1') as string);
    const s2 = parseInt(formData.get('score2') as string);
    const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-action');

    if (!isNaN(s1) && !isNaN(s2) && onUpdateScore) {
      onUpdateScore(match.id, s1, s2, action === 'finish' ? 'finished' : 'in_progress');
    }
  };

  const borderClass = highlight
    ? 'border-amber-400/60 bg-amber-500/10 ring-2 ring-amber-400/30 scale-[1.02]'
    : isInProgress
      ? 'border-yellow-500/40 animate-pulse-glow'
      : color
        ? `${color.border} bg-emerald-950/30`
        : isFinished
          ? 'border-emerald-800/30 bg-emerald-950/30'
          : 'border-emerald-800/20 bg-emerald-950/30';

  return (
    <div className={`backdrop-blur-sm border rounded-xl p-4 transition-all ${borderClass}`}>
      <div className="flex items-center gap-2 mb-3">
        {color && <span className={`w-2 h-2 rounded-full ${color.dot}`} />}
        <span className={`text-xs font-medium ${color ? color.text : 'text-emerald-300/35'}`}>
          {phaseLabels[match.phase]}
          {match.group_label ? ` ${match.group_label} \u00b7 Kolo ${match.round}` : ''}
        </span>
      </div>

      {editable && !isFinished ? (
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-right font-medium text-white text-sm truncate">{team1Name}</span>
            <input
              name="score1"
              type="number"
              min="0"
              defaultValue={match.score1 ?? ''}
              className="w-12 text-center bg-emerald-950/50 border border-emerald-700/40 rounded-lg px-1 py-1.5 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/60"
            />
            <span className="text-white/20 font-bold">:</span>
            <input
              name="score2"
              type="number"
              min="0"
              defaultValue={match.score2 ?? ''}
              className="w-12 text-center bg-emerald-950/50 border border-emerald-700/40 rounded-lg px-1 py-1.5 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400/60"
            />
            <span className="flex-1 font-medium text-white text-sm truncate">{team2Name}</span>
          </div>
          <div className="flex gap-2 mt-3 justify-center">
            <button
              type="submit"
              data-action="save"
              className="px-3 py-1.5 text-xs bg-yellow-500/15 text-yellow-300 rounded-lg hover:bg-yellow-500/25 transition-colors border border-yellow-500/20 font-medium"
            >
              Snimi
            </button>
            <button
              type="submit"
              data-action="finish"
              className="px-3 py-1.5 text-xs bg-emerald-500/15 text-emerald-300 rounded-lg hover:bg-emerald-500/25 transition-colors border border-emerald-500/20 font-medium"
            >
              Zavrsi
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`flex-1 text-right font-medium text-sm truncate ${
            isFinished && match.score1 !== null && match.score2 !== null && match.score1 > match.score2
              ? 'text-amber-300 font-bold' : 'text-white'
          }`}>
            {team1Name}
          </span>
          <div className={`flex items-center gap-1 px-4 py-1 rounded-xl ${
            isInProgress ? 'bg-yellow-500/10' : isFinished ? 'bg-white/5' : 'bg-white/[0.02]'
          }`}>
            <span className={`text-2xl font-extrabold ${
              isInProgress ? 'text-yellow-400' : isFinished ? 'text-white' : 'text-white/20'
            }`}>
              {match.score1 !== null ? match.score1 : '-'}
            </span>
            <span className="text-white/20 mx-1 font-light">:</span>
            <span className={`text-2xl font-extrabold ${
              isInProgress ? 'text-yellow-400' : isFinished ? 'text-white' : 'text-white/20'
            }`}>
              {match.score2 !== null ? match.score2 : '-'}
            </span>
          </div>
          <span className={`flex-1 font-medium text-sm truncate ${
            isFinished && match.score1 !== null && match.score2 !== null && match.score2 > match.score1
              ? 'text-amber-300 font-bold' : 'text-white'
          }`}>
            {team2Name}
          </span>
        </div>
      )}

      {isInProgress && (
        <div className="mt-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
            U toku
          </span>
        </div>
      )}
      {isFinished && (
        <div className="mt-3 flex justify-center gap-3">
          <span className="text-xs text-white/20">Zavrseno</span>
          {editable && onUpdateScore && (
            <button
              onClick={() => onUpdateScore(match.id, 0, 0, 'pending')}
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
            >
              Resetuj
            </button>
          )}
        </div>
      )}
    </div>
  );
}
