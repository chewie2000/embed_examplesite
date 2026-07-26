'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Type → icon + colour ─────────────────────────────────────────────────────
function TypeIcon({ type, open }) {
  const cls = 'w-4 h-4 shrink-0';
  switch (type) {
    case 'folder':
      return (
        <svg className={`${cls} text-amber-400/80`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          )}
        </svg>
      );
    case 'workbook':
      return (
        <svg className={`${cls} text-indigo-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m0 0h7.5" />
        </svg>
      );
    case 'data-model':
    case 'dataset':
      return (
        <svg className={`${cls} text-emerald-400/80`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75" />
        </svg>
      );
    default:
      return (
        <svg className={`${cls} text-zinc-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}

const TYPE_LABEL = {
  'data-model': 'data model',
  workbook: 'workbook',
  report: 'report',
  dataset: 'dataset',
};

// ── Recursive tree node ───────────────────────────────────────────────────────
function TreeNode({ node, depth }) {
  const isFolder = node.type === 'folder';
  const hasChildren = isFolder && Array.isArray(node.children) && node.children.length > 0;
  const [open, setOpen] = useState(depth < 1); // top level expanded by default

  return (
    <li>
      <div
        role={isFolder ? 'button' : undefined}
        onClick={isFolder ? () => setOpen((o) => !o) : undefined}
        className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
          isFolder ? 'cursor-pointer hover:bg-white/[0.04]' : 'hover:bg-white/[0.02]'
        }`}
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {isFolder ? (
          <svg
            className={`w-3 h-3 shrink-0 text-zinc-600 transition-transform ${open ? 'rotate-90' : ''} ${hasChildren ? '' : 'opacity-0'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <TypeIcon type={node.type} open={open} />

        <span className={`truncate ${isFolder ? 'text-zinc-200 font-medium' : 'text-zinc-300'}`}>
          {node.name}
        </span>

        {!isFolder && TYPE_LABEL[node.type] && (
          <span className="ml-auto text-[10px] uppercase tracking-wide text-zinc-600 group-hover:text-zinc-500">
            {TYPE_LABEL[node.type]}
          </span>
        )}
        {isFolder && hasChildren && (
          <span className="ml-auto text-[10px] text-zinc-600">{node.children.length}</span>
        )}
      </div>

      {hasChildren && open && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.key} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────
export default function ContentTree() {
  const [state, setState] = useState({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/sigma/tree');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load content tree.');
      setState({ status: 'ready', data });
    } catch (err) {
      setState({ status: 'error', error: err.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Loading ──
  if (state.status === 'loading') {
    return (
      <div className="p-4 space-y-2">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="h-8 rounded-lg bg-white/[0.03] animate-pulse"
            style={{ marginLeft: `${(i % 3) * 18}px`, opacity: 1 - (i % 3) * 0.15 }}
          />
        ))}
      </div>
    );
  }

  // ── Error ──
  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-zinc-200 text-sm mb-1">Couldn&apos;t load the content tree</p>
          <p className="text-xs text-zinc-500 max-w-md leading-relaxed">{state.error}</p>
        </div>
        <button
          onClick={load}
          className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.18] px-4 py-2 rounded-lg transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const { data } = state;
  const isEmpty = !data.tree || data.tree.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header strip */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <svg className="w-3.5 h-3.5 text-amber-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <span className="font-medium text-zinc-200">{data.workspace}</span>
          <span className="text-zinc-600">workspace</span>
        </div>
        <div className="flex-1" />
        <span className="text-[11px] text-zinc-600">
          via Sigma REST API · scoped to <span className="text-zinc-400">{data.sigmaEmail}</span>
        </span>
        <button
          onClick={load}
          title="Refresh"
          className="text-zinc-500 hover:text-indigo-300 border border-white/[0.06] hover:border-indigo-500/30 rounded-md p-1.5 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {/* Body */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6 text-center">
          <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-zinc-200 text-sm mb-1">No content visible in the {data.workspace} workspace</p>
            <p className="text-xs text-zinc-500 max-w-md leading-relaxed">
              {data.member
                ? `This embed user has no access to content in the ${data.workspace} workspace yet. Add workbooks to it in Sigma and grant this user (or their team) access — they'll appear here automatically.`
                : `This embed user isn't provisioned in Sigma yet. Embed users are created lazily on their first embed, so open one of the embed pages first, then refresh.`}
            </p>
          </div>
          {data.member && (
            <p className="text-[10px] text-zinc-600 font-mono">
              member: {data.member.email} · {data.member.userKind}/{data.member.memberType}
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-2">
          <ul>
            {data.tree.map((node) => (
              <TreeNode key={node.key} node={node} depth={0} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
