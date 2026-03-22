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
import ShareQR from '@/components/ShareQR';
import CardSuits from '@/components/CardSuits';
import { getGroupColor } from '@/lib/groupColors';

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
    if (match.score1 > match.score2) { s1.wins++; s1.points += 2; s2.losses++; }
    else if (match.score1 < match.score2) { s2.wins++; s2.points += 2; s1.losses++; }
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
        alert(data.error || 'Greska pri zrebu');
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

  const handleUpdateScore = async (matchId: string, score1: number, score2: number, status: 'in_progress' | 'finished' | 'pending') => {
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

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Obrisati ekipu "${teamName}"?`)) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Greska pri brisanju');
        return;
      }
      fetchData();
    } catch {
      alert('Greska pri brisanju ekipe');
    }
  };

  const handleRenameTeam = async (teamId: string, currentName: string) => {
    const newName = prompt('Novo ime ekipe:', currentName);
    if (!newName || newName.trim() === currentName) return;
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Greska pri izmeni');
        return;
      }
      fetchData();
    } catch {
      alert('Greska pri izmeni imena');
    }
  };

  const handleDeleteTournament = async () => {
    if (!confirm('Da li ste sigurni da zelite obrisati ceo turnir? Ova akcija je nepovratna!')) return;
    if (!confirm('POSLEDNJE UPOZORENJE: Svi podaci ce biti izgubljeni. Nastaviti?')) return;
    try {
      const res = await fetch(`/api/tournaments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Greska pri brisanju');
        return;
      }
      window.location.href = '/';
    } catch {
      alert('Greska pri brisanju turnira');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAuthenticated(false);
  };

  if (checkingAuth) return null;
  if (!authenticated) return <AdminLogin onLogin={() => { setAuthenticated(true); }} />;

  if (loading) return (
    <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
      <div className="text-emerald-300/40 text-lg">Ucitavanje...</div>
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
      <div className="text-red-400 text-lg">Turnir nije pronadjen</div>
    </div>
  );

  const { tournament, teams, matches } = data;
  const groups = [...new Set(teams.map(t => t.group_label).filter(Boolean))].sort() as string[];
  const groupMatches = matches.filter(m => m.phase === 'group');
  const allGroupMatchesFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');

  return (
    <div className="min-h-screen bg-[#0a0f0d] relative">
      <CardSuits />
      <main className="relative max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <Link href="/" className="text-amber-400/40 hover:text-amber-400 text-sm transition-colors">
              &larr; Pocetna
            </Link>
            <Link href={`/tournament/${id}`} className="text-amber-400/40 hover:text-amber-400 text-sm transition-colors">
              Javna stranica
            </Link>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDeleteTournament}
              className="text-red-400/60 hover:text-red-400 text-sm transition-colors"
            >
              Obrisi turnir
            </button>
            <button
              onClick={handleLogout}
              className="text-emerald-300/40 hover:text-emerald-300 text-sm transition-colors"
            >
              Odjavi se
            </button>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm rounded-xl px-4 py-2 mb-6 inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-300/80 font-medium text-sm tracking-wide uppercase">Admin panel</span>
        </div>

        <TournamentHeader tournament={tournament} />

        <div className="mb-6">
          <ShareQR tournamentId={id} tournamentName={tournament.name} />
        </div>

        {/* Draft phase — add teams */}
        {tournament.status === 'draft' && (
          <div className="space-y-6 animate-fade-in">
            <TeamForm
              tournamentId={id}
              maxTeams={tournament.team_count}
              currentCount={teams.length}
              onTeamAdded={fetchData}
            />

            {teams.length > 0 && (
              <div className="bg-emerald-950/40 backdrop-blur-sm border border-emerald-800/30 rounded-2xl p-6">
                <h3 className="font-bold mb-4 text-white">Prijavljene ekipe ({teams.length}/{tournament.team_count})</h3>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                  {teams.map(team => (
                    <div key={team.id} className="bg-emerald-950/50 rounded-xl px-4 py-3 text-sm font-medium text-emerald-100 border border-emerald-800/30 flex items-center justify-between gap-2 hover:border-amber-500/20 transition-colors">
                      <span className="truncate">{team.name}</span>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleRenameTeam(team.id, team.name)}
                          className="text-amber-400/50 hover:text-amber-300 text-xs px-1.5 py-0.5 rounded hover:bg-amber-500/10 transition-colors"
                          title="Preimenuj"
                        >
                          &#9998;
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          className="text-red-400/50 hover:text-red-300 text-xs px-1.5 py-0.5 rounded hover:bg-red-500/10 transition-colors"
                          title="Obrisi"
                        >
                          &#10005;
                        </button>
                      </div>
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
                  className="bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 px-10 py-4 rounded-xl font-bold hover:from-amber-500 hover:to-yellow-400 disabled:opacity-50 text-lg transition-all shadow-lg shadow-amber-500/20 hover:scale-105"
                >
                  {actionLoading ? 'Zreb u toku...' : 'Pokreni zreb'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Group phase — enter results */}
        {tournament.status === 'group_phase' && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid gap-6 md:grid-cols-2">
              {groups.map(group => (
                <GroupTable
                  key={group}
                  groupLabel={group}
                  standings={calculateStandingsLocal(teams, matches, group)}
                  qualifyCount={getQualifyCount(tournament.team_count)}
                />
              ))}
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">Unos rezultata</h2>
              {groups.map(group => {
                const gc = getGroupColor(group);
                return (
                <div key={group}>
                  <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${gc.text}`}>
                    <span className={`w-3 h-3 rounded-full ${gc.dot}`} />
                    Grupa {group}
                  </h3>
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
                );
              })}
            </div>

            {allGroupMatchesFinished && (
              <div className="text-center bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm rounded-2xl p-8">
                <p className="text-emerald-300 font-medium mb-4 text-lg">Svi mecevi grupne faze su zavrseni!</p>
                <button
                  onClick={handleAdvance}
                  disabled={actionLoading}
                  className="bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 px-10 py-4 rounded-xl font-bold hover:from-amber-500 hover:to-yellow-400 disabled:opacity-50 text-lg transition-all shadow-lg shadow-amber-500/20 hover:scale-105"
                >
                  {actionLoading ? 'Generisanje bracketa...' : 'Kreni u eliminacije'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Elimination phase */}
        {(tournament.status === 'elimination' || tournament.status === 'finished') && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid gap-6 md:grid-cols-2">
              {groups.map(group => (
                <GroupTable
                  key={group}
                  groupLabel={group}
                  standings={calculateStandingsLocal(teams, matches, group)}
                  qualifyCount={getQualifyCount(tournament.team_count)}
                />
              ))}
            </div>

            <h2 className="text-xl font-bold bg-gradient-to-r from-amber-200 to-yellow-100 bg-clip-text text-transparent">Eliminaciona faza</h2>
            <Bracket
              matches={matches}
              onUpdateScore={tournament.status === 'elimination' ? handleUpdateScore : undefined}
              editable={tournament.status === 'elimination'}
            />

            {tournament.status === 'finished' && (
              <div className="text-center">
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
