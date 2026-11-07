import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Info, Layers, Percent, Save, Sparkles, Tag } from 'lucide-react';
import { adminApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { AdminPageHeader } from '../../layouts/AdminLayout.jsx';
import { Panel } from '../../components/admin/AdminUI.jsx';
import ImageUploader from '../../components/admin/ImageUploader.jsx';
import { Input, Textarea, Select, Toggle, Checkbox } from '../../components/ui/Field.jsx';
import Button from '../../components/ui/Button.jsx';
import { Alert, Skeleton, ErrorState } from '../../components/ui/States.jsx';
import { useToast } from '../../context/UIContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { inr, discountPercent, slugify } from '../../utils/format.js';
import { SIZES } from '../../constants/index.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';

const EMPTY = {
  name: '',
  sku: '',
  shortDescription: '',
  description: '',
  category: '',
  collections: [],
  price: '',
  mrp: '',
  taxPercent: 5,
  sizes: [],
  colors: [],
  images: [],
  status: 'DRAFT',
  isFeatured: false,
  isNewArrival: false,
  tags: '',
  lowStockThreshold: 5,
  attributes: { fabric: '', pattern: '', sleeve: '', neckline: '', length: '', fit: '', occasion: '', washCare: '', work: '', packageContains: '' },
  meta: { title: '', description: '' },
  variants: [],
};

const COLOR_PRESETS = [
  { name: 'Wine', hex: '#78152F' },
  { name: 'Rose', hex: '#D9A5A5' },
  { name: 'Ivory', hex: '#FFF9F3' },
  { name: 'Mustard', hex: '#C99A2E' },
  { name: 'Sage', hex: '#6C7A61' },
  { name: 'Navy', hex: '#25324A' },
  { name: 'Black', hex: '#282323' },
  { name: 'Teal', hex: '#1F6B63' },
  { name: 'Lilac', hex: '#9B8BB4' },
  { name: 'Blush', hex: '#E8B6B0' },
];

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  useDocumentTitle(isEdit ? 'Edit Product' : 'Add Product', 'Create or edit a Vimuhet product.');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { categories, collections } = useStore();

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('basics');
  const [newColor, setNewColor] = useState({ name: '', hex: '#78152F' });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    adminApi
      .product(id)
      .then((res) => {
        const p = res.data;
        setForm({
          ...EMPTY,
          ...p,
          category: p.category?._id || p.category || '',
          collections: (p.collections || []).map((c) => c._id || c),
          price: p.price ?? '',
          mrp: p.mrp ?? '',
          tags: (p.tags || []).join(', '),
          colors: (p.colors || []).map((c) => ({ name: c.name, hex: c.hex })),
          sizes: p.sizes || [],
          images: (p.images || []).map((i) => ({ url: i.url, publicId: i.publicId, alt: i.alt, color: i.color })),
          attributes: { ...EMPTY.attributes, ...(p.attributes || {}) },
          meta: { ...EMPTY.meta, ...(p.meta || {}) },
          variants: (p.variants || []).map((v) => ({ _id: v._id, sku: v.sku, size: v.size, color: v.color, stock: v.stock, price: v.price, mrp: v.mrp, lowStockThreshold: v.lowStockThreshold })),
        });
      })
      .catch((err) => setError(apiErrorMessage(err, 'Could not load this product')))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  /* Rebuild the size × colour stock grid whenever the matrix changes. */
  const variantMatrix = useMemo(() => {
    if (!form.sizes.length || !form.colors.length) return [];
    return form.sizes.flatMap((size) =>
      form.colors.map((color) => {
        const existing = form.variants.find((v) => v.size === size && v.color === color.name);
        return {
          size,
          color: color.name,
          stock: existing?.stock ?? 0,
          sku: existing?.sku || `${(form.sku || 'SKU').toUpperCase()}-${size}-${(color.name || '').slice(0, 3).toUpperCase()}`,
        };
      })
    );
  }, [form.sizes, form.colors, form.variants, form.sku]);

  const totalStock = variantMatrix.reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const margin = Number(form.mrp) > 0 ? discountPercent(Number(form.price) || 0, Number(form.mrp)) : 0;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setAttr = (key, value) => setForm((f) => ({ ...f, attributes: { ...f.attributes, [key]: value } }));

  const toggleSize = (size) => set('sizes', form.sizes.includes(size) ? form.sizes.filter((s) => s !== size) : [...form.sizes, size]);
  const toggleCollection = (cid) => set('collections', form.collections.includes(cid) ? form.collections.filter((c) => c !== cid) : [...form.collections, cid]);

  const addColor = () => {
    if (!newColor.name.trim()) return;
    if (form.colors.some((c) => c.name.toLowerCase() === newColor.name.trim().toLowerCase())) {
      toast('That colour is already added', 'error');
      return;
    }
    set('colors', [...form.colors, { name: newColor.name.trim(), hex: newColor.hex }]);
    setNewColor({ name: '', hex: '#78152F' });
  };

  const setStock = (size, color, value) => {
    const qty = Math.max(0, Number(value) || 0);
    setForm((f) => {
      const existing = f.variants.find((v) => v.size === size && v.color === color);
      const sku = existing?.sku || `${(f.sku || 'SKU').toUpperCase()}-${size}-${color.slice(0, 3).toUpperCase()}`;
      const variants = existing
        ? f.variants.map((v) => (v.size === size && v.color === color ? { ...v, stock: qty } : v))
        : [...f.variants, { sku, size, color, stock: qty }];
      return { ...f, variants };
    });
  };

  const validate = () => {
    if (!form.name.trim()) return 'Product name is required';
    if (!form.category) return 'Choose a category';
    if (form.price === '' || Number(form.price) < 0) return 'Enter a valid selling price';
    if (form.mrp === '' || Number(form.mrp) < Number(form.price)) return 'MRP must be greater than or equal to the selling price';
    if (!form.sizes.length) return 'Select at least one size';
    if (!form.colors.length) return 'Add at least one colour';
    if (!form.images.length) return 'Upload at least one product image';
    return '';
  };

  const submit = async (status) => {
    const problem = validate();
    if (problem) {
      setError(problem);
      toast(problem, 'error');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku || undefined,
        shortDescription: form.shortDescription,
        description: form.description,
        category: form.category,
        collections: form.collections,
        price: Number(form.price),
        mrp: Number(form.mrp),
        taxPercent: Number(form.taxPercent) || 5,
        sizes: form.sizes,
        colors: form.colors,
        images: form.images,
        status: status || form.status,
        isFeatured: form.isFeatured,
        isNewArrival: form.isNewArrival,
        lowStockThreshold: Number(form.lowStockThreshold) || 5,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        attributes: form.attributes,
        meta: form.meta,
      };
      if (variantMatrix.length) {
        payload.variants = variantMatrix.map((v) => {
          const existing = form.variants.find((x) => x.size === v.size && x.color === v.color);
          return { ...(existing?._id ? { _id: existing._id } : {}), size: v.size, color: v.color, stock: Number(v.stock) || 0, sku: v.sku };
        });
      }

      if (isEdit) {
        await adminApi.updateProduct(id, payload);
        toast('Product updated');
      } else {
        const res = await adminApi.createProduct(payload);
        toast('Product created');
        navigate(`/admin/products/${res.data._id}/edit`);
        return;
      }
      navigate('/admin/products');
    } catch (err) {
      const message = apiErrorMessage(err, 'Could not save this product');
      setError(message);
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton className="h-[500px] w-full rounded-xl" />;
  if (error && !form.name && isEdit) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const TABS = [
    { id: 'basics', label: 'Basics' },
    { id: 'pricing', label: 'Pricing & Stock' },
    { id: 'images', label: 'Images' },
    { id: 'details', label: 'Details & SEO' },
  ];

  return (
    <div>
      <AdminPageHeader
        title={isEdit ? `Edit: ${form.name || 'Product'}` : 'Add Product'}
        subtitle={isEdit ? form.sku : 'Create a new piece for the catalogue'}
        breadcrumb={isEdit ? 'Edit product' : 'Add product'}
        actions={
          <>
            <Button to="/admin/products" variant="outline" size="sm" icon={ArrowLeft}>
              Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => submit('DRAFT')} loading={saving}>
              Save draft
            </Button>
            <Button size="sm" onClick={() => submit('ACTIVE')} loading={saving} icon={Check}>
              {form.status === 'ACTIVE' ? 'Save & keep live' : 'Publish'}
            </Button>
          </>
        }
      />

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

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

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {tab === 'basics' && (
            <Panel title="Product Information" subtitle="What the customer sees first">
              <div className="grid gap-4">
                <Input label="Product name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Hand-embroidered Cotton Kurti" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="SKU" value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} placeholder="Auto-generated if blank" hint={<span className="text-[9px] uppercase">Optional</span>} />
                  <Input label="URL slug" value={form.slug ? `${form.slug}` : slugify(form.name || '')} readOnly disabled hint={<span className="text-[9px] uppercase">Auto</span>} />
                </div>
                <Textarea label="Short description" rows={2} maxLength={300} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} placeholder="One line that sells the piece (max 300 characters)" />
                <Textarea label="Full description" rows={7} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Fabric, fit, styling notes, care…" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Category"
                    required
                    placeholder="Select category"
                    options={(categories || []).map((c) => ({ value: c._id, label: c.name }))}
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                  />
                  <Input label="Low stock threshold" type="number" min={0} value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} />
                </div>

                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                    <Layers size={11} /> Collections
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(collections || []).map((c) => (
                      <button
                        key={c._id}
                        onClick={() => toggleCollection(c._id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                          form.collections.includes(c._id)
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--line-color)] text-[var(--ink-muted)] hover:border-[var(--accent)]'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {tab === 'pricing' && (
            <>
              <Panel title="Pricing" subtitle="Prices are in INR and inclusive of GST">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input label="Selling price (₹)" required type="number" min={0} value={form.price} onChange={(e) => set('price', e.target.value)} />
                  <Input label="MRP (₹)" required type="number" min={0} value={form.mrp} onChange={(e) => set('mrp', e.target.value)} />
                  <Input label="GST %" type="number" min={0} max={28} value={form.taxPercent} onChange={(e) => set('taxPercent', e.target.value)} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[11.5px]">
                  <span className="flex items-center gap-1 text-[var(--accent)]">
                    <Percent size={12} /> {margin}% off MRP
                  </span>
                  <span className="text-[var(--ink-muted)]">Customer pays {inr(Number(form.price) || 0)}</span>
                  {Number(form.mrp) > Number(form.price) && <span className="text-[var(--ink-muted)] line-through">{inr(Number(form.mrp) || 0)}</span>}
                </div>
              </Panel>

              <Panel title="Sizes & Colours" subtitle="Variants are created from this matrix">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Available sizes</p>
                <div className="flex flex-wrap gap-1.5">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleSize(s)}
                      className={`h-8 min-w-10 rounded-md border px-2 text-[11.5px] transition ${
                        form.sizes.includes(s) ? 'border-[var(--accent)] bg-[var(--accent)] text-white dark:text-[#1a1113]' : 'border-[var(--line-color)] text-[var(--ink)] hover:border-[var(--accent)]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Colours</p>
                <div className="flex flex-wrap gap-1.5">
                  {form.colors.map((c) => (
                    <span key={c.name} className="flex items-center gap-1.5 rounded-full border border-[var(--line-color)] py-1 pl-2 pr-1 text-[11px]">
                      <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: c.hex }} />
                      {c.name}
                      <button onClick={() => set('colors', form.colors.filter((x) => x.name !== c.name))} className="rounded-full px-1 text-[var(--ink-muted)] hover:text-red-600" aria-label={`Remove ${c.name}`}>
                        ×
                      </button>
                    </span>
                  ))}
                  {form.colors.length === 0 && <span className="text-[11.5px] text-[var(--ink-muted)]">No colours yet</span>}
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <Input label="Colour name" value={newColor.name} onChange={(e) => setNewColor({ ...newColor, name: e.target.value })} placeholder="e.g. Wine" containerClass="flex-1 min-w-[140px]" />
                  <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Swatch</p>
                    <input type="color" value={newColor.hex} onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg border border-[var(--line-color)] bg-transparent" aria-label="Colour swatch" />
                  </div>
                  <Button variant="outline" size="md" onClick={addColor}>
                    Add
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.filter((p) => !form.colors.some((c) => c.name === p.name)).map((p) => (
                    <button
                      key={p.name}
                      onClick={() => set('colors', [...form.colors, p])}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--line-color)] px-2 py-1 text-[10.5px] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.hex }} /> {p.name}
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title="Stock per Variant" subtitle={`${variantMatrix.length} variants · ${totalStock} units total`}>
                {variantMatrix.length === 0 ? (
                  <p className="py-4 text-center text-[12px] text-[var(--ink-muted)]">Select sizes and add colours to build the stock grid.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left">
                      <thead>
                        <tr className="border-b border-[var(--line-color)]">
                          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Size</th>
                          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Colour</th>
                          <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">SKU</th>
                          <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variantMatrix.map((v) => (
                          <tr key={`${v.size}-${v.color}`} className="border-b border-[var(--line-color)] last:border-0">
                            <td className="px-2 py-1.5 text-[12px] font-medium">{v.size}</td>
                            <td className="px-2 py-1.5 text-[12px]">{v.color}</td>
                            <td className="px-2 py-1.5 font-mono text-[10.5px] text-[var(--ink-muted)]">{v.sku}</td>
                            <td className="px-2 py-1.5 text-right">
                              <input
                                type="number"
                                min={0}
                                value={v.stock}
                                onChange={(e) => setStock(v.size, v.color, e.target.value)}
                                className="h-8 w-20 rounded-md border border-[var(--line-color)] bg-[var(--surface)] px-2 text-right text-[12px] outline-none focus:border-[var(--accent)]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}

          {tab === 'images' && (
            <Panel title="Product Images" subtitle="First image is the thumbnail · drag to reorder">
              <ImageUploader images={form.images} onChange={(imgs) => set('images', imgs)} colors={form.colors} max={8} />
            </Panel>
          )}

          {tab === 'details' && (
            <>
              <Panel title="Product Details" subtitle="Fabric and fit information shown on the product page">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Fabric" value={form.attributes.fabric} onChange={(e) => setAttr('fabric', e.target.value)} placeholder="e.g. Pure cotton" />
                  <Input label="Pattern" value={form.attributes.pattern} onChange={(e) => setAttr('pattern', e.target.value)} placeholder="e.g. Floral print" />
                  <Input label="Sleeve" value={form.attributes.sleeve} onChange={(e) => setAttr('sleeve', e.target.value)} placeholder="e.g. Three-quarter" />
                  <Input label="Neckline" value={form.attributes.neckline} onChange={(e) => setAttr('neckline', e.target.value)} placeholder="e.g. Round neck" />
                  <Input label="Length" value={form.attributes.length} onChange={(e) => setAttr('length', e.target.value)} placeholder="e.g. Calf length" />
                  <Input label="Fit" value={form.attributes.fit} onChange={(e) => setAttr('fit', e.target.value)} placeholder="e.g. Straight" />
                  <Input label="Occasion" value={form.attributes.occasion} onChange={(e) => setAttr('occasion', e.target.value)} placeholder="e.g. Festive" />
                  <Input label="Work" value={form.attributes.work} onChange={(e) => setAttr('work', e.target.value)} placeholder="e.g. Hand embroidery" />
                  <Input label="Wash care" value={form.attributes.washCare} onChange={(e) => setAttr('washCare', e.target.value)} placeholder="e.g. Gentle hand wash" />
                  <Input label="Package contains" value={form.attributes.packageContains} onChange={(e) => setAttr('packageContains', e.target.value)} placeholder="e.g. 1 kurti" />
                </div>
                <div className="mt-4">
                  <Input
                    label="Tags"
                    value={form.tags}
                    onChange={(e) => set('tags', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput) e.preventDefault();
                    }}
                    placeholder="cotton, festive, hand-embroidery (comma separated)"
                    hint={<span className="text-[9px] uppercase">Comma separated</span>}
                  />
                </div>
              </Panel>

              <Panel title="SEO" subtitle="How this product appears in search results">
                <div className="grid gap-4">
                  <Input label="Meta title" value={form.meta.title} onChange={(e) => set('meta', { ...form.meta, title: e.target.value })} placeholder={form.name || 'Product meta title'} />
                  <Textarea label="Meta description" rows={3} value={form.meta.description} onChange={(e) => set('meta', { ...form.meta, description: e.target.value })} placeholder={form.shortDescription || 'Product meta description'} />
                </div>
              </Panel>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Panel title="Publish">
            <div className="space-y-3">
              <Select label="Status" options={[{ value: 'DRAFT', label: 'Draft' }, { value: 'ACTIVE', label: 'Active' }, { value: 'ARCHIVED', label: 'Archived' }]} value={form.status} onChange={(e) => set('status', e.target.value)} />
              <Toggle label="Featured product" checked={form.isFeatured} onChange={() => set('isFeatured', !form.isFeatured)} />
              <Toggle label="New arrival" checked={form.isNewArrival} onChange={() => set('isNewArrival', !form.isNewArrival)} />
              <div className="border-t border-[var(--line-color)] pt-3">
                <Button className="w-full" size="md" onClick={() => submit()} loading={saving} icon={Save}>
                  {isEdit ? 'Save changes' : 'Create product'}
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Summary">
            <ul className="space-y-2 text-[11.5px]">
              {[
                ['Images', `${form.images.length}/8`],
                ['Sizes', form.sizes.length ? form.sizes.join(', ') : '—'],
                ['Colours', form.colors.length ? form.colors.map((c) => c.name).join(', ') : '—'],
                ['Variants', variantMatrix.length],
                ['Total stock', totalStock],
                ['Price', inr(Number(form.price) || 0)],
              ].map(([k, v]) => (
                <li key={k} className="flex items-start justify-between gap-2">
                  <span className="text-[var(--ink-muted)]">{k}</span>
                  <span className="text-right font-medium text-[var(--ink)]">{v}</span>
                </li>
              ))}
            </ul>
            {form.images[0] && <img src={form.images[0].url} alt="" className="mt-3 h-36 w-full rounded-lg object-cover" />}
          </Panel>

          <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-sunken)] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink)]">
              <Info size={12} className="text-[var(--accent)]" /> Good to know
            </p>
            <ul className="mt-1.5 space-y-1 text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
              <li>• Stock is the sum of all variant quantities and drives the storefront availability badge.</li>
              <li>• Publishing sets the product live immediately in the storefront catalogue.</li>
              <li>• Images are stored on the media provider — only URLs are saved to the database.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink)]">
              <Sparkles size={12} className="text-[var(--accent)]" /> Next steps
            </p>
            <Link to="/admin/inventory" className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline">
              <Tag size={10} /> Manage inventory levels
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
