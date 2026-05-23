'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Link, X, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getCloudinaryUploadParams } from '@/app/admin/cloudinary-actions';

type Tab = 'upload' | 'url';

export function ImageUpload({
  name = 'image_url',
  defaultValue = '',
}: {
  name?: string;
  defaultValue?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [tab, setTab] = useState<Tab>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const { cloudName, apiKey, timestamp, signature } = await getCloudinaryUploadParams();

      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: fd }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setUrl(data.secure_url);
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  const applyUrl = () => {
    const v = urlInput.trim();
    if (!v) return;
    setUrl(v);
    setUrlInput('');
    setError('');
  };

  const clear = () => {
    setUrl('');
    setUrlInput('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

      {url ? (
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="relative shrink-0">
            <img
              src={url}
              alt="Product"
              className="h-36 w-36 rounded-md object-cover border border-slate-200"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white p-0.5 hover:bg-red-600 transition-colors"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <span className="text-xs text-green-700 font-medium flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Image set
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clear}
              className="text-xs"
            >
              Replace
            </Button>
            <p className="text-xs text-slate-400 max-w-[180px] truncate" title={url}>{url}</p>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-md overflow-hidden max-w-xs">
          {/* Tab bar */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => setTab('upload')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                tab === 'upload'
                  ? 'bg-white text-slate-800 border-b-2 border-blue-500'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Upload className="h-3.5 w-3.5" /> Upload file
            </button>
            <button
              type="button"
              onClick={() => setTab('url')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                tab === 'url'
                  ? 'bg-white text-slate-800 border-b-2 border-blue-500'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Link className="h-3.5 w-3.5" /> Paste URL
            </button>
          </div>

          {tab === 'upload' ? (
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center gap-2 h-32 transition-colors ${
                uploading
                  ? 'cursor-default bg-white'
                  : dragOver
                  ? 'bg-blue-50 cursor-pointer'
                  : 'bg-white hover:bg-slate-50 cursor-pointer'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-7 w-7 text-slate-400 animate-spin" />
                  <span className="text-sm text-slate-500">Uploading…</span>
                </>
              ) : (
                <>
                  <Upload className="h-7 w-7 text-slate-400" />
                  <span className="text-sm text-slate-500">Click or drag to upload</span>
                  <span className="text-xs text-slate-400">PNG, JPG, WebP · max 10 MB</span>
                </>
              )}
            </div>
          ) : (
            <div className="p-3 bg-white space-y-2">
              <Input
                placeholder="https://res.cloudinary.com/…"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl(); } }}
                className="text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={applyUrl}
                disabled={!urlInput.trim()}
                className="w-full"
              >
                Use this URL
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
