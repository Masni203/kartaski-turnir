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
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'Ime turnira je obavezno' }, { status: 400 });
  }

  try {
    const tournament = await createTournament(name);
    return NextResponse.json(tournament, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greska pri kreiranju turnira';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
