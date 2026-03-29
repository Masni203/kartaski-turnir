import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Match, Team, Standing } from '@/lib/types';

function calculateStandings(teams: Team[], matches: Match[], groupLabel: string): Standing[] {
  const groupTeams = teams.filter(t => t.group_label === groupLabel);
  const groupMatches = matches.filter(
    m => m.phase === 'group' && m.group_label === groupLabel && m.status === 'finished'
  );

  const standingsMap = new Map<string, Standing>();
  for (const team of groupTeams) {
    standingsMap.set(team.id, {
      team, played: 0, wins: 0, losses: 0,
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

  const standings = Array.from(standingsMap.values());
  for (const s of standings) s.diff = s.scored - s.conceded;

  function getHeadToHeadResult(teamAId: string, teamBId: string): number {
    for (const m of groupMatches) {
      if (m.score1 === null || m.score2 === null) continue;
      if (m.team1_id === teamAId && m.team2_id === teamBId)
        return m.score1 > m.score2 ? 1 : m.score1 < m.score2 ? -1 : 0;
      if (m.team1_id === teamBId && m.team2_id === teamAId)
        return m.score2 > m.score1 ? 1 : m.score2 < m.score1 ? -1 : 0;
    }
    return 0;
  }

  standings.sort((a, b) => b.points - a.points || b.diff - a.diff || getHeadToHeadResult(b.team.id, a.team.id));
  return standings;
}

const phaseLabels: Record<string, string> = {
  round_of_16: 'Osmina finala',
  quarterfinal: 'Četvrtfinale',
  semifinal: 'Polufinale',
  final: 'Finale',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [tournamentRes, teamsRes, matchesRes] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', id).single(),
    supabase.from('teams').select('*').eq('tournament_id', id),
    supabase.from('matches').select('*').eq('tournament_id', id).order('round').order('bracket_position'),
  ]);

  if (tournamentRes.error || !tournamentRes.data) {
    return NextResponse.json({ error: 'Turnir nije pronađen' }, { status: 404 });
  }

  const tournament = tournamentRes.data;
  const teams = teamsRes.data || [];
  const teamsMap = new Map(teams.map(t => [t.id, t]));
  const matches: Match[] = (matchesRes.data || []).map(m => ({
    ...m,
    team1: m.team1_id ? teamsMap.get(m.team1_id) : undefined,
    team2: m.team2_id ? teamsMap.get(m.team2_id) : undefined,
  }));

  const groups = [...new Set(teams.map(t => t.group_label).filter(Boolean))].sort() as string[];
  const finishedMatches = matches.filter(m => m.status === 'finished' && m.score1 !== null && m.score2 !== null);

  // Pobednik i finalista
  const finalMatch = matches.find(m => m.phase === 'final' && m.status === 'finished');
  let champion: Team | undefined;
  let finalist: Team | undefined;
  let finalScore = '';
  if (finalMatch && finalMatch.score1 !== null && finalMatch.score2 !== null) {
    champion = finalMatch.score1 > finalMatch.score2 ? finalMatch.team1 : finalMatch.team2;
    finalist = finalMatch.score1 > finalMatch.score2 ? finalMatch.team2 : finalMatch.team1;
    finalScore = `${finalMatch.score1} : ${finalMatch.score2}`;
  }

  // Polufinalni gubitnici
  const semiMatches = matches.filter(m => m.phase === 'semifinal' && m.status === 'finished');
  const semifinalists: Team[] = [];
  for (const m of semiMatches) {
    if (m.score1 === null || m.score2 === null) continue;
    const loser = m.score1 < m.score2 ? m.team1 : m.team2;
    if (loser) semifinalists.push(loser);
  }

  // Statistike po timu (sve faze)
  const teamStats = new Map<string, { scored: number; conceded: number; name: string; wins: number; losses: number; played: number }>();
  for (const t of teams) teamStats.set(t.id, { scored: 0, conceded: 0, name: t.name, wins: 0, losses: 0, played: 0 });
  for (const m of finishedMatches) {
    if (!m.team1_id || !m.team2_id || m.score1 === null || m.score2 === null) continue;
    const t1 = teamStats.get(m.team1_id);
    const t2 = teamStats.get(m.team2_id);
    if (t1) { t1.scored += m.score1; t1.conceded += m.score2; t1.played++; if (m.score1 > m.score2) t1.wins++; else t1.losses++; }
    if (t2) { t2.scored += m.score2; t2.conceded += m.score1; t2.played++; if (m.score2 > m.score1) t2.wins++; else t2.losses++; }
  }

  const totalPoeni = finishedMatches.reduce((sum, m) => sum + (m.score1 || 0) + (m.score2 || 0), 0);
  const totalMatches = finishedMatches.length;
  const avgPoeniPerMatch = totalMatches > 0 ? (totalPoeni / totalMatches).toFixed(0) : '0';

  // Top 5 po osvojenim poenima
  const sortedByScored = [...teamStats.entries()]
    .filter(([, v]) => v.played > 0)
    .sort((a, b) => b[1].scored - a[1].scored);
  const top5Scored = sortedByScored.slice(0, 5);
  const maxScored = top5Scored.length > 0 ? top5Scored[0][1].scored : 1;

  // Procenat pobeda
  const teamsWithWinRate = [...teamStats.entries()]
    .filter(([, v]) => v.played > 0)
    .map(([id, v]) => ({ id, name: v.name, rate: Math.round((v.wins / v.played) * 100), wins: v.wins, played: v.played }))
    .sort((a, b) => b.rate - a.rate || b.wins - a.wins);

  // Najjača odbrana
  const bestDefense = [...teamStats.entries()]
    .filter(([, v]) => v.played > 0)
    .sort((a, b) => a[1].conceded - b[1].conceded)[0];

  // Najveća pobeda (najveća razlika)
  let biggestWin: { match: Match; diff: number } | null = null;
  for (const m of finishedMatches) {
    if (m.score1 === null || m.score2 === null) continue;
    const diff = Math.abs(m.score1 - m.score2);
    if (!biggestWin || diff > biggestWin.diff) biggestWin = { match: m, diff };
  }

  // Najviše poena u jednoj partiji
  let highestScoring: { match: Match; total: number } | null = null;
  for (const m of finishedMatches) {
    if (m.score1 === null || m.score2 === null) continue;
    const total = m.score1 + m.score2;
    if (!highestScoring || total > highestScoring.total) highestScoring = { match: m, total };
  }

  // Najtesnija partija (najmanja razlika)
  let closestMatch: { match: Match; diff: number } | null = null;
  for (const m of finishedMatches) {
    if (m.score1 === null || m.score2 === null) continue;
    const diff = Math.abs(m.score1 - m.score2);
    if (diff > 0 && (!closestMatch || diff < closestMatch.diff)) closestMatch = { match: m, diff };
  }

  // Neporaženi u grupi
  const groupStandings = groups.map(g => ({ group: g, standings: calculateStandings(teams, matches, g) }));
  const unbeatenTeams = groupStandings.flatMap(g => g.standings).filter(s => s.played > 0 && s.losses === 0);

  // Put šampiona
  const champPath: { phase: string; match: Match }[] = [];
  if (champion) {
    const elimPhaseOrder = ['round_of_16', 'quarterfinal', 'semifinal', 'final'];
    for (const phase of elimPhaseOrder) {
      const m = finishedMatches.find(
        fm => fm.phase === phase && (fm.team1_id === champion!.id || fm.team2_id === champion!.id)
      );
      if (m) champPath.push({ phase, match: m });
    }
  }

  // Raspodela razlike poena (histogram)
  const diffDist = new Map<number, number>();
  for (const m of finishedMatches) {
    if (m.score1 === null || m.score2 === null) continue;
    const diff = Math.abs(m.score1 - m.score2);
    diffDist.set(diff, (diffDist.get(diff) || 0) + 1);
  }
  const maxDiff = Math.max(...diffDist.keys(), 0);
  const maxDiffCount = Math.max(...diffDist.values(), 1);

  // Prvaci grupa
  const groupWinners = groupStandings.map(g => ({
    group: g.group,
    winner: g.standings[0]?.team.name || '?',
    points: g.standings[0]?.points || 0,
    scored: g.standings[0]?.scored || 0,
  }));

  // Eliminacioni rezultati
  const elimPhases = ['round_of_16', 'quarterfinal', 'semifinal', 'final'] as const;
  const elimMatches = elimPhases
    .map(phase => ({
      phase,
      label: phaseLabels[phase],
      matches: matches.filter(m => m.phase === phase && (m.team1_id || m.team2_id)),
    }))
    .filter(p => p.matches.length > 0);

  const groupColors: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
    A: { bg: '#1a2332', border: '#2563eb33', text: '#93c5fd', headerBg: '#1e3a5f' },
    B: { bg: '#1f2623', border: '#16a34a33', text: '#86efac', headerBg: '#1a3a2a' },
    C: { bg: '#2a2019', border: '#d9760633', text: '#fdba74', headerBg: '#3a2a1a' },
    D: { bg: '#261c2a', border: '#9333ea33', text: '#d8b4fe', headerBg: '#2e1a3e' },
  };

  const createdDate = new Date(tournament.created_at).toLocaleDateString('sr-Latn', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tournament.name} — Rezime turnira</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background: #0a0f0d; color: #e2e8f0; min-height: 100vh; }
    .page { max-width: 900px; margin: 0 auto; padding: 40px 24px 60px; }

    .header { text-align: center; margin-bottom: 48px; padding-bottom: 32px; border-bottom: 1px solid rgba(245,158,11,0.15); }
    .suits { color: rgba(245,158,11,0.25); font-size: 18px; letter-spacing: 8px; margin-bottom: 16px; }
    .tournament-name { font-size: 36px; font-weight: 900; background: linear-gradient(135deg,#fcd34d,#f59e0b,#d97706); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; }
    .tournament-date { color: rgba(167,210,179,0.4); font-size: 14px; }
    .tournament-meta { color: rgba(167,210,179,0.3); font-size: 13px; margin-top: 4px; }

    .champion-section { text-align: center; margin-bottom: 48px; padding: 40px 24px; background: linear-gradient(135deg,rgba(245,158,11,0.08),rgba(234,179,8,0.04)); border: 2px solid rgba(245,158,11,0.2); border-radius: 20px; position: relative; overflow: hidden; }
    .champion-section::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at center,rgba(245,158,11,0.06),transparent 70%); }
    .trophy { font-size: 64px; margin-bottom: 12px; position: relative; }
    .champion-label { font-size: 13px; text-transform: uppercase; letter-spacing: 4px; color: rgba(245,158,11,0.5); font-weight: 600; margin-bottom: 8px; position: relative; }
    .champion-name { font-size: 42px; font-weight: 900; background: linear-gradient(135deg,#fde68a,#fbbf24,#f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; position: relative; }
    .final-score { font-size: 20px; color: rgba(255,255,255,0.5); margin-top: 12px; font-weight: 600; position: relative; }
    .final-teams { font-size: 15px; color: rgba(255,255,255,0.35); margin-top: 4px; position: relative; }

    .podium { display: flex; justify-content: center; gap: 16px; margin-bottom: 48px; flex-wrap: wrap; }
    .podium-card { flex: 1; min-width: 140px; max-width: 220px; padding: 20px 16px; border-radius: 16px; text-align: center; border: 1px solid; }
    .podium-card.gold { background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.2); }
    .podium-card.silver { background: rgba(148,163,184,0.08); border-color: rgba(148,163,184,0.2); }
    .podium-card.bronze { background: rgba(180,120,60,0.08); border-color: rgba(180,120,60,0.2); }
    .podium-place { font-size: 28px; margin-bottom: 8px; }
    .podium-team { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
    .podium-card.gold .podium-team { color: #fcd34d; }
    .podium-card.silver .podium-team { color: #cbd5e1; }
    .podium-card.bronze .podium-team { color: #d4a574; }
    .podium-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.4; }

    .section-title { font-size: 20px; font-weight: 800; margin-bottom: 20px; color: #fcd34d; display: flex; align-items: center; gap: 10px; }
    .section-title::after { content: ''; flex: 1; height: 1px; background: rgba(245,158,11,0.15); }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: 12px; margin-bottom: 48px; }
    .stat-card { background: rgba(16,32,24,0.6); border: 1px solid rgba(52,211,153,0.1); border-radius: 14px; padding: 16px; }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: rgba(167,210,179,0.4); font-weight: 600; margin-bottom: 6px; }
    .stat-value { font-size: 22px; font-weight: 800; color: #86efac; }
    .stat-detail { font-size: 12px; color: rgba(167,210,179,0.35); margin-top: 2px; }

    .chart-container { background: rgba(16,32,24,0.4); border: 1px solid rgba(52,211,153,0.08); border-radius: 16px; padding: 24px; }
    .chart-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .chart-row:last-child { margin-bottom: 0; }
    .chart-label { width: 120px; font-size: 13px; font-weight: 600; text-align: right; color: rgba(255,255,255,0.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
    .chart-bar-wrap { flex: 1; height: 28px; background: rgba(255,255,255,0.04); border-radius: 6px; overflow: hidden; position: relative; }
    .chart-bar { height: 100%; border-radius: 6px; min-width: 36px; }
    .chart-bar-val { position: absolute; right: 8px; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.8); top: 50%; transform: translateY(-50%); }

    .winrate-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(100px,1fr)); gap: 16px; }
    .winrate-item { text-align: center; }
    .winrate-ring { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; position: relative; }
    .winrate-ring::before { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #0a0f0d; }
    .winrate-pct { position: relative; font-size: 16px; font-weight: 800; color: #fcd34d; }
    .winrate-name { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .winrate-sub { font-size: 10px; color: rgba(255,255,255,0.25); }

    .champ-path { display: flex; align-items: center; gap: 0; margin-bottom: 48px; flex-wrap: wrap; justify-content: center; }
    .path-step { display: flex; flex-direction: column; align-items: center; padding: 12px 16px; background: rgba(16,32,24,0.5); border: 1px solid rgba(52,211,153,0.1); border-radius: 12px; min-width: 130px; }
    .path-phase { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: rgba(245,158,11,0.5); font-weight: 600; margin-bottom: 4px; }
    .path-opponent { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.6); }
    .path-score { font-size: 18px; font-weight: 800; color: #86efac; margin-top: 2px; }
    .path-arrow { font-size: 20px; color: rgba(245,158,11,0.3); padding: 0 6px; }

    .histo-bars { display: flex; align-items: flex-end; gap: 6px; height: 120px; }
    .histo-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
    .histo-bar { width: 100%; max-width: 48px; border-radius: 4px 4px 0 0; background: linear-gradient(to top,#f59e0b,#fcd34d); min-height: 4px; }
    .histo-count { font-size: 11px; font-weight: 700; color: #fcd34d; margin-bottom: 4px; }
    .histo-label { font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 6px; }
    .histo-caption { text-align: center; margin-top: 12px; font-size: 12px; color: rgba(167,210,179,0.3); }

    .groups-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; margin-bottom: 48px; }
    @media (max-width: 700px) { .groups-grid { grid-template-columns: 1fr; } }
    .group-card { border-radius: 14px; overflow: hidden; border: 1px solid; }
    .group-header { padding: 10px 16px; font-weight: 700; font-size: 14px; }
    .group-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .group-table th { text-align: center; padding: 6px 8px; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.35); border-bottom: 1px solid rgba(255,255,255,0.06); }
    .group-table th:first-child { text-align: left; padding-left: 16px; }
    .group-table td { padding: 8px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .group-table td:first-child { text-align: left; font-weight: 600; padding-left: 16px; }
    .group-table tr.qualified td:first-child { position: relative; }
    .group-table tr.qualified td:first-child::before { content: ''; position: absolute; left: 6px; top: 50%; transform: translateY(-50%); width: 4px; height: 4px; border-radius: 50%; background: #4ade80; }

    .elim-section { margin-bottom: 48px; }
    .elim-phase { margin-bottom: 20px; }
    .elim-phase-title { font-size: 14px; font-weight: 700; color: rgba(245,158,11,0.6); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px; }
    .elim-matches { display: grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap: 10px; }
    .elim-match { background: rgba(16,32,24,0.5); border: 1px solid rgba(52,211,153,0.1); border-radius: 10px; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; }
    .elim-team { display: flex; justify-content: space-between; align-items: center; font-size: 14px; padding: 2px 0; }
    .elim-team.winner { font-weight: 700; color: #fcd34d; }
    .elim-team.loser { color: rgba(255,255,255,0.35); }
    .elim-score { font-weight: 700; font-variant-numeric: tabular-nums; }

    .all-matches-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); gap: 8px; margin-bottom: 48px; }
    .mini-match { background: rgba(16,32,24,0.4); border: 1px solid rgba(52,211,153,0.06); border-radius: 8px; padding: 8px 12px; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
    .mini-match-teams { display: flex; flex-direction: column; gap: 1px; }
    .mini-match-team { color: rgba(255,255,255,0.6); }
    .mini-match-team.w { font-weight: 700; color: rgba(255,255,255,0.85); }
    .mini-match-score { font-weight: 700; color: rgba(167,210,179,0.6); font-variant-numeric: tabular-nums; white-space: nowrap; }

    .footer { text-align: center; padding-top: 32px; border-top: 1px solid rgba(245,158,11,0.1); color: rgba(255,255,255,0.12); font-size: 12px; letter-spacing: 4px; text-transform: uppercase; }

    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 48px; }
    @media (max-width: 700px) { .charts-row { grid-template-columns: 1fr; } }
    .chart-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(245,158,11,0.5); margin-bottom: 16px; }

    @media print {
      body { background: white; color: #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px; }
      .champion-section { border-color: #d4a000; }
      .stat-card { border-color: #ddd; background: #f9f9f9; }
      .group-card { break-inside: avoid; }
      .chart-container { background: #f9f9f9; border-color: #ddd; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="suits">&spades; &hearts; &diams; &clubs;</div>
      <div class="tournament-name">${tournament.name}</div>
      <div class="tournament-date">${createdDate}</div>
      <div class="tournament-meta">${teams.length} ekipa &middot; ${totalMatches} partija &middot; ${totalPoeni} poena ukupno</div>
    </div>

    ${champion ? `
    <div class="champion-section">
      <div class="trophy">&#127942;</div>
      <div class="champion-label">Šampion turnira</div>
      <div class="champion-name">${champion.name}</div>
      <div class="final-score">Finale: ${finalScore}</div>
      <div class="final-teams">${finalMatch?.team1?.name || '?'} vs ${finalMatch?.team2?.name || '?'}</div>
    </div>
    ` : ''}

    <div class="podium">
      ${champion ? `<div class="podium-card gold"><div class="podium-place">&#129351;</div><div class="podium-team">${champion.name}</div><div class="podium-label">1. mesto</div></div>` : ''}
      ${finalist ? `<div class="podium-card silver"><div class="podium-place">&#129352;</div><div class="podium-team">${finalist.name}</div><div class="podium-label">2. mesto</div></div>` : ''}
      ${semifinalists.map(t => `<div class="podium-card bronze"><div class="podium-place">&#129353;</div><div class="podium-team">${t.name}</div><div class="podium-label">3-4. mesto</div></div>`).join('')}
    </div>

    ${champPath.length > 0 ? `
    <div class="section-title">Put do titule — ${champion?.name || ''}</div>
    <div class="champ-path">
      ${champPath.map((step, i) => {
        const isTeam1 = step.match.team1_id === champion!.id;
        const ownScore = isTeam1 ? step.match.score1 : step.match.score2;
        const oppScore = isTeam1 ? step.match.score2 : step.match.score1;
        const opponent = isTeam1 ? step.match.team2?.name : step.match.team1?.name;
        return `${i > 0 ? '<span class="path-arrow">&#9654;</span>' : ''}
        <div class="path-step">
          <span class="path-phase">${phaseLabels[step.phase] || step.phase}</span>
          <span class="path-opponent">vs ${opponent || '?'}</span>
          <span class="path-score">${ownScore} : ${oppScore}</span>
        </div>`;
      }).join('')}
    </div>
    ` : ''}

    <div class="section-title">Statistika turnira</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Ukupno poena</div>
        <div class="stat-value">${totalPoeni}</div>
        <div class="stat-detail">~${avgPoeniPerMatch} po partiji</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Odigrano partija</div>
        <div class="stat-value">${totalMatches}</div>
        <div class="stat-detail">grupna + eliminaciona faza</div>
      </div>
      ${sortedByScored[0] ? `
      <div class="stat-card">
        <div class="stat-label">Najviše osvojenih poena</div>
        <div class="stat-value">${sortedByScored[0][1].name}</div>
        <div class="stat-detail">${sortedByScored[0][1].scored} poena ukupno</div>
      </div>
      ` : ''}
      ${bestDefense ? `
      <div class="stat-card">
        <div class="stat-label">Najjača odbrana</div>
        <div class="stat-value">${bestDefense[1].name}</div>
        <div class="stat-detail">${bestDefense[1].conceded} primljenih poena</div>
      </div>
      ` : ''}
      ${biggestWin ? `
      <div class="stat-card">
        <div class="stat-label">Najveća pobeda</div>
        <div class="stat-value">${biggestWin.match.team1?.name || '?'} ${biggestWin.match.score1} : ${biggestWin.match.score2} ${biggestWin.match.team2?.name || '?'}</div>
        <div class="stat-detail">razlika ${biggestWin.diff} poena</div>
      </div>
      ` : ''}
      ${highestScoring ? `
      <div class="stat-card">
        <div class="stat-label">Najteža partija</div>
        <div class="stat-value">${highestScoring.match.team1?.name || '?'} ${highestScoring.match.score1} : ${highestScoring.match.score2} ${highestScoring.match.team2?.name || '?'}</div>
        <div class="stat-detail">${highestScoring.total} poena ukupno</div>
      </div>
      ` : ''}
      ${closestMatch ? `
      <div class="stat-card">
        <div class="stat-label">Najtesnija partija</div>
        <div class="stat-value">${closestMatch.match.team1?.name || '?'} ${closestMatch.match.score1} : ${closestMatch.match.score2} ${closestMatch.match.team2?.name || '?'}</div>
        <div class="stat-detail">razlika samo ${closestMatch.diff}</div>
      </div>
      ` : ''}
      ${unbeatenTeams.length > 0 ? `
      <div class="stat-card">
        <div class="stat-label">Neporaženi u grupi</div>
        <div class="stat-value">${unbeatenTeams.map(s => s.team.name).join(', ')}</div>
        <div class="stat-detail">bez poraza u grupnoj fazi</div>
      </div>
      ` : ''}
    </div>

    <div class="charts-row">
      <div class="chart-container">
        <div class="chart-title">Top 5 — Osvojeni poeni</div>
        ${top5Scored.map(([, v]) => {
          const pct = Math.round((v.scored / maxScored) * 100);
          return `
          <div class="chart-row">
            <span class="chart-label">${v.name}</span>
            <div class="chart-bar-wrap">
              <div class="chart-bar" style="width:${pct}%; background: linear-gradient(90deg,#f59e0b,#fcd34d);"></div>
              <span class="chart-bar-val">${v.scored}</span>
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="chart-container">
        <div class="chart-title">Raspodela razlike poena</div>
        <div class="histo-bars">
          ${Array.from({ length: maxDiff + 1 }, (_, d) => {
            const count = diffDist.get(d) || 0;
            const pct = Math.round((count / maxDiffCount) * 100);
            return `
            <div class="histo-col">
              <span class="histo-count">${count > 0 ? count : ''}</span>
              <div class="histo-bar" style="height:${Math.max(pct, 4)}%;"></div>
              <span class="histo-label">${d}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="histo-caption">Razlika poena između pobednika i gubitnika</div>
      </div>
    </div>

    <div class="section-title">Procenat pobeda</div>
    <div class="chart-container" style="margin-bottom:48px;">
      <div class="winrate-grid">
        ${teamsWithWinRate.map(t => {
          const deg = Math.round((t.rate / 100) * 360);
          const color = t.rate >= 60 ? '#22c55e' : t.rate >= 40 ? '#f59e0b' : '#ef4444';
          return `
          <div class="winrate-item">
            <div class="winrate-ring" style="background: conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.06) ${deg}deg);">
              <span class="winrate-pct">${t.rate}%</span>
            </div>
            <div class="winrate-name">${t.name}</div>
            <div class="winrate-sub">${t.wins}/${t.played} pobeda</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="section-title">Prvaci grupa</div>
    <div style="display:flex;gap:12px;margin-bottom:48px;flex-wrap:wrap;justify-content:center;">
      ${groupWinners.map(g => {
        const gc = groupColors[g.group] || groupColors.A;
        return `
        <div style="flex:1;min-width:160px;max-width:200px;background:${gc.bg};border:1px solid ${gc.border};border-radius:14px;padding:16px;text-align:center;">
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:${gc.text};opacity:0.6;margin-bottom:6px;">Grupa ${g.group}</div>
          <div style="font-size:18px;font-weight:800;color:${gc.text};">${g.winner}</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:4px;">${g.scored} poena &middot; ${g.points} bod.</div>
        </div>`;
      }).join('')}
    </div>

    <div class="section-title">Grupne tabele</div>
    <div class="groups-grid">
      ${groups.map(group => {
        const gc = groupColors[group] || groupColors.A;
        const standings = calculateStandings(teams, matches, group);
        const qualifyPerGroup = (tournament.team_count || teams.length) >= 24 ? 4 : (tournament.team_count || teams.length) >= 12 ? 2 : 1;
        return `
        <div class="group-card" style="background:${gc.bg};border-color:${gc.border};">
          <div class="group-header" style="background:${gc.headerBg};color:${gc.text};">Grupa ${group}</div>
          <table class="group-table">
            <thead><tr><th>Ekipa</th><th>OM</th><th>P</th><th>I</th><th>D:P</th><th>+/-</th><th>Bod</th></tr></thead>
            <tbody>
              ${standings.map((s, i) => `
                <tr class="${i < qualifyPerGroup ? 'qualified' : ''}">
                  <td>${s.team.name}</td>
                  <td>${s.played}</td>
                  <td style="color:#4ade80">${s.wins}</td>
                  <td style="color:#f87171">${s.losses}</td>
                  <td>${s.scored}:${s.conceded}</td>
                  <td style="color:${s.diff > 0 ? '#4ade80' : s.diff < 0 ? '#f87171' : 'rgba(255,255,255,0.4)'}">${s.diff > 0 ? '+' : ''}${s.diff}</td>
                  <td style="font-weight:700">${s.points}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      }).join('')}
    </div>

    ${elimMatches.length > 0 ? `
    <div class="section-title">Eliminaciona faza</div>
    <div class="elim-section">
      ${elimMatches.map(phase => `
        <div class="elim-phase">
          <div class="elim-phase-title">${phase.label}</div>
          <div class="elim-matches">
            ${phase.matches.filter(m => m.status === 'finished').map(m => {
              const t1Win = (m.score1 ?? 0) > (m.score2 ?? 0);
              return `
              <div class="elim-match">
                <div class="elim-team ${t1Win ? 'winner' : 'loser'}"><span>${m.team1?.name || '?'}</span><span class="elim-score">${m.score1 ?? '-'}</span></div>
                <div class="elim-team ${!t1Win ? 'winner' : 'loser'}"><span>${m.team2?.name || '?'}</span><span class="elim-score">${m.score2 ?? '-'}</span></div>
              </div>`;
            }).join('')}
          </div>
        </div>`).join('')}
    </div>
    ` : ''}

    <div class="section-title">Sve grupne partije</div>
    <div class="all-matches-grid">
      ${groups.map(group => {
        return matches.filter(m => m.phase === 'group' && m.group_label === group && m.status === 'finished').map(m => {
          const t1Win = (m.score1 ?? 0) > (m.score2 ?? 0);
          const t2Win = (m.score2 ?? 0) > (m.score1 ?? 0);
          return `
          <div class="mini-match">
            <div class="mini-match-teams">
              <span class="mini-match-team ${t1Win ? 'w' : ''}">${m.team1?.name || '?'}</span>
              <span class="mini-match-team ${t2Win ? 'w' : ''}">${m.team2?.name || '?'}</span>
            </div>
            <span class="mini-match-score">${m.score1} : ${m.score2}</span>
          </div>`;
        }).join('');
      }).join('')}
    </div>

    <div class="footer">&spades; &hearts; &diams; &clubs; &middot; Turnir Bela</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
