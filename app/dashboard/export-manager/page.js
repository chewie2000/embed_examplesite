'use client';

import { useEffect } from 'react';
import ConceptDemoPage from '@/components/ConceptDemoPage';
import ExportManager from '@/components/ExportManager';
import { useDashboardChrome } from '@/lib/dashboard-context';

/**
 * Export Manager — headless (no workbook embedded). Lets the signed-in embed
 * user create and manage exports of the workbooks they can reach: scheduled
 * email exports (create / pause / resume / delete) and one-off downloads.
 * See components/ExportManager.js and app/api/sigma/export*.
 */
export default function ExportManagerPage() {
  const { setPageTitle } = useDashboardChrome();
  useEffect(() => { setPageTitle('Export Manager'); }, [setPageTitle]);

  return (
    <ConceptDemoPage
      badge={{ text: 'Exports API', tone: 'beta' }}
      title="Export Manager"
      description="Create and manage exports of the workbooks you can reach: schedule recurring email exports, pause or delete them later, or download a one-off export. Sigma generates the files, and this page is the management UI embed users don't get inside Sigma itself."
      docs={[
        { label: 'Send or schedule workbook exports', href: 'https://help.sigmacomputing.com/docs/send-or-schedule-workbook-exports' },
        { label: 'API: add workbook schedule', href: 'https://help.sigmacomputing.com/reference/post-workbook-schedule' },
        { label: 'API: export data from a workbook', href: 'https://help.sigmacomputing.com/reference/export-workbook' },
      ]}
    >
      <ExportManager />
    </ConceptDemoPage>
  );
}
