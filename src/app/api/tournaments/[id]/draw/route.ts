import { NextRequest, NextResponse } from 'next/server';
import { drawGroups } from '@/lib/tournament';

// POST /api/tournaments/[id]/draw — perform group draw
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const result = await drawGroups(id);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greska pri zrebu';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
