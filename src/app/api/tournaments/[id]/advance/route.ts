import { NextRequest, NextResponse } from 'next/server';
import { generateEliminationBracket } from '@/lib/tournament';

// POST /api/tournaments/[id]/advance — advance to elimination phase
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await generateEliminationBracket(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greska pri prelasku u eliminacije';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
