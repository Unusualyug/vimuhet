import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Package, Phone, Send, Truck } from 'lucide-react';
import PageHero from '../../components/shop/PageHero.jsx';
import Button from '../../components/ui/Button.jsx';
import { Input, Textarea, Select } from '../../components/ui/Field.jsx';
import { Accordion } from '../../components/ui/Accordion.jsx';
import { Alert, EmptyState } from '../../components/ui/States.jsx';
import { FAQ_CATEGORIES } from '../../constants/index.js';
import { WHATSAPP_DISPLAY, WHATSAPP_LINK } from '../../constants/whatsapp.js';
import { miscApi, orderApi } from '../../services/endpoints.js';
import { apiErrorMessage } from '../../services/api.js';
import { useStore } from '../../context/StoreContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { isEmail, isMobile } from '../../utils/validators.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import { ORDER_STATUS_LABELS, ORDER_TIMELINE } from '../../constants/index.js';
import useDocumentTitle from '../../hooks/useDocumentTitle.js';
import { FadeIn } from '../../components/ui/Section.jsx';

/* --------------------------------- About --------------------------------- */

export function About() {
  useDocumentTitle('About Vimuhet', 'The story behind Vimuhet — premium ethnic wear made with care.');
  return (
    <>
      <PageHero
        eyebrow="Our Story"
        title="Crafted slowly,"
        accent="worn beautifully"
        description="Vimuhet is a premium women's ethnic wear label built on a simple belief: everyday pieces deserve the same care as occasion wear."
        image="/media/banners/hero-1-2000.jpg"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'About Us' }]}
      />
      <div className="container-page grid gap-10 py-14 lg:grid-cols-2 lg:gap-16">
        <FadeIn>
          <div className="space-y-5 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
            <p className="font-display text-[22px] leading-snug text-[var(--ink)]">
              We started with a question: why is comfortable ethnic wear so rarely beautiful, and beautiful ethnic wear so rarely comfortable?
            </p>
            <p>
              Vimuhet is our answer. Every piece begins with the fabric — cottons that soften with washing, georgettes that drape instead of
              cling, chanderi that holds its shape through a long day. We choose them for how they behave after ten washes, not for how they look
              under studio lights.
            </p>
            <p>
              From there, we work with small craft clusters on embroidery that earns its place: a placket, a cuff, a hem. Nothing is added to look
              expensive. Everything is added because it makes the piece better to wear.
            </p>
            <p>
              Our collections are produced in small batches. That means fewer pieces, more attention and fewer things we have to discount later.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="overflow-hidden rounded-2xl">
            <img src="/media/banners/brand-story-1000.jpg" alt="Hand embroidery detail" className="aspect-[4/5] w-full object-cover" loading="lazy" />
          </div>
        </FadeIn>
      </div>

      <div className="border-y border-[var(--line-color)] bg-[var(--surface-sunken)] py-14">
        <div className="container-page grid gap-8 sm:grid-cols-3">
          {[
            { title: 'Our Philosophy', body: 'Buy fewer, better pieces. Design for real days — commutes, desks, dinners — not just photoshoots.' },
            { title: 'Our Approach', body: 'Fabric first, fit second, embellishment third. Every style is wear-tested by our own team before it launches.' },
            { title: 'Our Values', body: 'Honest product descriptions, real reviews only, clear pricing and a returns process that does not punish you for changing your mind.' },
          ].map((v) => (
            <div key={v.title}>
              <h3 className="font-display text-xl">{v.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-muted)]">{v.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page py-14 text-center">
        <h2 className="font-display text-[26px] sm:text-[32px]">Explore the collections</h2>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-[var(--ink-muted)]">Six edits, each built around a way of dressing.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button to="/collections" size="lg">View collections</Button>
          <Button to="/shop" variant="secondary" size="lg">Shop all</Button>
        </div>
      </div>
    </>
  );
}

/* -------------------------------- Contact -------------------------------- */

export function Contact() {
  useDocumentTitle('Contact Us', 'Reach the Vimuhet care team.');
  const { general } = useStore();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', subject: 'Order enquiry', message: '' });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ loading: false, done: false, error: '' });

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your name';
    if (!isEmail(form.email)) next.email = 'Enter a valid email address';
    if (form.mobile && !isMobile(form.mobile)) next.mobile = 'Enter a valid mobile number';
    if (form.message.trim().length < 10) next.message = 'Please write at least 10 characters';
    setErrors(next);
    if (Object.keys(next).length) return;

    setState({ loading: true, done: false, error: '' });
    try {
      await miscApi.contact(form);
      setState({ loading: false, done: true, error: '' });
      setForm({ name: '', email: '', mobile: '', subject: 'Order enquiry', message: '' });
    } catch (err) {
      setState({ loading: false, done: false, error: apiErrorMessage(err, 'Could not send your message') });
    }
  };

  return (
    <>
      <PageHero eyebrow="We are here to help" title="Contact" accent="Us" description="Our care team replies within 24 hours on working days." breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Contact Us' }]} compact />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          {[
            { icon: Mail, label: 'Email', value: general.email, href: `mailto:${general.email}` },
            { icon: Phone, label: 'Phone', value: general.phone, href: `tel:${(general.phone || '').replace(/\s/g, '')}` },
            { icon: MessageCircle, label: 'WhatsApp', value: WHATSAPP_DISPLAY, href: WHATSAPP_LINK },
            { icon: MapPin, label: 'Studio', value: general.address || 'Ahmedabad, Gujarat' },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-3 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <c.icon size={15} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">{c.label}</p>
                {c.href ? (
                  <a href={c.href} target="_blank" rel="noreferrer" className="text-[13px] text-[var(--ink)] hover:text-[var(--accent)]">{c.value}</a>
                ) : (
                  <p className="text-[13px] leading-relaxed text-[var(--ink)]">{c.value}</p>
                )}
              </div>
            </div>
          ))}
          <div className="rounded-xl bg-[var(--surface-sunken)] p-4 text-[12px] leading-relaxed text-[var(--ink-muted)]">
            <p className="font-semibold text-[var(--ink)]">Support hours</p>
            <p className="mt-1">Monday – Saturday, 10:00 – 18:00 IST. Messages received on Sunday are answered on Monday.</p>
            <Link to="/faqs" className="mt-2 inline-block text-[var(--accent)] hover:underline">Browse FAQs first →</Link>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
          <h2 className="font-display text-xl">Send us a message</h2>
          {state.done && <Alert variant="success" className="mt-4">Message received. Our care team will reply within 24 hours.</Alert>}
          {state.error && <Alert variant="error" className="mt-4">{state.error}</Alert>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Your name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
            <Input label="Mobile (optional)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} error={errors.mobile} />
            <Select
              label="Subject"
              options={['Order enquiry', 'Payment issue', 'Return or refund', 'Product question', 'Feedback', 'Other']}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <Textarea label="Message" className="mt-4" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} error={errors.message} placeholder="Tell us how we can help…" />
          <Button type="submit" className="mt-4" loading={state.loading} icon={Send}>Send message</Button>
        </form>
      </div>
    </>
  );
}

/* ---------------------------------- FAQs --------------------------------- */

export function FAQs() {
  useDocumentTitle('FAQs', 'Answers to common questions about orders, payments, shipping and returns.');
  const [active, setActive] = useState(FAQ_CATEGORIES[0].id);
  const category = FAQ_CATEGORIES.find((c) => c.id === active) || FAQ_CATEGORIES[0];

  return (
    <>
      <PageHero eyebrow="Help Centre" title="Frequently Asked" accent="Questions" description="Everything about orders, payments, shipping and returns." breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'FAQs' }]} compact />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
          {FAQ_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-left text-[12.5px] transition ${
                active === c.id ? 'bg-[var(--accent)] text-white dark:text-[#1a1113]' : 'text-[var(--ink)] hover:bg-[var(--surface-sunken)]'
              }`}
            >
              {c.title}
            </button>
          ))}
        </nav>
        <div>
          <h2 className="mb-3 font-display text-2xl">{category.title}</h2>
          <Accordion items={category.items.map((item, i) => ({ id: `${category.id}-${i}`, title: item.q, content: <p>{item.a}</p> }))} defaultOpen={[`${category.id}-0`]} />
          <div className="mt-8 rounded-xl bg-[var(--surface-sunken)] p-5 text-center">
            <p className="text-[13px] text-[var(--ink)]">Still need help?</p>
            <Button to="/contact" size="sm" className="mt-3">Contact our care team</Button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------ Track Order ------------------------------ */

export function TrackOrder() {
  useDocumentTitle('Track Order', 'Track your Vimuhet order.');
  // A signed-in customer is already identified, so their email no longer needs
  // to be typed again — the API accepts the session in place of it.
  const { user } = useAuth();
  const [form, setForm] = useState({ orderNumber: '', email: '' });
  const [order, setOrder] = useState(null);
  const [state, setState] = useState({ loading: false, error: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.orderNumber.trim()) {
      setState({ loading: false, error: 'Enter your order number' });
      return;
    }
    setState({ loading: true, error: '' });
    try {
      const res = await orderApi.track({ orderNumber: form.orderNumber.trim(), email: form.email.trim() });
      setOrder(res.data);
      setState({ loading: false, error: '' });
    } catch (err) {
      setOrder(null);
      setState({ loading: false, error: apiErrorMessage(err, 'No order found for these details') });
    }
  };

  useEffect(() => {
    if (user?.email) setForm((f) => (f.email ? f : { ...f, email: user.email }));
  }, [user?.email]);

  const idx = order ? ORDER_TIMELINE.indexOf(order.status) : -1;

  return (
    <>
      <PageHero eyebrow="Order Status" title="Track your" accent="order" description="Enter your order number — email is required if you checked out as a guest." breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Track Order' }]} compact />
      <div className="container-page py-10">
        <form onSubmit={submit} className="mx-auto max-w-lg space-y-4 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
          <Input label="Order number" required value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value.toUpperCase() })} placeholder="VMT10234567" icon={Package} />
          <Input
            label={user ? 'Email' : 'Email (guest orders)'}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
          {state.error && <Alert variant="error">{state.error}</Alert>}
          <Button type="submit" className="w-full" loading={state.loading}>Track order</Button>
        </form>

        {order && (
          <div className="mx-auto mt-6 max-w-lg rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12.5px] font-semibold">Order #{order.orderNumber}</p>
                <p className="text-[11px] text-[var(--ink-muted)]">Placed {formatDate(order.createdAt)}</p>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            {!['CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'].includes(order.status) && (
              <ol className="mt-5 space-y-3">
                {ORDER_TIMELINE.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${idx >= i ? 'bg-[#2F7A4D] text-white' : 'border border-[var(--line-color)] text-[var(--ink-muted)]'}`}>
                      {idx >= i ? '✓' : i + 1}
                    </span>
                    <div>
                      <p className={`text-[12.5px] ${idx >= i ? 'font-medium text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>{ORDER_STATUS_LABELS[step]}</p>
                      {order.statusHistory?.find((h) => h.status === step) && (
                        <p className="text-[10.5px] text-[var(--ink-muted)]">{formatDateTime(order.statusHistory.find((h) => h.status === step).at)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {order.shipping?.trackingNumber && (
              <p className="mt-4 rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[11.5px] text-[var(--ink-muted)]">
                <Truck size={12} className="mr-1 inline" /> {order.shipping.courier} · {order.shipping.trackingNumber}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* -------------------------------- Policies ------------------------------- */

const POLICIES = {
  'shipping-policy': {
    title: 'Shipping Policy',
    intro: 'How and when your Vimuhet order reaches you.',
    sections: [
      { heading: 'Dispatch timelines', body: 'Orders are packed and handed to our courier partner within 24–48 working hours of a verified payment. Orders placed on Sundays and public holidays are dispatched the next working day.' },
      { heading: 'Delivery estimates', body: 'Metro cities typically receive orders within 3–4 working days. Other serviceable PIN codes are usually delivered in 5–7 working days. You can check your PIN code on any product page before ordering.' },
      { heading: 'Shipping charges', body: 'Shipping is ₹99 on orders below ₹1,999 and free on orders of ₹1,999 and above. Any active free-shipping coupon is applied at checkout and shown in your order summary.' },
      { heading: 'Tracking', body: 'Every confirmed order has a live timeline in My Account → Orders. Once shipped, the courier name and tracking number are displayed there and emailed to you.' },
      { heading: 'Serviceability', body: 'We currently deliver across India to PIN codes covered by our courier partners. If a PIN code is not serviceable, checkout will tell you before payment.' },
    ],
  },
  'return-policy': {
    title: 'Returns & Refund Policy',
    intro: 'Our returns process, in plain language.',
    sections: [
      { heading: 'Return window', body: 'You may request a return within 7 days of delivery. Pieces must be unused, unwashed and have their original tags intact. Raise the request from My Account → Orders → Request Return.' },
      { heading: 'Non-returnable items', body: 'For hygiene and safety reasons, altered pieces, and items marked final sale cannot be returned. Innerwear and accessories are non-returnable.' },
      { heading: 'Refund timelines', body: 'Once a returned piece passes quality inspection, the refund is initiated to your original payment method within 2 working days. Banks typically take 5–7 working days to credit it.' },
      { heading: 'Cancellations', body: 'Orders can be cancelled free of charge while they are in Placed, Confirmed or Processing status. Prepaid amounts are refunded in full to the original payment method.' },
      { heading: 'Damaged or incorrect items', body: 'If a piece arrives damaged or you receive the wrong item, contact care@vimuhet.com within 48 hours of delivery with photographs. We arrange a free pickup and replacement.' },
    ],
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    intro: 'The cookies we use, why we use them, and how to change your mind.',
    sections: [
      {
        heading: 'What cookies are',
        body: 'Cookies are small text files a website stores in your browser. We also use similar technologies such as local storage and session storage. Together these let a site remember things between page loads — that your bag has an item in it, for example, or that you prefer a light theme.',
      },
      {
        heading: 'The four categories we use',
        body: 'Strictly necessary cookies keep the site working: secure sign-in, fraud protection, your shopping bag and wishlist, and the record of the choice you make here. Functional cookies remember your preferences, such as theme and recently viewed pieces. Analytics cookies give us anonymous, aggregated measurement of page views and product interactions. Marketing cookies let us attribute visits to our own campaigns. Only strictly necessary cookies are on by default — the other three stay off until you turn them on.',
      },
      {
        heading: 'Your choices',
        body: 'When you first visit you are asked to Accept All, Reject Optional, or Customize Preferences. Whichever you choose is remembered, so you will not be asked again. You can change your mind whenever you like using the Cookie Settings link in the footer of every page. Rejecting optional cookies never stops you browsing products, using your bag, or signing in and checking out.',
      },
      {
        heading: 'What happens when you reject optional cookies',
        body: 'We do not set analytics or marketing cookies, and we do not create an anonymous identifier to measure you with — an anonymous identifier is still tracking, so we simply do not measure. Your bag and wishlist keep working exactly as before, because they rely only on strictly necessary cookies. If you had previously allowed analytics and later withdraw it, we delete the optional tracking data we collected under that permission.',
      },
      {
        heading: 'Third parties',
        body: 'Payments are processed by Razorpay, which sets its own cookies on its payment pages under its own policy. We do not run third-party advertising networks, social pixels or cross-site tracking scripts on this site.',
      },
      {
        heading: 'What we never store',
        body: 'We never store passwords, card numbers, CVV codes or UPI credentials in cookies or browser storage. Sign-in sessions use a short-lived access token plus a secure, HttpOnly refresh cookie that is not readable by JavaScript.',
      },
      {
        heading: 'Retention',
        body: 'Guest shopping sessions are kept for up to 180 days after last activity. Anonymous analytics events and cookie consent records are kept for 14 months, then deleted automatically. Recently viewed products are kept for 90 days. You can ask us to delete your data at any time from the Privacy Policy page.',
      },
      {
        heading: 'Managing cookies in your browser',
        body: 'You can also block or delete cookies through your browser settings. If you block strictly necessary cookies, the shopping bag, wishlist and sign-in will stop working because they depend on them.',
      },
    ],
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    intro: 'What we collect, why we collect it, and what we never do.',
    sections: [
      { heading: 'Information we collect', body: 'Account details you provide (name, email, mobile number, addresses), order and payment references, and site usage data such as pages viewed and device type.' },
      { heading: 'What we never store', body: 'We never store card numbers, CVV codes or UPI credentials. Payments are processed by Razorpay and our systems only retain the gateway reference ids needed to reconcile your order.' },
      { heading: 'Analytics', body: 'We record privacy-conscious usage events — page views, product views, add-to-cart — using an anonymous session identifier. Individual IP addresses are not stored in our analytics collections.' },
      { heading: 'How we use data', body: 'To fulfil orders, provide support, prevent fraud, and (if you opt in) send appropriate marketing email. You can withdraw marketing consent at any time from Account Settings.' },
      { heading: 'Your rights', body: 'You can request a copy of your data or ask for your account to be deleted by emailing care@vimuhet.com. Order records required for statutory accounting are retained as required by law.' },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'The terms that apply when you shop with Vimuhet.',
    sections: [
      { heading: 'Use of this website', body: 'By placing an order you confirm the information you provide is accurate and that you are authorised to use the payment method supplied.' },
      { heading: 'Pricing and availability', body: 'Prices are in Indian Rupees and inclusive of applicable GST. Stock is limited; if an item becomes unavailable after payment we will cancel the line and refund it in full.' },
      { heading: 'Orders and payments', body: 'An order is confirmed only after the payment gateway signature is verified on our server. Failed or interrupted payments are automatically reversed by your bank.' },
      { heading: 'Product representation', body: 'We photograph products as accurately as possible. Slight variation in colour can occur due to screen settings and the hand-finished nature of printed and embroidered pieces.' },
      { heading: 'Intellectual property', body: 'All content on this site — imagery, copy and design — belongs to Vimuhet and may not be reproduced without written permission.' },
      { heading: 'Governing law', body: 'These terms are governed by the laws of India, with jurisdiction in the courts of Ahmedabad, Gujarat.' },
    ],
  },
};

/**
 * Policy pages are mounted on static paths (/privacy-policy, /terms, …) rather
 * than a dynamic /policies/:slug route, so `useParams()` has no `slug` here.
 * Fall back to reading the pathname, otherwise every policy page — including
 * Privacy and Terms in the footer — renders "Page not found".
 */
export function PolicyPage() {
  const { slug: routeSlug } = useParams();
  const { pathname } = useLocation();
  const slug = routeSlug || pathname.replace(/^\/+|\/+$/g, '').split('/').pop();
  const policy = POLICIES[slug];
  useDocumentTitle(policy?.title || 'Policy', policy?.intro);

  if (!policy) {
    return (
      <div className="container-page py-20">
        <EmptyState title="Page not found" description="This policy page does not exist." actionTo="/" action="Back to home" />
      </div>
    );
  }

  return (
    <>
      <PageHero eyebrow="Policies" title={policy.title} description={policy.intro} breadcrumbs={[{ label: 'Home', to: '/' }, { label: policy.title }]} compact />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[220px_1fr]">
        <nav className="sticky top-24 hidden h-fit lg:block">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]">Contents</p>
          <ul className="space-y-1.5 border-l border-[var(--line-color)] pl-3">
            {policy.sections.map((s, i) => (
              <li key={s.heading}>
                <a href={`#s-${i}`} className="text-[12px] text-[var(--ink-muted)] hover:text-[var(--accent)]">{s.heading}</a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-2xl space-y-7">
          {policy.sections.map((s, i) => (
            <section key={s.heading} id={`s-${i}`} className="scroll-mt-28">
              <h2 className="font-display text-xl">{s.heading}</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">{s.body}</p>
            </section>
          ))}
          <p className="rounded-xl bg-[var(--surface-sunken)] p-4 text-[11.5px] leading-relaxed text-[var(--ink-muted)]">
            Last updated {formatDate(new Date())}. Questions about this policy? Email{' '}
            <a href="mailto:care@vimuhet.com" className="text-[var(--accent)] hover:underline">care@vimuhet.com</a>.
          </p>
        </article>
      </div>
    </>
  );
}

/* ---------------------------------- 404 --------------------------------- */

export function NotFound() {
  useDocumentTitle('Page Not Found', 'This page could not be found.');
  return (
    <div className="container-page py-16">
      <div className="mx-auto grid max-w-4xl items-center gap-8 sm:grid-cols-2">
        <div className="overflow-hidden rounded-2xl">
          <img src="/media/products/kurti-rose-embroidered-1000.jpg" alt="" className="aspect-[4/5] w-full object-cover" loading="lazy" />
        </div>
        <div>
          <p className="font-display text-[64px] leading-none text-[var(--accent)]">404</p>
          <h1 className="mt-2 font-display text-[28px] leading-tight">This page has wandered off</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
            The piece you are looking for may have sold out, or the link might be out of date. Let us help you find something beautiful instead.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to="/" size="lg">Return Home</Button>
            <Button to="/collections" variant="secondary" size="lg">Explore Collections</Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
            <Link to="/shop" className="hover:text-[var(--accent)]">Shop All</Link>
            <Link to="/new-arrivals" className="hover:text-[var(--accent)]">New Arrivals</Link>
            <Link to="/contact" className="hover:text-[var(--accent)]">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
