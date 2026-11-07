import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Gift,
  Globe,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Moon,
  Package,
  PieChart,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Sun,
  Tags,
  Truck,
  Users,
  UserCheck,
  Warehouse,
  X,
  Menu,
  PanelLeftClose,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { adminApi } from '../services/endpoints.js';
import { initials, formatDateTime } from '../utils/format.js';
import { Skeleton } from '../components/ui/States.jsx';

const NAV = [
  {
    group: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics:read' },
      { to: '/admin/live-visitors', label: 'Live Visitors', icon: Radio, permission: 'analytics:read' },
      { to: '/admin/visitors', label: 'Visitors & Consent', icon: UserCheck, permission: 'analytics:read' },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package, permission: 'products:read' },
      { to: '/admin/categories', label: 'Categories', icon: Tags, permission: 'products:read' },
      { to: '/admin/collections', label: 'Collections', icon: BookOpen, permission: 'products:read' },
      { to: '/admin/inventory', label: 'Inventory', icon: Warehouse, permission: 'inventory:write' },
      { to: '/admin/reviews', label: 'Reviews', icon: Star, permission: 'reviews:moderate' },
    ],
  },
  {
    group: 'Sales',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, permission: 'orders:read' },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard, permission: 'payments:read' },
      { to: '/admin/coupons', label: 'Coupons', icon: Gift, permission: 'coupons:write' },
      { to: '/admin/abandoned-carts', label: 'Abandoned Carts', icon: ShoppingCart, permission: 'analytics:read' },
    ],
  },
  {
    group: 'Customers',
    items: [
      { to: '/admin/customers', label: 'Customers', icon: Users, permission: 'customers:read' },
      { to: '/admin/messages', label: 'Messages', icon: MessageSquare, permission: 'orders:read' },
      { to: '/admin/subscribers', label: 'Subscribers', icon: Mail, permission: 'customers:read' },
    ],
  },
  {
    group: 'Content',
    items: [
      { to: '/admin/homepage', label: 'Homepage CMS', icon: Home, permission: 'cms:write' },
      { to: '/admin/banners', label: 'Banners', icon: ImageIcon, permission: 'cms:write' },
    ],
  },
  {
    group: 'Insights',
    items: [
      { to: '/admin/reports/sales', label: 'Sales Report', icon: PieChart, permission: 'reports:read' },
      { to: '/admin/reports/customers', label: 'Customer Report', icon: Users, permission: 'reports:read' },
      { to: '/admin/reports/inventory', label: 'Inventory Report', icon: Warehouse, permission: 'reports:read' },
      { to: '/admin/reports/visitors', label: 'Visitor Report', icon: Globe, permission: 'reports:read' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { to: '/admin/admins', label: 'Admin Users', icon: ShieldCheck, permission: 'admins:manage' },
      { to: '/admin/settings', label: 'Store Settings', icon: Store, permission: 'settings:write' },
      { to: '/admin/settings/payment', label: 'Payment Settings', icon: CreditCard, permission: 'settings:write' },
      { to: '/admin/settings/shipping', label: 'Shipping Settings', icon: Truck, permission: 'settings:write' },
      { to: '/admin/settings/notifications', label: 'Notification Settings', icon: Bell, permission: 'settings:write' },
      { to: '/admin/settings/security', label: 'Security Settings', icon: Settings, permission: 'settings:write' },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText, permission: 'audit:read' },
    ],
  },
];

export default function AdminLayout() {
  const { admin, loading, logout, can } = useAdminAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState({ items: [], unread: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    adminApi
      .notifications()
      .then((res) => setNotifications(res.data || { items: [], unread: 0 }))
      .catch(() => {});
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-sunken)]">
        <div className="w-64 space-y-3">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      </div>
    );
  }

  const submitSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/admin/products?q=${encodeURIComponent(search.trim())}`);
    setSearch('');
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={`flex h-16 shrink-0 items-center border-b border-white/10 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <Link to="/admin" className="flex flex-col leading-none">
          <span className="font-display text-[19px] text-white">Vimuhet</span>
          {!collapsed && <span className="mt-0.5 text-[7.5px] uppercase tracking-[0.34em] text-[#D9A5A5]">Admin Suite</span>}
        </Link>
        <button onClick={() => setCollapsed((c) => !c)} className="hidden rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white lg:block" aria-label="Collapse sidebar">
          <PanelLeftClose size={15} className={collapsed ? 'rotate-180' : ''} />
        </button>
        <button onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-white/60 hover:bg-white/10 lg:hidden" aria-label="Close menu">
          <X size={16} />
        </button>
      </div>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-2.5 py-3">
        {NAV.map((group) => {
          const items = group.items.filter((i) => can(i.permission));
          if (!items.length) return null;
          return (
            <div key={group.group} className="mb-3">
              {!collapsed && <p className="mb-1 px-2.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">{group.group}</p>}
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition ${
                          isActive ? 'bg-[#FFF9F3] font-medium text-[#3d101d]' : 'text-white/70 hover:bg-white/10 hover:text-white'
                        } ${collapsed ? 'justify-center' : ''}`
                      }
                    >
                      <item.icon size={15} strokeWidth={1.8} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-2.5">
        <Link
          to="/"
          target="_blank"
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-white/60 transition hover:bg-white/10 hover:text-white ${collapsed ? 'justify-center' : ''}`}
        >
          <LifeBuoy size={14} /> {!collapsed && 'View storefront'}
        </Link>
        <button
          onClick={async () => {
            await logout();
            navigate('/admin/login');
          }}
          className={`mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] text-white/60 transition hover:bg-red-500/20 hover:text-red-200 ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={14} /> {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--surface-sunken)]">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden bg-[#3d101d] transition-[width] duration-300 lg:block ${collapsed ? 'w-[68px]' : 'w-[236px]'}`}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.25 }} className="fixed inset-y-0 left-0 z-50 w-[248px] bg-[#3d101d] lg:hidden">
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className={`min-w-0 transition-[padding] duration-300 ${collapsed ? 'lg:pl-[68px]' : 'lg:pl-[236px]'}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--line-color)] bg-[var(--surface-raised)]/95 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[var(--ink)] hover:bg-[var(--surface-sunken)] lg:hidden" aria-label="Open menu">
            <Menu size={18} />
          </button>

          <form onSubmit={submitSearch} className="relative hidden max-w-xs flex-1 sm:block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, SKU…"
              className="h-9 w-full rounded-lg border border-[var(--line-color)] bg-[var(--surface-sunken)] pl-9 pr-3 text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--accent)]"
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={toggle} className="rounded-lg p-2 text-[var(--ink-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]" aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="relative">
              <button onClick={() => setMenuOpen((m) => !m)} className="relative rounded-lg p-2 text-[var(--ink-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]" aria-label="Notifications">
                <Bell size={16} />
                {notifications.unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[8.5px] font-semibold text-white dark:text-[#1a1113]">
                    {notifications.unread > 9 ? '9+' : notifications.unread}
                  </span>
                )}
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--line-color)] bg-[var(--surface-raised)] shadow-xl"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--line-color)] px-4 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Notifications</p>
                        {notifications.unread > 0 && (
                          <button
                            onClick={async () => {
                              await adminApi.markNotificationsRead([]).catch(() => {});
                              setNotifications((n) => ({ ...n, unread: 0 }));
                            }}
                            className="text-[10px] uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      <ul className="max-h-80 overflow-y-auto">
                        {(notifications.items || []).length === 0 && <li className="px-4 py-6 text-center text-[12px] text-[var(--ink-muted)]">Nothing new right now</li>}
                        {(notifications.items || []).slice(0, 8).map((n, i) => (
                          <li key={n._id || i} className="border-b border-[var(--line-color)] px-4 py-2.5 last:border-0">
                            <p className="text-[12px] text-[var(--ink)]">{n.description || n.message || n.title}</p>
                            <p className="mt-0.5 text-[10px] text-[var(--ink-muted)]">{n.createdAt ? formatDateTime(n.createdAt) : ''}</p>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="mx-1 h-6 w-px bg-[var(--line-color)]" />

            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[10.5px] font-semibold text-white dark:text-[#1a1113]">
                {initials(admin?.name || 'Admin')}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="text-[12px] font-medium text-[var(--ink)]">{admin?.name}</p>
                <p className="text-[10px] text-[var(--ink-muted)]">{admin?.role?.replace('_', ' ')}</p>
              </div>
              <ChevronDown size={13} className="hidden text-[var(--ink-muted)] sm:block" />
            </div>
          </div>
        </header>

        {/* min-w-0 is load-bearing: it lets grid/flex children scroll instead of
            stretching the page when a table is wider than the viewport. */}
        <main className="min-w-0 p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/* --------------------------- Shared page header --------------------------- */

export function AdminPageHeader({ title, subtitle, actions, breadcrumb }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        {breadcrumb && (
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)]">
            <Link to="/admin" className="hover:text-[var(--accent)]">Admin</Link>
            <ChevronRight size={10} />
            <span>{breadcrumb}</span>
          </div>
        )}
        <h1 className="font-display text-[24px] leading-tight text-[var(--ink)] sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-[var(--ink-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
