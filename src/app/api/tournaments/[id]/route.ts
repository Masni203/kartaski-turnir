import { NextRequest, NextResponse } from 'next/server';
import { getTournamentData } from '@/lib/tournament';

// GET /api/tournaments/[id] — get full tournament data
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await getTournamentData(id);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Turnir nije pronadjen';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
