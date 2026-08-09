import { useState } from 'react';
import { uploadsApi } from '../lib/api.js';
import { Button, Spinner } from './ui.jsx';

/**
 * Signed direct-to-Cloudinary upload.
 *
 * The API only mints a signature; the bytes go straight from the browser to
 * Cloudinary and never touch our server. That is what keeps a 1 GB free-tier
 * VM out of the image path.
 *
 * Only the returned public_id is handed back — never a full URL, since the
 * API stores ids and builds URLs itself.
 */
export function ImageUploader({ kind = 'option', value, onChange, label = 'Add image' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  async function upload(file) {
    if (!file) return;

    // Checked before the request so an oversized file fails instantly rather
    // than after a slow upload on a phone connection.
    if (file.size > 5 * 1024 * 1024) {
      setError('Images must be under 5 MB');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { upload: sig } = await uploadsApi.sign(kind);

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', sig.apiKey);
      form.append('timestamp', sig.timestamp);
      form.append('signature', sig.signature);
      form.append('folder', sig.folder);
      form.append('upload_preset', sig.uploadPreset);

      const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Cloudinary rejected the upload');

      const data = await res.json();
      setPreview(data.secure_url);
      onChange(data.public_id);
    } catch (err) {
      setError(err.message ?? 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-2">
        {preview && (
          <img
            src={preview}
            alt=""
            className="h-12 w-12 rounded object-cover"
            style={{ border: '1px solid var(--ring)' }}
          />
        )}
        <span className="truncate text-xs" style={{ color: 'var(--muted)' }}>
          Image attached
        </span>
        <Button size="sm" variant="ghost" onClick={() => { onChange(null); setPreview(null); }}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div>
      <label
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs"
        style={{ borderColor: 'var(--ring)', color: 'var(--ink-2)' }}
      >
        {busy ? <Spinner size={14} /> : '＋'} {busy ? 'Uploading…' : label}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </label>
      {error && (
        <p className="mt-1 text-xs" style={{ color: 'var(--critical)' }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
