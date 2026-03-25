'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Tournament, Team, Match, Standing } from '@/lib/types';
import { getGroupColor } from '@/lib/groupColors';

interface ProjectorViewProps {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  calculateStandings: (teams: Team[], matches: Match[], groupLabel: string) => Standing[];
  qualifyCount: number;
}

const phaseLabels: Record<string, string> = {
  round_of_16: 'Osmina finala',
  quarterfinal: 'Četvrtfinale',
  semifinal: 'Polufinale',
  final: 'Finale',
};

const phaseOrder = ['round_of_16', 'quarterfinal', 'semifinal', 'final'] as const;

export default function ProjectorView({ tournament, teams, matches, calculateStandings, qualifyCount }: ProjectorViewProps) {
  const groups = [...new Set(teams.map(t => t.group_label).filter(Boolean))].sort() as string[];
  const isElimination = tournament.status === 'elimination' || tournament.status === 'finished';

  const availableTabs: ('groups' | 'matches' | 'bracket')[] = [
    'groups',
    'matches',
    ...(isElimination ? ['bracket' as const] : []),
  ];

  const [currentTab, setCurrentTab] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-rotate tabs every 12 seconds
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      setCurrentTab(prev => (prev + 1) % availableTabs.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [autoRotate, availableTabs.length]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const activeTab = availableTabs[currentTab];

  const groupMatches = matches.filter(m => m.phase === 'group');
  const eliminationMatches = matches.filter(m => m.phase !== 'group');
  const phases = phaseOrder.filter(p => eliminationMatches.some(m => m.phase === p));

  // Progress bar for auto-rotate
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!autoRotate) { setProgress(0); return; }
    setProgress(0);
    const start = Date.now();
    const duration = 12000;
    const frame = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed < duration) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [currentTab, autoRotate]);

  // Winner display
  const finalMatch = matches.find(m => m.phase === 'final' && m.status === 'finished');
  const winner = finalMatch && finalMatch.score1 !== null && finalMatch.score2 !== null
    ? (finalMatch.score1 > finalMatch.score2 ? finalMatch.team1 : finalMatch.team2)
    : null;

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">
            {tournament.name}
          </h1>
          {winner && (
            <span className="text-2xl font-bold text-amber-300 animate-pulse">
              🏆 {winner.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Tab indicators */}
          <div className="flex gap-2">
            {availableTabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => { setCurrentTab(i); setAutoRotate(false); }}
                className={`px-4 py-2 rounded-lg text-lg font-bold transition-all ${
                  i === currentTab
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-white/30 hover:text-white/60'
                }`}
              >
                {tab === 'groups' ? '📊 Grupe' : tab === 'matches' ? '⚔️ Mečevi' : '🏆 Eliminacije'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
              autoRotate
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                : 'bg-white/5 text-white/30 border-white/10'
            }`}
            title={autoRotate ? 'Auto-rotacija uključena' : 'Auto-rotacija isključena'}
          >
            {autoRotate ? '⏩ Auto' : '⏸ Pauza'}
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-white/5 text-white/40 border border-white/10 hover:text-white/70 transition-all"
          >
            {isFullscreen ? '⬜ Izađi' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {autoRotate && (
        <div className="h-1 bg-white/5 rounded-full mb-4 flex-shrink-0 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* GROUPS TAB */}
        {activeTab === 'groups' && (
          <div className="grid grid-cols-2 gap-4 h-full animate-fade-in">
            {groups.map(group => {
              const color = getGroupColor(group);
              const standings = calculateStandings(teams, matches, group);
              return (
                <div key={group} className={`border ${color.border} rounded-xl overflow-hidden flex flex-col`}>
                  <div className={`bg-gradient-to-r ${color.gradient} px-5 py-2 flex items-center gap-2`}>
                    <span className={`w-3 h-3 rounded-full ${color.dot}`} />
                    <h3 className="text-xl font-bold text-white">Grupa {group}</h3>
                  </div>
                  <table className="w-full text-base flex-1">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-3 py-2 text-left text-emerald-300/50 font-medium w-8">#</th>
                        <th className="px-3 py-2 text-left text-emerald-300/50 font-medium">Ekipa</th>
                        <th className="px-3 py-2 text-center text-emerald-300/50 font-medium">OM</th>
                        <th className="px-3 py-2 text-center text-emerald-300/50 font-medium">P</th>
                        <th className="px-3 py-2 text-center text-emerald-300/50 font-medium">I</th>
                        <th className="px-3 py-2 text-center text-emerald-300/50 font-medium">D:P</th>
                        <th className="px-3 py-2 text-center text-emerald-300/50 font-medium">+/-</th>
                        <th className="px-3 py-2 text-center text-emerald-300/50 font-bold">Bod</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr
                          key={s.team.id}
                          className={`border-t border-white/5 ${i < qualifyCount ? 'bg-emerald-500/5' : ''}`}
                        >
                          <td className="px-3 py-1.5">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                              i < qualifyCount
                                ? (i === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300')
                                : 'bg-white/5 text-white/40'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 font-semibold text-white text-lg">{s.team.name}</td>
                          <td className="px-3 py-1.5 text-center text-white/60">{s.played}</td>
                          <td className="px-3 py-1.5 text-center text-green-400">{s.wins}</td>
                          <td className="px-3 py-1.5 text-center text-red-400">{s.losses}</td>
                          <td className="px-3 py-1.5 text-center text-white/60">{s.scored}:{s.conceded}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={s.diff > 0 ? 'text-green-400' : s.diff < 0 ? 'text-red-400' : 'text-white/40'}>
                              {s.diff > 0 ? '+' : ''}{s.diff}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg text-lg">{s.points}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* MATCHES TAB */}
        {activeTab === 'matches' && (
          <div className="grid grid-cols-2 gap-4 h-full animate-fade-in">
            {groups.map(group => {
              const color = getGroupColor(group);
              const gMatches = groupMatches.filter(m => m.group_label === group);
              const inProgress = gMatches.filter(m => m.status === 'in_progress');
              const pending = gMatches.filter(m => m.status === 'pending');
              const finished = gMatches.filter(m => m.status === 'finished');
              // Show active first, then pending, then finished
              const sorted = [...inProgress, ...pending, ...finished];

              return (
                <div key={group} className={`border ${color.border} rounded-xl overflow-hidden flex flex-col`}>
                  <div className={`bg-gradient-to-r ${color.gradient} px-5 py-2 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${color.dot}`} />
                      <h3 className="text-xl font-bold text-white">Grupa {group}</h3>
                    </div>
                    <span className="text-white/60 text-sm">
                      {finished.length}/{gMatches.length} završeno
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto px-1 py-1">
                    <table className="w-full">
                      <tbody>
                        {sorted.map(match => {
                          const isLive = match.status === 'in_progress';
                          const isDone = match.status === 'finished';
                          const t1Won = isDone && match.score1 !== null && match.score2 !== null && match.score1 > match.score2;
                          const t2Won = isDone && match.score1 !== null && match.score2 !== null && match.score2 > match.score1;

                          return (
                            <tr
                              key={match.id}
                              className={`border-b border-white/5 ${
                                isLive ? 'bg-yellow-500/10' : ''
                              }`}
                            >
                              <td className={`py-2 px-3 text-right text-base font-medium truncate max-w-[180px] ${
                                t1Won ? 'text-amber-300 font-bold' : isDone ? 'text-white/70' : 'text-white'
                              }`}>
                                {match.team1?.name || 'TBD'}
                              </td>
                              <td className="py-2 px-2 text-center whitespace-nowrap w-28">
                                {isLive && <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse mr-1.5" />}
                                <span className={`text-xl font-extrabold ${
                                  isLive ? 'text-yellow-400' : isDone ? 'text-white' : 'text-white/20'
                                }`}>
                                  {match.score1 !== null ? match.score1 : '-'}
                                </span>
                                <span className="text-white/20 mx-1">:</span>
                                <span className={`text-xl font-extrabold ${
                                  isLive ? 'text-yellow-400' : isDone ? 'text-white' : 'text-white/20'
                                }`}>
                                  {match.score2 !== null ? match.score2 : '-'}
                                </span>
                              </td>
                              <td className={`py-2 px-3 text-left text-base font-medium truncate max-w-[180px] ${
                                t2Won ? 'text-amber-300 font-bold' : isDone ? 'text-white/70' : 'text-white'
                              }`}>
                                {match.team2?.name || 'TBD'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BRACKET TAB */}
        {activeTab === 'bracket' && (
          <div className="h-full flex items-center justify-center animate-fade-in">
            <div className="flex gap-8 items-center">
              {phases.map(phase => {
                const phaseMatches = eliminationMatches
                  .filter(m => m.phase === phase)
                  .sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0));

                const isFinal = phase === 'final';

                return (
                  <div key={phase} className="flex flex-col items-center gap-3">
                    <div className="text-center mb-2">
                      <span className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">
                        {phaseLabels[phase]}
                      </span>
                    </div>
                    <div className={`flex flex-col justify-around flex-1 ${isFinal ? 'gap-4' : 'gap-3'}`}>
                      {phaseMatches.map(match => {
                        const isLive = match.status === 'in_progress';
                        const isDone = match.status === 'finished';
                        const t1Won = isDone && match.score1 !== null && match.score2 !== null && match.score1 > match.score2;
                        const t2Won = isDone && match.score1 !== null && match.score2 !== null && match.score2 > match.score1;

                        return (
                          <div
                            key={match.id}
                            className={`border rounded-xl overflow-hidden ${isFinal ? 'min-w-[320px]' : 'min-w-[280px]'} ${
                              isLive ? 'border-yellow-500/40 bg-yellow-500/5 animate-pulse-glow'
                                : isDone ? 'border-emerald-700/30 bg-emerald-950/30'
                                : 'border-white/10 bg-white/[0.02]'
                            }`}
                          >
                            {/* Team 1 */}
                            <div className={`flex items-center justify-between px-4 py-2.5 border-b border-white/5 ${
                              t1Won ? 'bg-amber-500/10' : ''
                            }`}>
                              <span className={`font-semibold truncate mr-3 ${isFinal ? 'text-xl' : 'text-lg'} ${
                                t1Won ? 'text-amber-300' : isDone && !t1Won ? 'text-white/50' : 'text-white'
                              }`}>
                                {match.team1?.name || 'TBD'}
                              </span>
                              <span className={`font-extrabold ${isFinal ? 'text-2xl' : 'text-xl'} ${
                                isLive ? 'text-yellow-400' : isDone ? 'text-white' : 'text-white/20'
                              }`}>
                                {match.score1 !== null ? match.score1 : '-'}
                              </span>
                            </div>
                            {/* Team 2 */}
                            <div className={`flex items-center justify-between px-4 py-2.5 ${
                              t2Won ? 'bg-amber-500/10' : ''
                            }`}>
                              <span className={`font-semibold truncate mr-3 ${isFinal ? 'text-xl' : 'text-lg'} ${
                                t2Won ? 'text-amber-300' : isDone && !t2Won ? 'text-white/50' : 'text-white'
                              }`}>
                                {match.team2?.name || 'TBD'}
                              </span>
                              <span className={`font-extrabold ${isFinal ? 'text-2xl' : 'text-xl'} ${
                                isLive ? 'text-yellow-400' : isDone ? 'text-white' : 'text-white/20'
                              }`}>
                                {match.score2 !== null ? match.score2 : '-'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
