import { NextRequest, NextResponse } from 'next/server';
import { getTournamentData } from '@/lib/tournament';
import { supabase } from '@/lib/supabase';

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

// DELETE /api/tournaments/[id] — delete tournament and all related data
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greska pri brisanju turnira';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
