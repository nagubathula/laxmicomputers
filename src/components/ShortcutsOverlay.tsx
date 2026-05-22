'use client';

import { X } from 'lucide-react';

export type ShortcutItem = { keys: string[]; description: string };
export type ShortcutGroup = { title: string; items: ShortcutItem[] };

export default function ShortcutsOverlay({
  open,
  groups,
  onClose,
}: {
  open: boolean;
  groups: ShortcutGroup[];
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="font-semibold text-navy-900">Keyboard shortcuts</h2>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[70vh] overflow-auto">
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{g.title}</h3>
              <ul className="space-y-1.5">
                {g.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-700">{item.description}</span>
                    <span className="flex gap-1 flex-shrink-0">
                      {item.keys.map((k, j) => (
                        <kbd key={j} className="inline-flex min-w-[1.75rem] justify-center rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 shadow-sm">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t px-5 py-3 text-xs text-slate-500">
          Press <Kbd>?</Kbd> anywhere to open this list. <Kbd>Esc</Kbd> to close.
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex min-w-[1.5rem] justify-center rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">{children}</kbd>;
}
