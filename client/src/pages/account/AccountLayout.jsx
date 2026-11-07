import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Heart, LayoutDashboard, LogOut, MapPin, Package, Star, User, Settings, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { initials } from '../../utils/format.js';
import PageHero from '../../components/shop/PageHero.jsx';
import { Skeleton } from '../../components/ui/States.jsx';

const LINKS = [
  { to: '/account', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/account/profile', label: 'My Profile', icon: User },
  { to: '/account/orders', label: 'My Orders', icon: Package },
  { to: '/wishlist', label: 'My Wishlist', icon: Heart },
  { to: '/account/addresses', label: 'Saved Addresses', icon: MapPin },
  { to: '/account/reviews', label: 'My Reviews', icon: Star },
  { to: '/account/settings', label: 'Account Settings', icon: Settings },
];

export default function AccountLayout() {
  const { user, loading, logout } = useAuth();
  const { wishlistCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate(`/login?redirect=${encodeURIComponent(pathname)}`, { replace: true });
  }, [loading, user, navigate, pathname]);

  if (loading || !user) {
    return (
      <div className="container-page py-16">
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="My Account"
        title={`Welcome back, ${user.fullName.split(' ')[0]}`}
        description="Your orders, addresses, reviews and saved pieces — all in one place."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'My Account' }]}
        compact
      />
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="mb-3 flex w-full items-center justify-between rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] px-4 py-3 lg:hidden"
          >
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-white dark:text-[#1a1113]">
                {initials(user.fullName)}
              </span>
              <span className="text-sm font-medium">{user.fullName}</span>
            </span>
            <ChevronRight size={16} className={`transition-transform ${mobileOpen ? 'rotate-90' : ''}`} />
          </button>

          <nav className={`${mobileOpen ? 'block' : 'hidden'} space-y-0.5 rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] p-2 lg:block`}>
            <div className="mb-2 hidden items-center gap-3 border-b border-[var(--line-color)] px-2 pb-3 lg:flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white dark:text-[#1a1113]">
                {initials(user.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold">{user.fullName}</p>
                <p className="truncate text-[10.5px] text-[var(--ink-muted)]">{user.email}</p>
              </div>
            </div>
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[12.5px] transition ${
                    isActive
                      ? 'bg-[var(--accent)] text-white dark:text-[#1a1113]'
                      : 'text-[var(--ink)] hover:bg-[var(--surface-sunken)]'
                  }`
                }
              >
                <span className="flex items-center gap-2.5">
                  <link.icon size={15} strokeWidth={1.8} /> {link.label}
                </span>
                {link.to === '/wishlist' && wishlistCount > 0 && <span className="text-[10px] opacity-80">{wishlistCount}</span>}
              </NavLink>
            ))}
            <button
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] text-[var(--ink)] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
            >
              <LogOut size={15} strokeWidth={1.8} /> Sign Out
            </button>
          </nav>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </>
  );
}
