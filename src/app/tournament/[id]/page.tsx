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

  if (loading) return <div className="text-center py-12 text-gray-500">Ucitavanje turnira...</div>;
  if (!data) return <div className="text-center py-12 text-red-500">Turnir nije pronadjen</div>;

  const { tournament, teams, matches } = data;
  const groups = [...new Set(teams.map(t => t.group_label).filter(Boolean))].sort() as string[];
  const groupMatches = matches.filter(m => m.phase === 'group');

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block">
        &larr; Nazad na listu turnira
      </Link>

      <TournamentHeader tournament={tournament} />

      {tournament.status === 'draft' && (
        <div className="text-center text-gray-500 py-12">
          Turnir je u pripremi. Ekipe se dodaju u admin panelu.
        </div>
      )}

      {(tournament.status === 'group_phase' || tournament.status === 'elimination' || tournament.status === 'finished') && (
        <>
          <div className="flex gap-2 mb-6 border-b">
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 font-medium ${activeTab === 'groups' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              Grupe
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 font-medium ${activeTab === 'matches' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
              Mecevi
            </button>
            {(tournament.status === 'elimination' || tournament.status === 'finished') && (
              <button
                onClick={() => setActiveTab('bracket')}
                className={`px-4 py-2 font-medium ${activeTab === 'bracket' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                Eliminacije
              </button>
            )}
          </div>

          {activeTab === 'groups' && (
            <div className="grid gap-6 md:grid-cols-2">
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
            <div className="space-y-6">
              {groups.map(group => (
                <div key={group}>
                  <h3 className="text-lg font-bold mb-3">Grupa {group}</h3>
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
            <Bracket matches={matches} />
          )}
        </>
      )}

      {tournament.status === 'finished' && (
        <div className="mt-8 text-center">
          <div className="inline-block bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
            <p className="text-2xl font-bold text-yellow-700">Turnir zavrsen!</p>
            {(() => {
              const finalMatch = matches.find(m => m.phase === 'final' && m.status === 'finished');
              if (finalMatch && finalMatch.score1 !== null && finalMatch.score2 !== null) {
                const winner = finalMatch.score1 > finalMatch.score2 ? finalMatch.team1 : finalMatch.team2;
                return winner ? (
                  <p className="text-3xl font-bold text-yellow-800 mt-2">Pobjednik: {winner.name}</p>
                ) : null;
              }
              return null;
            })()}
          </div>
        </div>
      )}
    </main>
  );
}
