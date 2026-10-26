'use client';

import { useEffect, useMemo, useState } from 'react';
import SigmaEmbed from '@/components/SigmaEmbed';
import AgentChat from '@/components/AgentChat';
import { useDashboardChrome } from '@/lib/dashboard-context';

const keyOf = (agent) => `${agent.workbookId}::${agent.agentId}`;

/**
 * Agent Chat — lists the Sigma workbook agents the signed-in embed user can
 * reach (discovered as that user, see lib/sigma-agents.js), embeds the picked
 * agent's workbook, and chats with the agent beside it through a server proxy.
 */
export default function AgentChatPage() {
  const { setJwt, clearJwts, setPageTitle, sessionLength, refreshKey } = useDashboardChrome();
  const [state, setState] = useState({ loading: true, error: null, agents: [], email: null });
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => { setPageTitle('Agent Chat'); }, [setPageTitle]);
  useEffect(() => clearJwts, [clearJwts, selectedKey]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sigma/agents')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load your agents.');
        if (cancelled) return;
        setState({ loading: false, error: null, agents: data.agents ?? [], email: data.email });
        if (data.agents?.length) setSelectedKey((prev) => prev ?? keyOf(data.agents[0]));
      })
      .catch((error) => { if (!cancelled) setState({ loading: false, error: error.message, agents: [], email: null }); });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => state.agents.find((a) => keyOf(a) === selectedKey) ?? null, [state.agents, selectedKey]);
  const groups = useMemo(() => {
    const map = new Map();
    state.agents.forEach((a) => map.set(a.workbookName, [...(map.get(a.workbookName) ?? []), a]));
    return [...map.entries()];
  }, [state.agents]);

  if (state.loading) return <Panel>Finding the agents you can access…</Panel>;
  if (state.error) return <Panel tone="error">{state.error}</Panel>;
  if (!state.agents.length) {
    return <Panel>No workbook agents are available to {state.email || 'this user'}. Ask a workbook owner to give this user access to a workbook that has an agent.</Panel>;
  }

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <label className="text-xs text-ink-secondary" htmlFor="agent-picker">Agent</label>
        <select
          id="agent-picker"
          value={selectedKey ?? ''}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="text-sm rounded-lg border border-black/[0.1] bg-white px-3 py-1.5"
        >
          {groups.map(([workbook, agents]) => (
            <optgroup key={workbook} label={workbook}>
              {agents.map((a) => <option key={keyOf(a)} value={keyOf(a)}>{a.name}</option>)}
            </optgroup>
          ))}
        </select>
        <span className="text-xs text-ink-secondary">{state.agents.length} agent{state.agents.length === 1 ? '' : 's'} available to {state.email}</span>
      </div>

      {selected && (
        <div className="flex-1 min-h-[480px] grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="rounded-xl border border-black/[0.06] shadow-card overflow-hidden bg-white flex flex-col min-h-[360px]">
            {selected.workbookUrlId ? (
              <SigmaEmbed
                key={selected.workbookUrlId}
                urlId={selected.workbookUrlId}
                label={selected.workbookName}
                onJwt={(mode, jwt, embedUrl) => setJwt(mode, jwt, embedUrl, selected.workbookName)}
                sessionLength={sessionLength}
                refreshKey={refreshKey}
              />
            ) : (
              <div className="m-auto text-xs text-ink-secondary p-6">The workbook link isn’t available for this agent.</div>
            )}
          </div>
          <div className="rounded-xl border border-black/[0.06] shadow-card bg-white flex flex-col min-h-[360px]">
            <div className="shrink-0 px-4 py-2.5 border-b border-black/[0.06]">
              <p className="text-sm font-medium text-ink-primary">{selected.name}</p>
              <p className="text-xs text-ink-secondary">{selected.workbookName}</p>
            </div>
            <div className="flex-1 min-h-0">
              <AgentChat key={keyOf(selected)} agent={selected} />
            </div>
            <p className="shrink-0 px-4 py-2 text-[11px] leading-snug text-ink-secondary border-t border-black/[0.06]">
              The agent list is checked as you. Answers are produced by the app’s API client, so they are not limited by your own row-level security.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ children, tone }) {
  return (
    <div className={'rounded-xl border shadow-card bg-white h-full min-h-[240px] flex items-center justify-center p-8 text-center text-sm ' + (tone === 'error' ? 'border-red-200 text-red-700' : 'border-black/[0.06] text-ink-secondary')}>
      <p className="max-w-md leading-relaxed">{children}</p>
    </div>
  );
}
