import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import "./admin.css";
import {
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  ShoppingCart,
  Users,
  TicketPercent,
  MessageSquareText,
  PanelsTopLeft,
  Mail,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  ChevronRight,
  Plus,
  Download,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  AlertTriangle,
  ImagePlus,
  Pencil,
  Archive,
  Eye,
  SlidersHorizontal,
  MousePointerClick,
} from "lucide-react";

const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const navItems = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["products", "Products", Package],
  ["categories", "Categories & collections", Tags],
  ["inventory", "Inventory", Boxes],
  ["orders", "Orders & payments", ShoppingCart],
  ["customers", "Customers", Users],
  ["promotions", "Coupons & promotions", TicketPercent],
  ["support", "Reviews & support", MessageSquareText],
  ["content", "Website content", PanelsTopLeft],
  ["email", "Email & notifications", Mail],
  ["analytics", "Analytics & reports", ChartNoAxesCombined],
  ["settings", "Settings & security", Settings],
];
const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const dateTimeInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const errorText = (e) => e?.message || "Something went wrong. Please retry.";
async function api(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data =
    response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}
function useLoad(token, path) {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api(path, token));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api(path, token)
      .then((x) => {
        if (live) setData(x);
      })
      .catch((e) => {
        if (live) setError(errorText(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [token, path]);
  return { data, loading, error, reload };
}
function Empty({ title, detail }) {
  return (
    <div className="adm-empty">
      <span className="adm-empty-mark">✳</span>
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
function Notice({ children, tone = "error" }) {
  return children ? (
    <p
      className={`adm-notice ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  ) : null;
}
function Metric({ label, value, note, icon: Icon, href }) {
  return (
    <Link to={href} className="adm-metric">
      <span className="adm-metric-icon">
        <Icon size={17} />
      </span>
      <span className="adm-metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
      <ArrowUpRight className="adm-metric-arrow" size={15} />
    </Link>
  );
}

export default function AdminConsole({ token, user, onLogout }) {
  const location = useLocation(),
    navigate = useNavigate(),
    reduceMotion = useReducedMotion(),
    [drawer, setDrawer] = useState(false),
    [globalSearch, setGlobalSearch] = useState("");
  const section = location.pathname.split("/")[2] || "dashboard";
  const current =
    navItems.find(([id]) => id === section) ||
    (section === "security"
      ? navItems.find(([id]) => id === "settings")
      : section === "search"
        ? ["search", "Search results", Search]
        : navItems[0]);
  const [toast, setToast] = useState("");
  const notify = (text) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2600);
  };
  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [section]);
  const searchSubmit = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/admin/search?q=${encodeURIComponent(globalSearch.trim())}`);
    }
  };
  if (!token || !user || user.role !== "admin")
    return (
      <main className="adm-signin">
        <img src="/assets/brand/vimuhet-logo-transparent.webp" alt="VIMUHET" />
        <p>
          {token && user
            ? "This account does not have administrator privileges."
            : "Sign in with an authorized administrator account to manage your store."}
        </p>
        {token && user ? (
          <button className="adm-primary" onClick={onLogout}>
            Sign out
          </button>
        ) : (
          <Link to="/account" className="adm-primary">
            Go to sign in
          </Link>
        )}
      </main>
    );
  return (
    <div className="admin-console">
      <aside className={`adm-sidebar ${drawer ? "drawer-open" : ""}`}>
        <Link to="/admin" className="adm-brand">
          <img src="/assets/brand/vimuhet-logo-transparent.webp" alt="" />
          <span>
            VIMUHET <small>ADMIN STUDIO</small>
          </span>
        </Link>
        <div className="adm-nav-caption">STORE MANAGEMENT</div>
        <nav aria-label="Admin navigation">
          {navItems.map(([id, label, Icon]) => (
            <Link
              key={id}
              to={id === "dashboard" ? "/admin" : `/admin/${id}`}
              aria-current={section === id ? "page" : undefined}
              onClick={() => setDrawer(false)}
              className={`adm-nav-link ${section === id ? "active" : ""}`}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "dashboard" && <i />}
            </Link>
          ))}
        </nav>
        <div className="adm-sidebar-bottom">
          <span className="adm-secure-dot" />{" "}
          <span>Admin session protected</span>
        </div>
      </aside>
      {drawer && (
        <button
          className="adm-scrim"
          aria-label="Close admin navigation"
          onClick={() => setDrawer(false)}
        />
      )}
      <div className="adm-main">
        <header className="adm-topbar">
          <button
            className="adm-icon adm-mobile-menu"
            aria-label={drawer ? "Close menu" : "Open menu"}
            onClick={() => setDrawer(!drawer)}
          >
            {drawer ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="adm-crumb">
            <span>VIMUHET</span>
            <ChevronRight size={14} />
            <b>{current[1]}</b>
          </div>
          <form className="adm-global-search" onSubmit={searchSubmit}>
            <Search size={16} />
            <input
              aria-label="Search admin records"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search products, orders…"
            />
            <kbd>↵</kbd>
          </form>
          <Link
            className="adm-icon adm-notification"
            to="/admin/orders"
            aria-label="View order notifications"
          >
            <Bell size={18} />
          </Link>
          <div className="adm-profile">
            <span className="adm-avatar">
              {(user.name || user.email || "A").slice(0, 1).toUpperCase()}
            </span>
            <span>
              <b>{user.name || "Administrator"}</b>
              <small>Owner</small>
            </span>
            <button
              className="adm-icon"
              aria-label="Sign out"
              onClick={onLogout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <motion.main
          className="adm-content"
          key={section}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
        >
          <div className="adm-page-heading">
            <div>
              <span className="adm-overline">VIMUHET OPERATIONS</span>
              <h1>
                {section === "dashboard" ? "Good day" : current[1]}
                <em>{section === "dashboard" ? ", VIMUHET." : ""}</em>
              </h1>
              <p>
                {section === "dashboard"
                  ? "A clear view of your store, grounded in live records."
                  : sectionDescription(section)}
              </p>
            </div>
            <div className="adm-heading-actions">
              <span className="adm-live">
                <i /> LIVE DATA
              </span>
              {section === "products" && (
                <button
                  className="adm-primary"
                  onClick={() =>
                    document
                      .getElementById("adm-product-form")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <Plus size={15} /> Add product
                </button>
              )}
            </div>
          </div>
          <Notice>{toast}</Notice>
          {section === "dashboard" && <Dashboard token={token} />}
          {section === "search" && (
            <GlobalSearchResults
              token={token}
              query={new URLSearchParams(location.search).get("q") || ""}
            />
          )}
          {section === "analytics" && <Dashboard token={token} analytics />}
          {section === "products" && (
            <Products
              token={token}
              notify={notify}
              initialSearch={
                new URLSearchParams(location.search).get("search") || ""
              }
            />
          )}
          {section === "categories" && (
            <Categories token={token} notify={notify} />
          )}
          {section === "inventory" && (
            <Inventory token={token} notify={notify} />
          )}
          {section === "orders" && <Orders token={token} notify={notify} />}
          {section === "customers" && <Customers token={token} />}
          {section === "promotions" && (
            <Promotions token={token} notify={notify} />
          )}
          {section === "support" && (
            <SupportCenter token={token} notify={notify} />
          )}
          {section === "email" && <EmailCenter token={token} />}
          {section === "settings" && <SettingsPage token={token} />}
          {section === "content" && <ModuleStatus section={section} />}
          {section === "security" && <Audit token={token} />}
        </motion.main>
      </div>
      {toast && (
        <div className="adm-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
function sectionDescription(id) {
  return (
    {
      search: "Search products, orders and registered customers.",
      products:
        "Manage the catalog, pricing, visibility and product photography.",
      categories: "Organize the collection and control category visibility.",
      inventory: "Review stock levels and record reasoned stock adjustments.",
      orders: "Review orders, payment state, fulfillment and refunds.",
      customers: "Search customer accounts and review their order history.",
      promotions:
        "Create time-bound coupon rules whose final discount is calculated securely at checkout.",
      support: "Review customer messages and product feedback.",
      content: "Curate storefront campaigns and published content.",
      email: "Review newsletter consent records and delivery configuration.",
      analytics:
        "Explore sales and operating metrics calculated from store records.",
      settings: "Review integration health and administrative activity.",
    }[id] || "Store administration"
  );
}
function GlobalSearchResults({ token, query }) {
  const { data, error, loading } = useLoad(
    token,
    `/admin/search?q=${encodeURIComponent(query)}`,
  );
  if (!query.trim())
    return (
      <Empty
        title="Enter a search term"
        detail="Search product names and SKUs, order numbers and registered customer names or emails."
      />
    );
  return (
    <>
      <Notice>{error}</Notice>
      {loading ? (
        <div className="adm-loading">Searching authorized store records…</div>
      ) : (
        <div className="adm-search-results">
          {[
            ["Products", data?.products || [], "/admin/products"],
            ["Orders", data?.orders || [], "/admin/orders"],
            ["Customers", data?.customers || [], "/admin/customers"],
          ].map(([title, rows, href]) => (
            <section className="adm-panel" key={title}>
              <div className="adm-panel-head">
                <div>
                  <h2>{title}</h2>
                  <p>{rows.length} matching record(s)</p>
                </div>
              </div>
              {rows.length ? (
                <div className="adm-compact-list">
                  {rows.map((x) => (
                    <div key={x._id}>
                      <span className="adm-activity-dot" />
                      <span>
                        <b>{x.name || x.number || x.email}</b>
                        <small>
                          {x.sku || x.category || x.email || x.status || ""}
                        </small>
                      </span>
                      <Link
                        className="adm-text-link"
                        to={`${href}?search=${encodeURIComponent(query)}`}
                      >
                        Open <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title={`No ${title.toLowerCase()} found`}
                  detail="No matching authorized records were returned."
                />
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
function Dashboard({ token, analytics = false }) {
  const [range, setRange] = useState("30d"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [exportError, setExportError] = useState("");
  const query =
    range === "custom" && from && to
      ? `from=${from}&to=${to}`
      : `range=${range === "custom" ? "30d" : range}`;
  const { data, loading, error, reload } = useLoad(
    token,
    `/admin/dashboard?${query}`,
  );
  const {
    data: visitorData,
    loading: visitorLoading,
    error: visitorError,
    reload: reloadVisitors,
  } = useLoad(token, `/admin/visitor-analytics?${query}`);
  const result = data || {},
    m = result.metrics || {},
    chart = result.salesByDay || [],
    visitor = visitorData || {},
    vm = visitor.metrics || {};
  const points = useMemo(() => {
    if (!chart.length) return "";
    const max = Math.max(1, ...chart.map((x) => x.revenue));
    return chart
      .map(
        (x, i) =>
          `${chart.length === 1 ? 50 : (i * 100) / (chart.length - 1)},${92 - (x.revenue / max) * 82}`,
      )
      .join(" ");
  }, [chart]);
  async function exportSales() {
    setExportError("");
    try {
      const response = await fetch(`${API}/admin/reports/sales.csv?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to export report");
      }
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "vimuhet-sales-report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      setExportError(errorText(e));
    }
  }
  return (
    <>
      <div className="adm-toolbar">
        <div
          className="adm-range-tabs"
          role="group"
          aria-label="Dashboard date range"
        >
          {[
            ["today", "Today"],
            ["7d", "7 days"],
            ["30d", "30 days"],
            ["month", "This month"],
            ["custom", "Custom"],
          ].map(([v, l]) => (
            <button
              className={range === v ? "selected" : ""}
              key={v}
              onClick={() => setRange(v)}
            >
              {l}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <>
            <label className="adm-date-filter">
              From
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="adm-date-filter">
              To
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        )}
        <button
          className="adm-secondary"
          onClick={() => {
            reload();
            reloadVisitors();
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
        {analytics && (
          <button className="adm-secondary" onClick={exportSales}>
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>
      <Notice>{error || visitorError || exportError}</Notice>
      {loading || visitorLoading ? (
        <div className="adm-loading">
          Loading verified store and visitor metrics…
        </div>
      ) : error || visitorError ? (
        <Empty
          title="Live dashboard data is unavailable"
          detail={error || visitorError}
        />
      ) : (
        <>
          <div className="adm-metric-grid">
            <Metric
              label="Net collected"
              value={money(m.netCollected)}
              note={`Gross merchandise ${money(m.grossSales)} · discounts ${money(m.discounts)} · refunds ${money(m.refunds)}`}
              icon={ChartNoAxesCombined}
              href="/admin/analytics"
            />
            <Metric
              label="Orders"
              value={m.totalOrders || 0}
              note={`${m.pendingOrders || 0} awaiting payment · ${m.processingOrders || 0} processing`}
              icon={ShoppingCart}
              href="/admin/orders"
            />
            <Metric
              label="Customers"
              value={m.totalCustomers || 0}
              note="Registered customer accounts"
              icon={Users}
              href="/admin/customers"
            />
            <Metric
              label="Unique visitors"
              value={vm.uniqueVisitors || 0}
              note="Approx. distinct consented browsers"
              icon={Users}
              href="/admin/analytics"
            />
            <Metric
              label="Visits"
              value={vm.visits || 0}
              note="Consented browser sessions"
              icon={MousePointerClick}
              href="/admin/analytics"
            />
            <Metric
              label="Page views"
              value={vm.pageViews || 0}
              note={`${vm.productViews || 0} product views · ${vm.addToBag || 0} bag adds · ${vm.checkoutStarts || 0} checkout starts`}
              icon={Eye}
              href="/admin/analytics"
            />
            <Metric
              label="Avg. captured order"
              value={money(m.averageCapturedOrderValue)}
              note={`${m.refundedOrders || 0} fully refunded in selected range`}
              icon={ArrowUpRight}
              href="/admin/orders"
            />
            <Metric
              label="Inventory alerts"
              value={(m.lowStockProducts || 0) + (m.outOfStockProducts || 0)}
              note={`${m.lowStockProducts || 0} low · ${m.outOfStockProducts || 0} out of stock`}
              icon={Boxes}
              href="/admin/inventory"
            />
            <Metric
              label="Payment failures"
              value={m.paymentFailures || 0}
              note="Failed payment records in selected range"
              icon={AlertTriangle}
              href="/admin/orders"
            />
          </div>
          {analytics && (
            <div className="adm-grid-two">
              <section className="adm-panel">
                <div className="adm-panel-head">
                  <div>
                    <h2>Visitor funnel</h2>
                    <p>
                      Anonymous, consented events in the selected UTC date
                      range.
                    </p>
                  </div>
                </div>
                <div className="adm-compact-list">
                  <div>
                    <span className="adm-rank">01</span>
                    <span>
                      <b>Visits</b>
                      <small>Consented browser sessions</small>
                    </span>
                    <strong>{vm.visits || 0}</strong>
                  </div>
                  <div>
                    <span className="adm-rank">02</span>
                    <span>
                      <b>Product views</b>
                      <small>Product-detail pages viewed</small>
                    </span>
                    <strong>{vm.productViews || 0}</strong>
                  </div>
                  <div>
                    <span className="adm-rank">03</span>
                    <span>
                      <b>Add to bag</b>
                      <small>Successful add-to-bag actions</small>
                    </span>
                    <strong>{vm.addToBag || 0}</strong>
                  </div>
                  <div>
                    <span className="adm-rank">04</span>
                    <span>
                      <b>Checkout starts</b>
                      <small>Cart present when checkout opened</small>
                    </span>
                    <strong>{vm.checkoutStarts || 0}</strong>
                  </div>
                </div>
              </section>
              <section className="adm-panel">
                <div className="adm-panel-head">
                  <div>
                    <h2>Most viewed pages</h2>
                    <p>
                      Top page views; query strings and personal data are not
                      stored.
                    </p>
                  </div>
                </div>
                {(visitor.topPages || []).length ? (
                  <div className="adm-compact-list">
                    {visitor.topPages.map((row) => (
                      <div key={row.path}>
                        <span className="adm-rank">{row.views}</span>
                        <span>
                          <b>{row.path}</b>
                          <small>
                            {row.uniqueVisitors} unique visitor
                            {row.uniqueVisitors === 1 ? "" : "s"}
                          </small>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="No consented visitor data yet"
                    detail="Metrics begin after a visitor allows analytics."
                  />
                )}
              </section>
            </div>
          )}
          <div className="adm-grid-two">
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>
                    {analytics ? "Revenue & order trend" : "Revenue trend"}
                  </h2>
                  <p>
                    Captured order totals by UTC order date. Refunds are
                    subtracted in net collected.
                  </p>
                </div>
                <span className="adm-pill">{range}</span>
              </div>
              {chart.length ? (
                <div className="adm-chart">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Daily captured revenue trend"
                  >
                    <defs>
                      <linearGradient
                        id="adm-chart-fill"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0"
                          stopColor="#F052A0"
                          stopOpacity=".35"
                        />
                        <stop offset="1" stopColor="#F052A0" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`0,100 ${points} 100,100`}
                      fill="url(#adm-chart-fill)"
                    />
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#F052A0"
                      strokeWidth="1.3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <div className="adm-chart-foot">
                    <span>{date(chart[0]?.date)}</span>
                    <span>{date(chart.at(-1)?.date)}</span>
                  </div>
                </div>
              ) : (
                <Empty
                  title="No order activity in this range"
                  detail="The chart will populate from verified orders as they are placed."
                />
              )}
            </section>
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>Inventory watch</h2>
                  <p>Products at or below their configured threshold.</p>
                </div>
                <Link to="/admin/inventory" className="adm-text-link">
                  View stock <ArrowUpRight size={14} />
                </Link>
              </div>
              {(result.lowStock || []).length ? (
                <div className="adm-compact-list">
                  {result.lowStock.slice(0, 6).map((p) => (
                    <div key={p._id}>
                      <span className="adm-stock-dot" />
                      <span>
                        <b>{p.name}</b>
                        <small>{p.sku || p.category || "Product"}</small>
                      </span>
                      <strong>{p.stock} left</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No low-stock products"
                  detail="Inventory alerts will appear here using each product's threshold."
                />
              )}
            </section>
          </div>
          <div className="adm-grid-two">
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>Recent orders</h2>
                  <p>Latest orders recorded by the API.</p>
                </div>
                <Link to="/admin/orders" className="adm-text-link">
                  All orders <ArrowUpRight size={14} />
                </Link>
              </div>
              {(result.recentOrders || []).length ? (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.recentOrders.slice(0, 6).map((o) => (
                        <tr key={o._id}>
                          <td>{o.number}</td>
                          <td>{o.email}</td>
                          <td>{money(o.total)}</td>
                          <td>
                            <Status value={o.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty
                  title="No orders yet"
                  detail="Order activity will appear here when recorded."
                />
              )}
            </section>
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>Best sellers</h2>
                  <p>Units from captured orders in the selected period.</p>
                </div>
              </div>
              {(result.bestSellers || []).length ? (
                <div className="adm-compact-list">
                  {result.bestSellers.slice(0, 6).map((p, i) => (
                    <div key={`${p.name}-${i}`}>
                      <span className="adm-rank">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <b>{p.name}</b>
                        <small>{money(p.revenue)} captured</small>
                      </span>
                      <strong>{p.units} units</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No captured sales yet"
                  detail="Best sellers appear after an order is verified as paid."
                />
              )}
            </section>
          </div>
          <div className="adm-grid-two">
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>New customers</h2>
                  <p>Recent registered customer accounts.</p>
                </div>
                <Link to="/admin/customers" className="adm-text-link">
                  Directory <ArrowUpRight size={14} />
                </Link>
              </div>
              {(result.recentCustomers || []).length ? (
                <div className="adm-compact-list">
                  {result.recentCustomers.slice(0, 5).map((c) => (
                    <div key={c._id}>
                      <span className="adm-avatar small">
                        {(c.name || c.email).slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <b>{c.name}</b>
                        <small>{c.email}</small>
                      </span>
                      <time>{date(c.createdAt)}</time>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No recent registrations"
                  detail="New customers will be listed when they create an account."
                />
              )}
            </section>
            <section className="adm-panel">
              <div className="adm-panel-head">
                <div>
                  <h2>Admin activity</h2>
                  <p>Recorded administrative changes.</p>
                </div>
                <Link to="/admin/security" className="adm-text-link">
                  Audit log <ArrowUpRight size={14} />
                </Link>
              </div>
              {(result.recentActivity || []).length ? (
                <div className="adm-compact-list">
                  {result.recentActivity.slice(0, 5).map((a) => (
                    <div key={a._id}>
                      <span className="adm-activity-dot" />
                      <span>
                        <b>{a.summary}</b>
                        <small>
                          {a.actor?.name || "Administrator"} · {a.action}
                        </small>
                      </span>
                      <time>{date(a.createdAt)}</time>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  title="No admin activity recorded"
                  detail="Product, inventory and order actions will be recorded here."
                />
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
function Status({ value }) {
  return (
    <span
      className={`adm-status ${String(value || "")
        .toLowerCase()
        .replaceAll("_", "-")}`}
    >
      {String(value || "unknown").replaceAll("_", " ")}
    </span>
  );
}
function Products({ token, notify, initialSearch }) {
  const [search, setSearch] = useState(initialSearch),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [editing, setEditing] = useState(null),
    [files, setFiles] = useState([]),
    [imageRecords, setImageRecords] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [variants, setVariants] = useState([]);
  const path = `/admin/products?page=${page}&limit=25&status=${status === "all" ? "" : status}&search=${encodeURIComponent(search)}&v=${refresh}`;
  const { data, loading, error: loadError, reload } = useLoad(token, path);
  const { data: cats } = useLoad(token, "/admin/categories");
  const products = data?.items || [];
  const previews = useMemo(
    () => [...files].map((file) => URL.createObjectURL(file)),
    [files],
  );
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);
  const blank = {
    name: "",
    slug: "",
    sku: "",
    category: "",
    collection: "",
    price: "",
    salePrice: "",
    saleStartsAt: "",
    saleEndsAt: "",
    seoTitle: "",
    seoDescription: "",
    stock: "0",
    lowStockThreshold: "5",
    sizes: "",
    colors: "",
    material: "",
    fabric: "",
    fit: "",
    care: "",
    sizeGuide: "",
    shortDescription: "",
    description: "",
    status: "draft",
    featured: false,
  };
  const [form, setForm] = useState(blank);
  const startEdit = (p) => {
    setEditing(p._id);
    setForm({
      ...blank,
      ...p,
      collection: p.collectionName || p.collection || "",
      status: p.status || (p.published ? "published" : "draft"),
      price: String(p.price),
      salePrice: p.salePrice == null ? "" : String(p.salePrice),
      saleStartsAt: dateTimeInput(p.saleStartsAt),
      saleEndsAt: dateTimeInput(p.saleEndsAt),
      stock: String(p.stock),
      lowStockThreshold: String(p.lowStockThreshold ?? 5),
      sizes: (p.sizes || []).join(", "),
      colors: (p.colors || []).join(", "),
    });
    setVariants(
      (p.variants || []).map((v) => ({ ...v, stock: Number(v.stock) || 0 })),
    );
    setImageRecords((p.images || []).map((x) => ({ ...x })));
    setFiles([]);
    setError("");
    document
      .getElementById("adm-product-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };
  async function upload(file) {
    const sig = await api("/admin/cloudinary/sign", token, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", sig.timestamp);
    fd.append("folder", sig.folder);
    fd.append("allowed_formats", sig.allowed_formats);
    fd.append("max_file_size", sig.max_file_size);
    fd.append("signature", sig.signature);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
      { method: "POST", body: fd },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error?.message || "Image upload failed");
    return { url: data.secure_url, publicId: data.public_id };
  }
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (form.salePrice !== "" && Number(form.salePrice) > Number(form.price))
        throw new Error("Sale price cannot exceed regular price.");
      if (
        form.saleStartsAt &&
        form.saleEndsAt &&
        new Date(form.saleEndsAt) <= new Date(form.saleStartsAt)
      )
        throw new Error("Sale end must be later than sale start.");
      let images = editing ? [...imageRecords] : [];
      if (files.length) {
        const added = await Promise.all([...files].map(upload));
        images = [...images, ...added];
      }
      const cleanVariants = variants.filter(
        (v) => String(v.size || "").trim() || String(v.color || "").trim(),
      );
      if (
        !editing &&
        cleanVariants.some(
          (v) =>
            !String(v.size || "").trim() ||
            !String(v.color || "").trim() ||
            !Number.isInteger(Number(v.stock)) ||
            Number(v.stock) < 0,
        )
      )
        throw new Error(
          "Complete every variant with a size, color and non-negative whole-number stock.",
        );
      const payload = {
        ...form,
        price: Number(form.price),
        salePrice:
          form.salePrice === ""
            ? editing
              ? null
              : undefined
            : Number(form.salePrice),
        saleStartsAt: form.saleStartsAt
          ? new Date(form.saleStartsAt).toISOString()
          : editing
            ? null
            : undefined,
        saleEndsAt: form.saleEndsAt
          ? new Date(form.saleEndsAt).toISOString()
          : editing
            ? null
            : undefined,
        stock:
          !editing && cleanVariants.length
            ? cleanVariants.reduce((sum, v) => sum + Number(v.stock), 0)
            : Number(form.stock),
        variants:
          !editing && cleanVariants.length
            ? cleanVariants.map((v) => ({
                size: String(v.size).trim(),
                color: String(v.color).trim(),
                sku: String(v.sku || "").trim(),
                stock: Number(v.stock),
              }))
            : undefined,
        lowStockThreshold: Number(form.lowStockThreshold),
        sizes: form.sizes
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        colors: form.colors
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        images,
        published: form.status === "published",
      };
      if (editing) delete payload.stock;
      const saved = await api(
        editing ? `/admin/products/${editing}` : "/admin/products",
        token,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      if (editing)
        setImageRecords((saved.images || images).map((x) => ({ ...x })));
      notify(editing ? "Product updated" : "Product created");
      setForm(blank);
      setEditing(null);
      setVariants([]);
      setImageRecords([]);
      setFiles([]);
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function archive(p) {
    if (
      !confirm(
        `Archive ${p.name}? It will be hidden from the storefront while preserving order history.`,
      )
    )
      return;
    try {
      await api(`/admin/products/${p._id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: "archived" }),
      });
      notify("Product archived");
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function exportCsv() {
    try {
      const first = await api("/admin/products?page=1&limit=100", token),
        all = [...(first.items || [])];
      for (let page = 2; page <= Math.ceil(first.total / first.limit); page++) {
        const next = await api(`/admin/products?page=${page}&limit=100`, token);
        all.push(...(next.items || []));
      }
      const rows = [
        [
          "name",
          "sku",
          "category",
          "price",
          "salePrice",
          "stock",
          "status",
          "slug",
        ],
        ...all.map((p) => [
          p.name,
          p.sku || "",
          p.category,
          p.price,
          p.salePrice || "",
          p.stock,
          p.status || (p.published ? "published" : "draft"),
          p.slug,
        ]),
      ];
      const csv = rows
        .map((r) =>
          r.map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`).join(","),
        )
        .join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "vimuh-products.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <>
      <section className="adm-panel">
        <div className="adm-toolbar adm-products-toolbar">
          <label className="adm-search">
            <Search size={15} />
            <input
              aria-label="Search products"
              placeholder="Search name, SKU or category"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="adm-select-label">
            <SlidersHorizontal size={14} />
            <select
              aria-label="Filter product status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <button className="adm-secondary" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
        </div>
        <Notice>{loadError || error}</Notice>
        {loading ? (
          <div className="adm-loading">Loading products…</div>
        ) : loadError ? (
          <Empty title="Product records are unavailable" detail={loadError} />
        ) : products.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU / category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="adm-product-name">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" />
                        ) : (
                          <span className="adm-image-empty">
                            <Package size={17} />
                          </span>
                        )}
                        <b>{p.name}</b>
                      </div>
                    </td>
                    <td>
                      {p.sku || "—"}
                      <small>{p.category}</small>
                    </td>
                    <td>
                      {money(p.salePrice || p.price)}
                      {p.salePrice && <small>Regular {money(p.price)}</small>}
                    </td>
                    <td>
                      <span
                        className={
                          p.stock === 0
                            ? "adm-stock-out"
                            : p.stock <= (p.lowStockThreshold ?? 5)
                              ? "adm-stock-low"
                              : "adm-stock-good"
                        }
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <Status
                        value={
                          p.status || (p.published ? "published" : "draft")
                        }
                      />
                    </td>
                    <td>{date(p.updatedAt)}</td>
                    <td>
                      <div className="adm-row-actions">
                        <button
                          aria-label={`Edit ${p.name}`}
                          onClick={() => startEdit(p)}
                        >
                          <Pencil size={15} />
                        </button>
                        {p.status !== "archived" && (
                          <button
                            aria-label={`Archive ${p.name}`}
                            onClick={() => archive(p)}
                          >
                            <Archive size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No products in this view"
            detail="Add a real catalog record; no sample merchandise is inserted automatically."
          />
        )}
        <div className="adm-pagination">
          <span>{data?.total || 0} products</span>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>Page {data?.page || page}</span>
          <button
            disabled={!data || page * data.limit >= data.total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </section>
      <details
        className="adm-panel adm-form-panel"
        id="adm-product-form"
        open={!editing ? undefined : true}
      >
        <summary>
          {editing ? "Edit product" : "Create product"} <Plus size={16} />
        </summary>
        <form className="adm-form-grid" onSubmit={save}>
          <label>
            Product name
            <input
              required
              maxLength="180"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              placeholder="Generated from name if blank"
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
            />
          </label>
          <label>
            SKU
            <input
              value={form.sku || ""}
              maxLength="80"
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </label>
          <label>
            Category
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Choose category</option>
              {(cats || []).map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Collection
            <input
              value={form.collection || ""}
              onChange={(e) => setForm({ ...form, collection: e.target.value })}
            />
          </label>
          <label>
            Regular price (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </label>
          <label>
            Sale price (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
            />
          </label>
          <label>
            Sale starts (optional)
            <input
              type="datetime-local"
              value={form.saleStartsAt || ""}
              onChange={(e) =>
                setForm({ ...form, saleStartsAt: e.target.value })
              }
            />
          </label>
          <label>
            Sale ends (optional)
            <input
              type="datetime-local"
              value={form.saleEndsAt || ""}
              onChange={(e) => setForm({ ...form, saleEndsAt: e.target.value })}
            />
          </label>
          <label>
            {editing ? "Current stock (adjust in Inventory)" : "Initial stock"}
            <input
              type="number"
              min="0"
              step="1"
              required
              readOnly={Boolean(editing)}
              value={form.stock}
              onChange={(e) =>
                !editing && setForm({ ...form, stock: e.target.value })
              }
            />
          </label>
          <label>
            Low-stock threshold
            <input
              type="number"
              min="0"
              step="1"
              value={form.lowStockThreshold}
              onChange={(e) =>
                setForm({ ...form, lowStockThreshold: e.target.value })
              }
            />
          </label>
          <label>
            Sizes, comma-separated
            <input
              value={form.sizes}
              onChange={(e) => setForm({ ...form, sizes: e.target.value })}
            />
          </label>
          <label>
            Colors, comma-separated
            <input
              value={form.colors}
              onChange={(e) => setForm({ ...form, colors: e.target.value })}
            />
          </label>
          <label>
            Material / fabric
            <input
              value={form.material || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  material: e.target.value,
                  fabric: e.target.value,
                })
              }
            />
          </label>
          <label>
            Fit / style
            <input
              value={form.fit || ""}
              onChange={(e) =>
                setForm({ ...form, fit: e.target.value, style: e.target.value })
              }
            />
          </label>
          <label>
            Care information
            <input
              value={form.care || ""}
              onChange={(e) => setForm({ ...form, care: e.target.value })}
            />
          </label>
          <label>
            Product-specific size guide
            <textarea
              maxLength={3000}
              value={form.sizeGuide || ""}
              onChange={(e) => setForm({ ...form, sizeGuide: e.target.value })}
              placeholder="Add actual garment measurements and fit advice; leave blank if unavailable."
            />
          </label>
          <div className="adm-wide adm-variant-editor">
            <div>
              <b>Size/color inventory variants</b>
              <small>
                Optional. When entered, this list is authoritative for
                storefront availability. Stock is the initial count; later
                changes belong in Inventory.
              </small>
            </div>
            {editing ? (
              variants.length ? (
                <div className="adm-variant-list">
                  {variants.map((v, i) => (
                    <p key={v._id || i}>
                      {v.size} / {v.color} · SKU {v.sku || "—"} · {v.stock} in
                      stock
                    </p>
                  ))}
                </div>
              ) : (
                <p>
                  Currently tracked as product-level stock. Convert only through
                  a controlled inventory migration.
                </p>
              )
            ) : (
              <>
                <div className="adm-variant-list">
                  {variants.map((v, i) => (
                    <div className="adm-variant-row" key={i}>
                      <label>
                        Size
                        <input
                          value={v.size || ""}
                          onChange={(e) =>
                            setVariants((rows) =>
                              rows.map((row, j) =>
                                j === i
                                  ? { ...row, size: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Color
                        <input
                          value={v.color || ""}
                          onChange={(e) =>
                            setVariants((rows) =>
                              rows.map((row, j) =>
                                j === i
                                  ? { ...row, color: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Variant SKU
                        <input
                          value={v.sku || ""}
                          onChange={(e) =>
                            setVariants((rows) =>
                              rows.map((row, j) =>
                                j === i ? { ...row, sku: e.target.value } : row,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        Initial stock
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={v.stock ?? 0}
                          onChange={(e) =>
                            setVariants((rows) =>
                              rows.map((row, j) =>
                                j === i
                                  ? { ...row, stock: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="adm-secondary compact"
                        onClick={() =>
                          setVariants((rows) => rows.filter((_, j) => j !== i))
                        }
                        aria-label={`Remove variant ${i + 1}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="adm-secondary compact"
                  onClick={() =>
                    setVariants((rows) => [
                      ...rows,
                      { size: "", color: "", sku: "", stock: 0 },
                    ])
                  }
                >
                  Add size/color variant
                </button>
              </>
            )}
          </div>
          <label>
            Visibility
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              {editing && <option value="archived">Archived</option>}
            </select>
          </label>
          <label className="adm-check">
            <input
              type="checkbox"
              checked={!!form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />{" "}
            Featured product
          </label>
          <label className="adm-wide">
            Short description
            <input
              maxLength="300"
              value={form.shortDescription || ""}
              onChange={(e) =>
                setForm({ ...form, shortDescription: e.target.value })
              }
            />
          </label>
          <label className="adm-wide">
            Full description
            <textarea
              required
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label>
            SEO title
            <input
              maxLength="180"
              value={form.seoTitle || ""}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
            />
          </label>
          <label>
            SEO description
            <textarea
              maxLength="320"
              value={form.seoDescription || ""}
              onChange={(e) =>
                setForm({ ...form, seoDescription: e.target.value })
              }
            />
          </label>
          <label className="adm-wide adm-file">
            <ImagePlus size={16} />
            <span>Product gallery photos — select multiple</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setFiles(e.target.files || [])}
            />
            {files.length > 0 && (
              <small>{files.length} image(s) selected</small>
            )}
          </label>
          {previews.length > 0 && (
            <div className="adm-existing-images">
              {previews.map((src, i) => (
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt={`Selected product image ${i + 1} preview`}
                />
              ))}
            </div>
          )}
          {editing && imageRecords.length > 0 && (
            <div className="adm-wide adm-image-manager">
              <b>Gallery order & metadata</b>
              <small>
                Use the arrows to set storefront order; alt text and color are
                optional descriptive metadata. Removed assets are detached from
                the product, not deleted from Cloudinary.
              </small>
              {imageRecords.map((im, i) => (
                <div className="adm-image-row" key={im.publicId || im.url || i}>
                  <img src={im.url} alt={im.alt || `Product image ${i + 1}`} />
                  <label>
                    Alt text
                    <input
                      value={im.alt || ""}
                      maxLength="180"
                      onChange={(e) =>
                        setImageRecords((rows) =>
                          rows.map((row, j) =>
                            j === i ? { ...row, alt: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    Color tag
                    <input
                      value={im.color || ""}
                      maxLength="80"
                      placeholder="e.g. Terracotta"
                      onChange={(e) =>
                        setImageRecords((rows) =>
                          rows.map((row, j) =>
                            j === i ? { ...row, color: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="adm-image-actions">
                    <button
                      type="button"
                      className="adm-secondary compact"
                      disabled={i === 0}
                      aria-label={`Move image ${i + 1} earlier`}
                      onClick={() =>
                        setImageRecords((rows) => {
                          const next = [...rows];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          return next;
                        })
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="adm-secondary compact"
                      disabled={i === imageRecords.length - 1}
                      aria-label={`Move image ${i + 1} later`}
                      onClick={() =>
                        setImageRecords((rows) => {
                          const next = [...rows];
                          [next[i + 1], next[i]] = [next[i], next[i + 1]];
                          return next;
                        })
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="adm-secondary compact"
                      aria-label={`Remove image ${i + 1}`}
                      onClick={() =>
                        setImageRecords((rows) =>
                          rows.filter((_, j) => j !== i),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="adm-form-actions adm-wide">
            <button className="adm-primary" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create product"}
            </button>
            {editing && (
              <button
                type="button"
                className="adm-secondary"
                onClick={() => {
                  setEditing(null);
                  setForm(blank);
                  setVariants([]);
                  setImageRecords([]);
                  setFiles([]);
                }}
              >
                Cancel edit
              </button>
            )}
          </div>
          <Notice>{error}</Notice>
        </form>
      </details>
    </>
  );
}
function Categories({ token, notify }) {
  const {
      data: categories,
      loading,
      error,
      reload,
    } = useLoad(token, "/admin/categories"),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [order, setOrder] = useState("0"),
    [busy, setBusy] = useState(false);
  async function add(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/admin/categories", token, {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          displayOrder: Number(order),
        }),
      });
      setName("");
      setDescription("");
      notify("Category added");
      reload();
    } catch (e) {
      notify(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function toggle(c) {
    try {
      await api(`/admin/categories/${c._id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ active: !c.active }),
      });
      notify(c.active ? "Category hidden" : "Category activated");
      reload();
    } catch (e) {
      notify(errorText(e));
    }
  }
  return (
    <>
      <div className="adm-grid-two">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h2>Store categories</h2>
              <p>Current category records, including inactive categories.</p>
            </div>
          </div>
          <Notice>{error}</Notice>
          {loading ? (
            <div className="adm-loading">Loading categories…</div>
          ) : categories?.length ? (
            <div className="adm-compact-list">
              {categories.map((c) => (
                <div key={c._id}>
                  <span className="adm-rank">
                    {String(c.displayOrder || 0).padStart(2, "0")}
                  </span>
                  <span>
                    <b>{c.name}</b>
                    <small>
                      /{c.slug} · {c.active ? "Active" : "Hidden"}
                    </small>
                  </span>
                  <button
                    className="adm-secondary compact"
                    onClick={() => toggle(c)}
                  >
                    {c.active ? "Hide" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No categories yet"
              detail="Add the store’s confirmed categories here."
            />
          )}
        </section>
        <section className="adm-panel">
          <div className="adm-panel-head">
            <div>
              <h2>Add category</h2>
              <p>Names and order are saved to MongoDB.</p>
            </div>
          </div>
          <form className="adm-form-grid one-col" onSubmit={add}>
            <label>
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Description
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label>
              Display order
              <input
                type="number"
                min="0"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              />
            </label>
            <button className="adm-primary" disabled={busy}>
              {busy ? "Saving…" : "Add category"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
function Inventory({ token, notify }) {
  const [search, setSearch] = useState(""),
    [refresh, setRefresh] = useState(0),
    [adjust, setAdjust] = useState(null),
    [historyProduct, setHistoryProduct] = useState(null),
    [delta, setDelta] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useLoad(
    token,
    `/admin/inventory?limit=100&search=${encodeURIComponent(search)}&v=${refresh}`,
  );
  const items = data?.items || [];
  async function submit(e) {
    e.preventDefault();
    if (!adjust) return;
    setBusy(true);
    setError("");
    try {
      await api(
        adjust.variant
          ? `/admin/inventory/${adjust._id}/variants/${adjust.variant._id}/adjust`
          : `/admin/inventory/${adjust._id}/adjust`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ delta: Number(delta), reason }),
        },
      );
      notify("Stock adjustment recorded");
      setAdjust(null);
      setDelta("");
      setReason("");
      setRefresh((x) => x + 1);
      reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="adm-panel">
        <div className="adm-toolbar">
          <label className="adm-search">
            <Search size={15} />
            <input
              placeholder="Search product, SKU or category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className="adm-pill">
            {data?.total || 0} products · variants listed separately
          </span>
        </div>
        <Notice>{loadError || error}</Notice>
        {loading ? (
          <div className="adm-loading">Loading inventory…</div>
        ) : loadError ? (
          <Empty title="Inventory is unavailable" detail={loadError} />
        ) : items.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>In stock</th>
                  <th>Threshold</th>
                  <th>Updated</th>
                  <th>Adjustment</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <React.Fragment key={p._id}>
                    <tr>
                      <td>{p.name}</td>
                      <td>{p.sku || "—"}</td>
                      <td>{p.category}</td>
                      <td>
                        <span
                          className={
                            p.stock === 0
                              ? "adm-stock-out"
                              : p.stock <= (p.lowStockThreshold ?? 5)
                                ? "adm-stock-low"
                                : "adm-stock-good"
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td>{p.lowStockThreshold ?? 5}</td>
                      <td>{date(p.updatedAt)}</td>
                      <td>
                        <div className="adm-row-actions">
                          {!p.variants?.length && (
                            <button
                              className="adm-secondary compact"
                              onClick={() => setAdjust(p)}
                            >
                              Adjust
                            </button>
                          )}
                          <button
                            className="adm-row-text"
                            onClick={() => setHistoryProduct(p)}
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                    {(p.variants || []).map((v) => (
                      <tr
                        key={`${p._id}-${v._id}`}
                        className="adm-variant-stock-row"
                      >
                        <td>
                          ↳ {v.size} / {v.color}
                        </td>
                        <td>{v.sku || "—"}</td>
                        <td>{p.category}</td>
                        <td>
                          <span
                            className={
                              v.stock === 0
                                ? "adm-stock-out"
                                : v.stock <= (p.lowStockThreshold ?? 5)
                                  ? "adm-stock-low"
                                  : "adm-stock-good"
                            }
                          >
                            {v.stock}
                          </span>
                        </td>
                        <td>{p.lowStockThreshold ?? 5}</td>
                        <td>{date(p.updatedAt)}</td>
                        <td>
                          <div className="adm-row-actions">
                            <button
                              className="adm-secondary compact"
                              onClick={() => setAdjust({ ...p, variant: v })}
                            >
                              Adjust
                            </button>
                            <button
                              className="adm-row-text"
                              onClick={() => setHistoryProduct(p)}
                            >
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No inventory records"
            detail="Published and draft products appear here when saved."
          />
        )}
      </section>
      {historyProduct && (
        <InventoryHistory
          token={token}
          product={historyProduct}
          close={() => setHistoryProduct(null)}
        />
      )}
      {adjust && (
        <div
          className="adm-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setAdjust(null)}
        >
          <section
            className="adm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-title"
          >
            <button
              className="adm-modal-close"
              onClick={() => setAdjust(null)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 id="adjust-title">
              Adjust {adjust.name}
              {adjust.variant
                ? ` · ${adjust.variant.size} / ${adjust.variant.color}`
                : ""}
            </h2>
            <p>
              {adjust.variant ? (
                <>
                  Current variant stock: <b>{adjust.variant.stock}</b>. The
                  product total is updated with this variant.
                </>
              ) : (
                <>
                  Current product stock: <b>{adjust.stock}</b>.
                </>
              )}{" "}
              Use a positive or negative whole number; adjustments that cause
              negative stock are rejected.
            </p>
            <form className="adm-form-grid one-col" onSubmit={submit}>
              <label>
                Quantity change
                <input
                  type="number"
                  step="1"
                  required
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                  placeholder="e.g. 5 or -2"
                />
              </label>
              <label>
                Reason
                <input
                  required
                  minLength="3"
                  maxLength="300"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Restock, damaged item, correction…"
                />
              </label>
              <Notice>{error}</Notice>
              <button className="adm-primary" disabled={busy}>
                {busy ? "Recording…" : "Record adjustment"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
function InventoryHistory({ token, product, close }) {
  const { data, error, loading } = useLoad(
    token,
    `/admin/inventory/${product._id}/movements`,
  );
  return (
    <div
      className="adm-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section
        className="adm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Stock history for ${product.name}`}
      >
        <button className="adm-modal-close" onClick={close} aria-label="Close">
          ×
        </button>
        <span className="adm-overline">INVENTORY LEDGER</span>
        <h2>{product.name}</h2>
        <p>Current aggregate stock: {product.stock}</p>
        <Notice>{error}</Notice>
        {loading ? (
          <div className="adm-loading">Loading movements…</div>
        ) : data?.length ? (
          <div className="adm-compact-list">
            {data.map((x) => (
              <div key={x._id}>
                <span className="adm-rank">
                  {x.delta > 0 ? "+" : ""}
                  {x.delta}
                </span>
                <span>
                  <b>
                    {x.size && x.color ? `${x.size} / ${x.color} · ` : ""}
                    {x.reason}
                  </b>
                  <small>
                    {x.sku ? `${x.sku} · ` : ""}
                    {x.actor?.name || x.actor?.email || "Admin"} ·{" "}
                    {date(x.createdAt)} · {x.previousStock} → {x.newStock}
                  </small>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No adjustments recorded"
            detail="Manual stock changes will be listed with actor, reason and time."
          />
        )}
      </section>
    </div>
  );
}
function Orders({ token, notify }) {
  const loc = useLocation(),
    [search, setSearch] = useState(
      () => new URLSearchParams(loc.search).get("search") || "",
    ),
    [status, setStatus] = useState(""),
    [paymentStatus, setPaymentStatus] = useState(""),
    [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState(null),
    [error, setError] = useState("");
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useLoad(
    token,
    `/admin/orders?limit=50&search=${encodeURIComponent(search)}&status=${status}&paymentStatus=${paymentStatus}&v=${refresh}`,
  );
  const orders = data?.items || [];
  async function setOrderStatus(o, value) {
    try {
      await api(`/admin/orders/${o._id}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: value }),
      });
      notify("Order status updated");
      setRefresh((x) => x + 1);
      reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function refund(o) {
    if (!confirm(`Request a full refund for order ${o.number}?`)) return;
    try {
      await api(`/admin/orders/${o._id}/refund`, token, {
        method: "POST",
        body: JSON.stringify({ reason: "Admin-initiated full refund" }),
      });
      notify("Refund request sent");
      setRefresh((x) => x + 1);
      reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <>
      <section className="adm-panel">
        <div className="adm-toolbar adm-orders-toolbar">
          <label className="adm-search">
            <Search size={15} />
            <input
              aria-label="Search orders"
              placeholder="Order number or customer email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Order status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All fulfillment states</option>
            {[
              "pending_payment",
              "confirmed",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
              "refunded",
            ].map((x) => (
              <option key={x} value={x}>
                {x.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <select
            aria-label="Payment status filter"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="">All payment states</option>
            {["pending", "paid", "failed", "refunded"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        <Notice>{loadError || error}</Notice>
        {loading ? (
          <div className="adm-loading">Loading orders…</div>
        ) : loadError ? (
          <Empty title="Orders are unavailable" detail={loadError} />
        ) : orders.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Fulfillment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <button
                        className="adm-table-link"
                        onClick={() => setSelected(o)}
                      >
                        {o.number}
                      </button>
                    </td>
                    <td>{o.email}</td>
                    <td>{date(o.createdAt)}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <Status value={o.paymentStatus} />
                    </td>
                    <td>
                      <Status value={o.status} />
                    </td>
                    <td>
                      <div className="adm-row-actions">
                        <button
                          onClick={() => setSelected(o)}
                          aria-label={`View order ${o.number}`}
                        >
                          <Eye size={15} />
                        </button>
                        {o.paymentStatus === "paid" &&
                          o.refundStatus === "none" && (
                            <button
                              onClick={() => refund(o)}
                              aria-label={`Request refund for ${o.number}`}
                            >
                              Refund
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No matching orders"
            detail="Verified and pending orders will appear when recorded."
          />
        )}
        <div className="adm-pagination">
          <span>{data?.total || 0} orders</span>
          <button onClick={reload}>
            <RefreshCw size={13} /> Refresh list
          </button>
        </div>
      </section>
      {selected && (
        <OrderDrawer
          order={selected}
          token={token}
          close={() => setSelected(null)}
          onStatus={setOrderStatus}
        />
      )}
    </>
  );
}
function OrderDrawer({ order, token, close, onStatus }) {
  const { data, error, loading, reload } = useLoad(
    token,
    `/admin/orders/${order._id}`,
  );
  const o = data || order;
  const [note, setNote] = useState(""),
    [requestResolution, setRequestResolution] = useState(""),
    [carrier, setCarrier] = useState(o.carrier || ""),
    [trackingNumber, setTrackingNumber] = useState(o.trackingNumber || ""),
    [trackingUrl, setTrackingUrl] = useState(o.trackingUrl || ""),
    [message, setMessage] = useState("");
  async function saveNote(e) {
    e.preventDefault();
    try {
      await api(`/admin/orders/${o._id}/notes`, token, {
        method: "POST",
        body: JSON.stringify({ note }),
      });
      setMessage("Internal note saved");
      setNote("");
    } catch (e) {
      setMessage(errorText(e));
    }
  }
  async function saveTracking(e) {
    e.preventDefault();
    try {
      await api(`/admin/orders/${o._id}/shipping`, token, {
        method: "PATCH",
        body: JSON.stringify({ carrier, trackingNumber, trackingUrl }),
      });
      setMessage("Tracking information saved");
      reload();
    } catch (e) {
      setMessage(errorText(e));
    }
  }
  async function reviewRequest(r, status) {
    if (requestResolution.trim().length < 3) {
      setMessage("Add a review note of at least 3 characters.");
      return;
    }
    try {
      await api(`/admin/orders/${o._id}/requests/${r._id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewNote: requestResolution }),
      });
      setRequestResolution("");
      setMessage(
        `Request marked ${status}; no refund or order cancellation was processed.`,
      );
      reload();
    } catch (e) {
      setMessage(errorText(e));
    }
  }
  return (
    <div
      className="adm-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section
        className="adm-modal adm-order-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-drawer-title"
      >
        <button className="adm-modal-close" onClick={close} aria-label="Close">
          ×
        </button>
        <span className="adm-overline">ORDER DETAIL</span>
        <h2 id="order-drawer-title">{o.number}</h2>
        <p>
          {o.email} · {date(o.createdAt)} · {money(o.total)}
        </p>
        <div className="adm-order-statuses">
          <Status value={o.paymentStatus} />
          <Status value={o.status} />
        </div>
        <Notice>{error || message}</Notice>
        {loading ? (
          <div className="adm-loading">Loading order history…</div>
        ) : (
          <>
            <h3>Items</h3>
            {(o.items || []).map((i, n) => (
              <div className="adm-detail-row" key={n}>
                <span>
                  {i.name} · {i.size || "One size"} · {i.color || "—"} ×{" "}
                  {i.quantity}
                </span>
                <b>{money((i.unitPrice || 0) * (i.quantity || 0))}</b>
              </div>
            ))}
            <h3>Delivery</h3>
            <p>
              {[
                o.shipping?.name,
                o.shipping?.phone,
                o.shipping?.line1,
                o.shipping?.line2,
                o.shipping?.city,
                o.shipping?.state,
                o.shipping?.pincode,
              ]
                .filter(Boolean)
                .join(" · ") || "No delivery address attached"}
            </p>
            {o.gift?.wrapped && (
              <div className="adm-gift-note">
                <h3>Gift wrapping · {money(o.gift.fee)}</h3>
                <p>
                  {o.gift.note
                    ? `Gift note: ${o.gift.note}`
                    : "No gift note supplied."}
                </p>
              </div>
            )}
            <form className="adm-form-grid one-col" onSubmit={saveTracking}>
              <label>
                Carrier
                <input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
              </label>
              <label>
                Tracking number
                <input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </label>
              <label>
                HTTPS tracking URL
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                />
              </label>
              <button className="adm-secondary">Save tracking</button>
            </form>
            <h3>Customer cancellation / return requests</h3>
            {(o.customerRequests || []).length ? (
              (o.customerRequests || []).map((r) => (
                <div className="adm-note" key={r._id}>
                  <b>
                    {r.type} · {r.status}
                  </b>
                  <p>{r.reason}</p>
                  {r.reviewNote && <small>Review: {r.reviewNote}</small>}
                  {r.status === "pending" && (
                    <div className="adm-request-actions">
                      <button
                        className="adm-secondary compact"
                        onClick={() => reviewRequest(r, "approved")}
                      >
                        Mark approved
                      </button>
                      <button
                        className="adm-secondary compact"
                        onClick={() => reviewRequest(r, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No customer requests recorded.</p>
            )}
            {(o.customerRequests || []).some((r) => r.status === "pending") && (
              <label className="adm-request-note">
                Resolution note
                <textarea
                  value={requestResolution}
                  minLength="3"
                  maxLength="1000"
                  onChange={(e) => setRequestResolution(e.target.value)}
                  placeholder="Explain the review decision. This does not issue a refund."
                />
              </label>
            )}
            <h3>Internal notes</h3>
            {(o.adminNotes || []).map((n, i) => (
              <p className="adm-note" key={i}>
                {n.note} <small>{date(n.createdAt)}</small>
              </p>
            ))}
            <form className="adm-form-grid one-col" onSubmit={saveNote}>
              <label>
                Add internal note
                <textarea
                  required
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <button className="adm-secondary">Add note</button>
            </form>
            <h3>Status history</h3>
            {(o.statusHistory || []).map((h, i) => (
              <p className="adm-note" key={i}>
                {h.from} → {h.to} <small>{date(h.at)}</small>
              </p>
            ))}
            <label className="adm-status-change">
              Update allowed status
              <select
                value={o.status}
                onChange={(e) => onStatus(o, e.target.value)}
              >
                <option value={o.status}>
                  {o.status.replaceAll("_", " ")}
                </option>
                {allowedNext(o.status).map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </section>
    </div>
  );
}
function allowedNext(s) {
  return (
    {
      pending_payment: ["cancelled"],
      confirmed: ["processing"],
      processing: ["shipped"],
      shipped: ["delivered"],
    }[s] || []
  );
}
function Customers({ token }) {
  const loc = useLocation(),
    [search, setSearch] = useState(
      () => new URLSearchParams(loc.search).get("search") || "",
    ),
    [selected, setSelected] = useState(null),
    [page, setPage] = useState(1);
  const { data, loading, error } = useLoad(
    token,
    `/admin/customers?page=${page}&limit=25&search=${encodeURIComponent(search)}`,
  );
  return (
    <section className="adm-panel">
      <div className="adm-toolbar">
        <label className="adm-search">
          <Search size={15} />
          <input
            placeholder="Search name or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <span className="adm-pill">Privacy-limited directory</span>
      </div>
      <Notice>{error}</Notice>
      {loading ? (
        <div className="adm-loading">Loading customers…</div>
      ) : data?.items?.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Total paid</th>
                <th>Most recent order</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.name}</b>
                    <small>{c.email}</small>
                  </td>
                  <td>{date(c.createdAt)}</td>
                  <td>{c.orderCount}</td>
                  <td>{money(c.totalSpent)}</td>
                  <td>{date(c.lastOrder)}</td>
                  <td>
                    <button
                      className="adm-secondary compact"
                      onClick={() => setSelected(c)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No customers found"
          detail="Only registered customer profiles are listed; guest checkouts are not exposed as accounts."
        />
      )}
      <div className="adm-pagination">
        <span>{data?.total || 0} customers</span>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={!data || page * data.limit >= data.total}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
      {selected && (
        <CustomerDetail
          token={token}
          customer={selected}
          close={() => setSelected(null)}
        />
      )}
    </section>
  );
}
function CustomerDetail({ token, customer, close }) {
  const { data, error, loading } = useLoad(
    token,
    `/admin/customers/${customer.id}`,
  );
  return (
    <div
      className="adm-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section
        className="adm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Customer ${customer.name}`}
      >
        <button className="adm-modal-close" onClick={close} aria-label="Close">
          ×
        </button>
        <h2>{customer.name}</h2>
        <p>
          {customer.email} · joined {date(customer.createdAt)}
        </p>
        <Notice>{error}</Notice>
        {loading ? (
          <div className="adm-loading">Loading customer history…</div>
        ) : (
          <>
            <h3>Addresses</h3>
            {(data?.customer?.addresses || []).map((a, i) => (
              <p key={i}>
                {[a.name, a.phone, a.line1, a.line2, a.city, a.state, a.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            ))}
            <h3>Order history</h3>
            {(data?.orders || []).map((o) => (
              <div className="adm-detail-row" key={o._id}>
                <span>
                  {o.number} · {date(o.createdAt)} · {o.paymentStatus}
                </span>
                <b>{money(o.total)}</b>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
function EmailCenter({ token }) {
  const { data, error, loading, reload } = useLoad(token, "/admin/newsletter");
  const people = data || [];
  return (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <div>
          <h2>Newsletter consent records</h2>
          <p>
            Only consented subscriber records are shown. This is not a
            transactional email delivery log.
          </p>
        </div>
        <button className="adm-secondary" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <Notice>{error}</Notice>
      {loading ? (
        <div className="adm-loading">Loading consent records…</div>
      ) : people.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Consent recorded</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {people.map((x) => (
                <tr key={x._id}>
                  <td>{x.email}</td>
                  <td>{date(x.consentedAt)}</td>
                  <td>
                    <Status
                      value={x.subscribed ? "subscribed" : "unsubscribed"}
                    />
                  </td>
                  <td>{date(x.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No subscribers"
          detail="Newsletter subscribers appear only after explicit consent."
        />
      )}
    </section>
  );
}
function SettingsPage({ token }) {
  const { data, error, loading, reload } = useLoad(
    token,
    "/admin/settings/status",
  );
  const rows = [
    ["MongoDB", data?.mongodb],
    ["Cloudinary", data?.cloudinary],
    ["Razorpay", data?.razorpay],
    ["Email / SMTP", data?.email],
  ];
  return (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <div>
          <h2>Integration health</h2>
          <p>Configuration status only. Secret values are never returned.</p>
        </div>
        <button className="adm-secondary" onClick={reload}>
          <RefreshCw size={14} /> Check again
        </button>
      </div>
      <Notice>{error}</Notice>
      {loading ? (
        <div className="adm-loading">Checking integrations…</div>
      ) : (
        <div className="adm-integrations">
          {rows.map(([name, ready]) => (
            <div key={name}>
              <span>
                <b>{name}</b>
                <small>{ready ? "Configured" : "Not configured"}</small>
              </span>
              <Status value={ready ? "ready" : "unavailable"} />
            </div>
          ))}
        </div>
      )}
      <div className="adm-security-note">
        <AlertTriangle size={17} />
        <p>
          Set credentials in the server environment or secret manager. Never
          paste provider secrets into storefront code or return them from an
          admin API.
        </p>
      </div>
      <Link to="/admin/security" className="adm-text-link">
        Open administrator audit log <ArrowUpRight size={14} />
      </Link>
    </section>
  );
}
function Audit({ token }) {
  const { data, error, loading } = useLoad(token, "/admin/audit?limit=100");
  return (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <div>
          <h2>Administrative audit log</h2>
          <p>
            Recent product, category, order and inventory actions. Secrets are
            excluded from summaries.
          </p>
        </div>
      </div>
      <Notice>{error}</Notice>
      {loading ? (
        <div className="adm-loading">Loading audit records…</div>
      ) : data?.items?.length ? (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Record</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((x) => (
                <tr key={x._id}>
                  <td>{date(x.createdAt)}</td>
                  <td>{x.actor?.name || x.actor?.email || "Admin"}</td>
                  <td>{x.action}</td>
                  <td>
                    {x.recordType} {x.recordId}
                  </td>
                  <td>{x.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="No activity recorded"
          detail="Administrative writes will appear when an authorized action is made."
        />
      )}
    </section>
  );
}
function Promotions({ token, notify }) {
  const blank = {
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    minSubtotal: "0",
    maxRedemptions: "0",
    maxUsesPerCustomer: "0",
    startsAt: "",
    endsAt: "",
    active: true,
    firstOrderOnly: false,
  };
  const [form, setForm] = useState(blank),
    [editing, setEditing] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const {
      data,
      loading,
      error: loadError,
    } = useLoad(token, `/admin/coupons?page=1&limit=100&v=${refresh}`),
    items = data?.items || [];
  const edit = (c) => {
    setEditing(c._id);
    setForm({
      code: c.code || "",
      description: c.description || "",
      discountType: c.discountType || "percentage",
      discountValue: String(c.discountValue ?? ""),
      minSubtotal: String(c.minSubtotal ?? 0),
      maxRedemptions: String(c.maxRedemptions ?? 0),
      maxUsesPerCustomer: String(c.maxUsesPerCustomer ?? 0),
      startsAt: dateTimeInput(c.startsAt),
      endsAt: dateTimeInput(c.endsAt),
      active: c.active !== false,
      firstOrderOnly: Boolean(c.firstOrderOnly),
    });
    document
      .getElementById("adm-coupon-form")
      ?.scrollIntoView({ behavior: "smooth" });
  };
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (
        form.startsAt &&
        form.endsAt &&
        new Date(form.endsAt) <= new Date(form.startsAt)
      )
        throw new Error("Coupon end must be later than its start.");
      const body = {
        ...form,
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue),
        minSubtotal: Number(form.minSubtotal || 0),
        maxRedemptions: Number(form.maxRedemptions || 0),
        maxUsesPerCustomer: Number(form.maxUsesPerCustomer || 0),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };
      await api(
        editing ? `/admin/coupons/${editing}` : "/admin/coupons",
        token,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      notify(editing ? "Coupon updated" : "Coupon created");
      setForm(blank);
      setEditing("");
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="adm-panel">
        <div className="adm-panel-head">
          <div>
            <h2>Coupon rules</h2>
            <p>
              Discounts are recalculated by the server from live product prices.
              A pending payment temporarily reserves a limited-use coupon; only
              captured payments count as redemptions.
            </p>
          </div>
          <span className="adm-pill">{items.length} shown</span>
        </div>
        <Notice>{loadError}</Notice>
        {loading ? (
          <div className="adm-loading">Loading coupons…</div>
        ) : items.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Eligibility</th>
                  <th>Schedule</th>
                  <th>Uses</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <b>{c.code}</b>
                      <small>
                        {c.description || "No internal description"}
                      </small>
                    </td>
                    <td>
                      {c.discountType === "percentage"
                        ? `${c.discountValue}%`
                        : `${money(c.discountValue)} off`}
                    </td>
                    <td>
                      <small>
                        Min. {money(c.minSubtotal)}
                        {c.firstOrderOnly ? " · First order only" : ""}
                        {c.maxUsesPerCustomer
                          ? ` · ${c.maxUsesPerCustomer}/customer`
                          : ""}
                      </small>
                    </td>
                    <td>
                      <small>
                        {c.startsAt ? `From ${date(c.startsAt)}` : "Starts now"}
                        <br />
                        {c.endsAt ? `Until ${date(c.endsAt)}` : "No end date"}
                      </small>
                    </td>
                    <td>
                      {c.redemptionCount || 0}
                      {c.maxRedemptions
                        ? ` / ${c.maxRedemptions}`
                        : " / unlimited"}
                      {c.reservedCount ? (
                        <small> · {c.reservedCount} held</small>
                      ) : null}
                    </td>
                    <td>
                      <Status value={c.active ? "active" : "inactive"} />
                    </td>
                    <td>
                      <button
                        className="adm-secondary compact"
                        onClick={() => edit(c)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No coupons yet"
            detail="Create a real promotion rule here; it will not affect checkout until active and eligible."
          />
        )}
      </section>
      <details
        className="adm-panel adm-form-panel"
        id="adm-coupon-form"
        open={Boolean(editing)}
      >
        <summary>
          {editing ? "Edit coupon" : "Create coupon"} <Plus size={16} />
        </summary>
        <form className="adm-form-grid" onSubmit={save}>
          <label>
            Coupon code
            <input
              required
              pattern="[A-Za-z0-9_-]{3,32}"
              maxLength="32"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder="WELCOME10"
            />
          </label>
          <label>
            Discount type
            <select
              value={form.discountType}
              onChange={(e) =>
                setForm((f) => ({ ...f, discountType: e.target.value }))
              }
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed ₹ amount</option>
            </select>
          </label>
          <label>
            {form.discountType === "percentage" ? "Percent off" : "₹ off"}
            <input
              type="number"
              min="0.01"
              max={form.discountType === "percentage" ? "100" : undefined}
              step="0.01"
              required
              value={form.discountValue}
              onChange={(e) =>
                setForm((f) => ({ ...f, discountValue: e.target.value }))
              }
            />
          </label>
          <label>
            Minimum merchandise subtotal (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minSubtotal}
              onChange={(e) =>
                setForm((f) => ({ ...f, minSubtotal: e.target.value }))
              }
            />
          </label>
          <label>
            Overall redemption limit{" "}
            <input
              type="number"
              min="0"
              step="1"
              value={form.maxRedemptions}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxRedemptions: e.target.value }))
              }
            />
            <small>0 means unlimited</small>
          </label>
          <label>
            Uses per customer{" "}
            <input
              type="number"
              min="0"
              step="1"
              value={form.maxUsesPerCustomer}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxUsesPerCustomer: e.target.value }))
              }
            />
            <small>0 means unlimited</small>
          </label>
          <label>
            Starts (optional)
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, startsAt: e.target.value }))
              }
            />
          </label>
          <label>
            Ends (optional)
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, endsAt: e.target.value }))
              }
            />
          </label>
          <label className="adm-wide">
            Internal description
            <input
              maxLength="240"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Shown only to administrators"
            />
          </label>
          <label className="adm-check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.checked }))
              }
            />{" "}
            Coupon is active
          </label>
          <label className="adm-check">
            <input
              type="checkbox"
              checked={form.firstOrderOnly}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstOrderOnly: e.target.checked }))
              }
            />{" "}
            First completed order only
          </label>
          <div className="adm-form-actions adm-wide">
            <button className="adm-primary" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save coupon" : "Create coupon"}
            </button>
            {editing && (
              <button
                type="button"
                className="adm-secondary"
                onClick={() => {
                  setEditing("");
                  setForm(blank);
                  setError("");
                }}
              >
                Cancel edit
              </button>
            )}
          </div>
          <Notice>{error}</Notice>
        </form>
      </details>
    </>
  );
}
function SupportCenter({ token, notify }) {
  const [kind, setKind] = useState("reviews"),
    [status, setStatus] = useState("pending"),
    [drafts, setDrafts] = useState({}),
    [working, setWorking] = useState("");
  const endpoint =
      kind === "reviews"
        ? `/admin/reviews?status=${status}`
        : `/admin/questions?status=${status}`,
    { data, error, loading, reload } = useLoad(token, endpoint),
    rows = data?.items || [];
  const patchDraft = (id, field, value) =>
    setDrafts((all) => ({
      ...all,
      [id]: { ...(all[id] || {}), [field]: value },
    }));
  async function resolve(row, next) {
    const draft = drafts[row._id] || {},
      body =
        kind === "reviews"
          ? { status: next, moderationNote: draft.note || "" }
          : {
              status: next,
              answer: draft.answer || "",
              moderationNote: draft.note || "",
            };
    if (
      kind === "questions" &&
      next === "published" &&
      String(body.answer).trim().length < 3
    ) {
      notify("Add an answer of at least 3 characters before publishing.");
      return;
    }
    setWorking(row._id);
    try {
      await api(
        kind === "reviews"
          ? `/admin/reviews/${row._id}`
          : `/admin/questions/${row._id}`,
        token,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      notify(
        kind === "reviews"
          ? `Review marked ${next}`
          : `Question marked ${next}`,
      );
      setDrafts((all) => {
        const copy = { ...all };
        delete copy[row._id];
        return copy;
      });
      reload();
    } catch (e) {
      notify(errorText(e));
    } finally {
      setWorking("");
    }
  }
  return (
    <section className="adm-panel support-center">
      <div className="adm-panel-head">
        <div>
          <h2>Reviews &amp; product questions</h2>
          <p>
            Only publish feedback you are comfortable showing on the storefront.
            Ratings remain hidden until a real moderated review is published.
          </p>
        </div>
        <button className="adm-secondary" onClick={reload}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <div className="adm-toolbar support-toolbar">
        <div className="adm-segmented" role="group" aria-label="Feedback type">
          <button
            className={kind === "reviews" ? "active" : ""}
            onClick={() => setKind("reviews")}
          >
            Reviews
          </button>
          <button
            className={kind === "questions" ? "active" : ""}
            onClick={() => setKind("questions")}
          >
            Questions
          </button>
        </div>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>
      <Notice>{error}</Notice>
      {loading ? (
        <div className="adm-loading">Loading {kind}…</div>
      ) : rows.length ? (
        <div className="adm-feedback-list">
          {rows.map((row) => {
            const draft = drafts[row._id] || {};
            return (
              <article className="adm-feedback-card" key={row._id}>
                <div className="adm-feedback-meta">
                  <span className="adm-pill">{row.status}</span>
                  <b>{row.product?.name || "Product unavailable"}</b>
                  <small>
                    {row.authorLabel || row.user?.name || "Customer"} ·{" "}
                    {date(row.createdAt)}
                  </small>
                </div>
                {kind === "reviews" ? (
                  <>
                    <div className="adm-feedback-title">
                      <b>
                        {row.rating} / 5 · {row.title}
                      </b>
                      <small>
                        {row.verifiedPurchase
                          ? "Verified purchase"
                          : "Not marked verified"}
                      </small>
                    </div>
                    <p>{row.body}</p>
                  </>
                ) : (
                  <>
                    <p>
                      <b>Q. </b>
                      {row.question}
                    </p>
                    {row.answer && (
                      <p>
                        <b>A. </b>
                        {row.answer}
                      </p>
                    )}
                  </>
                )}
                <label>
                  Internal moderation note{" "}
                  <textarea
                    maxLength="1000"
                    value={draft.note ?? row.moderationNote ?? ""}
                    onChange={(e) =>
                      patchDraft(row._id, "note", e.target.value)
                    }
                    placeholder="Optional internal context; never shown to customers."
                  />
                </label>
                {kind === "questions" && (
                  <label>
                    Store answer{" "}
                    <textarea
                      maxLength="2000"
                      value={draft.answer ?? row.answer ?? ""}
                      onChange={(e) =>
                        patchDraft(row._id, "answer", e.target.value)
                      }
                      placeholder="Required to publish a product question."
                    />
                  </label>
                )}
                {row.status === "pending" ? (
                  <div className="adm-feedback-actions">
                    <button
                      className="adm-primary"
                      disabled={working === row._id}
                      onClick={() => resolve(row, "published")}
                    >
                      Publish{kind === "questions" ? " answer" : ""}
                    </button>
                    <button
                      className="adm-secondary"
                      disabled={working === row._id}
                      onClick={() => resolve(row, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <small>
                    Moderated {date(row.moderatedAt || row.answeredAt)}
                  </small>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title={`No ${status} ${kind}`}
          detail={
            kind === "reviews"
              ? "Verified-purchase reviews submitted by customers will appear here for review."
              : "Signed-in customer questions will appear here so you can answer and publish them."
          }
        />
      )}
      <div className="adm-security-note">
        <AlertTriangle size={17} />
        <p>
          Contact-form messages are still delivered through configured SMTP and
          are not yet stored as a support inbox. Order-specific cancellation and
          return requests remain in the order detail screen.
        </p>
      </div>
    </section>
  );
}
function ModuleStatus({ section }) {
  const text = {
    promotions: [
      "Promotion rules need to be implemented before coupons can affect checkout.",
      "No coupon is applied or implied by this page.",
    ],
    support: [
      "Support inbox and review moderation require persistent message/review records and moderation rules.",
      "Contact form delivery currently uses configured SMTP; messages are not yet stored in a dashboard inbox.",
    ],
    content: [
      "Storefront content management requires a publishing schema and preview workflow.",
      "The current homepage uses source-controlled editorial content and local supplied images.",
    ],
  }[section];
  return (
    <section className="adm-panel adm-module-status">
      <span className="adm-status-icon">
        <Settings size={20} />
      </span>
      <h2>{text[0]}</h2>
      <p>{text[1]}</p>
      <p className="adm-module-hint">
        This module is intentionally marked unavailable rather than showing
        fabricated controls or metrics. See{" "}
        <Link to="/admin/settings">integration and setup status</Link> and the
        implementation plan for remaining work.
      </p>
    </section>
  );
}
