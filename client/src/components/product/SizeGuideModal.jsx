import { Modal } from '../ui/Modal.jsx';
import { SIZE_CHART } from '../../constants/sizeChart.js';

export default function SizeGuideModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Size Guide"
      subtitle="Bust, waist and hip are body measurements. All measurements in inches."
      size="lg"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <caption className="sr-only">Vimuhet size chart with body measurements by size</caption>
          <thead>
            <tr className="border-b border-[var(--line-color)] text-left text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              <th scope="col" className="py-2.5 pr-3 font-semibold">Size</th>
              <th scope="col" className="py-2.5 pr-3 font-semibold">Bust</th>
              <th scope="col" className="py-2.5 pr-3 font-semibold">Waist</th>
              <th scope="col" className="py-2.5 pr-3 font-semibold">Hip</th>
              <th scope="col" className="py-2.5 font-semibold">Kurti length</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_CHART.map((r) => (
              <tr key={r.size} className="border-b border-[var(--line-color)]/60 last:border-0">
                <th scope="row" className="py-2.5 pr-3 text-left font-medium text-[var(--ink)]">{r.size}</th>
                <td className="py-2.5 pr-3 tabular-nums text-[var(--ink-muted)]">{r.bust[0]}–{r.bust[1]}</td>
                <td className="py-2.5 pr-3 tabular-nums text-[var(--ink-muted)]">{r.waist[0]}–{r.waist[1]}</td>
                <td className="py-2.5 pr-3 tabular-nums text-[var(--ink-muted)]">{r.hip[0]}–{r.hip[1]}</td>
                <td className="py-2.5 tabular-nums text-[var(--ink-muted)]">{r.length}&quot;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 space-y-2 rounded-xl bg-[var(--surface-sunken)] p-4 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
        <p>
          <strong className="text-[var(--ink)]">How to measure:</strong> measure around the fullest part of the bust, the narrowest part of the
          waist, and the fullest part of the hips, keeping the tape parallel to the floor.
        </p>
        <p>
          Between sizes? Size up for straight kurtis and stay true to size for flared anarkalis. On any product page,{' '}
          <strong className="text-[var(--ink)]">Find your size</strong> will match your measurements to this chart. Our care team can help on{' '}
          <a href="mailto:care@vimuhet.com" className="text-[var(--accent)] hover:underline">care@vimuhet.com</a>.
        </p>
      </div>
    </Modal>
  );
}
