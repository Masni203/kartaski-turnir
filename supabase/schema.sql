-- Kartaski Turnir Database Schema

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Tournaments table
create table tournaments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  team_count integer,
  status text not null default 'draft' check (status in ('draft', 'group_phase', 'elimination', 'finished')),
  created_at timestamptz not null default now()
);

-- Teams table
create table teams (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  group_label text
);

-- Matches table
create table matches (
  id uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  phase text not null check (phase in ('group', 'round_of_16', 'quarterfinal', 'semifinal', 'final')),
  group_label text,
  team1_id uuid references teams(id),
  team2_id uuid references teams(id),
  score1 integer,
  score2 integer,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'finished')),
  round integer not null default 1,
  bracket_position integer,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_teams_tournament on teams(tournament_id);
create index idx_teams_group on teams(tournament_id, group_label);
create index idx_matches_tournament on matches(tournament_id);
create index idx_matches_phase on matches(tournament_id, phase);

-- Enable Realtime
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table tournaments;

-- Row Level Security (allow all for now - no auth required)
alter table tournaments enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;

create policy "Allow all on tournaments" on tournaments for all using (true) with check (true);
create policy "Allow all on teams" on teams for all using (true) with check (true);
create policy "Allow all on matches" on matches for all using (true) with check (true);
