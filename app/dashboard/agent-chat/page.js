'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AgentChat from '@/components/AgentChat';
import { useDashboardChrome } from '@/lib/dashboard-context';
import { loadConversations, saveConversation, deleteConversation } from '@/lib/agent-history';

const keyOf = (item) => `${item.workbookId}::${item.agentId}`;

/**
 * Agent Chat — headless agent embedding. No workbook is embedded: the page
 * lists the Sigma workbook agents the signed-in user can reach (discovered as
 * that user, see lib/sigma-agents.js) and chats with one through a server
 * proxy. Conversations are kept in the browser (lib/agent-history.js).
 */
export default function AgentChatPage() {
  const { setPageTitle } = useDashboardChrome();
  const [state, setState] = useState({ loading: true, error: null, agents: [], email: null });
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);
  const [active, setActive] = useState({ id: null, chatKey: 'new-0' }); // id: saved conversation shown, chatKey: remount key

  useEffect(() => { setPageTitle('Agent Chat'); }, [setPageTitle]);

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
        if (data.agents?.length) pickAgent(data.agents[0], data.agents, saved);
      })
      .catch((error) => { if (!cancelled) setState({ loading: false, error: error.message, agents: [], email: null }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selecting an agent resumes its most recent conversation, like the Plugs Agent Hub.
  function pickAgent(agent, _agents = state.agents, list = conversations) {
    setSelectedKey(keyOf(agent));
    const latest = list.find((c) => keyOf(c) === keyOf(agent));
    setActive(latest ? { id: latest.id, chatKey: latest.id } : { id: null, chatKey: `new-${agent.agentId}-${Date.now()}` });
  }

  const selected = useMemo(() => state.agents.find((a) => keyOf(a) === selectedKey) ?? null, [state.agents, selectedKey]);
  const activeConversation = useMemo(() => conversations.find((c) => c.id === active.id) ?? null, [conversations, active.id]);

  const startNew = useCallback(() => {
    setActive({ id: null, chatKey: `new-${Date.now()}` });
  }, []);

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

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map();
    state.agents
      .filter((a) => !q || `${a.name} ${a.workbookName} ${a.description}`.toLowerCase().includes(q))
      .forEach((a) => map.set(a.workbookName, [...(map.get(a.workbookName) ?? []), a]));
    return [...map.entries()];
  }, [state.agents, search]);

  if (state.loading) return <Panel>Finding the agents you can access…</Panel>;
  if (state.error) return <Panel tone="error">{state.error}</Panel>;
  if (!state.agents.length) {
    return <Panel>No workbook agents are available to {state.email || 'this user'}. Ask a workbook owner to give this user access to a workbook that has an agent.</Panel>;
  }

  return (
    <div className="grid gap-3 h-full min-h-[520px] lg:grid-cols-[minmax(0,2fr)_minmax(0,5fr)]">
      <aside className="rounded-xl border border-black/[0.06] shadow-card bg-white flex flex-col min-h-0">
        <div className="shrink-0 p-3 border-b border-black/[0.06]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents or workbooks"
            className="w-full text-sm rounded-lg border border-black/[0.1] px-3 py-1.5 outline-none focus:border-black/30"
          />
          <p className="mt-2 text-[11px] text-ink-secondary">{state.agents.length} agent{state.agents.length === 1 ? '' : 's'} available to {state.email}</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
          {groups.map(([workbook, agents]) => (
            <div key={workbook}>
              <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-ink-secondary">{workbook}</p>
              {agents.map((a) => (
                <button
                  key={keyOf(a)}
                  type="button"
                  onClick={() => pickAgent(a)}
                  className={'w-full text-left rounded-lg px-2 py-1.5 ' + (keyOf(a) === selectedKey ? 'bg-black/[0.06]' : 'hover:bg-black/[0.03]')}
                >
                  <span className="block text-sm font-medium text-ink-primary">{a.name}</span>
                  <span className="block text-xs text-ink-secondary line-clamp-2">{a.description || 'No description'}</span>
                </button>
              ))}
            </div>
          ))}
          <div>
            <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-ink-secondary">Recent conversations</p>
            {conversations.length === 0 && <p className="px-2 text-xs text-ink-secondary">None yet.</p>}
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
        </div>
      </aside>

      <section className="rounded-xl border border-black/[0.06] shadow-card bg-white flex flex-col min-h-0">
        {selected ? (
          <>
            <div className="shrink-0 px-4 py-2.5 border-b border-black/[0.06]">
              <p className="text-sm font-medium text-ink-primary">{selected.name}</p>
              <p className="text-xs text-ink-secondary">{selected.workbookName}</p>
            </div>
            <div className="flex-1 min-h-0">
              <AgentChat key={active.chatKey} agent={selected} conversation={activeConversation} onSaved={handleSaved} onNew={startNew} />
            </div>
            <p className="shrink-0 px-4 py-2 text-[11px] leading-snug text-ink-secondary border-t border-black/[0.06]">
              The agent list is checked as you. Answers are produced by the app’s API client, so they are not limited by your own row-level security. Conversations are saved in this browser only.
            </p>
          </>
        ) : (
          <div className="m-auto text-sm text-ink-secondary">Choose an agent to start a conversation.</div>
        )}
      </section>
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
