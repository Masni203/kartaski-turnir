'use client';

import type { Match } from '@/lib/types';

interface MatchCardProps {
  match: Match;
  onUpdateScore?: (matchId: string, score1: number, score2: number, status: 'in_progress' | 'finished') => void;
  editable?: boolean;
}

const phaseLabels: Record<string, string> = {
  group: 'Grupa',
  round_of_16: 'Osmina finala',
  quarterfinal: 'Cetvrtfinale',
  semifinal: 'Polufinale',
  final: 'Finale',
};

export default function MatchCard({ match, onUpdateScore, editable = false }: MatchCardProps) {
  const team1Name = match.team1?.name || 'TBD';
  const team2Name = match.team2?.name || 'TBD';
  const isFinished = match.status === 'finished';
  const isInProgress = match.status === 'in_progress';

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

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 p-4 ${
      isFinished ? 'border-gray-200' : isInProgress ? 'border-yellow-400' : 'border-gray-100'
    }`}>
      {match.group_label && (
        <div className="text-xs text-gray-500 mb-2">
          {phaseLabels[match.phase]} {match.group_label} &middot; Kolo {match.round}
        </div>
      )}
      {!match.group_label && (
        <div className="text-xs text-gray-500 mb-2">
          {phaseLabels[match.phase]}
        </div>
      )}

      {editable && !isFinished ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <span className="flex-1 text-right font-medium truncate">{team1Name}</span>
          <input
            name="score1"
            type="number"
            min="0"
            defaultValue={match.score1 ?? ''}
            className="w-12 text-center border rounded px-1 py-1 text-lg font-bold"
          />
          <span className="text-gray-400">:</span>
          <input
            name="score2"
            type="number"
            min="0"
            defaultValue={match.score2 ?? ''}
            className="w-12 text-center border rounded px-1 py-1 text-lg font-bold"
          />
          <span className="flex-1 font-medium truncate">{team2Name}</span>
          <div className="flex gap-1 ml-2">
            <button
              type="submit"
              data-action="save"
              className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Snimi
            </button>
            <button
              type="submit"
              data-action="finish"
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              Zavrsi
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`flex-1 text-right font-medium truncate ${
            isFinished && match.score1 !== null && match.score2 !== null && match.score1 > match.score2
              ? 'text-green-700 font-bold' : ''
          }`}>
            {team1Name}
          </span>
          <span className={`text-2xl font-bold px-3 ${
            isInProgress ? 'text-yellow-600' : isFinished ? 'text-gray-900' : 'text-gray-300'
          }`}>
            {match.score1 !== null ? match.score1 : '-'}
            <span className="text-gray-400 mx-1">:</span>
            {match.score2 !== null ? match.score2 : '-'}
          </span>
          <span className={`flex-1 font-medium truncate ${
            isFinished && match.score1 !== null && match.score2 !== null && match.score2 > match.score1
              ? 'text-green-700 font-bold' : ''
          }`}>
            {team2Name}
          </span>
        </div>
      )}

      {isInProgress && (
        <div className="mt-2 flex justify-center">
          <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            U toku
          </span>
        </div>
      )}
      {isFinished && (
        <div className="mt-2 flex justify-center">
          <span className="text-xs text-gray-500">Zavrseno</span>
        </div>
      )}
    </div>
  );
}
