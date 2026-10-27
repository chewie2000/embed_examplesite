'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AgentChat from '@/components/AgentChat';
import AgentWalkthrough from '@/components/AgentWalkthrough';
import SigmaCallInspector from '@/components/SigmaCallInspector';
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
  const [tab, setTab] = useState('try'); // 'try' | 'how'
  const [showCalls, setShowCalls] = useState(false);
  const [calls, setCalls] = useState([]); // Sigma calls recorded by the server, shown in the inspector
  const [highlightStep, setHighlightStep] = useState(null);

  const addCalls = useCallback((entries) => {
    const list = Array.isArray(entries) ? entries : [entries];
    setCalls((prev) => {
      let seq = prev.length ? prev[prev.length - 1].seq : 0;
      return [...prev, ...list.map((entry) => ({ ...entry, seq: ++seq }))].slice(-80);
    });
  }, []);

  // "See it live" in the walkthrough: jump to the chat with the inspector open.
  const showLive = useCallback((step) => {
    setTab('try');
    setShowCalls(true);
    setHighlightStep(step);
  }, []);

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
        addCalls(data.trace ?? []);
        if (data.agents?.length) pickAgent(data.agents[0], saved);
      })
      .catch((error) => { if (!cancelled) setState({ loading: false, error: error.message, agents: [], email: null }); });
    return () => { cancelled = true; };
  }, [pickAgent, addCalls]);

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

  const tryIt = state.loading ? <Panel>Finding the agents you can access…</Panel>
    : state.error ? <Panel tone="error">{state.error}</Panel>
    : !state.agents.length ? <Panel>No workbook agents are available to {state.email || 'this user'}. Ask a workbook owner to give this user access to a workbook that has an agent.</Panel>
    : (
      <div className="flex flex-col gap-3 h-full min-h-0">
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
        <div className={'flex-1 min-h-0 grid gap-3 grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] ' + (showCalls ? 'lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,24rem)]' : 'lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]')}>
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
                  <AgentChat key={active.chatKey} agent={selected} conversation={activeConversation} onSaved={handleSaved} onNew={startNew} onTrace={addCalls} />
                </div>
                <p className="shrink-0 px-4 py-1.5 text-[11px] leading-snug text-ink-secondary border-t border-black/[0.06]">
                  The agents are listed and run as you, so answers respect your own Sigma permissions and row-level security. Conversations are saved in this browser only.{' '}
                  <button type="button" onClick={() => setTab('how')} className="underline hover:text-ink-primary">How this works</button>
                </p>
              </>
            )}
          </section>

          {showCalls && (
            <aside className="hidden lg:flex rounded-xl border border-black/[0.06] shadow-card bg-white flex-col min-h-0">
              <SigmaCallInspector calls={calls} highlightStep={highlightStep} onClear={() => { setCalls([]); setHighlightStep(null); }} />
            </aside>
          )}
        </div>
      </div>
    );

  return (
    // DashboardChrome is min-h-screen (not a fixed height), so h-full would just
    // follow the content. Size to the viewport minus the header (3.5rem), main
    // padding and utility bar instead, so only the panes inside scroll.
    <div className="flex flex-col gap-3 h-[calc(100dvh-9.5rem)] min-h-[420px]">
      <div role="tablist" className="shrink-0 flex items-center gap-1 border-b border-black/[0.06]">
        <TabButton active={tab === 'try'} onClick={() => setTab('try')}>Try it</TabButton>
        <TabButton active={tab === 'how'} onClick={() => setTab('how')}>How it works</TabButton>
        {tab === 'try' && (
          <button
            type="button"
            onClick={() => setShowCalls((v) => !v)}
            className="ml-auto hidden lg:inline-flex mb-1 text-xs rounded-lg border border-black/[0.1] px-2.5 py-1 hover:border-black/[0.25]"
          >
            {showCalls ? 'Hide' : 'Show'} Sigma calls{calls.length ? ` (${calls.length})` : ''}
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {tab === 'try' ? tryIt : <AgentWalkthrough onShowLive={showLive} />}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={'px-3 py-2 text-sm -mb-px border-b-2 ' + (active ? 'border-ink-primary text-ink-primary font-medium' : 'border-transparent text-ink-secondary hover:text-ink-primary')}
    >
      {children}
    </button>
  );
}

function Panel({ children, tone }) {
  return (
    <div className={'rounded-xl border shadow-card bg-white h-full min-h-[240px] flex items-center justify-center p-8 text-center text-sm ' + (tone === 'error' ? 'border-red-200 text-red-700' : 'border-black/[0.06] text-ink-secondary')}>
      <p className="max-w-md leading-relaxed">{children}</p>
    </div>
  );
}
