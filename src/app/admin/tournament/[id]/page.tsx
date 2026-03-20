'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import type { Tournament, Team, Match, Standing } from '@/lib/types';
import TournamentHeader from '@/components/TournamentHeader';
import GroupTable from '@/components/GroupTable';
import MatchCard from '@/components/MatchCard';
import Bracket from '@/components/Bracket';
import TeamForm from '@/components/TeamForm';
import AdminLogin from '@/components/AdminLogin';

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
    if (match.score1 > match.score2) { s1.wins++; s1.points += 3; s2.losses++; }
    else if (match.score1 < match.score2) { s2.wins++; s2.points += 3; s1.losses++; }
    else { s1.draws++; s2.draws++; s1.points += 1; s2.points += 1; }
  }

  const standings = Array.from(standingsMap.values());
  for (const s of standings) s.diff = s.scored - s.conceded;
  standings.sort((a, b) => b.points - a.points || b.diff - a.diff || b.scored - a.scored);
  return standings;
}

export default function AdminTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setAuthenticated(!!token);
    setCheckingAuth(false);
  }, []);

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
    if (authenticated) fetchData();
  }, [fetchData, authenticated]);

  const handleDraw = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/draw`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Greska pri zrijebu');
        return;
      }
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdvance = async () => {
    if (!confirm('Da li ste sigurni da zelite preci u eliminacijsku fazu?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${id}/advance`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Greska pri prelasku');
        return;
      }
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateScore = async (matchId: string, score1: number, score2: number, status: 'in_progress' | 'finished') => {
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score1, score2, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Greska pri azuriranju');
        return;
      }
      fetchData();
    } catch {
      alert('Greska pri azuriranju rezultata');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAuthenticated(false);
  };

  if (checkingAuth) return null;
  if (!authenticated) return <AdminLogin onLogin={() => { setAuthenticated(true); }} />;

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center">
      <div className="text-blue-300 text-lg">Ucitavanje...</div>
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
  const allGroupMatchesFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <Link href="/" className="text-blue-300 hover:text-blue-100 text-sm transition-colors">
              &larr; Pocetna
            </Link>
            <Link href={`/tournament/${id}`} className="text-blue-300 hover:text-blue-100 text-sm transition-colors">
              Javna stranica
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            Odjavi se
          </button>
        </div>

        <div className="bg-orange-500/20 border border-orange-500/30 backdrop-blur-sm rounded-xl px-4 py-2 mb-6">
          <span className="text-orange-300 font-medium">Admin panel</span>
        </div>

        <TournamentHeader tournament={tournament} />

        {/* Draft phase — add teams */}
        {tournament.status === 'draft' && (
          <div className="space-y-6">
            <TeamForm
              tournamentId={id}
              maxTeams={tournament.team_count}
              currentCount={teams.length}
              onTeamAdded={fetchData}
            />

            {teams.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="font-bold mb-4 text-white">Prijavljene ekipe ({teams.length}/{tournament.team_count})</h3>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                  {teams.map(team => (
                    <div key={team.id} className="bg-white/10 rounded-xl px-4 py-3 text-sm font-medium text-blue-100 border border-white/5">
                      {team.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {teams.length === tournament.team_count && (
              <div className="text-center">
                <button
                  onClick={handleDraw}
                  disabled={actionLoading}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-10 py-4 rounded-xl font-bold hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-lg transition-all shadow-lg shadow-purple-500/25"
                >
                  {actionLoading ? 'Zrijeb u toku...' : 'Pokreni zrijeb'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Group phase — enter results */}
        {tournament.status === 'group_phase' && (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              {groups.map(group => (
                <GroupTable
                  key={group}
                  groupLabel={group}
                  standings={calculateStandingsLocal(teams, matches, group)}
                />
              ))}
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Unos rezultata</h2>
              {groups.map(group => (
                <div key={group}>
                  <h3 className="text-lg font-bold mb-3 text-blue-200">Grupa {group}</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {groupMatches
                      .filter(m => m.group_label === group)
                      .map(match => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onUpdateScore={handleUpdateScore}
                          editable
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {allGroupMatchesFinished && (
              <div className="text-center bg-green-500/10 border border-green-500/30 backdrop-blur-sm rounded-2xl p-8">
                <p className="text-green-300 font-medium mb-4 text-lg">Svi mecevi grupne faze su zavrseni!</p>
                <button
                  onClick={handleAdvance}
                  disabled={actionLoading}
                  className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-10 py-4 rounded-xl font-bold hover:from-orange-500 hover:to-red-500 disabled:opacity-50 text-lg transition-all shadow-lg shadow-orange-500/25"
                >
                  {actionLoading ? 'Generisanje bracketa...' : 'Kreni u eliminacije'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Elimination phase */}
        {(tournament.status === 'elimination' || tournament.status === 'finished') && (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              {groups.map(group => (
                <GroupTable
                  key={group}
                  groupLabel={group}
                  standings={calculateStandingsLocal(teams, matches, group)}
                />
              ))}
            </div>

            <h2 className="text-xl font-bold text-white">Eliminacijska faza</h2>
            <Bracket
              matches={matches}
              onUpdateScore={tournament.status === 'elimination' ? handleUpdateScore : undefined}
              editable={tournament.status === 'elimination'}
            />

            {tournament.status === 'finished' && (
              <div className="text-center">
                <div className="inline-block bg-yellow-500/20 border-2 border-yellow-500/40 backdrop-blur-sm rounded-2xl p-8">
                  <p className="text-2xl font-bold text-yellow-300">Turnir zavrsen!</p>
                  {(() => {
                    const finalMatch = matches.find(m => m.phase === 'final' && m.status === 'finished');
                    if (finalMatch && finalMatch.score1 !== null && finalMatch.score2 !== null) {
                      const winner = finalMatch.score1 > finalMatch.score2 ? finalMatch.team1 : finalMatch.team2;
                      return winner ? (
                        <p className="text-3xl font-bold text-yellow-200 mt-2">Pobjednik: {winner.name}</p>
                      ) : null;
                    }
                    return null;
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
