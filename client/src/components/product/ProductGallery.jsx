import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, Maximize2, X, ZoomIn } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import useScrollLock from '../../hooks/useScrollLock.js';
import { imageSet, resizeImage } from '../../utils/format.js';

export default function ProductGallery({ product, images = [], activeIndex, onChange }) {
  const { toggleWishlist, isWishlisted } = useCart();
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);
  useScrollLock(zoomOpen);
  const frameRef = useRef(null);

  const current = images[activeIndex] || images[0];
  const wishlisted = isWishlisted(product._id);

  useEffect(() => {
    if (!zoomOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setZoomOpen(false);
      if (e.key === 'ArrowRight') onChange((activeIndex + 1) % images.length);
      if (e.key === 'ArrowLeft') onChange((activeIndex - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomOpen, activeIndex, images.length, onChange]);

  const onMove = (e) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    setZoomPos({
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    });
  };

  if (!current) return <div className="aspect-[4/5] rounded-2xl bg-[var(--surface-sunken)]" />;
  const src = imageSet(current.url);

  return (
    <div className="lg:sticky lg:top-24">
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {/* Thumbnails */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:w-[74px] sm:flex-col sm:overflow-visible sm:pb-0">
          {images.map((img, i) => {
            const thumb = imageSet(img.url);
            return (
              <button
                key={img._id || i}
                onClick={() => onChange(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === activeIndex}
                className={`relative shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === activeIndex ? 'border-[var(--accent)]' : 'border-transparent opacity-75 hover:opacity-100'
                }`}
              >
                <img
                  src={resizeImage(img.url, 400)}
                  alt=""
                  className="h-[74px] w-[60px] object-cover sm:h-[88px] sm:w-[70px]"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            );
          })}
        </div>

        {/* Main image */}
        <div
          ref={frameRef}
          className="group relative flex-1 overflow-hidden rounded-2xl bg-[var(--surface-sunken)]"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onMouseMove={onMove}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={current.url}
              src={src.src}
              srcSet={src.srcSet}
              sizes="(max-width: 1024px) 100vw, 560px"
              alt={`${product.name}${current.type ? ` — ${current.type} view` : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="aspect-[4/5] w-full object-cover transition-transform duration-500"
              style={hovering ? { transform: 'scale(1.7)', transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
              fetchPriority="high"
            />
          </AnimatePresence>

          <button
            onClick={() => toggleWishlist(product._id)}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition ${
              wishlisted ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-white/70 bg-white/85 text-[#78152F] hover:bg-white dark:border-white/10 dark:bg-black/40 dark:text-[#f4ebe4]'
            }`}
          >
            <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => setZoomOpen(true)}
            aria-label="View full screen"
            className="absolute bottom-3 right-3 flex h-9 items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#78152F] backdrop-blur transition hover:bg-white dark:border-white/10 dark:bg-black/50 dark:text-[#f4ebe4]"
          >
            <Maximize2 size={12} /> View
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={() => onChange((activeIndex - 1 + images.length) % images.length)}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#78152F] opacity-0 backdrop-blur transition group-hover:opacity-100 dark:bg-black/50 dark:text-[#f4ebe4] max-sm:opacity-100"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => onChange((activeIndex + 1) % images.length)}
                aria-label="Next image"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#78152F] opacity-0 backdrop-blur transition group-hover:opacity-100 dark:bg-black/50 dark:text-[#f4ebe4] max-sm:opacity-100"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
                {images.map((_, i) => (
                  <span key={i} className={`h-1 rounded-full transition-[width,background-color] ${i === activeIndex ? 'w-5 bg-white' : 'w-1 bg-white/60'}`} />
                ))}
              </div>
            </>
          )}

          <span className="pointer-events-none absolute left-3 top-3 hidden items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#78152F] backdrop-blur group-hover:flex">
            <ZoomIn size={11} /> Hover to zoom
          </span>
        </div>
      </div>

      {zoomOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1c0a11]/95 p-4"
              onClick={() => setZoomOpen(false)}
            >
              <button aria-label="Close viewer" className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                <X size={20} />
              </button>
              <motion.img
                key={current.url}
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={resizeImage(current.url, 1500)}
                alt={product.name}
                className="max-h-[88vh] max-w-full rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange((activeIndex - 1 + images.length) % images.length);
                }}
                aria-label="Previous image"
                className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange((activeIndex + 1) % images.length);
                }}
                aria-label="Next image"
                className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight size={20} />
              </button>
              <p className="absolute bottom-5 text-[11px] uppercase tracking-[0.18em] text-white/60">
                {activeIndex + 1} / {images.length}
              </p>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
