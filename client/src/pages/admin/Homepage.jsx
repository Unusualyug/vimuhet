import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Eye, Home, Image as ImageIcon, Layers, Plus, Save, Sparkles, Trash2 } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel, StatusPill } from '../../components/admin/AdminUI.jsx';
import ImageUploader from '../../components/admin/ImageUploader.jsx';
import { Input, Textarea, Select, Toggle } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { Skeleton, ErrorState, Alert } from '../../components/ui/States.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { formatDateTime } from '../../utils/format.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const IMAGE_BASE = '/media/banners';

export default function AdminHomepage() {
  useDocumentTitle('Homepage CMS', 'Edit the storefront homepage.');
  const { toast } = useToast();
  const { collections, refreshHome } = useStore();
  const { can } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('hero');
  const [imageTarget, setImageTarget] = useState(null);

  const load = () => {
    setLoading(true);
    adminApi
      .homepage()
      .then((res) => {
        setData(res.data);
        setError('');
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load homepage content')))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminApi.saveHomepage({ announcement: data.announcement, hero: data.hero, sections: data.sections, status: data.status });
      setData(res.data);
      await refreshHome();
      toast('Homepage saved and live');
    } catch (err) {
      toast(apiErrorMessage(err, 'Could not save the homepage'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const setSection = (key, patch) => setData((d) => ({ ...d, sections: { ...d.sections, [key]: { ...(d.sections[key] || {}), ...patch } } }));
  const setSlide = (index, patch) => setData((d) => ({ ...d, hero: d.hero.map((h, i) => (i === index ? { ...h, ...patch } : h)) }));
  const moveSlide = (index, dir) => {
    const next = [...data.hero];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setData({ ...data, hero: next.map((h, i) => ({ ...h, sortOrder: i })) });
  };
  const addSlide = () =>
    setData((d) => ({
      ...d,
      hero: [
        ...d.hero,
        {
          eyebrow: 'NEW EDIT',
          title: 'Your headline',
          titleAccent: 'goes here',
          subtitle: '',
          image: { url: `${IMAGE_BASE}/hero-1-2000.jpg` },
          primaryCta: { label: 'Shop Now', to: '/shop' },
          secondaryCta: { label: 'Explore Collections', to: '/collections' },
          align: 'left',
          isActive: true,
          sortOrder: d.hero.length,
        },
      ],
    }));

  if (loading) return <Skeleton className="h-[520px] w-full rounded-xl" />;
  if (error || !data) return <ErrorState message={error} onRetry={load} />;

  const TABS = [
    { id: 'hero', label: 'Hero Slides' },
    { id: 'announcement', label: 'Announcement' },
    { id: 'sections', label: 'Sections' },
    { id: 'content', label: 'Copy' },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Homepage CMS"
        subtitle={`Version ${data.version} · last updated ${formatDateTime(data.updatedAt)}`}
        breadcrumb="Content"
        actions={
          <>
            <Button to="/" variant="outline" size="sm" icon={Eye}>Preview</Button>
            <Select
              options={[{ value: 'PUBLISHED', label: 'Published' }, { value: 'DRAFT', label: 'Draft' }]}
              value={data.status}
              onChange={(e) => setData({ ...data, status: e.target.value })}
              className="!h-9 !w-auto !text-[11.5px]"
            />
            <Button size="sm" onClick={save} loading={saving} icon={Save} disabled={!can('cms:write')}>
              Save & publish
            </Button>
          </>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-[var(--line-color)] bg-[var(--surface-raised)] p-1 no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${tab === t.id ? 'bg-[var(--accent)] text-white dark:text-[#1a1113]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hero' && (
        <div className="space-y-3">
          <Alert variant="info">
            These slides power the homepage carousel. Images are served from <code className="text-[11px]">/media/banners</code> — pick an existing file or upload a new one.
          </Alert>
          {data.hero.map((slide, i) => (
            <Panel
              key={slide._id || i}
              title={`Slide ${i + 1}`}
              subtitle={slide.title ? `${slide.title} ${slide.titleAccent}` : 'Untitled slide'}
              action={
                <div className="flex items-center gap-1">
                  <StatusPill tone={slide.isActive ? 'green' : 'neutral'}>{slide.isActive ? 'Active' : 'Hidden'}</StatusPill>
                  <button onClick={() => moveSlide(i, -1)} className="rounded p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]" aria-label="Move up"><ArrowUp size={13} /></button>
                  <button onClick={() => moveSlide(i, 1)} className="rounded p-1.5 text-[var(--ink-muted)] hover:bg-[var(--surface-sunken)]" aria-label="Move down"><ArrowDown size={13} /></button>
                  <button
                    onClick={() => setData({ ...data, hero: data.hero.filter((_, x) => x !== i) })}
                    className="rounded p-1.5 text-[var(--ink-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    aria-label="Delete slide"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              }
            >
              <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
                <div>
                  <img src={slide.image?.url || `${IMAGE_BASE}/hero-1-2000.jpg`} alt="" className="aspect-[20/9] w-full rounded-lg object-cover" />
                  <p className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">Desktop</p>
                  <button onClick={() => setImageTarget({ type: 'hero', index: i })} className="mt-1.5 w-full rounded-lg border border-[var(--line-color)] px-2 py-1.5 text-[11px] font-medium text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                    Change image
                  </button>
                  {/* Phones get their own portrait crop of the same shot, so the
                      model is never sliced in half on a narrow screen. */}
                  <img
                    src={slide.mobileImage?.url || slide.image?.url || `${IMAGE_BASE}/hero-1-2000.jpg`}
                    alt=""
                    className="mt-3 aspect-[4/5] w-full rounded-lg object-cover"
                  />
                  <p className="mt-1.5 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">Mobile (portrait)</p>
                  <button onClick={() => setImageTarget({ type: 'hero-mobile', index: i })} className="mt-1.5 w-full rounded-lg border border-[var(--line-color)] px-2 py-1.5 text-[11px] font-medium text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                    {slide.mobileImage?.url ? 'Change mobile image' : 'Add mobile image'}
                  </button>
                  {slide.mobileImage?.url && (
                    <button onClick={() => setSlide(i, { mobileImage: { url: '' } })} className="mt-1.5 w-full rounded-lg px-2 py-1 text-[11px] text-[var(--ink-muted)] hover:text-[var(--accent)]">
                      Use desktop image on mobile
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Eyebrow" value={slide.eyebrow || ''} onChange={(e) => setSlide(i, { eyebrow: e.target.value })} />
                  <Input label="Heading" value={slide.title || ''} onChange={(e) => setSlide(i, { title: e.target.value })} />
                  <Input label="Accent words (italic)" value={slide.titleAccent || ''} onChange={(e) => setSlide(i, { titleAccent: e.target.value })} />
                  <Select label="Text alignment" options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} value={slide.align || 'left'} onChange={(e) => setSlide(i, { align: e.target.value })} />
                  <div className="sm:col-span-2">
                    <Textarea label="Subtitle" rows={2} value={slide.subtitle || ''} onChange={(e) => setSlide(i, { subtitle: e.target.value })} />
                  </div>
                  <Input label="Primary CTA label" value={slide.primaryCta?.label || ''} onChange={(e) => setSlide(i, { primaryCta: { ...slide.primaryCta, label: e.target.value } })} />
                  <Input label="Primary CTA link" value={slide.primaryCta?.to || ''} onChange={(e) => setSlide(i, { primaryCta: { ...slide.primaryCta, to: e.target.value } })} />
                  <Input label="Secondary CTA label" value={slide.secondaryCta?.label || ''} onChange={(e) => setSlide(i, { secondaryCta: { ...slide.secondaryCta, label: e.target.value } })} />
                  <Input label="Secondary CTA link" value={slide.secondaryCta?.to || ''} onChange={(e) => setSlide(i, { secondaryCta: { ...slide.secondaryCta, to: e.target.value } })} />
                  <div className="sm:col-span-2">
                    <Toggle label="Show this slide" checked={slide.isActive !== false} onChange={(v) => setSlide(i, { isActive: v })} />
                  </div>
                </div>
              </div>
            </Panel>
          ))}
          <Button variant="outline" size="sm" icon={Plus} onClick={addSlide}>Add slide</Button>
        </div>
      )}

      {tab === 'announcement' && (
        <Panel title="Announcement bar" subtitle="The thin bar at the very top of the storefront">
          <div className="space-y-4">
            <Toggle label="Show announcement bar" checked={data.announcement?.enabled !== false} onChange={(v) => setData({ ...data, announcement: { ...data.announcement, enabled: v } })} />
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Rotating messages</p>
              <div className="space-y-2">
                {(data.announcement?.messages || []).map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={m}
                      onChange={(e) => setData({ ...data, announcement: { ...data.announcement, messages: data.announcement.messages.map((x, xi) => (xi === i ? e.target.value : x)) } })}
                      containerClass="flex-1"
                    />
                    <button
                      onClick={() => setData({ ...data, announcement: { ...data.announcement, messages: data.announcement.messages.filter((_, xi) => xi !== i) } })}
                      className="rounded-lg px-2 text-[var(--ink-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      aria-label="Remove message"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2" icon={Plus} onClick={() => setData({ ...data, announcement: { ...data.announcement, messages: [...(data.announcement?.messages || []), ''] } })}>
                Add message
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Coupon code" value={data.announcement?.couponCode || ''} onChange={(e) => setData({ ...data, announcement: { ...data.announcement, couponCode: e.target.value.toUpperCase() } })} placeholder="VIMUHET300" />
              <Input label="Offer text" value={data.announcement?.offerText || ''} onChange={(e) => setData({ ...data, announcement: { ...data.announcement, offerText: e.target.value } })} />
            </div>
          </div>
        </Panel>
      )}

      {tab === 'sections' && (
        <div className="grid gap-3 lg:grid-cols-2">
          {[
            { key: 'featuredCollections', label: 'Featured Collections', icon: Layers },
            { key: 'newArrivals', label: 'New Arrivals', icon: Sparkles },
            { key: 'bestSellers', label: 'Best Sellers', icon: Sparkles },
            { key: 'trending', label: 'Trending Now', icon: Sparkles },
            { key: 'promoBanner', label: 'Promo Banner', icon: ImageIcon },
            { key: 'brandStory', label: 'Brand Story', icon: Home },
            { key: 'testimonials', label: 'Testimonials', icon: Sparkles },
            { key: 'newsletter', label: 'Newsletter', icon: Sparkles },
          ].map((s) => (
            <Panel key={s.key} title={s.label} subtitle={`sections.${s.key}`}>
              <div className="space-y-3">
                <Toggle label="Visible on homepage" checked={data.sections?.[s.key]?.enabled !== false} onChange={(v) => setSection(s.key, { enabled: v })} />
                {s.key !== 'featuredCollections' && s.key !== 'testimonials' && s.key !== 'newsletter' && s.key !== 'promoBanner' && s.key !== 'brandStory' && (
                  <>
                    <Input label="Title" value={data.sections?.[s.key]?.title || ''} onChange={(e) => setSection(s.key, { title: e.target.value })} />
                    <Input label="Subtitle" value={data.sections?.[s.key]?.subtitle || ''} onChange={(e) => setSection(s.key, { subtitle: e.target.value })} />
                    {['newArrivals', 'bestSellers', 'trending'].includes(s.key) && (
                      <Input label="Products to show" type="number" min={2} max={12} value={data.sections?.[s.key]?.limit || 4} onChange={(e) => setSection(s.key, { limit: Number(e.target.value) })} />
                    )}
                  </>
                )}
                {s.key === 'featuredCollections' && (
                  <>
                    <Input label="Title" value={data.sections?.featuredCollections?.title || ''} onChange={(e) => setSection('featuredCollections', { title: e.target.value })} />
                    <Input label="Subtitle" value={data.sections?.featuredCollections?.subtitle || ''} onChange={(e) => setSection('featuredCollections', { subtitle: e.target.value })} />
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Collections shown</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(collections || []).map((c) => {
                          const ids = (data.sections?.featuredCollections?.collectionIds || []).map((x) => x._id || x);
                          const on = ids.includes(c._id);
                          return (
                            <button
                              key={c._id}
                              onClick={() => setSection('featuredCollections', { collectionIds: on ? ids.filter((x) => x !== c._id) : [...ids, c._id] })}
                              className={`rounded-full border px-2.5 py-1 text-[11px] transition ${on ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--line-color)] text-[var(--ink-muted)]'}`}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
                {(s.key === 'promoBanner' || s.key === 'brandStory') && (
                  <>
                    <Input label="Title" value={data.sections?.[s.key]?.title || ''} onChange={(e) => setSection(s.key, { title: e.target.value })} />
                    <Textarea label="Body" rows={3} value={data.sections?.[s.key]?.subtitle || data.sections?.[s.key]?.body || ''} onChange={(e) => setSection(s.key, s.key === 'brandStory' ? { body: e.target.value } : { subtitle: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <img src={data.sections?.[s.key]?.image?.url || `${IMAGE_BASE}/promo-festive-2000.jpg`} alt="" className="h-14 w-24 rounded object-cover" />
                      <button onClick={() => setImageTarget({ type: 'section', key: s.key })} className="rounded-lg border border-[var(--line-color)] px-2 py-1.5 text-[11px] font-medium hover:border-[var(--accent)] hover:text-[var(--accent)]">
                        Change image
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {tab === 'content' && (
        <div className="space-y-3">
          <Panel title="Newsletter" subtitle="Footer signup copy">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Title" value={data.sections?.newsletter?.title || ''} onChange={(e) => setSection('newsletter', { title: e.target.value })} />
              <Input label="Placeholder" value={data.sections?.newsletter?.placeholder || ''} onChange={(e) => setSection('newsletter', { placeholder: e.target.value })} />
              <div className="sm:col-span-2">
                <Input label="Subtitle" value={data.sections?.newsletter?.subtitle || ''} onChange={(e) => setSection('newsletter', { subtitle: e.target.value })} />
              </div>
            </div>
          </Panel>
          <Panel title="Testimonials" subtitle="Header copy for the review strip">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Title" value={data.sections?.testimonials?.title || ''} onChange={(e) => setSection('testimonials', { title: e.target.value })} />
              <Input label="Subtitle" value={data.sections?.testimonials?.subtitle || ''} onChange={(e) => setSection('testimonials', { subtitle: e.target.value })} />
            </div>
            <p className="mt-3 text-[11px] text-[var(--ink-muted)]">
              Testimonials are pulled from approved customer reviews — moderate them in{' '}
              <Link to="/admin/reviews" className="text-[var(--accent)] hover:underline">Reviews</Link>.
            </p>
          </Panel>
          <Panel title="Trust strip" subtitle="Assurance points under the hero">
            <ul className="space-y-2">
              {(data.sections?.trustStrip?.items || []).map((item, i) => (
                <li key={i} className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label={i === 0 ? 'Title' : undefined}
                    value={item.title}
                    onChange={(e) => setSection('trustStrip', { items: data.sections.trustStrip.items.map((x, xi) => (xi === i ? { ...x, title: e.target.value } : x)) })}
                  />
                  <Input
                    label={i === 0 ? 'Subtitle' : undefined}
                    value={item.subtitle}
                    onChange={(e) => setSection('trustStrip', { items: data.sections.trustStrip.items.map((x, xi) => (xi === i ? { ...x, subtitle: e.target.value } : x)) })}
                  />
                </li>
              ))}
              {!(data.sections?.trustStrip?.items || []).length && <li className="text-[11.5px] text-[var(--ink-muted)]">No trust items configured.</li>}
            </ul>
          </Panel>
        </div>
      )}

      <div className="sticky bottom-4 mt-5 flex justify-end">
        <Button onClick={save} loading={saving} icon={Save} size="lg" disabled={!can('cms:write')}>
          Save & publish homepage
        </Button>
      </div>

      {imageTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setImageTarget(null)}>
          <div className="w-full max-w-md rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-display text-lg">Choose an image</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                'hero-1', 'hero-2', 'hero-3', 'promo-festive', 'brand-story',
              ].map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    const url = `${IMAGE_BASE}/${name}-2000.jpg`;
                    if (imageTarget.type === 'hero') setSlide(imageTarget.index, { image: { url } });
                    else if (imageTarget.type === 'hero-mobile') setSlide(imageTarget.index, { mobileImage: { url } });
                    else setSection(imageTarget.key, { image: { url } });
                    setImageTarget(null);
                  }}
                  className="overflow-hidden rounded-lg border border-[var(--line-color)] hover:border-[var(--accent)]"
                >
                  <img src={`${IMAGE_BASE}/${name}-800.jpg`} alt={name} className="h-20 w-full object-cover" loading="lazy" />
                  <span className="block px-1 py-1 text-[9.5px] text-[var(--ink-muted)]">{name}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 border-t border-[var(--line-color)] pt-3">
              <ImageUploader
                images={[]}
                max={1}
                onChange={(imgs) => {
                  if (!imgs.length) return;
                  if (imageTarget.type === 'hero') setSlide(imageTarget.index, { image: imgs[0] });
                  else if (imageTarget.type === 'hero-mobile') setSlide(imageTarget.index, { mobileImage: imgs[0] });
                  else setSection(imageTarget.key, { image: imgs[0] });
                  setImageTarget(null);
                }}
              />
            </div>
            <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={() => setImageTarget(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
