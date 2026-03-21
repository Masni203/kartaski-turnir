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

// Get group labels based on team count (always 4 per group)
function getGroupLabels(teamCount: number): string[] {
  const groupCount = teamCount / 4;
  return Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));
}

// Create a new tournament
export async function createTournament(name: string, teamCount: number) {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({ name, team_count: teamCount, status: 'draft' })
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

  // Get all teams
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('*')
    .eq('tournament_id', tournamentId);

  if (teamsErr) throw teamsErr;
  if (!teams || teams.length !== tournament.team_count) {
    throw new Error(`Trebate tacno ${tournament.team_count} ekipa za zreb. Trenutno: ${teams?.length || 0}`);
  }

  const shuffled = shuffle(teams);
  const groups = getGroupLabels(tournament.team_count);
  const teamsPerGroup = 4;

  // Assign groups
  const updates = shuffled.map((team, index) => ({
    id: team.id,
    group_label: groups[Math.floor(index / teamsPerGroup)],
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('teams')
      .update({ group_label: update.group_label })
      .eq('id', update.id);
    if (error) throw error;
  }

  // Generate round-robin matches for each group
  await generateGroupMatches(tournamentId, groups, shuffled, teamsPerGroup);

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
  teams: Team[],
  teamsPerGroup: number
) {
  const matches: Omit<Match, 'id' | 'created_at' | 'team1' | 'team2'>[] = [];

  for (let g = 0; g < groups.length; g++) {
    const groupTeams = teams.slice(g * teamsPerGroup, (g + 1) * teamsPerGroup);
    let round = 1;

    // Round-robin: each team plays against every other team in the group
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        matches.push({
          tournament_id: tournamentId,
          phase: 'group',
          group_label: groups[g],
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
      draws: 0,
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
      s1.points += 3;
      s2.losses++;
    } else if (match.score1 < match.score2) {
      s2.wins++;
      s2.points += 3;
      s1.losses++;
    } else {
      s1.draws++;
      s2.draws++;
      s1.points += 1;
      s2.points += 1;
    }
  }

  // Calculate diff and sort
  const standings = Array.from(standingsMap.values());
  for (const s of standings) {
    s.diff = s.scored - s.conceded;
  }

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return b.scored - a.scored;
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

  const groups = getGroupLabels(tournament.team_count);
  const qualifiedTeams: { team: Team; groupPosition: number; groupLabel: string }[] = [];

  // Get top 2 from each group
  for (const group of groups) {
    const standings = await calculateStandings(tournamentId, group);
    if (standings.length < 2) {
      throw new Error(`Grupa ${group} nema dovoljno zavrsenih meceva`);
    }
    qualifiedTeams.push(
      { team: standings[0].team, groupPosition: 1, groupLabel: group },
      { team: standings[1].team, groupPosition: 2, groupLabel: group }
    );
  }

  const totalQualified = qualifiedTeams.length;
  const firstPhase = getEliminationPhase(totalQualified);

  // Create matchups: 1st of group A vs 2nd of group B, etc.
  const matches: Omit<Match, 'id' | 'created_at' | 'team1' | 'team2'>[] = [];
  const firsts = qualifiedTeams.filter(t => t.groupPosition === 1);
  const seconds = qualifiedTeams.filter(t => t.groupPosition === 2);

  // Cross-match: 1st from group[i] vs 2nd from group[groups.length - 1 - i]
  for (let i = 0; i < firsts.length; i++) {
    const opponent = seconds[seconds.length - 1 - i];
    matches.push({
      tournament_id: tournamentId,
      phase: firstPhase,
      group_label: null,
      team1_id: firsts[i].team.id,
      team2_id: opponent.team.id,
      score1: null,
      score2: null,
      status: 'pending',
      round: 1,
      bracket_position: i + 1,
    });
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

  const { error: updateErr } = await supabase
    .from('matches')
    .update(isTeam1Slot ? { team1_id: winnerId } : { team2_id: winnerId })
    .eq('id', nextMatch.id);

  if (updateErr) throw updateErr;
  return { winnerId, isFinal: false };
}

// Reset match to pending
export async function resetMatch(matchId: string) {
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
