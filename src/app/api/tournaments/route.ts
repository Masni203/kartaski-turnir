import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createTournament } from '@/lib/tournament';

// GET /api/tournaments — list all tournaments
export async function GET() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tournaments — create new tournament
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, teamCount } = body;

  if (!name || !teamCount) {
    return NextResponse.json({ error: 'Ime i broj ekipa su obavezni' }, { status: 400 });
  }

  if (![8, 12, 16, 24, 32].includes(teamCount)) {
    return NextResponse.json({ error: 'Broj ekipa mora biti 8, 12, 16, 24 ili 32' }, { status: 400 });
  }

  try {
    const tournament = await createTournament(name, teamCount);
    return NextResponse.json(tournament, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greska pri kreiranju turnira';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
