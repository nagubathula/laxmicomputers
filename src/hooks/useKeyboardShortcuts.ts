'use client';

import { useEffect, useRef } from 'react';

type Handler = (e: KeyboardEvent) => void;

/**
 * Map of shortcut combo → handler.
 *
 * Combo string format (case-insensitive, joined by `+`):
 *   - Modifiers: `mod` (Ctrl on Win/Linux, Cmd on Mac), `shift`, `alt`
 *   - Key: any value from KeyboardEvent.key, lowercased
 *
 * Examples:
 *   - 'f1'              → just F1
 *   - 'mod+enter'       → Ctrl/Cmd + Enter
 *   - 'shift+arrowup'   → Shift + ArrowUp
 *   - 'escape'          → Escape
 *   - '/'               → forward slash
 *   - '?'               → question mark (shift+/)
 */
export type ShortcutMap = Record<string, Handler>;

type Options = {
  /**
   * If true (default), shortcuts that are plain printable characters are ignored
   * when an <input>, <textarea>, <select>, or contenteditable element has focus.
   * F-keys, Escape, and combos with modifiers always run regardless.
   */
  ignoreInputs?: boolean;
  /** Disable the listener entirely (e.g. when a modal is open). */
  disabled?: boolean;
};

const PRINTABLE_KEY_RX = /^[\x20-\x7e]$/;

function isEditableTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (node.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, options: Options = {}) {
  const { ignoreInputs = true, disabled = false } = options;
  // Keep latest shortcuts ref so consumers don't have to memoize the map
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (disabled) return;

    const handler = (e: KeyboardEvent) => {
      if (!e.key) return;

      // Build the combo string
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push('mod');
      if (e.shiftKey) parts.push('shift');
      if (e.altKey) parts.push('alt');
      parts.push(e.key.toLowerCase());
      const combo = parts.join('+');

      const fn = shortcutsRef.current[combo];
      if (!fn) return;

      // Allow F-keys, Escape, and any combo with a modifier to fire even when
      // inputs are focused — they're unambiguous "command" keys.
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      const isFunctionKey = /^f\d{1,2}$/.test(e.key.toLowerCase());
      const isEscape = e.key === 'Escape';
      const isCommandLike = hasModifier || isFunctionKey || isEscape;

      if (ignoreInputs && !isCommandLike) {
        // Only suppress printable shortcuts when an input is focused.
        // E.g. typing "+" inside customer search shouldn't bump qty.
        if (PRINTABLE_KEY_RX.test(e.key) && isEditableTarget(e.target)) return;
      }

      e.preventDefault();
      fn(e);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ignoreInputs, disabled]);
}
