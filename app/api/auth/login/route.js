import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session';

// Demo users — in a real app these would come from a database or identity provider.
// Passwords here are plaintext for demo purposes only.
const DEMO_USERS = [
  {
    email: 'mark.oldfield@sigmacomputing.com',
    password: '3145n!',
    name: 'Mark Oldfield',
  },
];

export async function POST(request) {
  const { email, password } = await request.json();

  const user = DEMO_USERS.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const sessionToken = await createSession(user);

  const response = NextResponse.json({
    success: true,
    user: { email: user.email, name: user.name },
  });

  response.cookies.set('session', sessionToken, {
    httpOnly: true,                                    // Not accessible via JS
    secure: process.env.NODE_ENV === 'production',     // HTTPS only in prod
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,                               // 8 hours
    path: '/',
  });

  return response;
}
