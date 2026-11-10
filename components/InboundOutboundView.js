'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SigmaEmbed from './SigmaEmbed';
import ConceptDemoPage from './ConceptDemoPage';
import { useDashboardChrome } from '@/lib/dashboard-context';
import { CONTROL_ID, OUTBOUND_EVENT, SAFE_CONTROL_VALUE, SAMPLE_CUSTOMERS } from '@/lib/inbound-outbound';

const TITLE = 'Inbound/Outbound';

const DOCS = [
  { label: 'Inbound & outbound events in embeds', href: 'https://help.sigmacomputing.com/docs/inbound-and-outbound-events-in-embeds' },
  { label: 'Outbound event reference', href: 'https://help.sigmacomputing.com/docs/outbound-event-reference' },
  { label: 'Generate iframe event action', href: 'https://help.sigmacomputing.com/docs/create-actions-that-trigger-embed-iframe-events' },
  { label: 'Control values in the URL', href: 'https://help.sigmacomputing.com/docs/workbook-control-values-in-the-url' },
];

const DESCRIPTION =
  "Two-way communication between this page and an embedded Sigma workbook. Outbound: clicking a customer in the workbook sends an event up to the host page, which navigates inside the app — no new tab. Inbound: the host page sets the workbook's customer control, on load through the embed URL and afterwards by postMessage, without reloading the iframe.";

// The mock destination the outbound event navigates to — "Example App" is a
// stand-in for whatever app is hosting the embed.
const APP_PATH = /^\/customers\/[A-Za-z0-9_-]{1,64}$/;

const MAX_LOG = 25;

export default function InboundOutboundView({ initialEmbedData, initialCustomer }) {
  const { setJwt, clearJwts, setPageTitle, sessionLength, refreshKey } = useDashboardChrome();
  const searchParams = useSearchParams();
  const bridgeRef = useRef(null);
  const [log, setLog] = useState([]);

  useEffect(() => {
    setPageTitle(TITLE);
  }, [setPageTitle]);

  // Drop this page's JWT from the inspector as we leave — see the note in
  // LegacyExampleView about why the provider doesn't wipe on navigation.
  useEffect(() => clearJwts, [clearJwts]);

  // Derived from the URL, not component state, so Back/Forward and a refresh
  // after pushState keep the Example App panel in step with the address bar.
  const appParam = searchParams.get('app');
  const appPath = appParam && APP_PATH.test(appParam) ? appParam : null;

  const addLog = useCallback((direction, data) => {
    setLog((prev) => [{ direction, at: new Date().toLocaleTimeString(), data }, ...prev].slice(0, MAX_LOG));
  }, []);

  // Outbound: every message SigmaEmbed lets through (origin and source already
  // checked there) lands here. The raw payload is logged first so the first
  // click confirms the real shape.
  const handleEvent = useCallback((data) => {
    addLog('received', data);
    if (data.type !== 'action:outbound' || data.name !== OUTBOUND_EVENT) return;
    const customerId = data.values?.customer_id;
    const value = customerId === undefined || customerId === null ? '' : String(customerId);
    if (!SAFE_CONTROL_VALUE.test(value)) return;
    // The host handles navigation itself: change the address bar in place.
    // No new tab, and the iframe stays mounted so it doesn't reload.
    const url = new URL(window.location.href);
    url.searchParams.set('app', `/customers/${value}`);
    window.history.pushState(null, '', url);
  }, [addLog]);

  // Inbound after load: set the workbook control without touching the iframe src.
  // https://help.sigmacomputing.com/docs/inbound-and-outbound-events-in-embeds
  const setCustomer = (value) => {
    const message = { type: 'workbook:variables:update', variables: { [CONTROL_ID]: value } };
    bridgeRef.current?.post(message);
    addLog('sent', message);
  };

  const closeApp = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('app');
    window.history.pushState(null, '', url);
  };

  return (
    <ConceptDemoPage
      badge={{ text: 'Iframe events', tone: 'info' }}
      title={TITLE}
      description={DESCRIPTION}
      docs={DOCS}
    >
      <div className="flex flex-col lg:flex-row gap-3 h-full min-h-0">
        <div className="flex-1 min-h-[420px] rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white flex flex-col">
          <SigmaEmbed
            mode="inbound_outbound"
            label={TITLE}
            onJwt={(mode, jwt, embedUrl) => setJwt(mode, jwt, embedUrl, TITLE)}
            initialEmbedUrl={initialEmbedData?.embedUrl}
            initialJwt={initialEmbedData?.jwt}
            sessionLength={sessionLength}
            refreshKey={refreshKey}
            onEvent={handleEvent}
            bridgeRef={bridgeRef}
          />
        </div>

        <aside className="lg:w-80 shrink-0 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <section className="rounded-xl border border-black/[0.06] shadow-card bg-white p-3">
            <p className="text-[11px] font-semibold text-ink-secondary uppercase tracking-widest mb-1">Inbound</p>
            <p className="text-xs text-ink-secondary leading-relaxed mb-2">
              Sets the <span className="font-mono">{CONTROL_ID}</span> control by postMessage.
              {initialCustomer && (
                <> Opened with <span className="font-mono">?customer={initialCustomer}</span>, so it started filtered.</>
              )}
            </p>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_CUSTOMERS.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setCustomer(customer.id)}
                  className="text-left text-xs text-ink-primary border border-black/[0.08] hover:border-black/[0.18] hover:bg-black/[0.03] rounded-lg px-3 py-1.5 transition-all"
                >
                  {customer.name} <span className="font-mono text-ink-secondary">#{customer.id}</span>
                </button>
              ))}
              <button
                onClick={() => setCustomer('')}
                className="text-left text-xs text-ink-secondary hover:text-ink-primary border border-black/[0.06] hover:border-black/[0.14] rounded-lg px-3 py-1.5 transition-all"
              >
                Clear
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-black/[0.06] shadow-card bg-white p-3">
            <p className="text-[11px] font-semibold text-ink-secondary uppercase tracking-widest mb-1">Outbound</p>
            {appPath ? (
              <div className="rounded-lg border border-brand-500/25 bg-brand-50 p-3">
                <p className="text-[11px] text-brand-600 mb-0.5">Example App</p>
                <p className="font-mono text-sm text-ink-primary break-all">{appPath}</p>
                <p className="text-[11px] text-ink-secondary leading-relaxed mt-1.5">
                  The host URL changed with history.pushState — same tab, iframe not reloaded.
                </p>
                <button onClick={closeApp} className="mt-2 text-[11px] text-brand-600 hover:text-brand-700">
                  Close
                </button>
              </div>
            ) : (
              <p className="text-xs text-ink-secondary leading-relaxed">
                Click a customer ID in the workbook. Its <span className="font-mono">{OUTBOUND_EVENT}</span> event
                opens that customer in Example App.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-black/[0.06] shadow-card bg-white p-3 min-h-0">
            <p className="text-[11px] font-semibold text-ink-secondary uppercase tracking-widest mb-1">Debug: raw events</p>
            {log.length === 0 ? (
              <p className="text-xs text-ink-secondary">Nothing yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                {log.map((entry, i) => (
                  <li key={`${entry.at}-${i}`} className="text-[10px] font-mono text-ink-secondary">
                    <span className={entry.direction === 'sent' ? 'text-chart-teal' : 'text-brand-600'}>
                      {entry.direction === 'sent' ? '→ sent' : '← received'}
                    </span>{' '}
                    {entry.at}
                    <pre className="whitespace-pre-wrap break-all text-ink-primary">{JSON.stringify(entry.data)}</pre>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </ConceptDemoPage>
  );
}
