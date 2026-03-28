'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

// How many match rows fit on half-screen (one group column)
// 1080p: ~900px available, ~50px group header = 850px / ~56px per row ≈ 15
// Keep conservative to avoid overflow — better to paginate than to cut off
const MATCHES_PER_PAGE = 10;

type Slide =
  | { type: 'groups' }
  | { type: 'matches'; groups: string[]; page: number; totalPages: number }
  | { type: 'bracket' };

export default function ProjectorView({ tournament, teams, matches, calculateStandings, qualifyCount }: ProjectorViewProps) {
  const groups = useMemo(
    () => [...new Set(teams.map(t => t.group_label).filter(Boolean))].sort() as string[],
    [teams]
  );
  const isElimination = tournament.status === 'elimination' || tournament.status === 'finished';
  const groupMatches = useMemo(() => matches.filter(m => m.phase === 'group'), [matches]);
  const eliminationMatches = useMemo(() => matches.filter(m => m.phase !== 'group'), [matches]);
  const phases = useMemo(() => phaseOrder.filter(p => eliminationMatches.some(m => m.phase === p)), [eliminationMatches]);

  // Max teams per group — drives adaptive sizing
  const maxTeamsPerGroup = useMemo(
    () => Math.max(...groups.map(g => teams.filter(t => t.group_label === g).length), 0),
    [groups, teams]
  );

  // Sort matches: in_progress first, then pending, then finished
  const sortedMatchesForGroup = useCallback((group: string) => {
    const gm = groupMatches.filter(m => m.group_label === group);
    const inProgress = gm.filter(m => m.status === 'in_progress');
    const pending = gm.filter(m => m.status === 'pending');
    const finished = gm.filter(m => m.status === 'finished');
    return [...inProgress, ...pending, ...finished];
  }, [groupMatches]);

  // Build slides
  const slides: Slide[] = useMemo(() => {
    const s: Slide[] = [];
    // Groups slide
    s.push({ type: 'groups' });

    // Match slides — pair groups and paginate
    for (let i = 0; i < groups.length; i += 2) {
      const pair = groups.slice(i, i + 2);
      // Find max matches in this pair to determine pages
      const maxMatches = Math.max(...pair.map(g => groupMatches.filter(m => m.group_label === g).length));
      const totalPages = Math.max(1, Math.ceil(maxMatches / MATCHES_PER_PAGE));
      for (let page = 0; page < totalPages; page++) {
        s.push({ type: 'matches', groups: pair, page, totalPages });
      }
    }

    // Bracket slide
    if (isElimination) {
      s.push({ type: 'bracket' });
    }
    return s;
  }, [groups, groupMatches, isElimination]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);

  // Keep a ref to slides so the timer doesn't reset on every data refetch
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  // Slide durations
  const getSlideDuration = useCallback((slide: Slide) => {
    if (slide.type === 'matches') return 15000;
    return 12000;
  }, []);

  // Auto-rotate — only re-trigger on actual slide change or toggle, NOT on data refetch
  useEffect(() => {
    const currentSlides = slidesRef.current;
    if (!autoRotate || currentSlides.length === 0) { setProgress(0); return; }
    const safeIdx = currentSlide % currentSlides.length;
    const duration = getSlideDuration(currentSlides[safeIdx]);
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
      setCurrentSlide(prev => (prev + 1) % (slidesRef.current.length || 1));
    }, duration);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [currentSlide, autoRotate, getSlideDuration]);

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

  const slide = slides[currentSlide % slides.length];

  // Winner
  const finalMatch = matches.find(m => m.phase === 'final' && m.status === 'finished');
  const winner = finalMatch && finalMatch.score1 !== null && finalMatch.score2 !== null
    ? (finalMatch.score1 > finalMatch.score2 ? finalMatch.team1 : finalMatch.team2)
    : null;

  // Slide label
  const slideLabel = slide.type === 'groups'
    ? '📊 Grupe'
    : slide.type === 'matches'
      ? `⚔️ Mečevi — Grupa ${slide.groups.join(' & ')}${slide.totalPages > 1 ? ` (${slide.page + 1}/${slide.totalPages})` : ''}`
      : '🏆 Eliminacije';

  // How many rows in the groups grid
  const groupRows = Math.ceil(groups.length / 2);

  // Adaptive sizing based on team count AND group count
  // With more groups stacked vertically, we need compact sizing earlier
  const totalTeamRows = maxTeamsPerGroup * groupRows;
  const isCompactGroups = maxTeamsPerGroup > 7 || totalTeamRows > 10;
  const isVeryCompactGroups = maxTeamsPerGroup > 9 || totalTeamRows > 14;

  return (
    <div className="h-screen bg-[#0a0f0d] text-white px-5 py-3 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
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
          <div className="flex gap-1.5 mr-2">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => { setCurrentSlide(i); setAutoRotate(false); }}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  i === currentSlide ? 'bg-amber-400 scale-125' : 'bg-white/15 hover:bg-white/30'
                }`}
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
        <div className="h-1 bg-white/5 rounded-full mb-2 flex-shrink-0 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* =================== GROUPS =================== */}
        {slide.type === 'groups' && (
          <div
            className="grid grid-cols-2 gap-3 h-full animate-fade-in"
            style={{ gridTemplateRows: `repeat(${groupRows}, 1fr)` }}
          >
            {groups.map(group => {
              const color = getGroupColor(group);
              const standings = calculateStandings(teams, matches, group);
              return (
                <div key={group} className={`border ${color.border} rounded-2xl overflow-hidden flex flex-col min-h-0`}>
                  <div className={`bg-gradient-to-r ${color.gradient} ${isVeryCompactGroups ? 'px-4 py-1' : 'px-5 py-1.5'} flex items-center gap-2 flex-shrink-0`}>
                    <span className={`${isVeryCompactGroups ? 'w-3 h-3' : 'w-3.5 h-3.5'} rounded-full ${color.dot}`} />
                    <h3 className={`${isVeryCompactGroups ? 'text-base' : 'text-xl'} font-bold text-white`}>Grupa {group}</h3>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className={`px-3 ${isVeryCompactGroups ? 'py-1' : isCompactGroups ? 'py-1.5' : 'py-3'} text-left text-emerald-300/50 font-medium ${isVeryCompactGroups ? 'text-sm' : 'text-base'} w-8`}>#</th>
                        <th className={`px-3 ${isVeryCompactGroups ? 'py-1' : isCompactGroups ? 'py-1.5' : 'py-3'} text-left text-emerald-300/50 font-medium ${isVeryCompactGroups ? 'text-sm' : 'text-base'}`}>Ekipa</th>
                        <th className={`px-2 ${isVeryCompactGroups ? 'py-1' : isCompactGroups ? 'py-1.5' : 'py-3'} text-center text-emerald-300/50 font-medium ${isVeryCompactGroups ? 'text-sm' : 'text-base'}`}>OM</th>
                        <th className={`px-2 ${isVeryCompactGroups ? 'py-1' : isCompactGroups ? 'py-1.5' : 'py-3'} text-center text-emerald-300/50 font-medium ${isVeryCompactGroups ? 'text-sm' : 'text-base'}`}>P</th>
                        <th className={`px-2 ${isVeryCompactGroups ? 'py-1' : isCompactGroups ? 'py-1.5' : 'py-3'} text-center text-emerald-300/50 font-medium ${isVeryCompactGroups ? 'text-sm' : 'text-base'}`}>I</th>
                        <th className={`px-2 ${isVeryCompactGroups ? 'py-1' : isCompactGroups ? 'py-1.5' : 'py-3'} text-center text-emerald-300/50 font-medium ${isVeryCompactGroups ? 'text-sm' : 'text-base'}`}>D:P</th>
                        <th className={`px-2 ${isVeryCompactGroups ? 'py-1' : isCompactGroups ? 'py-1.5' : 'py-3'} text-center text-emerald-300/50 font-medium ${isVeryCompactGroups ? 'text-sm' : 'text-base'}`}>+/-</th>
                        <th className={`px-2 ${isVeryCompactGroups ? 'py-1' : isCompactGroups ? 'py-1.5' : 'py-3'} text-center text-emerald-300/50 font-bold ${isVeryCompactGroups ? 'text-sm' : 'text-base'}`}>Bod</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr
                          key={s.team.id}
                          className={`border-t border-white/5 ${i < qualifyCount ? 'bg-emerald-500/5' : ''}`}
                        >
                          <td className={`px-3 ${isVeryCompactGroups ? 'py-0.5' : isCompactGroups ? 'py-1' : 'py-2'}`}>
                            <span className={`inline-flex items-center justify-center ${isVeryCompactGroups ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} rounded-full font-bold ${
                              i < qualifyCount
                                ? (i === 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300')
                                : 'bg-white/5 text-white/40'
                            }`}>
                              {i + 1}
                            </span>
                          </td>
                          <td className={`px-3 ${isVeryCompactGroups ? 'py-0.5' : isCompactGroups ? 'py-1' : 'py-2'} font-bold text-white ${isVeryCompactGroups ? 'text-base' : isCompactGroups ? 'text-lg' : 'text-xl'}`}>{s.team.name}</td>
                          <td className={`px-2 ${isVeryCompactGroups ? 'py-0.5' : isCompactGroups ? 'py-1' : 'py-2'} text-center text-white/60 ${isVeryCompactGroups ? 'text-base' : 'text-xl'}`}>{s.played}</td>
                          <td className={`px-2 ${isVeryCompactGroups ? 'py-0.5' : isCompactGroups ? 'py-1' : 'py-2'} text-center text-green-400 font-semibold ${isVeryCompactGroups ? 'text-base' : 'text-xl'}`}>{s.wins}</td>
                          <td className={`px-2 ${isVeryCompactGroups ? 'py-0.5' : isCompactGroups ? 'py-1' : 'py-2'} text-center text-red-400 font-semibold ${isVeryCompactGroups ? 'text-base' : 'text-xl'}`}>{s.losses}</td>
                          <td className={`px-2 ${isVeryCompactGroups ? 'py-0.5' : isCompactGroups ? 'py-1' : 'py-2'} text-center text-white/60 ${isVeryCompactGroups ? 'text-base' : 'text-xl'}`}>{s.scored}:{s.conceded}</td>
                          <td className={`px-2 ${isVeryCompactGroups ? 'py-0.5' : isCompactGroups ? 'py-1' : 'py-2'} text-center ${isVeryCompactGroups ? 'text-base' : 'text-xl'}`}>
                            <span className={s.diff > 0 ? 'text-green-400 font-semibold' : s.diff < 0 ? 'text-red-400 font-semibold' : 'text-white/40'}>
                              {s.diff > 0 ? '+' : ''}{s.diff}
                            </span>
                          </td>
                          <td className={`px-2 ${isVeryCompactGroups ? 'py-0.5' : isCompactGroups ? 'py-1' : 'py-2'} text-center`}>
                            <span className={`font-extrabold text-white bg-white/10 px-2 py-0.5 rounded-lg ${isVeryCompactGroups ? 'text-lg' : 'text-2xl'}`}>{s.points}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =================== MATCHES (paginated) =================== */}
        {slide.type === 'matches' && (
          <div className={`grid ${slide.groups.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 h-full animate-fade-in`}>
            {slide.groups.map(group => {
              const color = getGroupColor(group);
              const sorted = sortedMatchesForGroup(group);
              const totalForGroup = sorted.length;
              const pageMatches = sorted.slice(slide.page * MATCHES_PER_PAGE, (slide.page + 1) * MATCHES_PER_PAGE);
              const finished = sorted.filter(m => m.status === 'finished').length;

              return (
                <div key={group} className={`border ${color.border} rounded-2xl overflow-hidden flex flex-col min-h-0`}>
                  <div className={`bg-gradient-to-r ${color.gradient} px-6 py-2 flex items-center justify-between flex-shrink-0`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-4 h-4 rounded-full ${color.dot}`} />
                      <h3 className="text-2xl font-bold text-white">Grupa {group}</h3>
                    </div>
                    <span className="text-white/70 text-lg font-medium">
                      {finished}/{totalForGroup} završeno
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col justify-around py-1 overflow-y-auto">
                    {pageMatches.map(match => {
                      const isLive = match.status === 'in_progress';
                      const isDone = match.status === 'finished';
                      const t1Won = isDone && match.score1 !== null && match.score2 !== null && match.score1 > match.score2;
                      const t2Won = isDone && match.score1 !== null && match.score2 !== null && match.score2 > match.score1;

                      return (
                        <div
                          key={match.id}
                          className={`flex items-center px-4 ${isLive ? 'bg-yellow-500/10' : ''} border-b border-white/[0.03]`}
                        >
                          <span className={`flex-1 text-right font-semibold truncate text-xl py-2 ${
                            t1Won ? 'text-amber-300 font-bold' : isDone ? 'text-white/50' : 'text-white'
                          }`}>
                            {match.team1?.name || 'TBD'}
                          </span>
                          <div className="px-4 text-center whitespace-nowrap w-36 flex items-center justify-center">
                            {isLive && <span className="inline-block w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse mr-2" />}
                            <span className={`text-2xl font-extrabold ${
                              isLive ? 'text-yellow-400' : isDone ? 'text-white' : 'text-white/20'
                            }`}>
                              {match.score1 !== null ? match.score1 : '-'}
                            </span>
                            <span className="text-white/20 mx-1.5">:</span>
                            <span className={`text-2xl font-extrabold ${
                              isLive ? 'text-yellow-400' : isDone ? 'text-white' : 'text-white/20'
                            }`}>
                              {match.score2 !== null ? match.score2 : '-'}
                            </span>
                          </div>
                          <span className={`flex-1 text-left font-semibold truncate text-xl py-2 ${
                            t2Won ? 'text-amber-300 font-bold' : isDone ? 'text-white/50' : 'text-white'
                          }`}>
                            {match.team2?.name || 'TBD'}
                          </span>
                        </div>
                      );
                    })}
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
                  <div className="flex flex-col justify-around flex-1 gap-1">
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
