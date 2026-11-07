import { useEffect, useMemo, useRef, useState } from 'react';
import WhatsAppIcon from '../components/whatsapp/WhatsAppIcon.jsx';
import { WHATSAPP_DISPLAY, WHATSAPP_LINK } from '../constants/whatsapp.js';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  User,
  X,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { NAV_LINKS } from '../constants/index.js';
import { DESKTOP_NAV_HIDDEN } from '../constants/index.js';
import { Drawer } from '../components/ui/Modal.jsx';
import SearchPanel from '../components/SearchPanel.jsx';
import { inr } from '../utils/format.js';

/** NAV_LINKS minus the entries duplicated by the logo or by the mega menus. */
const DESKTOP_NAV = NAV_LINKS.filter((l) => !DESKTOP_NAV_HIDDEN.includes(l.label));

const Logo = ({ className = '' }) => (
  <Link to="/" className={`group inline-flex flex-col leading-none ${className}`} aria-label="Vimuhet home">
    <span className="font-display text-[26px] tracking-[0.01em] text-[var(--ink)] sm:text-[28px]">
      Vimuhet
    </span>
    <span className="mt-0.5 text-[8px] uppercase tracking-[0.42em] text-[var(--accent)]">Premium Ethnic</span>
  </Link>
);

export default function Header() {
  const { home, categories, collections, general } = useStore();
  const { itemCount, wishlistCount, setDrawerOpen } = useCart();
  const { user } = useAuth();
  const { isDark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const closeTimer = useRef(null);

  const announcement = home?.homepage?.announcement;
  const messages = useMemo(() => {
    const list = announcement?.messages?.filter(Boolean) || [];
    return list.length ? list : ['Free shipping on orders above ₹1,999', 'Flat ₹300 off with code VIMUHET300'];
  }, [announcement]);

  /* The header is sticky and repaints on every scroll frame while it is over
     the page, so a state update per scroll event is the wrong shape: `setScrolled`
     re-rendered the entire header (9 nav items, 5 icons, the announcement bar)
     dozens of times a second even though the value only flips once. Guard on the
     actual transition and read scrollY inside rAF so the work lands in the
     frame, not the event handler. */
  useEffect(() => {
    let ticking = false;
    let current = false;
    const read = () => {
      ticking = false;
      const next = window.scrollY > 12;
      if (next !== current) {
        current = next;
        setScrolled(next);
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
    setSearchOpen(false);
    setMobileExpanded(null);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (messages.length < 2) return undefined;
    const timer = setInterval(() => setAnnouncementIndex((i) => (i + 1) % messages.length), 5200);
    return () => clearInterval(timer);
  }, [messages.length]);

  const kurtiChildren = categories.filter((c) => !['Kurti Sets', 'Anarkali Kurtis'].includes(c.name));
  const MENUS = {
    kurtis: {
      title: 'Shop Kurtis',
      columns: [
        {
          heading: 'By Style',
          links: kurtiChildren.slice(0, 6).map((c) => ({ label: c.name, to: `/category/${c.slug}` })),
        },
        {
          heading: 'Popular',
          links: [
            { label: 'New Arrivals', to: '/new-arrivals' },
            { label: 'Best Sellers', to: '/best-sellers' },
            { label: 'Trending Now', to: '/trending' },
            { label: 'Under ₹1,499', to: '/shop?maxPrice=1499' },
            { label: 'Festive Wear', to: '/category/festive-wear' },
          ],
        },
      ],
    },
    sets: {
      title: 'Kurti Sets',
      columns: [
        {
          heading: 'Sets',
          links: [
            { label: 'All Kurti Sets', to: '/category/kurti-sets' },
            { label: 'Anarkali Sets', to: '/category/anarkali-kurtis' },
            { label: 'Designer Kurtis', to: '/category/designer-kurtis' },
          ],
        },
        {
          heading: 'Collections',
          links: collections.slice(0, 4).map((c) => ({ label: c.name, to: `/collection/${c.slug}` })),
        },
      ],
    },
    collections: {
      title: 'Collections',
      columns: [
        { heading: 'Curated', links: collections.slice(0, 5).map((c) => ({ label: c.name, to: `/collection/${c.slug}` })) },
        {
          heading: 'Discover',
          links: [
            { label: 'All Collections', to: '/collections' },
            { label: 'Offers & Sale', to: '/shop?onSale=true' },
            { label: 'Our Story', to: '/about' },
          ],
        },
      ],
    },
  };

  const openWithDelay = (key) => {
    clearTimeout(closeTimer.current);
    setOpenMenu(key);
  };
  const closeWithDelay = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };

  return (
    <>
      {/* Announcement bar */}
      {announcement?.enabled !== false && (
        <div className="relative z-50 bg-[#3d101d] text-[#FFF9F3]">
          <div className="container-page flex min-h-9 items-center justify-between gap-2 py-1 text-[9.5px] tracking-[0.01em] min-[380px]:text-[10.5px] sm:gap-4 sm:py-0 sm:text-[11px] lg:gap-3">
            <div className="hidden items-center gap-2 whitespace-nowrap opacity-90 md:flex">
              <Sparkles size={12} className="text-[#D9A5A5]" />
              <span>Free shipping over ₹1,999</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={announcementIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
                className="mx-auto flex items-center gap-1.5 text-center leading-tight sm:mx-0 sm:gap-2"
              >
                <span className="h-1 w-1 rounded-full bg-[#D9A5A5]" />
                {messages[announcementIndex]}
                <span className="h-1 w-1 rounded-full bg-[#D9A5A5]" />
              </motion.p>
            </AnimatePresence>
            <div className="hidden items-center gap-2.5 md:flex lg:gap-3">
              <Link to="/track-order" className="hidden whitespace-nowrap opacity-80 transition hover:opacity-100 lg:block">
                Track Order
              </Link>
              <Link to="/contact" className="whitespace-nowrap opacity-80 transition hover:opacity-100">
                Help
              </Link>
              {/* Direct WhatsApp contact, desktop only. The floating button
                  covers every viewport and the header above carries no spare
                  horizontal room at 1280px, so this lives in the top utility bar
                  where there is space. No sign-in required. */}
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Chat with us on WhatsApp at ${WHATSAPP_DISPLAY}`}
                className="ml-0.5 flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#25D366] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0b3d20] transition-colors hover:bg-[#1fbe5b]"
              >
                <WhatsAppIcon size={12} />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main header */}
      <header
        className={`sticky top-0 z-40 border-b border-[var(--line-color)] transition-[background-color,box-shadow] duration-300 ${
          scrolled ? 'bg-[var(--surface)]/95 shadow-[0_10px_30px_-24px_rgba(61,16,29,0.5)] backdrop-blur-md' : 'bg-[var(--surface)]'
        }`}
      >
        <div className="container-page">
          <div className="flex h-16 items-center gap-2 lg:h-[74px] lg:gap-3">
            <button onClick={() => setMobileOpen(true)} className="p-2 lg:hidden" aria-label="Open menu">
              <Menu size={20} />
            </button>

            <Logo className="mr-auto shrink-0 xl:mr-8" />

            <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex" onMouseLeave={closeWithDelay}>
              {DESKTOP_NAV.map((link) => (
                <div key={link.label} className="relative" onMouseEnter={() => link.dropdown && openWithDelay(link.dropdown)}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      `link-underline flex items-center gap-1 whitespace-nowrap px-2.5 py-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                        isActive ? 'text-[var(--accent)]' : 'text-[var(--ink)] hover:text-[var(--accent)]'
                      }`
                    }
                  >
                    {link.label}
                    {link.dropdown && <ChevronDown size={11} className={`transition-transform ${openMenu === link.dropdown ? 'rotate-180' : ''}`} />}
                  </NavLink>
                </div>
              ))}
            </nav>

            <div className="flex items-center gap-0.5 sm:gap-1">
              <button onClick={() => setSearchOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--surface-sunken)]" aria-label="Search products">
                <Search size={18} strokeWidth={1.7} />
              </button>
              <button
                onClick={toggle}
                className="hidden h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--surface-sunken)] sm:flex"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={18} strokeWidth={1.7} /> : <Moon size={18} strokeWidth={1.7} />}
              </button>
              <Link to="/wishlist" className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--surface-sunken)]" aria-label={`Wishlist, ${wishlistCount} items`}>
                <Heart size={18} strokeWidth={1.7} />
                {wishlistCount > 0 && <CountBadge count={wishlistCount} />}
              </Link>
              <Link
                to={user ? '/account' : '/login'}
                className="hidden h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--surface-sunken)] sm:flex"
                aria-label={user ? 'My account' : 'Sign in'}
              >
                <User size={18} strokeWidth={1.7} />
              </Link>
              <button
                onClick={() => setDrawerOpen(true)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--surface-sunken)]"
                aria-label={`Shopping bag, ${itemCount} items`}
              >
                <ShoppingBag size={18} strokeWidth={1.7} />
                {itemCount > 0 && <CountBadge count={itemCount} />}
              </button>
            </div>
          </div>
        </div>

        {/* Tablet / small-laptop nav strip (lg–xl). Keeps every top-level
            destination one tap away instead of burying them in a hamburger. */}
        <nav
          aria-label="Primary"
          className="container-page hidden lg:block xl:hidden"
        >
          <div className="no-scrollbar -mx-1 flex items-center gap-0.5 overflow-x-auto border-t border-[var(--line-color)] py-1">
            {DESKTOP_NAV.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                    isActive ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink)] hover:text-[var(--accent)]'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Mega menu */}
        <AnimatePresence>
          {openMenu && MENUS[openMenu] && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => openWithDelay(openMenu)}
              onMouseLeave={closeWithDelay}
              className="absolute inset-x-0 top-full hidden border-b border-[var(--line-color)] bg-[var(--surface-raised)] shadow-[0_24px_50px_-30px_rgba(61,16,29,0.4)] xl:block"
            >
              <div className="container-page grid grid-cols-[1.2fr_1fr_1fr] gap-10 py-8">
                <div>
                  <p className="eyebrow">{MENUS[openMenu].title}</p>
                  <p className="mt-2 max-w-xs font-display text-lg leading-snug text-[var(--ink)]">
                    Thoughtfully made pieces, priced for the way you actually shop.
                  </p>
                  <Link
                    to="/shop"
                    className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] hover:underline"
                  >
                    View everything
                  </Link>
                </div>
                {MENUS[openMenu].columns.map((col) => (
                  <div key={col.heading}>
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">{col.heading}</p>
                    <ul className="space-y-2">
                      {col.links.map((l) => (
                        <li key={l.label}>
                          <Link to={l.to} className="link-underline text-[13px] text-[var(--ink)] transition hover:text-[var(--accent)]">
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile drawer */}
      <MobileMenuSignal open={mobileOpen} />
      <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} title="Menu" side="left" width="max-w-[86%]">
        <div className="flex items-center justify-between pb-4">
          <Logo />
          <button onClick={toggle} className="flex items-center gap-1.5 rounded-full border border-[var(--line-color)] px-3 py-1.5 text-[10px] uppercase tracking-[0.12em]" aria-label="Toggle theme">
            {isDark ? <Sun size={13} /> : <Moon size={13} />} {isDark ? 'Light' : 'Dark'}
          </button>
        </div>
        <nav>
          {NAV_LINKS.map((link) => {
            const menu = link.dropdown ? MENUS[link.dropdown] : null;
            const expanded = mobileExpanded === link.label;
            const children = menu ? menu.columns.flatMap((col) => col.links) : [];
            return (
              <div key={link.label} className="border-b border-[var(--line-color)]">
                <div className="flex items-center">
                  <Link
                    to={link.to}
                    className="flex-1 py-3.5 text-sm font-medium text-[var(--ink)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                  {children.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMobileExpanded(expanded ? null : link.label)}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? 'Collapse' : 'Expand'} ${link.label} menu`}
                      className="-mr-1 flex h-11 w-11 items-center justify-center text-[var(--ink-muted)]"
                    >
                      <ChevronDown size={16} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {expanded && children.length > 0 && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      {children.map((child) => (
                        <li key={`${link.label}-${child.label}`}>
                          <Link
                            to={child.to}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center justify-between py-2.5 pl-4 text-[13px] text-[var(--ink-muted)] transition-colors hover:text-[var(--accent)]"
                          >
                            {child.label}
                            <ArrowRight size={12} className="opacity-50" />
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
        <div className="mt-6 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">Shop by category</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c._id}
                to={`/category/${c.slug}`}
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-[var(--line-color)] px-3 py-2 text-xs"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-8 grid gap-2 border-t border-[var(--line-color)] pt-5 text-sm">
          <Link to={user ? '/account' : '/login'} className="text-[var(--ink)]">{user ? 'My Account' : 'Sign In'}</Link>
          <Link to="/track-order" className="text-[var(--ink)]">Track Order</Link>
          <Link to="/faqs" className="text-[var(--ink)]">FAQs</Link>
          <Link to="/contact" className="text-[var(--ink)]">Contact Us</Link>
          <p className="pt-3 text-xs text-[var(--ink-muted)]">{general.email} · {general.phone}</p>
        </div>
      </Drawer>

      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

const CountBadge = ({ count }) => (
  <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9.5px] font-semibold text-white dark:text-[#1a1113]">
    {count > 99 ? '99+' : count}
  </span>
);


/**
 * Publishes the mobile-menu state as a data attribute on <html> so worldwide
 * floating UI (the WhatsApp button) can hide itself while the full-screen menu
 * is open instead of hovering over the navigation.
 */
function MobileMenuSignal({ open }) {
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.setAttribute('data-mobile-menu', 'open');
    else root.removeAttribute('data-mobile-menu');
    return () => root.removeAttribute('data-mobile-menu');
  }, [open]);
  return null;
}
