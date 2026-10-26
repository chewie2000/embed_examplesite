'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AgentChat from '@/components/AgentChat';
import { useDashboardChrome } from '@/lib/dashboard-context';
import { loadConversations, saveConversation, deleteConversation } from '@/lib/agent-history';

const keyOf = (item) => `${item.workbookId}::${item.agentId}`;

/**
 * Agent Chat — headless agent embedding. No workbook is embedded: the page
 * lists the Sigma workbook agents the signed-in user can reach (discovered as
 * that user, see lib/sigma-agents.js) in a dropdown and chats with one through
 * a server proxy. Conversations are kept in the browser (lib/agent-history.js).
 *
 * Layout: the page is sized to the viewport. Only the message list and the
 * conversation rail scroll, never the page, however many agents there are.
 */
export default function AgentChatPage() {
  const { setPageTitle } = useDashboardChrome();
  const [state, setState] = useState({ loading: true, error: null, agents: [], email: null });
  const [conversations, setConversations] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [active, setActive] = useState({ id: null, chatKey: 'new-0' }); // id: saved conversation shown, chatKey: remount key

  useEffect(() => { setPageTitle('Agent Chat'); }, [setPageTitle]);

  // Selecting an agent resumes its most recent conversation, like the Plugs Agent Hub.
  const pickAgent = useCallback((agent, list) => {
    setSelectedKey(keyOf(agent));
    const latest = list.find((c) => keyOf(c) === keyOf(agent));
    setActive(latest ? { id: latest.id, chatKey: latest.id } : { id: null, chatKey: `new-${agent.agentId}-${Date.now()}` });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sigma/agents')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load your agents.');
        if (cancelled) return;
        const saved = loadConversations(data.email);
        setConversations(saved);
        setState({ loading: false, error: null, agents: data.agents ?? [], email: data.email });
        if (data.agents?.length) pickAgent(data.agents[0], saved);
      })
      .catch((error) => { if (!cancelled) setState({ loading: false, error: error.message, agents: [], email: null }); });
    return () => { cancelled = true; };
  }, [pickAgent]);

  const selected = useMemo(() => state.agents.find((a) => keyOf(a) === selectedKey) ?? null, [state.agents, selectedKey]);
  const activeConversation = useMemo(() => conversations.find((c) => c.id === active.id) ?? null, [conversations, active.id]);
  const groups = useMemo(() => {
    const map = new Map();
    state.agents.forEach((a) => map.set(a.workbookName, [...(map.get(a.workbookName) ?? []), a]));
    return [...map.entries()];
  }, [state.agents]);

  const startNew = useCallback(() => setActive({ id: null, chatKey: `new-${Date.now()}` }), []);

  const handleSaved = useCallback((conversation) => {
    setConversations(saveConversation(state.email, conversation));
    // First save of a new chat: mark it active without remounting the live chat.
    setActive((prev) => (prev.id ? prev : { ...prev, id: conversation.id }));
  }, [state.email]);

  function openConversation(conversation) {
    const agent = state.agents.find((a) => keyOf(a) === keyOf(conversation));
    if (agent) setSelectedKey(keyOf(agent));
    setActive({ id: conversation.id, chatKey: conversation.id });
  }

  function removeConversation(conversation) {
    setConversations(deleteConversation(state.email, conversation.id));
    if (active.id === conversation.id) startNew();
  }

  if (state.loading) return <Panel>Finding the agents you can access…</Panel>;
  if (state.error) return <Panel tone="error">{state.error}</Panel>;
  if (!state.agents.length) {
    return <Panel>No workbook agents are available to {state.email || 'this user'}. Ask a workbook owner to give this user access to a workbook that has an agent.</Panel>;
  }

  return (
    // DashboardChrome is min-h-screen (not a fixed height), so h-full would just
    // follow the content. Size to the viewport minus the header (3.5rem), main
    // padding and utility bar instead, so only the panes inside scroll.
    <div className="flex flex-col gap-3 h-[calc(100dvh-9.5rem)] min-h-[420px]">
      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <label className="text-xs text-ink-secondary" htmlFor="agent-picker">Agent</label>
        <select
          id="agent-picker"
          value={selectedKey ?? ''}
          onChange={(e) => {
            const agent = state.agents.find((a) => keyOf(a) === e.target.value);
            if (agent) pickAgent(agent, conversations);
          }}
          className="text-sm rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 max-w-full"
        >
          {groups.map(([workbook, agents]) => (
            <optgroup key={workbook} label={workbook}>
              {agents.map((a) => <option key={keyOf(a)} value={keyOf(a)}>{a.name}</option>)}
            </optgroup>
          ))}
        </select>
        <span className="text-xs text-ink-secondary">{state.agents.length} agent{state.agents.length === 1 ? '' : 's'} available to {state.email}</span>
      </div>

      {/* minmax(0,1fr) rows + min-h-0 children are what stop long content growing the page. */}
      <div className="flex-1 min-h-0 grid gap-3 grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <aside className="rounded-xl border border-black/[0.06] shadow-card bg-white flex flex-col min-h-0 max-h-36 lg:max-h-none">
          <p className="shrink-0 px-3 py-2 text-[11px] uppercase tracking-wide text-ink-secondary border-b border-black/[0.06]">Recent conversations</p>
          <div className="flex-1 min-h-0 overflow-y-auto p-1.5">
            {conversations.length === 0 && <p className="px-2 py-1 text-xs text-ink-secondary">None yet.</p>}
            {conversations.map((c) => {
              const last = [...c.messages].reverse().find((m) => m.role === 'user');
              return (
                <div key={c.id} className={'group flex items-start gap-1 rounded-lg px-2 py-1.5 ' + (c.id === active.id ? 'bg-black/[0.06]' : 'hover:bg-black/[0.03]')}>
                  <button type="button" onClick={() => openConversation(c)} className="flex-1 min-w-0 text-left">
                    <span className="block text-sm font-medium text-ink-primary truncate">{c.agentName}</span>
                    <span className="block text-xs text-ink-secondary truncate">{last?.text || 'New conversation'}</span>
                  </button>
                  <button type="button" onClick={() => removeConversation(c)} aria-label="Delete conversation" className="text-xs text-ink-secondary opacity-0 group-hover:opacity-100 focus:opacity-100">✕</button>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="rounded-xl border border-black/[0.06] shadow-card bg-white flex flex-col min-h-0">
          {selected && (
            <>
              <div className="shrink-0 px-4 py-2.5 border-b border-black/[0.06]">
                <p className="text-sm font-medium text-ink-primary">{selected.name}</p>
                <p className="text-xs text-ink-secondary truncate">{selected.workbookName}{selected.description ? ` · ${selected.description}` : ''}</p>
              </div>
              <div className="flex-1 min-h-0">
                <AgentChat key={active.chatKey} agent={selected} conversation={activeConversation} onSaved={handleSaved} onNew={startNew} />
              </div>
              <p className="shrink-0 px-4 py-1.5 text-[11px] leading-snug text-ink-secondary border-t border-black/[0.06]">
                The agent list is checked as you. Answers come from the app’s API client, so they aren’t limited by your own row-level security. Conversations are saved in this browser only.
              </p>
            </>
          )}
        </section>
      </div>
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
