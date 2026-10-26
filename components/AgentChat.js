'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Chat panel for one Sigma workbook agent. The Sigma agent API is stateless,
 * so this keeps the replayable `history` returned by each run and sends it
 * back with the next question. The parent remounts it (via `key`) to switch
 * conversation; `conversation` is only read on mount.
 */
export default function AgentChat({ agent, conversation, onSaved, onNew, onTrace }) {
  const [messages, setMessages] = useState(conversation?.messages ?? []); // { role: 'user' | 'assistant' | 'error', text, pending? }
  const [history, setHistory] = useState(conversation?.history ?? []);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState(null); // string while a run is in flight
  const idRef = useRef(conversation?.id ?? null);
  const abortRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, status]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = status !== null;

  async function send(event) {
    event.preventDefault();
    if (busy) { abortRef.current?.abort(); return; }
    const message = input.trim();
    if (!message) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: message }, { role: 'assistant', text: '', pending: true }]);
    setStatus('Thinking…');

    const controller = new AbortController();
    abortRef.current = controller;
    const patchLast = (patch) => setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, ...patch } : m)));

    try {
      const res = await fetch('/api/sigma/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workbookId: agent.workbookId, agentId: agent.agentId, message, history }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamed = '';
      let finished = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let split = buffer.indexOf('\n\n');
        while (split !== -1) {
          const block = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n');
          if (data) {
            const evt = JSON.parse(data);
            if (evt.type === 'trace') onTrace?.(evt.entry);
            if (evt.type === 'status' && !streamed) setStatus(evt.text);
            if (evt.type === 'delta') { streamed += evt.text; patchLast({ text: streamed, pending: false }); }
            if (evt.type === 'done') {
              finished = true;
              patchLast({ text: evt.text, pending: false });
              setHistory(evt.history || []);
              if (!idRef.current) idRef.current = crypto.randomUUID();
              // Persist from the state we just built, not from React state (not yet flushed).
              onSaved({
                id: idRef.current,
                workbookId: agent.workbookId,
                agentId: agent.agentId,
                agentName: agent.name,
                workbookName: agent.workbookName,
                messages: [...savedMessages(messages), { role: 'user', text: message }, { role: 'assistant', text: evt.text }],
                history: evt.history || [],
              });
            }
            if (evt.type === 'error') throw new Error(evt.message);
          }
          split = buffer.indexOf('\n\n');
        }
      }
      if (!finished) throw new Error('The connection closed before the agent finished.');
    } catch (error) {
      if (error.name !== 'AbortError') {
        setMessages((prev) => [...prev.slice(0, -1), { role: 'error', text: error.message }]);
      } else {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      abortRef.current = null;
      setStatus(null);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-ink-secondary leading-relaxed">
            Ask <span className="font-medium text-ink-primary">{agent.name}</span> a question.
            {agent.description && <> {agent.description}</>}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              'text-sm leading-relaxed whitespace-pre-wrap rounded-xl px-3 py-2 max-w-[92%] ' +
              (m.role === 'user' ? 'ml-auto bg-black/[0.05] text-ink-primary'
                : m.role === 'error' ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-white border border-black/[0.06] text-ink-primary')
            }
          >
            {m.pending && !m.text ? <span className="text-ink-secondary">{status}</span> : m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="shrink-0 flex gap-2 p-3 border-t border-black/[0.06]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={4000}
          placeholder="Ask this agent a question…"
          className="flex-1 text-sm rounded-lg border border-black/[0.1] px-3 py-2 outline-none focus:border-black/30"
        />
        <button type="submit" className="text-xs font-medium rounded-lg bg-ink-primary text-white px-3 py-2">
          {busy ? 'Stop' : 'Send'}
        </button>
        <button type="button" onClick={onNew} disabled={busy} className="text-xs rounded-lg border border-black/[0.1] px-3 py-2 disabled:opacity-40">
          New
        </button>
      </form>
    </div>
  );
}

// Drop transient bubbles (errors, pending placeholders); keep real turns.
function savedMessages(messages) {
  return messages.filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.pending && m.text);
}
