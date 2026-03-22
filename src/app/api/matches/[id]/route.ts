import { NextRequest, NextResponse } from 'next/server';
import { updateMatchScore, advanceWinner, resetMatch } from '@/lib/tournament';
import type { Match } from '@/lib/types';

// PUT /api/matches/[id] — update match score
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { score1, score2, status: matchStatus } = body;

  // Reset match
  if (matchStatus === 'pending') {
    try {
      const match = await resetMatch(id);
      return NextResponse.json({ match });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Greska pri resetovanju meca';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (score1 === undefined || score2 === undefined) {
    return NextResponse.json({ error: 'Rezultat je obavezan' }, { status: 400 });
  }

  if (matchStatus === 'finished' && score1 === score2) {
    return NextResponse.json({ error: 'Mec ne moze zavrsiti nerijeseno' }, { status: 400 });
  }

  try {
    const match = await updateMatchScore(id, score1, score2, matchStatus || 'finished') as Match;

    // Auto-advance winner in elimination phase
    if (matchStatus === 'finished' && match.phase !== 'group') {
      const result = await advanceWinner(id);
      return NextResponse.json({ match, ...result });
    }

    return NextResponse.json({ match });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greska pri azuriranju rezultata';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
