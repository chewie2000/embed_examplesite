'use client';

import InfoButton from './InfoButton';

/**
 * The embed menu / Assistant switches, shared by Team Swapping and Folder
 * Explorer. Controlled: `menuState` is { visible, position, assistant } (see
 * resolveMenuState in lib/embed-url-params.js) and `onChange` receives a
 * partial patch. Each page keeps the state in its own URL.
 *
 * Menu: :menu_position accepts exactly top/bottom/none (verified against
 * Sigma's embed URL parameters reference); modeled as one visibility toggle
 * plus a position choice rather than a three-way selector, since "hidden"
 * isn't a position.
 */
export default function EmbedMenuControls({ menuState, onChange }) {
  return (
    <div className="shrink-0 flex items-center gap-4 text-xs">
      <InfoButton title="Showing and positioning the embed menu">
        Both switches drive one URL parameter,{' '}
        <code className="text-brand-600">:menu_position</code>, which accepts exactly{' '}
        <code className="text-brand-600">top</code>, <code className="text-brand-600">bottom</code>,
        or <code className="text-brand-600">none</code> (its default when unset). Hidden isn&apos;t
        a position — it&apos;s <code className="text-brand-600">none</code> regardless of which
        position was last selected, which is why the two controls here are a visibility toggle
        plus a position choice rather than a three-way switch.
        <a
          href="https://help.sigmacomputing.com/docs/embed-url-parameters"
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium"
        >
          Sigma docs: Embed URL parameters ↗
        </a>
      </InfoButton>
      <div className="flex items-center gap-2">
        <span className="text-ink-secondary">Menu</span>
        <button
          onClick={() => onChange({ visible: !menuState.visible })}
          role="switch"
          aria-checked={menuState.visible}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            menuState.visible ? 'bg-brand-500' : 'bg-zinc-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              menuState.visible ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-ink-primary">{menuState.visible ? 'Visible' : 'Hidden'}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-ink-secondary">Position</span>
        <div className="inline-flex rounded-lg border border-black/[0.08] p-0.5">
          {['top', 'bottom'].map((p) => (
            <button
              key={p}
              onClick={() => onChange({ visible: true, position: p })}
              className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                menuState.visible && menuState.position === p
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <InfoButton title="Showing the Assistant">
          Turning this on appends{' '}
          <code className="text-brand-600">:show_assistant=true</code> to the embed URL, after the{' '}
          <code className="text-brand-600">:jwt</code> parameter (for example{' '}
          <code className="text-brand-600">?:jwt=&lt;jwt&gt;&amp;:show_assistant=true</code>). Only
          users whose account type has the <span className="font-medium">Use Assistant</span>{' '}
          permission enabled can access the Assistant in the workbook — for everyone else the
          parameter has no visible effect.
        </InfoButton>
        <span className="text-ink-secondary">Assistant</span>
        <button
          onClick={() => onChange({ assistant: !menuState.assistant })}
          role="switch"
          aria-checked={menuState.assistant}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            menuState.assistant ? 'bg-brand-500' : 'bg-zinc-200'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              menuState.assistant ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-ink-primary">{menuState.assistant ? 'Shown' : 'Hidden'}</span>
      </div>
    </div>
  );
}
