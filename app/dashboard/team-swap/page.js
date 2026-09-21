import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { generateSigmaEmbedUrl } from '@/lib/sigma-embed';
import { resolveMenuState, menuStateUrlParams } from '@/lib/embed-url-params';
import { listWorkbooksInWorkspace, resolveMemberByEmail } from '@/lib/sigma-api';
import { getSwapTeam } from '@/lib/teams';
import TeamSwapView from '@/components/TeamSwapView';

// A fresh JWT is signed per request, carrying whichever team is selected.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TeamSwapPage({ searchParams }) {
  const { team: slug, urlId, menu, pos } = await searchParams;
  const team = getSwapTeam(slug);
  const menuState = resolveMenuState({ menu, pos });

  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const meta = user.publicMetadata ?? {};
  const sigmaEmail = meta.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  if (!team) {
    return <TeamSwapView team={null} sigmaEmail={sigmaEmail} menuState={menuState} />;
  }

  let files = null;
  let member = null;
  let error = null;

  try {
    // Resolved live rather than configured, so re-copying/adding workbooks
    // doesn't strand this page on stale ids. Same list the sidebar fetches
    // independently (it can't see this page's props — see the note in
    // app/api/sigma/team-files/route.js) — doubles as validating that urlId
    // actually belongs to this team's workspace, not just an arbitrary id.
    [files, member] = await Promise.all([
      listWorkbooksInWorkspace(team.name),
      resolveMemberByEmail(sigmaEmail),
    ]);
  } catch (err) {
    error = err.message;
  }

  // Team picked, no file yet — show the picker state, no embed. This is the
  // normal resting state after switching teams, not an error.
  if (!urlId && !error) {
    return (
      <TeamSwapView
        team={team}
        sigmaEmail={sigmaEmail}
        memberType={member?.memberType ?? null}
        menuState={menuState}
      />
    );
  }

  const found = urlId ? files?.find((f) => f.urlId === urlId) ?? null : null;
  const workbook = found ? { ...found, workspace: team.name } : null;
  if (urlId && !workbook && !error) {
    error = `"${urlId}" isn't a file in the "${team.name}" workspace.`;
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
        urlParams: menuStateUrlParams(menuState),
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
      menuState={menuState}
    />
  );
}
