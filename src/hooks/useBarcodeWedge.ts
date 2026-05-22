'use client';

import { useEffect, useRef } from 'react';

type Options = {
  /** Called with the scanned code (excluding the terminating Enter/Tab). */
  onScan: (code: string) => void;
  /** Max ms between keystrokes to count as scanner input. Humans type slower. */
  maxIntervalMs?: number;
  /** Minimum length of a valid scan. */
  minLength?: number;
  /** Disable the listener (e.g. when a modal/scanner is open). */
  disabled?: boolean;
};

/**
 * Listens globally for hardware barcode-scanner input (keyboard-wedge devices).
 *
 * Heuristic: scanners burst characters very fast (<30 ms apart) and terminate
 * with Enter or Tab. We buffer keystrokes; once 3+ chars arrive faster than
 * a human can type, we treat the burst as a scan, swallow further keys so
 * they don't pollute focused inputs, and fire onScan on the terminator.
 */
export function useBarcodeWedge({
  onScan,
  maxIntervalMs = 30,
  minLength = 4,
  disabled = false,
}: Options) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (disabled) return;

    let buffer = '';
    let lastTime = 0;
    let isScanning = false; // true once burst looks scanner-like

    const reset = () => {
      buffer = '';
      lastTime = 0;
      isScanning = false;
    };

    const handler = (e: KeyboardEvent) => {
      // e.key can be undefined during IME composition or on some Android keyboards
      if (!e.key) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = performance.now();
      const interval = lastTime === 0 ? 0 : now - lastTime;

      // Terminator
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (isScanning && buffer.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          const code = buffer;
          reset();
          onScanRef.current(code);
        } else {
          reset();
        }
        return;
      }

      // Non-printable keys break the burst
      if (e.key.length !== 1) {
        reset();
        return;
      }

      // Gap too long? Start fresh.
      if (lastTime !== 0 && interval > maxIntervalMs) {
        buffer = '';
        isScanning = false;
      }

      buffer += e.key;
      lastTime = now;

      // After 3 fast chars in a row, mark as scanning and swallow keystrokes
      if (buffer.length >= 3 && (lastTime === now)) {
        // Recompute: were the recent intervals all fast?
        // (Simpler proxy: once we have 3+ chars without a reset, it's a burst.)
        isScanning = true;
      }
      if (isScanning) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [maxIntervalMs, minLength, disabled]);
}
