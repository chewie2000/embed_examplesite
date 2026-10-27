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
  const [copiedIndex, setCopiedIndex] = useState(null);
  const idRef = useRef(conversation?.id ?? null);
  const abortRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages, status]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const busy = status !== null;

  const sessionTokens = messages.reduce((sum, m) => sum + (m.usage?.totalTokens ?? 0), 0);

  async function copy(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1500);
    } catch { /* clipboard unavailable; ignore */ }
  }

  function send(event) {
    event.preventDefault();
    if (busy) { abortRef.current?.abort(); return; }
    ask(input);
  }

  async function ask(text) {
    if (busy) return;
    const message = text.trim();
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
              patchLast({ text: evt.text, pending: false, usage: evt.usage || null });
              setHistory(evt.history || []);
              if (!idRef.current) idRef.current = crypto.randomUUID();
              // Persist from the state we just built, not from React state (not yet flushed).
              onSaved({
                id: idRef.current,
                workbookId: agent.workbookId,
                agentId: agent.agentId,
                agentName: agent.name,
                workbookName: agent.workbookName,
                messages: [...savedMessages(messages), { role: 'user', text: message }, { role: 'assistant', text: evt.text, usage: evt.usage || null }],
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
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-black/[0.06] bg-gradient-to-r from-mint-400/15 to-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar />
          <span className="text-sm font-medium text-ink-primary truncate">{agent.name}</span>
        </div>
        {sessionTokens > 0 && (
          <span className="shrink-0 text-[11px] text-ink-secondary tabular-nums" title="Total tokens used by this conversation so far">
            {sessionTokens.toLocaleString()} tokens this chat
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="animate-chat-in space-y-3">
            <p className="text-xs text-ink-secondary leading-relaxed">
              Ask <span className="font-medium text-ink-primary">{agent.name}</span> a question.
              {agent.description && <> {agent.description}</>}
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
                  className="text-xs rounded-full border border-mint-border/40 bg-mint-400/10 px-3 py-1.5 text-ink-primary hover:bg-mint-400/30 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          if (m.role === 'user') {
            return (
              <div key={i} className="animate-chat-in ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ink-primary text-white text-sm leading-relaxed whitespace-pre-wrap px-3.5 py-2">
                {m.text}
              </div>
            );
          }
          if (m.role === 'error') {
            return <div key={i} className="animate-chat-in text-sm leading-relaxed rounded-xl px-3 py-2 max-w-[92%] bg-red-50 text-red-700 border border-red-200">{m.text}</div>;
          }
          const streaming = busy && isLast;
          return (
            <div key={i} className="animate-chat-in group flex items-start gap-2.5 max-w-[92%]">
              <Avatar />
              <div className="min-w-0">
                <div className="text-sm leading-relaxed whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white border border-black/[0.06] shadow-card text-ink-primary px-3.5 py-2">
                  {m.pending && !m.text ? (
                    <span className="inline-flex items-center gap-2 text-ink-secondary">
                      <Dots />
                      {status}
                    </span>
                  ) : (
                    <>
                      {m.text}
                      {streaming && <span className="inline-block w-[2px] h-[1em] -mb-[2px] ml-0.5 bg-mint-border animate-chat-caret" />}
                    </>
                  )}
                </div>
                {!m.pending && m.text && (
                  <div className="mt-1 flex items-center gap-3 px-1 text-[11px] text-ink-secondary tabular-nums">
                    {m.usage && <UsageMeta usage={m.usage} />}
                    <button
                      type="button"
                      onClick={() => copy(m.text, i)}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-ink-primary transition-opacity"
                    >
                      {copiedIndex === i ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="shrink-0 flex gap-2 p-3 border-t border-black/[0.06]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={4000}
          placeholder="Ask this agent a question…"
          className="flex-1 text-sm rounded-lg border border-black/[0.1] px-3 py-2 outline-none focus:border-mint-border"
        />
        <button type="submit" className="text-xs font-medium rounded-lg bg-mint-400 hover:bg-mint-500 text-mint-ink px-3 py-2 transition-colors">
          {busy ? 'Stop' : 'Send'}
        </button>
        <button type="button" onClick={onNew} disabled={busy} className="text-xs rounded-lg border border-black/[0.1] px-3 py-2 disabled:opacity-40">
          New
        </button>
      </form>
    </div>
  );
}

const STARTERS = ['What can you help me with?', 'Summarise the key trends', 'What stands out in the data?'];

function Avatar() {
  return (
    <span className="shrink-0 mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-mint-400 text-mint-ink text-[11px] font-semibold" aria-hidden="true">
      ✦
    </span>
  );
}

function Dots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((n) => (
        <span key={n} className="h-1.5 w-1.5 rounded-full bg-mint-border animate-chat-dot" style={{ animationDelay: `${n * 0.18}s` }} />
      ))}
    </span>
  );
}

// "4,984 in · 155 out · 3.6s" with a bar showing the input/output split.
function UsageMeta({ usage }) {
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  const total = usage.totalTokens ?? input + output;
  const outPct = total ? Math.max(4, Math.round((output / total) * 100)) : 0;
  return (
    <span className="inline-flex items-center gap-2" title={`${total.toLocaleString()} tokens total across ${usage.turns ?? 1} turn(s)`}>
      <span>{input.toLocaleString()} in · {output.toLocaleString()} out{usage.durationMs ? ` · ${(usage.durationMs / 1000).toFixed(1)}s` : ''}</span>
      <span className="inline-flex h-1 w-12 overflow-hidden rounded-full bg-chart-teal/25" aria-hidden="true">
        <span className="h-full bg-mint-border" style={{ width: `${outPct}%` }} />
      </span>
    </span>
  );
}

// Drop transient bubbles (errors, pending placeholders); keep real turns.
function savedMessages(messages) {
  return messages.filter((m) => (m.role === 'user' || m.role === 'assistant') && !m.pending && m.text);
}
