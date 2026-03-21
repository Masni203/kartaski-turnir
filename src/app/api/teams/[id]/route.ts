import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PUT /api/teams/[id] — rename team
export async function PUT(
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
    const { data, error } = await supabase
      .from('teams')
      .update({ name })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greska pri izmeni ekipe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/teams/[id] — delete team
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Greska pri brisanju ekipe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
