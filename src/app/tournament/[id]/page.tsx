'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import type { Tournament, Team, Match, Standing } from '@/lib/types';
import TournamentHeader from '@/components/TournamentHeader';
import GroupTable from '@/components/GroupTable';
import MatchCard from '@/components/MatchCard';
import Bracket from '@/components/Bracket';
import { supabase } from '@/lib/supabase';

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
      played: 0, wins: 0, draws: 0, losses: 0,
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
      s1.wins++; s1.points += 3; s2.losses++;
    } else if (match.score1 < match.score2) {
      s2.wins++; s2.points += 3; s1.losses++;
    } else {
      s1.draws++; s2.draws++; s1.points += 1; s2.points += 1;
    }
  }

  const standings = Array.from(standingsMap.values());
  for (const s of standings) s.diff = s.scored - s.conceded;
  standings.sort((a, b) => b.points - a.points || b.diff - a.diff || b.scored - a.scored);
  return standings;
}

export default function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'groups' | 'matches' | 'bracket'>('groups');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      const json = await res.json();
      setData(json);
    } catch {
      console.error('Greska pri ucitavanju');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchData]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center">
      <div className="text-blue-300/50 text-lg">Ucitavanje turnira...</div>
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center">
      <div className="text-red-400 text-lg">Turnir nije pronadjen</div>
    </div>
  );

  const { tournament, teams, matches } = data;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/" className="text-blue-300/50 hover:text-blue-300 text-sm mb-6 inline-block transition-colors">
          &larr; Nazad na listu turnira
        </Link>

        <TournamentHeader tournament={tournament} />

        {tournament.status === 'draft' && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">🎴</div>
            <p className="text-blue-300/30 text-lg">Turnir je u pripremi. Ekipe se dodaju u admin panelu.</p>
          </div>
        )}

        {(tournament.status === 'group_phase' || tournament.status === 'elimination' || tournament.status === 'finished') && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-8 bg-white/5 rounded-xl p-1 inline-flex">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-blue-300/50 hover:text-blue-300 hover:bg-white/5'
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
                  />
                ))}
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="space-y-8 animate-fade-in">
                {groups.map(group => (
                  <div key={group}>
                    <h3 className="text-lg font-bold mb-4 text-blue-200">Grupa {group}</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {groupMatches
                        .filter(m => m.group_label === group)
                        .map(match => (
                          <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                  </div>
                ))}
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
            <div className="inline-block bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 backdrop-blur-sm rounded-2xl p-10">
              <div className="text-5xl mb-3">🏆</div>
              <p className="text-2xl font-bold text-yellow-300">Turnir zavrsen!</p>
              {(() => {
                const finalMatch = matches.find(m => m.phase === 'final' && m.status === 'finished');
                if (finalMatch && finalMatch.score1 !== null && finalMatch.score2 !== null) {
                  const winner = finalMatch.score1 > finalMatch.score2 ? finalMatch.team1 : finalMatch.team2;
                  return winner ? (
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent mt-3">
                      {winner.name}
                    </p>
                  ) : null;
                }
                return null;
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
