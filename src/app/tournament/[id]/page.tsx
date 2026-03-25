'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import Link from 'next/link';
import type { Tournament, Team, Match, Standing } from '@/lib/types';
import TournamentHeader from '@/components/TournamentHeader';
import GroupTable from '@/components/GroupTable';
import MatchCard from '@/components/MatchCard';
import Bracket from '@/components/Bracket';
import CardSuits from '@/components/CardSuits';
import { supabase } from '@/lib/supabase';
import { getGroupColor } from '@/lib/groupColors';
import ProjectorView from '@/components/ProjectorView';

interface TournamentData {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
}

function calculateStandingsLocal(teams: Team[], matches: Match[], groupLabel: string): Standing[] {
  const groupTeams = teams.filter(t => t.group_label === groupLabel);
  const groupMatches = matches.filter(
    m => m.phase === 'group' && m.group_label === groupLabel && m.status === 'finished'
  );

  const standingsMap = new Map<string, Standing>();
  for (const team of groupTeams) {
    standingsMap.set(team.id, {
      team,
      played: 0, wins: 0, losses: 0,
      scored: 0, conceded: 0, diff: 0, points: 0,
    });
  }

  for (const match of groupMatches) {
    if (match.score1 === null || match.score2 === null) continue;
    if (!match.team1_id || !match.team2_id) continue;

    const s1 = standingsMap.get(match.team1_id);
    const s2 = standingsMap.get(match.team2_id);
    if (!s1 || !s2) continue;

    s1.played++; s2.played++;
    s1.scored += match.score1; s1.conceded += match.score2;
    s2.scored += match.score2; s2.conceded += match.score1;

    if (match.score1 > match.score2) {
      s1.wins++; s1.points += 2; s2.losses++;
    } else if (match.score1 < match.score2) {
      s2.wins++; s2.points += 2; s1.losses++;
    }
  }

  function getHeadToHeadResult(teamAId: string, teamBId: string): number {
    for (const m of groupMatches) {
      if (m.score1 === null || m.score2 === null) continue;
      if (m.team1_id === teamAId && m.team2_id === teamBId) {
        return m.score1 > m.score2 ? 1 : m.score1 < m.score2 ? -1 : 0;
      }
      if (m.team1_id === teamBId && m.team2_id === teamAId) {
        return m.score2 > m.score1 ? 1 : m.score2 < m.score1 ? -1 : 0;
      }
    }
    return 0;
  }

  const standings = Array.from(standingsMap.values());
  for (const s of standings) s.diff = s.scored - s.conceded;
  standings.sort((a, b) => b.points - a.points || b.diff - a.diff || getHeadToHeadResult(b.team.id, a.team.id));
  return standings;
}

function getQualifyCount(teamCount: number): number {
  if (teamCount >= 24) return 4;
  if (teamCount >= 12) return 2;
  return 1;
}

export default function TournamentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = use(params);
  const { view } = use(searchParams);
  const isProjector = view === 'projector';
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'groups' | 'matches' | 'bracket'>('groups');
  const [changedMatchIds, setChangedMatchIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevMatchesRef = useRef<string>('');
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const enableSound = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setSoundEnabled(true);
    };
    document.addEventListener('click', enableSound, { once: true });
    document.addEventListener('touchstart', enableSound, { once: true });
    return () => {
      document.removeEventListener('click', enableSound);
      document.removeEventListener('touchstart', enableSound);
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'suspended') return;
    try {
      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gain.gain.value = 0.3;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not supported
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      const json = await res.json();

      if (json.matches) {
        const newFingerprint = JSON.stringify(json.matches.map((m: Match) => `${m.id}:${m.score1}:${m.score2}:${m.status}`));
        if (prevMatchesRef.current && prevMatchesRef.current !== newFingerprint) {
          const oldMatches = JSON.parse(prevMatchesRef.current) as string[];
          const newMatches = json.matches.map((m: Match) => `${m.id}:${m.score1}:${m.score2}:${m.status}`);
          const changed = new Set<string>();
          newMatches.forEach((entry: string, i: number) => {
            if (oldMatches[i] !== entry) {
              changed.add(entry.split(':')[0]);
            }
          });
          if (changed.size > 0) {
            setChangedMatchIds(changed);
            playNotificationSound();
            setTimeout(() => setChangedMatchIds(new Set()), 2000);
          }
        }
        prevMatchesRef.current = JSON.stringify(json.matches.map((m: Match) => `${m.id}:${m.score1}:${m.score2}:${m.status}`));
      }

      setData(json);
    } catch {
      console.error('Greska pri ucitavanju');
    } finally {
      setLoading(false);
    }
  }, [id, playNotificationSound]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel(`tournament-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${id}` }, () => {
        fetchData();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [id, fetchData]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
      <div className="text-emerald-300/40 text-lg">Ucitavanje turnira...</div>
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
      <div className="text-red-400 text-lg">Turnir nije pronadjen</div>
    </div>
  );

  const { tournament, teams, matches } = data;

  if (isProjector) {
    return (
      <ProjectorView
        tournament={tournament}
        teams={teams}
        matches={matches}
        calculateStandings={calculateStandingsLocal}
        qualifyCount={getQualifyCount(tournament.team_count || teams.length)}
      />
    );
  }

  const groups = [...new Set(teams.map(t => t.group_label).filter(Boolean))].sort() as string[];
  const groupMatches = matches.filter(m => m.phase === 'group');

  const tabs = [
    { key: 'groups' as const, label: 'Grupe', icon: '📊' },
    { key: 'matches' as const, label: 'Mecevi', icon: '⚔️' },
    ...(tournament.status === 'elimination' || tournament.status === 'finished'
      ? [{ key: 'bracket' as const, label: 'Eliminacije', icon: '🏆' }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#0a0f0d] relative">
      <CardSuits />
      <main className="relative max-w-6xl mx-auto px-4 py-8">
        <Link href="/" className="text-amber-400/40 hover:text-amber-400 text-sm mb-6 inline-block transition-colors">
          &larr; Nazad na listu turnira
        </Link>

        <TournamentHeader tournament={tournament} />

        {!soundEnabled && (tournament.status === 'group_phase' || tournament.status === 'elimination') && (
          <div className="mb-4 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-2 text-amber-300/50 text-sm text-center">
            Dodirnite ekran da omogucite zvucne notifikacije za nove rezultate
          </div>
        )}

        {tournament.status === 'draft' && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">🎴</div>
            <p className="text-emerald-300/30 text-lg">Turnir je u pripremi. Ekipe se dodaju u admin panelu.</p>
          </div>
        )}

        {(tournament.status === 'group_phase' || tournament.status === 'elimination' || tournament.status === 'finished') && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-8 bg-emerald-950/40 rounded-xl p-1 inline-flex border border-emerald-800/20">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 shadow-lg shadow-amber-500/20 font-bold'
                      : 'text-emerald-300/40 hover:text-emerald-200 hover:bg-emerald-950/60'
                  }`}
                >
                  <span className="mr-1.5">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'groups' && (
              <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
                {groups.map(group => (
                  <GroupTable
                    key={group}
                    groupLabel={group}
                    standings={calculateStandingsLocal(teams, matches, group)}
                    qualifyCount={getQualifyCount(tournament.team_count || teams.length)}
                  />
                ))}
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="space-y-8 animate-fade-in">
                {groups.map(group => {
                  const gc = getGroupColor(group);
                  return (
                    <div key={group}>
                      <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${gc.text}`}>
                        <span className={`w-3 h-3 rounded-full ${gc.dot}`} />
                        Grupa {group}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {groupMatches
                          .filter(m => m.group_label === group)
                          .map(match => (
                            <MatchCard key={match.id} match={match} highlight={changedMatchIds.has(match.id)} />
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'bracket' && (
              <div className="animate-fade-in">
                <Bracket matches={matches} />
              </div>
            )}
          </>
        )}

        {tournament.status === 'finished' && (
          <div className="mt-10 text-center animate-fade-in">
            <div className="inline-block bg-amber-500/10 border-2 border-amber-500/20 backdrop-blur-sm rounded-2xl p-10">
              <div className="text-5xl mb-3">🏆</div>
              <p className="text-2xl font-bold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">Turnir zavrsen!</p>
              {(() => {
                const finalMatch = matches.find(m => m.phase === 'final' && m.status === 'finished');
                if (finalMatch && finalMatch.score1 !== null && finalMatch.score2 !== null) {
                  const winner = finalMatch.score1 > finalMatch.score2 ? finalMatch.team1 : finalMatch.team2;
                  return winner ? (
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-amber-300 to-yellow-200 bg-clip-text text-transparent mt-3">
                      {winner.name}
                    </p>
                  ) : null;
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 pt-6 border-t border-amber-500/10 text-center">
          <p className="text-white/15 text-xs tracking-widest uppercase">
            ♠ ♥ ♦ ♣ &middot; Turnir Bela
          </p>
        </div>
      </main>
    </div>
  );
}
