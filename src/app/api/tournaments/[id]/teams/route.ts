import { NextRequest, NextResponse } from 'next/server';
import { addTeam } from '@/lib/tournament';

// POST /api/tournaments/[id]/teams — add a team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name } = body;

  if (!name) {
    return NextResponse.json({ error: 'Ime ekipe je obavezno' }, { status: 400 });
  }

  try {
    const team = await addTeam(id, name);
    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greska pri dodavanju ekipe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
