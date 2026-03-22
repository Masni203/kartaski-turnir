export type TournamentStatus = 'draft' | 'group_phase' | 'elimination' | 'finished';
export type MatchPhase = 'group' | 'round_of_16' | 'quarterfinal' | 'semifinal' | 'final';
export type MatchStatus = 'pending' | 'in_progress' | 'finished';

export interface Tournament {
  id: string;
  name: string;
  team_count: number;
  status: TournamentStatus;
  created_at: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  name: string;
  group_label: string | null;
}

export interface Match {
  id: string;
  tournament_id: string;
  phase: MatchPhase;
  group_label: string | null;
  team1_id: string | null;
  team2_id: string | null;
  score1: number | null;
  score2: number | null;
  status: MatchStatus;
  round: number;
  bracket_position: number | null;
  created_at: string;
  team1?: Team;
  team2?: Team;
}

export interface Standing {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  scored: number;
  conceded: number;
  diff: number;
  points: number;
}

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: Tournament;
        Insert: Omit<Tournament, 'id' | 'created_at'>;
        Update: Partial<Omit<Tournament, 'id' | 'created_at'>>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, 'id'>;
        Update: Partial<Omit<Team, 'id'>>;
      };
      matches: {
        Row: Match;
        Insert: Omit<Match, 'id' | 'created_at'>;
        Update: Partial<Omit<Match, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
