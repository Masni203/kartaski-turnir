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

// Split groups into pairs for match rotation: [['A','B'], ['C','D']]
function groupPairs(groups: string[]): string[][] {
  const pairs: string[][] = [];
  for (let i = 0; i < groups.length; i += 2) {
    pairs.push(groups.slice(i, i + 2));
  }
  return pairs;
}

export default function ProjectorView({ tournament, teams, matches, calculateStandings, qualifyCount }: ProjectorViewProps) {
  const groups = [...new Set(teams.map(t => t.group_label).filter(Boolean))].sort() as string[];
  const isElimination = tournament.status === 'elimination' || tournament.status === 'finished';

  // Build slides: groups (1 slide), match pairs (N slides), bracket (1 slide if elimination)
  type Slide = { type: 'groups' } | { type: 'matches'; groups: string[] } | { type: 'bracket' };
  const slides: Slide[] = [];
  slides.push({ type: 'groups' });
  const matchPairs = groupPairs(groups);
  for (const pair of matchPairs) {
    slides.push({ type: 'matches', groups: pair });
  }
  if (isElimination) {
    slides.push({ type: 'bracket' });
  }

  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Slide durations: groups 15s, matches 20s, bracket 15s
  const getSlideDuration = (slide: Slide) => {
    if (slide.type === 'matches') return 20000;
    return 15000;
  };

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!autoRotate) { setProgress(0); return; }
    const duration = getSlideDuration(slides[currentSlide]);
    setProgress(0);
    const start = Date.now();
    let raf: number;
    const frame = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed < duration) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const timeout = setTimeout(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, duration);

    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [currentSlide, autoRotate, slides.length]);

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

  const slide = slides[currentSlide];

  const groupMatches = matches.filter(m => m.phase === 'group');
  const eliminationMatches = matches.filter(m => m.phase !== 'group');
  const phases = phaseOrder.filter(p => eliminationMatches.some(m => m.phase === p));

  // Winner
  const finalMatch = matches.find(m => m.phase === 'final' && m.status === 'finished');
  const winner = finalMatch && finalMatch.score1 !== null && finalMatch.score2 !== null
    ? (finalMatch.score1 > finalMatch.score2 ? finalMatch.team1 : finalMatch.team2)
    : null;

  // Slide label for header
  const slideLabel = slide.type === 'groups'
    ? '📊 Grupe'
    : slide.type === 'matches'
      ? `⚔️ Mečevi — Grupa ${slide.groups.join(' & ')}`
      : '🏆 Eliminacije';

  return (
    <div className="h-screen bg-[#0a0f0d] text-white p-5 flex flex-col overflow-hidden">
      {/* Header — compact */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-5">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">
            {tournament.name}
          </h1>
          {winner && (
            <span className="text-2xl font-bold text-amber-300 animate-pulse">
              🏆 {winner.name}
            </span>
          )}
          <span className="text-xl text-white/40 font-medium">{slideLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Slide dots */}
          <div className="flex gap-1.5 mr-2">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => { setCurrentSlide(i); setAutoRotate(false); }}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentSlide ? 'bg-amber-400 scale-110' : 'bg-white/15 hover:bg-white/30'
                }`}
                title={s.type === 'groups' ? 'Grupe' : s.type === 'bracket' ? 'Eliminacije' : `Mečevi ${s.groups.join('+')}`}
              />
            ))}
          </div>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              autoRotate
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                : 'bg-white/5 text-white/30 border-white/10'
            }`}
          >
            {autoRotate ? '⏩' : '⏸'}
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-white/40 border border-white/10 hover:text-white/70 transition-all"
          >
            {isFullscreen ? '⬜' : '⛶'}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {autoRotate && (
        <div className="h-1 bg-white/5 rounded-full mb-3 flex-shrink-0 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Content — fills remaining screen */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* =================== GROUPS =================== */}
        {slide.type === 'groups' && (
          <div className="grid grid-cols-2 gap-5 h-full animate-fade-in">
            {groups.map(group => {
              const color = getGroupColor(group);
              const standings = calculateStandings(teams, matches, group);
              return (
                <div key={group} className={`border ${color.border} rounded-2xl overflow-hidden flex flex-col`}>
                  <div className={`bg-gradient-to-r ${color.gradient} px-6 py-3 flex items-center gap-3`}>
                    <span className={`w-4 h-4 rounded-full ${color.dot}`} />
                    <h3 className="text-2xl font-bold text-white">Grupa {group}</h3>
                  </div>
                  <table className="w-full flex-1">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-4 py-3 text-left text-emerald-300/50 font-medium text-lg w-10">#</th>
                        <th className="px-4 py-3 text-left text-emerald-300/50 font-medium text-lg">Ekipa</th>
                        <th className="px-4 py-3 text-center text-emerald-300/50 font-medium text-lg">OM</th>
                        <th className="px-4 py-3 text-center text-emerald-300/50 font-medium text-lg">P</th>
                        <th className="px-4 py-3 text-center text-emerald-300/50 font-medium text-lg">I</th>
                        <th className="px-4 py-3 text-center text-emerald-300/50 font-medium text-lg">D:P</th>
                        <th className="px-4 py-3 text-center text-emerald-300/50 font-medium text-lg">+/-</th>
                        <th className="px-4 py-3 text-center text-emerald-300/50 font-bold text-lg">Bod</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr
                          key={s.team.id}
                          className={`border-t border-white/5 ${i < qualifyCount ? 'bg-emerald-500/5' : ''}`}
                        >
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-base font-bold ${
                              i < qualifyCount
                                ? (i === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300')
                                : 'bg-white/5 text-white/40'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-white text-xl">{s.team.name}</td>
                          <td className="px-4 py-2.5 text-center text-white/60 text-xl">{s.played}</td>
                          <td className="px-4 py-2.5 text-center text-green-400 text-xl font-semibold">{s.wins}</td>
                          <td className="px-4 py-2.5 text-center text-red-400 text-xl font-semibold">{s.losses}</td>
                          <td className="px-4 py-2.5 text-center text-white/60 text-xl">{s.scored}:{s.conceded}</td>
                          <td className="px-4 py-2.5 text-center text-xl">
                            <span className={s.diff > 0 ? 'text-green-400 font-semibold' : s.diff < 0 ? 'text-red-400 font-semibold' : 'text-white/40'}>
                              {s.diff > 0 ? '+' : ''}{s.diff}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="font-extrabold text-white bg-white/10 px-3 py-1 rounded-lg text-2xl">{s.points}</span>
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

        {/* =================== MATCHES (2 groups at a time) =================== */}
        {slide.type === 'matches' && (
          <div className={`grid ${slide.groups.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-5 h-full animate-fade-in`}>
            {slide.groups.map(group => {
              const color = getGroupColor(group);
              const gMatches = groupMatches.filter(m => m.group_label === group);
              const inProgress = gMatches.filter(m => m.status === 'in_progress');
              const pending = gMatches.filter(m => m.status === 'pending');
              const finished = gMatches.filter(m => m.status === 'finished');
              const sorted = [...inProgress, ...pending, ...finished];

              return (
                <div key={group} className={`border ${color.border} rounded-2xl overflow-hidden flex flex-col`}>
                  <div className={`bg-gradient-to-r ${color.gradient} px-6 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-4 h-4 rounded-full ${color.dot}`} />
                      <h3 className="text-2xl font-bold text-white">Grupa {group}</h3>
                    </div>
                    <span className="text-white/70 text-lg font-medium">
                      {finished.length}/{gMatches.length} završeno
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
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
                              className={`border-b border-white/5 ${isLive ? 'bg-yellow-500/10' : ''}`}
                            >
                              <td className={`py-3 px-4 text-right font-semibold truncate max-w-[240px] text-xl ${
                                t1Won ? 'text-amber-300 font-bold' : isDone ? 'text-white/60' : 'text-white'
                              }`}>
                                {match.team1?.name || 'TBD'}
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap w-36">
                                {isLive && <span className="inline-block w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse mr-2" />}
                                <span className={`text-2xl font-extrabold ${
                                  isLive ? 'text-yellow-400' : isDone ? 'text-white' : 'text-white/20'
                                }`}>
                                  {match.score1 !== null ? match.score1 : '-'}
                                </span>
                                <span className="text-white/20 mx-1.5 text-xl">:</span>
                                <span className={`text-2xl font-extrabold ${
                                  isLive ? 'text-yellow-400' : isDone ? 'text-white' : 'text-white/20'
                                }`}>
                                  {match.score2 !== null ? match.score2 : '-'}
                                </span>
                              </td>
                              <td className={`py-3 px-4 text-left font-semibold truncate max-w-[240px] text-xl ${
                                t2Won ? 'text-amber-300 font-bold' : isDone ? 'text-white/60' : 'text-white'
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

        {/* =================== BRACKET =================== */}
        {slide.type === 'bracket' && (
          <div className="h-full flex items-stretch animate-fade-in gap-6">
            {phases.map(phase => {
              const phaseMatches = eliminationMatches
                .filter(m => m.phase === phase)
                .sort((a, b) => (a.bracket_position || 0) - (b.bracket_position || 0));

              const isFinal = phase === 'final';
              const isSemi = phase === 'semifinal';
              // Compact padding when many matches (round_of_16 = 8 matches)
              const isCompact = phaseMatches.length > 4;

              return (
                <div key={phase} className="flex flex-col flex-1 min-w-0">
                  <div className="text-center mb-2 flex-shrink-0">
                    <span className={`font-bold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent ${
                      isFinal ? 'text-3xl' : 'text-2xl'
                    }`}>
                      {phaseLabels[phase]}
                    </span>
                  </div>
                  <div className="flex flex-col justify-around flex-1 gap-1.5">
                    {phaseMatches.map(match => {
                      const isLive = match.status === 'in_progress';
                      const isDone = match.status === 'finished';
                      const t1Won = isDone && match.score1 !== null && match.score2 !== null && match.score1 > match.score2;
                      const t2Won = isDone && match.score1 !== null && match.score2 !== null && match.score2 > match.score1;

                      return (
                        <div
                          key={match.id}
                          className={`border rounded-lg overflow-hidden ${
                            isLive ? 'border-yellow-500/40 bg-yellow-500/5 animate-pulse-glow'
                              : isDone ? 'border-emerald-700/30 bg-emerald-950/30'
                              : 'border-white/10 bg-white/[0.02]'
                          }`}
                        >
                          {/* Team 1 */}
                          <div className={`flex items-center justify-between ${isCompact ? 'px-3 py-1' : 'px-4 py-2'} border-b border-white/5 ${
                            t1Won ? 'bg-amber-500/10' : ''
                          }`}>
                            <span className={`font-bold truncate mr-3 ${
                              isFinal ? 'text-2xl' : isSemi ? 'text-xl' : isCompact ? 'text-base' : 'text-lg'
                            } ${
                              t1Won ? 'text-amber-300' : isDone && !t1Won ? 'text-white/40' : 'text-white'
                            }`}>
                              {match.team1?.name || 'TBD'}
                            </span>
                            <span className={`font-extrabold flex-shrink-0 ${
                              isFinal ? 'text-3xl' : isSemi ? 'text-2xl' : isCompact ? 'text-xl' : 'text-2xl'
                            } ${
                              isLive ? 'text-yellow-400' : isDone ? 'text-white' : 'text-white/20'
                            }`}>
                              {match.score1 !== null ? match.score1 : '-'}
                            </span>
                          </div>
                          {/* Team 2 */}
                          <div className={`flex items-center justify-between ${isCompact ? 'px-3 py-1' : 'px-4 py-2'} ${
                            t2Won ? 'bg-amber-500/10' : ''
                          }`}>
                            <span className={`font-bold truncate mr-3 ${
                              isFinal ? 'text-2xl' : isSemi ? 'text-xl' : isCompact ? 'text-base' : 'text-lg'
                            } ${
                              t2Won ? 'text-amber-300' : isDone && !t2Won ? 'text-white/40' : 'text-white'
                            }`}>
                              {match.team2?.name || 'TBD'}
                            </span>
                            <span className={`font-extrabold flex-shrink-0 ${
                              isFinal ? 'text-3xl' : isSemi ? 'text-2xl' : isCompact ? 'text-xl' : 'text-2xl'
                            } ${
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
        )}
      </div>
    </div>
  );
}
