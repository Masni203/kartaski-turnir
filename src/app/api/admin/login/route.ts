import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin lozinka nije konfigurisana' }, { status: 500 });
  }

  if (password === adminPassword) {
    // Return a simple token (hash of password + secret)
    const token = Buffer.from(`admin:${adminPassword}:${Date.now()}`).toString('base64');
    return NextResponse.json({ token });
  }

  return NextResponse.json({ error: 'Pogresna lozinka' }, { status: 401 });
}
