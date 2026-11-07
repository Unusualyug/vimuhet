import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, Ruler, Sparkles, Users } from 'lucide-react';
import {
  BUST_RANGE,
  HEIGHT_RANGE,
  SIZE_CHART,
  formatHeight,
  recommendSize,
  summariseSizeStats,
} from '../../constants/sizeChart.js';
import { catalogApi } from '../../services/endpoints.js';

/** A brand-styled range input. The native thumb is hidden; the fill + knob are ours. */
function MeasureSlider({ id, label, value, unit, display, min, max, step = 1, onChange, ticks }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--ink-muted)]">
          {label}
        </label>
        <span className="font-display text-[17px] text-[var(--accent)] tabular-nums" aria-hidden="true">
          {display ? display(value) : `${value}${unit}`}
        </span>
      </div>

      <div className="relative mt-2.5 h-6">
        {/* track */}
        <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-[var(--line-color)]" />
        {/* filled portion */}
        <div
          className="absolute left-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]/25"
          style={{ width: `${pct}%` }}
        />
        {/* knob */}
        <div
          className="pointer-events-none absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--accent)] bg-[var(--accent)] shadow-[0_2px_8px_rgba(61,16,29,0.28)]"
          style={{ left: `${pct}%` }}
          aria-hidden="true"
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={unit === ' in' ? `${value} inches` : formatHeight(value)}
          className="absolute inset-0 h-6 w-full cursor-pointer appearance-none bg-transparent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-transparent [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent"
        />
      </div>

      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-[var(--ink-muted)]" aria-hidden="true">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}

const CONFIDENCE_COPY = {
  high: 'A confident match from the measurements you gave.',
  medium: 'A close match — check the fit note below before you decide.',
  low: 'Add a bust measurement for a recommendation.',
};

export default function SizeFinder({ product, open, onApply }) {
  const [height, setHeight] = useState(HEIGHT_RANGE.default);
  const [bust, setBust] = useState(BUST_RANGE.default);
  const [stats, setStats] = useState(null);

  // Sizes the customer can actually buy, and separately those with live stock.
  const { listedSizes, inStockSizes } = useMemo(() => {
    const variants = product?.variants || [];
    const listed = new Set(variants.map((v) => v.size).filter(Boolean));
    const stocked = new Set(
      variants
        .filter((v) => Number(v.stock || 0) - Number(v.reserved || 0) > 0)
        .map((v) => v.size)
        .filter(Boolean)
    );
    return {
      listedSizes: listed.size ? [...listed] : SIZE_CHART.map((r) => r.size),
      inStockSizes: stocked,
    };
  }, [product]);

  const availableSizes = inStockSizes.size ? [...inStockSizes] : listedSizes;

  // Real purchase data for this product. Failure is silent — the finder works
  // purely from measurements, the social proof is a bonus.
  useEffect(() => {
    if (!open || !product?._id) return undefined;
    let alive = true;
    catalogApi
      .sizeStats(product._id)
      .then((res) => alive && setStats(res.data))
      .catch(() => alive && setStats(null));
    return () => {
      alive = false;
    };
  }, [open, product?._id]);

  const result = useMemo(
    () => recommendSize({ bust, height, availableSizes }),
    [bust, height, availableSizes]
  );

  const social = summariseSizeStats(stats?.sizeCounts);
  const applied = product?.selectedSize && product.selectedSize === result.size;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <section
            aria-label="Find your size"
            className="mt-4 rounded-2xl border border-[var(--line-color)] bg-[var(--surface-sunken)] p-5 sm:p-6"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <Ruler size={15} />
              </span>
              <div>
                <h3 className="font-display text-[19px] leading-tight text-[var(--ink)]">Find your size</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                  Answer two things. We&rsquo;ll match you to the fit chart
                  {social.total > 0 ? ' and show what other customers chose.' : '.'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-6 md:grid-cols-2 md:gap-8">
              {/* ---- inputs ---- */}
              <div className="space-y-5">
                <MeasureSlider
                  id="sf-height"
                  label="Height"
                  value={height}
                  display={formatHeight}
                  min={HEIGHT_RANGE.min}
                  max={HEIGHT_RANGE.max}
                  onChange={setHeight}
                  ticks={[formatHeight(HEIGHT_RANGE.min), formatHeight(HEIGHT_RANGE.max)]}
                />
                <MeasureSlider
                  id="sf-bust"
                  label="Bust"
                  value={bust}
                  unit=" in"
                  min={BUST_RANGE.min}
                  max={BUST_RANGE.max}
                  onChange={setBust}
                  ticks={[`${BUST_RANGE.min}"`, `${BUST_RANGE.max}"`]}
                />
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--ink-muted)]">
                  <Info size={12} className="mt-[1px] shrink-0" />
                  Measure around the fullest part of your bust, keeping the tape level and snug — not tight.
                </p>
              </div>

              {/* ---- result ---- */}
              <div className="flex flex-col justify-center rounded-xl border border-[var(--accent)]/25 bg-[var(--surface-raised)] p-5 text-center">
                {result.size ? (
                  <>
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                      We suggest
                    </p>
                    <p
                      className="mt-1 font-display text-[46px] leading-none text-[var(--accent)]"
                      aria-live="polite"
                    >
                      {result.size}
                    </p>

                    {social.total > 0 && (
                      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-[var(--ink-muted)]">
                        <Users size={12} className="shrink-0" />
                        <span>
                          Most customers chose <strong className="font-semibold text-[var(--ink)]">{social.mostOrdered}</strong> ({social.share}% of{' '}
                          {social.total} order{social.total === 1 ? '' : 's'})
                        </span>
                      </p>
                    )}

                    <ul className="mt-3 space-y-1.5 text-left">
                      <li className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
                        <Sparkles size={11} className="mt-1 shrink-0 text-[var(--accent)]" />
                        {CONFIDENCE_COPY[result.confidence]}
                      </li>
                      {result.notes.map((note) => (
                        <li key={note} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
                          <Info size={11} className="mt-1 shrink-0 text-[var(--accent)]" />
                          {note}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                      <button
                        type="button"
                        onClick={() => onApply?.(result.size)}
                        disabled={!availableSizes.includes(result.size)}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[var(--accent)] px-5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#5f0f24] disabled:opacity-50 dark:text-[#1a1113]"
                      >
                        {applied ? <Check size={13} /> : null}
                        {applied ? 'Selected' : `Select ${result.size}`}
                      </button>
                      <Link
                        to="/faqs"
                        className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line-color)] px-5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        Fit help
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="text-[12.5px] text-[var(--ink-muted)]">Move a slider to see your size.</p>
                )}
              </div>
            </div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
