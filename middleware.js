import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

// Runs on the Edge runtime — jose is compatible, node-only libs are not.
const getSecret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

export async function middleware(request) {
  const token = request.cookies.get('session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    // Token invalid or expired — clear the cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }
}

// Only protect /dashboard and any future sub-routes under it
export const config = {
  matcher: ['/dashboard/:path*'],
};
