"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { getAdminToken } from "@/lib/admin-client";

/**
 * Multi-photo uploader.
 * - drag & drop or pick several files at once
 * - uploads straight to Cloudinary (falls back to PostgreSQL storage)
 * - reorder, set cover, remove, or paste an external image URL
 */
export default function ImageUploader({ images = [], onChange }) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const inputRef = useRef(null);

  function update(next) {
    onChange(next.filter(Boolean).slice(0, 12));
  }

  function uploadFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => /^image\//.test(f.type));
    if (!files.length) {
      setError("Please choose image files (jpg, png, webp).");
      return;
    }
    setError("");

    const body = new FormData();
    files.forEach((file) => body.append("files", file));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");
    const token = getAdminToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      setProgress(null);
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          const urls = (data.uploaded || []).map((u) => u.url);
          if (!urls.length) setError(data.failed?.[0]?.reason || "Upload failed");
          update([...images, ...urls]);
          if (data.failed?.length) setError(`${data.failed.length} file(s) failed: ${data.failed[0].reason}`);
        } else {
          setError(data.error || "Upload failed");
        }
      } catch {
        setError("Unexpected server response");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("Network error while uploading");
    };
    setProgress(0);
    xhr.send(body);
  }

  function move(index, dir) {
    const next = [...images];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragging ? "border-gold bg-gold/5" : "border-white/15 hover:border-gold/60 hover:bg-white/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="text-3xl">🖼️</span>
        <p className="mt-3 text-sm text-cream/75">
          {dragging ? "Drop to upload" : "Drag & drop product photos here"}
        </p>
        <p className="mt-1 text-[0.62rem] uppercase tracking-[0.2em] text-cream/35">
          select multiple files · jpg / png / webp · up to 12 photos
        </p>
      </div>

      <AnimatePresence>
        {progress !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--grad)" }}
                animate={{ width: `${Math.max(8, progress)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="mt-2 text-[0.6rem] uppercase tracking-[0.2em] text-cream/45">Uploading… {progress}%</p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="mt-3 text-xs text-rose">{error}</p>}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          placeholder="…or paste an image URL (https://…)"
          className="w-full rounded-xl border border-white/12 bg-ink/60 px-4 py-3 text-sm text-cream placeholder:text-cream/30 focus:border-gold focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            if (!/^https?:\/\//.test(urlValue.trim())) {
              setError("URL must start with http:// or https://");
              return;
            }
            setError("");
            update([...images, urlValue.trim()]);
            setUrlValue("");
          }}
          className="shrink-0 rounded-xl border border-white/15 px-5 py-3 text-[0.6rem] uppercase tracking-[0.2em] text-cream/70 transition hover:border-gold hover:text-gold"
        >
          Add URL
        </button>
      </div>

      {images.length > 0 && (
        <>
          <p className="mt-6 text-[0.58rem] uppercase tracking-[0.28em] text-cream/40">
            {images.length} photo{images.length > 1 ? "s" : ""} · first one is the cover
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <AnimatePresence>
              {images.map((src, i) => (
                <motion.div
                  key={`${src}-${i}`}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`group relative aspect-[3/4] overflow-hidden rounded-xl border ${
                    i === 0 ? "border-gold" : "border-white/12"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span
                      className="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.14em] text-ink"
                      style={{ background: "var(--grad)" }}
                    >
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/85 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex gap-1">
                      <IconBtn label="←" onClick={() => move(i, -1)} />
                      <IconBtn label="→" onClick={() => move(i, 1)} />
                    </div>
                    <IconBtn label="✕" danger onClick={() => update(images.filter((_, idx) => idx !== i))} />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 text-xs transition ${
        danger ? "text-cream/70 hover:border-rose hover:text-rose" : "text-cream/70 hover:border-gold hover:text-gold"
      }`}
    >
      {label}
    </button>
  );
}
