import { useRef, useState } from 'react';
import { GripVertical, ImagePlus, Loader2, Star, Trash2, UploadCloud } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { useToast } from '../../context/UIContext.jsx';

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/** Reorder / replace / delete product images. Values are { url, publicId, alt }. */
export default function ImageUploader({ images = [], onChange, folder = 'products', max = 8, colors = [] }) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const handleFiles = async (fileList) => {
    const files = [...fileList].filter((f) => {
      if (!ACCEPTED.includes(f.type)) {
        toast(`${f.name}: only JPG, PNG or WebP images are allowed`, 'error');
        return false;
      }
      if (f.size > MAX_SIZE) {
        toast(`${f.name}: images must be smaller than 5 MB`, 'error');
        return false;
      }
      return true;
    });
    if (!files.length) return;
    if (images.length + files.length > max) {
      toast(`You can upload up to ${max} images per product`, 'error');
      return;
    }

    setUploading(true);
    try {
      const res = await adminApi.upload(files, folder);
      const uploaded = (res.data.images || []).map((img, i) => ({
        url: img.url,
        publicId: img.publicId || '',
        alt: '',
        sortOrder: images.length + i,
      }));
      onChange([...images, ...uploaded]);
      toast(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded`);
    } catch (err) {
      toast(apiErrorMessage(err, 'Upload failed'), 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (index) => {
    const img = images[index];
    onChange(images.filter((_, i) => i !== index));
    if (img?.publicId) {
      adminApi.deleteMedia?.(img.publicId);
    }
  };

  const move = (from, to) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next.map((im, i) => ({ ...im, sortOrder: i })));
  };

  const setAlt = (index, alt) => onChange(images.map((im, i) => (i === index ? { ...im, alt } : im)));

  const setColor = (index, color) => onChange(images.map((im, i) => (i === index ? { ...im, color } : im)));

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragOver ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40' : 'border-[var(--line-color)] bg-[var(--surface-sunken)]/40 hover:border-[var(--accent)]'
        }`}
      >
        {uploading ? <Loader2 size={20} className="animate-spin text-[var(--accent)]" /> : <UploadCloud size={20} className="text-[var(--accent)]" />}
        <p className="text-[12px] font-medium text-[var(--ink)]">{uploading ? 'Uploading…' : 'Click or drag images here'}</p>
        <p className="text-[10.5px] text-[var(--ink-muted)]">JPG, PNG or WebP · up to 5 MB each · max {max} images</p>
        <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {images.length > 0 && (
        <ul className="mt-3 space-y-2">
          {images.map((img, i) => (
            <li
              key={img.url + i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex != null && dragIndex !== i) move(dragIndex, i);
                setDragIndex(null);
              }}
              className="flex flex-wrap items-center gap-2.5 rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] p-2"
            >
              <GripVertical size={13} className="cursor-grab text-[var(--ink-muted)]" />
              <img src={img.url} alt={img.alt || ''} className="h-14 w-11 rounded object-cover" loading="lazy" />
              <div className="grid min-w-[140px] flex-1 gap-1.5 sm:grid-cols-2">
                <input
                  value={img.alt || ''}
                  onChange={(e) => setAlt(i, e.target.value)}
                  placeholder="Alt text (for SEO)"
                  className="h-7 w-full rounded border border-[var(--line-color)] bg-[var(--surface)] px-2 text-[11px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                />
                <select
                  value={img.color || ''}
                  onChange={(e) => setColor(i, e.target.value)}
                  className="h-7 w-full rounded border border-[var(--line-color)] bg-[var(--surface)] px-2 text-[11px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                >
                  <option value="">Any colour</option>
                  {colors.map((c) => (
                    <option key={c.name || c} value={c.name || c}>
                      {c.name || c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => move(i, 0)} title="Make primary" className={`rounded p-1.5 hover:bg-[var(--surface-sunken)] ${i === 0 ? 'text-[#C99A2E]' : 'text-[var(--ink-muted)]'}`}>
                  <Star size={12} fill={i === 0 ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] disabled:opacity-30" title="Move up">
                  ↑
                </button>
                <button onClick={() => move(i, i + 1)} disabled={i === images.length - 1} className="rounded p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)] disabled:opacity-30" title="Move down">
                  ↓
                </button>
                <button onClick={() => remove(i)} className="rounded p-1.5 text-[var(--ink-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40" title="Remove">
                  <Trash2 size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {images.length === 0 && !uploading && (
        <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[var(--ink-muted)]">
          <ImagePlus size={11} /> The first image is used as the product's primary thumbnail.
        </p>
      )}
    </div>
  );
}
