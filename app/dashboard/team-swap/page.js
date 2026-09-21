import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { MENU_BAR_TOP } from '@/lib/embed-url-params';
import { findWorkbookInWorkspace, resolveMemberByEmail } from '@/lib/sigma-api';
import { getSwapTeam } from '@/lib/teams';
import TeamSwapView from '@/components/TeamSwapView';

// A fresh JWT is signed per request, carrying whichever team is selected.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TeamSwapPage({ searchParams }) {
  const { team: slug } = await searchParams;
  const team = getSwapTeam(slug);

  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const meta = user.publicMetadata ?? {};
  const sigmaEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  if (!team) {
    return <TeamSwapView team={null} sigmaEmail={sigmaEmail} />;
  }

  let workbook = null;
  let member = null;
  let error = null;

  try {
    // Resolved live rather than configured, so re-copying the workbooks doesn't
    // strand this page on stale ids.
    [workbook, member] = await Promise.all([
      findWorkbookInWorkspace(team.name),
      resolveMemberByEmail(sigmaEmail),
    ]);
    if (!workbook) {
      error = `No workbook found in the "${team.name}" workspace.`;
    }
  } catch (err) {
    error = err.message;
  }

  let embedData = null;
  if (workbook && !error) {
    try {
      embedData = await generateSigmaEmbedUrl({
        email: sigmaEmail,
        accountType: meta.accountType,
        // Deliberately OVERRIDES Clerk publicMetadata.teams — swapping this one
        // claim, and watching content access follow, is the whole point here.
        teams: [team.name],
        // No user attributes: these workbooks don't do attribute-driven RLS, and
        // sending Clerk's embed_region would put a claim in the inspector that
        // isn't doing any work — easy to mistake for the thing granting access.
        userAttributes: {},
        urlId: workbook.urlId,
        // Show the workbook menu bar at the top, matching the internal-user
        // legacy example.
        urlParams: MENU_BAR_TOP,
      });
    } catch (err) {
      error = err.message;
    }
  }

  return (
    <TeamSwapView
      team={team}
      workbook={workbook}
      embedData={embedData}
      sigmaEmail={sigmaEmail}
      memberType={member?.memberType ?? null}
      error={error}
    />
  );
}
