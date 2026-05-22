'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onDetected: (code: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({ open, onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    BrowserMultiFormatReader.listVideoInputDevices()
      .then((d) => {
        if (cancelled) return;
        setDevices(d);
        const rear = d.find((x) => /back|rear|environment/i.test(x.label));
        setDeviceId((prev) => prev ?? rear?.deviceId ?? d[0]?.deviceId);
      })
      .catch((e) => setError(e?.message ?? 'Camera access failed'));

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    let stopped = false;

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result, err, controls) => {
        if (stopped) return;
        if (result) {
          controls.stop();
          onDetected(result.getText());
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch((e) => setError(e?.message ?? 'Failed to start camera'));

    return () => {
      stopped = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, deviceId, onDetected]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-slate-600" />
            <h2 className="font-medium text-slate-900">Scan barcode</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error ? (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          ) : (
            <>
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/70" />
              </div>
              {devices.length > 1 && (
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-slate-500">
                Point the camera at a barcode. Detection happens automatically.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
