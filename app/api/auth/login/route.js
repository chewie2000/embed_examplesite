import { NextResponse } from 'next/server';
import { createSession } from '@/lib/session';

// Demo user — credentials are set via environment variables (DEMO_USER_EMAIL, DEMO_USER_PASSWORD, DEMO_USER_NAME).
// DEMO_USER_SIGMA_EMAIL overrides the email used in the Sigma JWT sub claim (defaults to login email).
// In a real app these would come from a database or identity provider.
const DEMO_USERS = [
  {
    email: process.env.DEMO_USER_EMAIL,
    password: process.env.DEMO_USER_PASSWORD,
    name: process.env.DEMO_USER_NAME || 'Demo User',
    sigmaEmail: process.env.DEMO_USER_SIGMA_EMAIL || process.env.DEMO_USER_EMAIL,
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
