import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { discoverUserAgents } from '@/lib/sigma-agents';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/sigma/agents
 *
 * The workbook agents the signed-in embed user can reach in Sigma, discovered
 * as that user (impersonated REST token) — see lib/sigma-agents.js. The
 * identity is the same sigmaEmail the embed JWT uses, never a client param.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = user.publicMetadata?.sigmaEmail || user.emailAddresses[0]?.emailAddress;
  try {
    const agents = await discoverUserAgents(email);
    return NextResponse.json({ email, agents }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[/api/sigma/agents]', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
