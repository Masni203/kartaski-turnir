import { supabase } from './supabase';
import type { Match, MatchPhase, Standing, Team } from './types';

// Shuffle array using Fisher-Yates algorithm
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Always 4 groups (A, B, C, D)
function getGroupLabels(): string[] {
  return ['A', 'B', 'C', 'D'];
}

// Create a new tournament (just a name, teams added later)
export async function createTournament(name: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({ name, team_count: null, status: 'draft' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Add a team to a tournament
export async function addTeam(tournamentId: string, teamName: string) {
  const { data, error } = await supabase
    .from('teams')
    .insert({ tournament_id: tournamentId, name: teamName, group_label: null })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Draw groups — randomly assign teams to groups of 4
export async function drawGroups(tournamentId: string) {
  // Get tournament info
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (tErr) throw tErr;

  // Guard: only allow draw in draft status
  if (tournament.status !== 'draft') {
    throw new Error('Zreb je vec obavljen — turnir nije u draft fazi');
  }

  // Get all teams
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId);

  if (teamsErr) throw teamsErr;
  if (!teams || teams.length < 8) {
    throw new Error(`Minimum 8 ekipa za zreb. Trenutno: ${teams?.length || 0}`);
  }
  if (teams.length > 40) {
    throw new Error(`Maksimum 40 ekipa. Trenutno: ${teams.length}`);
  }

  // Set team_count now that we know the final number
  await supabase
    .from('tournaments')
    .update({ team_count: teams.length })
    .eq('id', tournamentId);

  const shuffled = shuffle(teams);
  const groups = getGroupLabels();
  const n = shuffled.length;

  // Distribute teams evenly: first (n % 4) groups get ceil(n/4), rest get floor(n/4)
  const base = Math.floor(n / 4);
  const extra = n % 4;
  const groupSizes = groups.map((_, i) => base + (i < extra ? 1 : 0));

  // Assign groups
  const updates: { id: string; group_label: string }[] = [];
  let idx = 0;
  for (let g = 0; g < groups.length; g++) {
    for (let t = 0; t < groupSizes[g]; t++) {
      updates.push({ id: shuffled[idx].id, group_label: groups[g] });
      shuffled[idx] = { ...shuffled[idx], group_label: groups[g] };
      idx++;
    }
  }

  for (const update of updates) {
    const { error } = await supabase
      .from('teams')
      .update({ group_label: update.group_label })
      .eq('id', update.id);
    if (error) throw error;
  }

  // Generate round-robin matches for each group
  await generateGroupMatches(tournamentId, groups, shuffled);

  // Update tournament status
  await supabase
    .from('tournaments')
    .update({ status: 'group_phase' })
    .eq('id', tournamentId);

  return { groups, teams: shuffled };
}

// Generate round-robin matches within each group
async function generateGroupMatches(
  tournamentId: string,
  groups: string[],
  teams: Team[]
) {
  const matches: Omit<Match, 'id' | 'created_at' | 'team1' | 'team2'>[] = [];

  for (const group of groups) {
    const groupTeams = teams.filter(t => t.group_label === group);
    let round = 1;

    // Round-robin: each team plays against every other team in the group
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        matches.push({
          tournament_id: tournamentId,
          phase: 'group',
          group_label: group,
          team1_id: groupTeams[i].id,
          team2_id: groupTeams[j].id,
          score1: null,
          score2: null,
          status: 'pending',
          round: round++,
          bracket_position: null,
        });
      }
    }
  }

  const { error } = await supabase.from('matches').insert(matches);
  if (error) throw error;
}

// Calculate standings for a group
export async function calculateStandings(
  tournamentId: string,
  groupLabel: string
): Promise<Standing[]> {
  // Get teams in this group
  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('group_label', groupLabel);

  if (tErr) throw tErr;
  if (!teams) return [];

  // Get finished matches in this group
  const { data: matches, error: mErr } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('phase', 'group')
    .eq('group_label', groupLabel)
    .eq('status', 'finished');

  if (mErr) throw mErr;

  const standingsMap = new Map<string, Standing>();

  for (const team of teams) {
    standingsMap.set(team.id, {
      team,
      played: 0,
      wins: 0,
      losses: 0,
      scored: 0,
      conceded: 0,
      diff: 0,
      points: 0,
    });
  }

  for (const match of matches || []) {
    if (match.score1 === null || match.score2 === null) continue;
    if (!match.team1_id || !match.team2_id) continue;

    const s1 = standingsMap.get(match.team1_id);
    const s2 = standingsMap.get(match.team2_id);
    if (!s1 || !s2) continue;

    s1.played++;
    s2.played++;
    s1.scored += match.score1;
    s1.conceded += match.score2;
    s2.scored += match.score2;
    s2.conceded += match.score1;

    if (match.score1 > match.score2) {
      s1.wins++;
      s1.points += 2;
      s2.losses++;
    } else if (match.score1 < match.score2) {
      s2.wins++;
      s2.points += 2;
      s1.losses++;
    }
  }

  // Calculate diff and sort
  const standings = Array.from(standingsMap.values());
  for (const s of standings) {
    s.diff = s.scored - s.conceded;
  }

  // Head-to-head tiebreaker: returns 1 if teamA beat teamB, -1 if lost, 0 if no result
  function getHeadToHeadResult(teamAId: string, teamBId: string): number {
    if (!matches) return 0;
    for (const m of matches) {
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

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return getHeadToHeadResult(b.team.id, a.team.id);
  });

  return standings;
}

// Get elimination phase name based on team count
function getEliminationPhase(totalQualified: number): MatchPhase {
  if (totalQualified >= 16) return 'round_of_16';
  if (totalQualified >= 8) return 'quarterfinal';
  if (totalQualified >= 4) return 'semifinal';
  return 'final';
}

// Get next phase
function getNextPhase(phase: MatchPhase): MatchPhase | null {
  const order: MatchPhase[] = ['round_of_16', 'quarterfinal', 'semifinal', 'final'];
  const idx = order.indexOf(phase);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
}

// Generate elimination bracket from group stage results
export async function generateEliminationBracket(tournamentId: string) {
  const { data: tournament, error: tErr } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (tErr) throw tErr;

  // Guard: only allow advance from group_phase
  if (tournament.status !== 'group_phase') {
    throw new Error('Turnir nije u grupnoj fazi — eliminacije su vec generisane ili turnir nije poceo');
  }

  // Guard: check if elimination matches already exist
  const { data: existingElim, error: eErr } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .neq('phase', 'group')
    .limit(1);

  if (eErr) throw eErr;
  if (existingElim && existingElim.length > 0) {
    throw new Error('Eliminacioni mecevi vec postoje');
  }

  const groups = getGroupLabels();
  const teamCount = tournament.team_count;

  // Verify ALL group matches are finished before advancing
  const { data: unfinishedMatches, error: umErr } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('phase', 'group')
    .neq('status', 'finished');

  if (umErr) throw umErr;
  if (unfinishedMatches && unfinishedMatches.length > 0) {
    throw new Error(`Nije moguce napredovati — ${unfinishedMatches.length} grupnih meceva jos nije zavrseno`);
  }

  // Determine how many qualify from each group
  let qualifyPerGroup: number;
  let firstPhase: MatchPhase;
  if (teamCount >= 24) {
    qualifyPerGroup = 4;
    firstPhase = 'round_of_16';
  } else if (teamCount >= 12) {
    qualifyPerGroup = 2;
    firstPhase = 'quarterfinal';
  } else {
    qualifyPerGroup = 1;
    firstPhase = 'semifinal';
  }

  const qualifiedTeams: { team: Team; groupPosition: number; groupLabel: string }[] = [];

  for (const group of groups) {
    const standings = await calculateStandings(tournamentId, group);
    if (standings.length < qualifyPerGroup) {
      throw new Error(`Grupa ${group} nema dovoljno zavrsenih meceva`);
    }
    for (let p = 0; p < qualifyPerGroup; p++) {
      qualifiedTeams.push(
        { team: standings[p].team, groupPosition: p + 1, groupLabel: group }
      );
    }
  }

  const matches: Omit<Match, 'id' | 'created_at' | 'team1' | 'team2'>[] = [];

  if (firstPhase === 'round_of_16') {
    // 16 teams: A1vD4, B2vC3, C1vB4, D2vA3, A2vD3, B1vC4, C2vB3, D1vA4
    const pairings: [string, number, string, number][] = [
      ['A', 1, 'D', 4], ['B', 2, 'C', 3], ['C', 1, 'B', 4], ['D', 2, 'A', 3],
      ['A', 2, 'D', 3], ['B', 1, 'C', 4], ['C', 2, 'B', 3], ['D', 1, 'A', 4],
    ];
    for (let i = 0; i < pairings.length; i++) {
      const [g1, p1, g2, p2] = pairings[i];
      const t1 = qualifiedTeams.find(t => t.groupLabel === g1 && t.groupPosition === p1);
      const t2 = qualifiedTeams.find(t => t.groupLabel === g2 && t.groupPosition === p2);
      matches.push({
        tournament_id: tournamentId,
        phase: firstPhase,
        group_label: null,
        team1_id: t1!.team.id,
        team2_id: t2!.team.id,
        score1: null,
        score2: null,
        status: 'pending',
        round: 1,
        bracket_position: i + 1,
      });
    }
  } else if (firstPhase === 'quarterfinal') {
    // 8 teams: A1vD2, B1vC2, C1vB2, D1vA2
    const pairings: [string, number, string, number][] = [
      ['A', 1, 'D', 2], ['B', 1, 'C', 2], ['C', 1, 'B', 2], ['D', 1, 'A', 2],
    ];
    for (let i = 0; i < pairings.length; i++) {
      const [g1, p1, g2, p2] = pairings[i];
      const t1 = qualifiedTeams.find(t => t.groupLabel === g1 && t.groupPosition === p1);
      const t2 = qualifiedTeams.find(t => t.groupLabel === g2 && t.groupPosition === p2);
      matches.push({
        tournament_id: tournamentId,
        phase: firstPhase,
        group_label: null,
        team1_id: t1!.team.id,
        team2_id: t2!.team.id,
        score1: null,
        score2: null,
        status: 'pending',
        round: 1,
        bracket_position: i + 1,
      });
    }
  } else {
    // 4 teams (semifinal): A1vC1, B1vD1
    const pairings: [string, string][] = [['A', 'C'], ['B', 'D']];
    for (let i = 0; i < pairings.length; i++) {
      const [g1, g2] = pairings[i];
      const t1 = qualifiedTeams.find(t => t.groupLabel === g1 && t.groupPosition === 1);
      const t2 = qualifiedTeams.find(t => t.groupLabel === g2 && t.groupPosition === 1);
      matches.push({
        tournament_id: tournamentId,
        phase: firstPhase,
        group_label: null,
        team1_id: t1!.team.id,
        team2_id: t2!.team.id,
        score1: null,
        score2: null,
        status: 'pending',
        round: 1,
        bracket_position: i + 1,
      });
    }
  }

  // Also create placeholder matches for subsequent rounds
  let currentPhase = getNextPhase(firstPhase);
  let matchesInRound = matches.length / 2;
  let round = 2;

  while (currentPhase) {
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        tournament_id: tournamentId,
        phase: currentPhase,
        group_label: null,
        team1_id: null,
        team2_id: null,
        score1: null,
        score2: null,
        status: 'pending',
        round,
        bracket_position: i + 1,
      });
    }
    currentPhase = getNextPhase(currentPhase);
    matchesInRound = Math.max(1, matchesInRound / 2);
    round++;
  }

  const { error } = await supabase.from('matches').insert(matches);
  if (error) throw error;

  // Update tournament status
  await supabase
    .from('tournaments')
    .update({ status: 'elimination' })
    .eq('id', tournamentId);
}

// Advance winner of a match to the next round
export async function advanceWinner(matchId: string) {
  const { data: match, error: mErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (mErr) throw mErr;
  if (match.status !== 'finished' || match.score1 === null || match.score2 === null) {
    throw new Error('Mec nije zavrsen');
  }
  if (match.score1 === match.score2) {
    throw new Error('Eliminacioni mec ne moze zavrsiti nerijeseno');
  }

  const winnerId = match.score1 > match.score2 ? match.team1_id : match.team2_id;
  const nextPhase = getNextPhase(match.phase);

  if (!nextPhase) {
    // This was the final — tournament is finished
    await supabase
      .from('tournaments')
      .update({ status: 'finished' })
      .eq('id', match.tournament_id);
    return { winnerId, isFinal: true };
  }

  // Find the next round match to place the winner
  const nextPosition = Math.ceil(match.bracket_position! / 2);

  const { data: nextMatches, error: nErr } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', match.tournament_id)
    .eq('phase', nextPhase)
    .eq('bracket_position', nextPosition);

  if (nErr) throw nErr;
  if (!nextMatches || nextMatches.length === 0) {
    throw new Error('Nema sljedeceg meca u bracketu');
  }

  const nextMatch = nextMatches[0];
  // If bracket_position is odd, winner goes to team1; if even, team2
  const isTeam1Slot = match.bracket_position! % 2 === 1;

  // Idempotency: check if winner is already placed in the correct slot
  const currentSlotValue = isTeam1Slot ? nextMatch.team1_id : nextMatch.team2_id;
  if (currentSlotValue === winnerId) {
    return { winnerId, isFinal: false };
  }

  const { error: updateErr } = await supabase
    .from('matches')
    .update(isTeam1Slot ? { team1_id: winnerId } : { team2_id: winnerId })
    .eq('id', nextMatch.id);

  if (updateErr) throw updateErr;
  return { winnerId, isFinal: false };
}

// Reset match to pending (cascade: remove winner from next bracket match)
export async function resetMatch(matchId: string) {
  const { data: match, error: fetchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (fetchErr) throw fetchErr;

  // For elimination matches, remove the winner from the next round
  if (match.phase !== 'group' && match.bracket_position) {
    const nextPhase = getNextPhase(match.phase);
    if (nextPhase) {
      const nextPosition = Math.ceil(match.bracket_position / 2);
      const isTeam1Slot = match.bracket_position % 2 === 1;

      const { data: nextMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', match.tournament_id)
        .eq('phase', nextPhase)
        .eq('bracket_position', nextPosition);

      if (nextMatches && nextMatches.length > 0) {
        const nextMatch = nextMatches[0];

        // Only clear if the next match hasn't been played yet
        if (nextMatch.status !== 'finished') {
          // Recursively reset the next match first if it has scores
          if (nextMatch.status === 'in_progress' || nextMatch.score1 !== null) {
            await resetMatch(nextMatch.id);
          }

          await supabase
            .from('matches')
            .update(isTeam1Slot ? { team1_id: null } : { team2_id: null })
            .eq('id', nextMatch.id);
        } else {
          throw new Error('Ne mozete resetovati mec ciji pobjednik je vec odigrao sljedeci mec');
        }
      }
    }

    // If tournament was marked finished (final was reset), revert to elimination
    if (match.phase === 'final') {
      await supabase
        .from('tournaments')
        .update({ status: 'elimination' })
        .eq('id', match.tournament_id);
    }
  }

  const { data, error } = await supabase
    .from('matches')
    .update({ score1: null, score2: null, status: 'pending' })
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update match score
export async function updateMatchScore(
  matchId: string,
  score1: number,
  score2: number,
  status: 'in_progress' | 'finished' = 'finished'
) {
  const { data, error } = await supabase
    .from('matches')
    .update({ score1, score2, status })
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Get all tournament data (tournament + teams + matches)
export async function getTournamentData(tournamentId: string) {
  const [tournamentRes, teamsRes, matchesRes] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
    supabase.from('teams').select('*').eq('tournament_id', tournamentId),
    supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('round').order('bracket_position'),
  ]);

  if (tournamentRes.error) throw tournamentRes.error;

  const teams = teamsRes.data || [];
  const teamsMap = new Map(teams.map(t => [t.id, t]));

  const matches = (matchesRes.data || []).map(m => ({
    ...m,
    team1: m.team1_id ? teamsMap.get(m.team1_id) : undefined,
    team2: m.team2_id ? teamsMap.get(m.team2_id) : undefined,
  }));

  return {
    tournament: tournamentRes.data,
    teams,
    matches,
  };
}
