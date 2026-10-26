import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import AdminConsole from "./AdminConsole.jsx";
import {
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search,
  UserRound,
  Heart,
  ShoppingBag,
  Menu,
  X,
  ArrowRight,
  House,
  Store,
  ArrowUpRight,
  Plus,
  Minus,
  Instagram,
  Trash2,
  Package,
  LogOut,
  ChevronRight,
} from "lucide-react";
const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const C = createContext(null);
const useStore = () => useContext(C);
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const optimized = (url, w = 700) =>
  url?.includes("/image/upload/")
    ? url.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_" + w + "/")
    : url || "";
const img = (p, w = 700, index = 0) =>
  optimized(p?.images?.[index]?.url || p?.images?.[0]?.url, w);
const srcSet = (url) =>
  url?.includes("/image/upload/")
    ? [400, 700, 1000, 1400].map((w) => `${optimized(url, w)} ${w}w`).join(", ")
    : undefined;
const localCategoryImage = (name) => {
  const n = String(name || "").toLowerCase();
  if (/western|dress|top|bottom/.test(n))
    return "/assets/categories/western-wear.webp";
  if (/ethnic|indian|kurta/.test(n))
    return "/assets/categories/ethnic-wear.webp";
  if (/fusion|indo|co-ord/.test(n))
    return "/assets/categories/indo-western.webp";
  return "/assets/lookbook/everyday-edit.webp";
};
const ANALYTICS_CONSENT_KEY = "vimuh-analytics-consent",
  ANALYTICS_VISITOR_KEY = "vimuh-analytics-visitor",
  ANALYTICS_SESSION_KEY = "vimuh-analytics-session";
function analyticsId(key, storage) {
  try {
    let value = storage.getItem(key);
    if (!value) {
      value = crypto.randomUUID().replaceAll("-", "");
      storage.setItem(key, value);
    }
    return value;
  } catch {
    return "";
  }
}
function trackAnalytics(
  eventType,
  { path = window.location.pathname, productSlug = "" } = {},
) {
  try {
    if (localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "granted") return;
    const visitorId = analyticsId(ANALYTICS_VISITOR_KEY, localStorage),
      sessionId = analyticsId(ANALYTICS_SESSION_KEY, sessionStorage);
    if (!visitorId || !sessionId) return;
    fetch(`${API}/analytics/events`, {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consent: true,
        eventType,
        path,
        productSlug: productSlug || undefined,
        visitorId,
        sessionId,
      }),
    }).catch(() => {});
  } catch {}
}
function AnalyticsPreference({ value, onChange }) {
  if (value) return null;
  return (
    <aside
      className="analytics-preference"
      role="region"
      aria-label="Analytics preference"
    >
      <div>
        <b>Help VIMUHET improve</b>
        <p>
          Allow anonymous visit, page and shopping-flow measurement. No name,
          email or precise location is collected.
        </p>
      </div>
      <div>
        <button className="button outline" onClick={() => onChange("denied")}>
          Keep essential only
        </button>
        <button className="button dark" onClick={() => onChange("granted")}>
          Allow analytics
        </button>
      </div>
    </aside>
  );
}
async function request(path, { token, ...opts } = {}) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(data.error || "Request failed. Please try again.");
  return data;
}
function mergeCartItems(local = [], remote = []) {
  const rows = new Map();
  for (const item of [...remote, ...local]) {
    const key = `${item.productId}|${item.variantId || ""}|${item.size || ""}|${item.color || ""}`,
      prior = rows.get(key);
    rows.set(
      key,
      prior
        ? {
            ...item,
            ...prior,
            quantity: Math.max(
              Number(prior.quantity) || 1,
              Number(item.quantity) || 1,
            ),
          }
        : item,
    );
  }
  return [...rows.values()].slice(0, 30);
}
function sameCartItems(a = [], b = []) {
  const normalize = (rows) =>
    rows
      .map((item) => [
        String(item.productId || ""),
        String(item.variantId || ""),
        String(item.size || ""),
        String(item.color || ""),
        Number(item.quantity) || 0,
        Number(item.stock) || 0,
        Number(item.price) || 0,
      ])
      .sort((x, y) => x.join("|").localeCompare(y.join("|")));
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}
function App() {
  const location = useLocation(),
    isAdmin = location.pathname.startsWith("/admin"),
    [analyticsConsent, setAnalyticsConsent] = useState(() => {
      try {
        return localStorage.getItem(ANALYTICS_CONSENT_KEY) || "";
      } catch {
        return "";
      }
    }),
    [showSplash, setShowSplash] = useState(() => {
      try {
        return sessionStorage.getItem("vimuh-splash-seen") !== "1";
      } catch {
        return true;
      }
    }),
    [cart, setCart] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("vimuh-cart") || "[]");
      } catch {
        return [];
      }
    }),
    [token, setToken] = useState(
      () => localStorage.getItem("vimuh-token") || "",
    ),
    [user, setUser] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("vimuh-user") || "null");
      } catch {
        return null;
      }
    }),
    [wishlist, setWishlist] = useState(() =>
      JSON.parse(localStorage.getItem("vimuh-wish") || "[]"),
    ),
    [toast, setToast] = useState(""),
    [categories, setCategories] = useState([]);
  const cartRef = React.useRef(cart),
    [cartSyncReady, setCartSyncReady] = useState(false);
  const notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 2800);
  };
  useEffect(() => {
    cartRef.current = cart;
    localStorage.setItem("vimuh-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    let live = true;
    if (!token) {
      setCartSyncReady(false);
      return () => {
        live = false;
      };
    }
    setCartSyncReady(false);
    request("/auth/me/cart", { token })
      .then((result) => {
        if (!live) return;
        const merged = mergeCartItems(cartRef.current, result.items || []);
        setCart(merged);
        cartRef.current = merged;
        setCartSyncReady(true);
      })
      .catch(() => {
        if (live) setCartSyncReady(true);
      });
    return () => {
      live = false;
    };
  }, [token]);
  useEffect(() => {
    if (!token || !cartSyncReady) return;
    const timer = setTimeout(
      () =>
        request("/auth/me/cart", {
          token,
          method: "PUT",
          body: JSON.stringify({
            items: cart.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
            })),
          }),
        })
          .then((result) => {
            if (result?.items)
              setCart((current) => {
                const merged = mergeCartItems(current, result.items);
                return sameCartItems(current, merged) ? current : merged;
              });
          })
          .catch(() => {}),
      450,
    );
    return () => clearTimeout(timer);
  }, [cart, token, cartSyncReady]);
  useEffect(() => {
    localStorage.setItem("vimuh-wish", JSON.stringify(wishlist));
  }, [wishlist]);
  useEffect(() => {
    if (!showSplash) return;
    try {
      sessionStorage.setItem("vimuh-splash-seen", "1");
    } catch {}
    const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches,
      timer = setTimeout(() => setShowSplash(false), reduced ? 650 : 1600);
    return () => clearTimeout(timer);
  }, [showSplash]);
  useEffect(() => {
    request("/categories")
      .then(setCategories)
      .catch(() => {});
  }, []);
  useEffect(() => {
    try {
      if (analyticsConsent)
        localStorage.setItem(ANALYTICS_CONSENT_KEY, analyticsConsent);
    } catch {}
  }, [analyticsConsent]);
  useEffect(() => {
    if (isAdmin || analyticsConsent !== "granted") return;
    trackAnalytics("page_view", { path: location.pathname });
    const match = location.pathname.match(/^\/products\/([a-z0-9-]+)$/i);
    if (match)
      trackAnalytics("product_view", {
        path: location.pathname,
        productSlug: match[1].toLowerCase(),
      });
  }, [location.pathname, isAdmin, analyticsConsent]);
  const auth = {
    token,
    user,
    setAuth: (t, u) => {
      setToken(t);
      setUser(u);
      localStorage.setItem("vimuh-token", t);
      localStorage.setItem("vimuh-user", JSON.stringify(u));
    },
    logout: () => {
      setToken("");
      setUser(null);
      localStorage.removeItem("vimuh-token");
      localStorage.removeItem("vimuh-user");
    },
  };
  const value = {
    cart,
    setCart,
    token,
    user,
    wishlist,
    setWishlist,
    notify,
    categories,
    auth,
  };
  return (
    <C.Provider value={value}>
      {isAdmin ? (
        <Admin />
      ) : (
        <>
          <Header />
          <RouteTransition />
          <MobileBottomNav />
          <Footer />
          <AnalyticsPreference
            value={analyticsConsent}
            onChange={setAnalyticsConsent}
          />
        </>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />
        )}
      </AnimatePresence>
    </C.Provider>
  );
}
function SplashScreen({ onFinish }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="splash-screen"
      role="status"
      aria-label="Loading VIMUHET"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.42, ease: "easeInOut" }}
    >
      <motion.div
        className="splash-content"
        initial={reduce ? false : { opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: reduce ? 0.1 : 0.75,
          ease: [0.22, 0.61, 0.36, 1],
        }}
      >
        <img
          className="splash-logo"
          src="/assets/brand/vimuhet-logo-transparent.webp"
          alt="VIMUHET"
        />
        <p className="splash-tagline">Clothing that moves with you.</p>
        <div className="splash-progress" aria-hidden="true">
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reduce ? 0.35 : 1.25, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
      <button type="button" className="splash-skip" onClick={onFinish}>
        Skip intro
      </button>
    </motion.div>
  );
}
function RouteTransition() {
  const location = useLocation(),
    reduce = useReducedMotion();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="route-transition"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 0.24, ease: [0.22, 0.61, 0.36, 1] }
        }
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Catalog />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/shipping-returns" element={<ShippingPage />} />
          <Route path="/products/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/account" element={<Account />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/newsletter/unsubscribe" element={<Unsubscribe />} />
          <Route
            path="/stock-alerts/unsubscribe"
            element={<PreferenceUnsubscribe type="stock-alerts" />}
          />
          <Route
            path="/cart-reminders/unsubscribe"
            element={<PreferenceUnsubscribe type="cart-reminders" />}
          />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order-lookup" element={<OrderLookup />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/admin" element={<Admin />} />
          <Route
            path="*"
            element={
              <main className="page">
                <h1>Page not found</h1>
                <Link to="/">Back home</Link>
              </main>
            }
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
function MobileBottomNav() {
  const { cart } = useStore();
  return (
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">
      <Link to="/">
        <House size={17} />
        <span>Home</span>
      </Link>
      <Link to="/products">
        <Store size={17} />
        <span>Shop</span>
      </Link>
      <Link to="/wishlist">
        <Heart size={17} />
        <span>Saved</span>
      </Link>
      <Link to="/account">
        <UserRound size={17} />
        <span>Account</span>
      </Link>
      <Link to="/cart">
        <ShoppingBag size={17} />
        <span>
          Bag{" "}
          {cart.reduce((s, i) => s + i.quantity, 0) > 0 &&
            `(${cart.reduce((s, i) => s + i.quantity, 0)})`}
        </span>
      </Link>
    </nav>
  );
}
const RECENT_KEY = "vimuh-recently-viewed-v1";
function getRecentProducts() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}
function rememberProduct(product) {
  try {
    const record = { _id: product._id, slug: product.slug };
    const rows = [
      record,
      ...getRecentProducts().filter((p) => p._id !== record._id),
    ].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(rows));
  } catch {}
}
function Header() {
  const { cart, token } = useStore(),
    [menu, setMenu] = useState(false),
    [q, setQ] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [suggestions, setSuggestions] = useState([]),
    navigate = useNavigate(),
    searchRef = React.useRef(null);
  useEffect(() => {
    const outside = (e) => {
      if (!searchRef.current?.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const timer = setTimeout(
      () =>
        request(`/products?search=${encodeURIComponent(query)}`)
          .then((rows) => {
            if (active) setSuggestions(rows.slice(0, 5));
          })
          .catch(() => {
            if (active) setSuggestions([]);
          }),
      220,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q]);
  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearchOpen(false);
    navigate(`/products?search=${encodeURIComponent(q.trim())}`);
  };
  return (
    <>
      <div className="announcement">
        Clothing that moves with you. <span>✳</span> Free shipping over ₹2,499
      </div>
      <header className="nav">
        <button
          className="icon mobile"
          onClick={() => setMenu(!menu)}
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav
          className={`links ${menu ? "open" : ""}`}
          aria-label="Main navigation"
        >
          <Link to="/" onClick={() => setMenu(false)}>
            Home
          </Link>
          <Link to="/products" onClick={() => setMenu(false)}>
            Shop
          </Link>
          <Link to="/products" onClick={() => setMenu(false)}>
            Collections
          </Link>
          <Link to="/about" onClick={() => setMenu(false)}>
            About
          </Link>
          <Link to="/contact" onClick={() => setMenu(false)}>
            Contact
          </Link>
        </nav>
        <Link to="/" className="wordmark">
          VIMUHET<span>✳</span>
        </Link>
        <div className="nav-actions">
          <form
            ref={searchRef}
            className={`search ${searchOpen ? "search-open" : ""}`}
            onSubmit={submit}
          >
            <button
              type="button"
              className="search-trigger"
              aria-label="Search products"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search size={17} />
            </button>
            <input
              placeholder="Find your favourite…"
              value={q}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setQ(e.target.value);
                setSearchOpen(true);
              }}
              aria-label="Search products"
              aria-autocomplete="list"
              aria-controls="product-search-suggestions"
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
            />
            {searchOpen && q.trim().length >= 2 && (
              <div
                id="product-search-suggestions"
                className="search-suggestions"
                role="listbox"
                aria-label="Product suggestions"
              >
                {suggestions.length ? (
                  suggestions.map((p) => (
                    <Link
                      role="option"
                      aria-selected="false"
                      key={p._id}
                      to={`/products/${p.slug}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQ("");
                        setSearchOpen(false);
                      }}
                    >
                      <img src={img(p, 90)} alt="" />
                      <span>
                        <b>{p.name}</b>
                        <small>
                          {p.category} · {money(p.salePrice || p.price)}
                        </small>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p role="status">No matching pieces yet.</p>
                )}
                <button type="submit" className="suggestion-all">
                  See all results for “{q.trim()}”
                </button>
              </div>
            )}
          </form>
          <Link
            className="icon desktop"
            to={token ? "/orders" : "/account"}
            aria-label="Account"
          >
            <UserRound />
          </Link>
          <Link className="icon desktop" to="/wishlist" aria-label="Wishlist">
            <Heart />
          </Link>
          <Link
            className="icon bag"
            to="/cart"
            aria-label={`Shopping bag, ${cart.reduce((s, i) => s + i.quantity, 0)} items`}
          >
            <ShoppingBag />
            <sup>{cart.reduce((s, i) => s + i.quantity, 0)}</sup>
          </Link>
        </div>
      </header>
    </>
  );
}

function Home() {
  const { categories } = useStore();
  const reduce = useReducedMotion();
  const categoryCards = categories.length
    ? categories.slice(0, 6)
    : [
        "Western Wear",
        "Ethnic Wear",
        "Indo-Western",
        "Dresses",
        "Tops",
        "Co-ord Sets",
      ].map((name) => ({ name }));
  return (
    <main id="top">
      <motion.section
        className="hero-banner"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.75 }}
      >
        <picture>
          <source
            media="(max-width:600px)"
            srcSet="/assets/hero/hero-mobile.webp"
          />
          <img
            className="hero-banner-image"
            src="/assets/hero/hero-desktop.webp"
            alt="VIMUHET model wearing terracotta Indian-inspired fashion in a heritage courtyard"
            fetchpriority="high"
            decoding="async"
          />
        </picture>
        <div className="hero-shade" />
        <div className="hero-banner-copy">
          <motion.div
            className="hero-banner-copy-content"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.12,
              ease: [0.22, 0.61, 0.36, 1],
            }}
          >
            <span className="eyebrow">
              MODERN INDIAN HERITAGE · MADE FOR EVERYDAY
            </span>
            <p className="hero-brand">VIMUHET</p>
            <h1>
              Clothing that
              <br />
              <em>moves with you.</em>
            </h1>
            <p>
              Thoughtful Indian-inspired pieces for all the places life takes
              you.
            </p>
            <Link className="button terracotta" to="/products">
              Shop now <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
        <span className="hero-caption">
          THE EVERYDAY EDIT · ROOTED HERE, WORN EVERYWHERE
        </span>
      </motion.section>
      <section className="circle-categories">
        <div className="section-head">
          <div>
            <span className="eyebrow">FIND YOUR KIND OF EVERYDAY</span>
            <h2>
              Shop by <em>feeling.</em>
            </h2>
          </div>
          <Link to="/products" className="text-link">
            View all collections <ArrowRight size={15} />
          </Link>
        </div>
        <div
          className="circle-category-row"
          role="region"
          aria-label="Browse categories"
        >
          <div className="circle-category-track">
            {[false, true].map((duplicate) => (
              <div
                className="circle-category-group"
                aria-hidden={duplicate || undefined}
                key={duplicate ? "duplicate-categories" : "categories"}
              >
                {categoryCards.map((c, i) => (
                  <Link
                    key={`${duplicate ? "copy-" : ""}${c._id || c.name}`}
                    tabIndex={duplicate ? -1 : undefined}
                    className="circle-category"
                    to={`/products?category=${encodeURIComponent(c.name)}`}
                  >
                    <span>
                      <img
                        src={c.image?.url || localCategoryImage(c.name)}
                        alt=""
                        loading="lazy"
                      />
                    </span>
                    <b>{c.name}</b>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
      <HomeArrivals />
      <section className="edit-banner">
        <img
          src="/assets/lookbook/everyday-edit.webp"
          alt="Everyday wardrobe in warm, natural textures"
          loading="lazy"
        />
        <div className="edit-copy">
          <span className="eyebrow">THE VIMUHET EDIT</span>
          <h2>
            Wear the
            <br />
            <em>in-between.</em>
          </h2>
          <p>
            For chai that turns into dinner. For plans you didn't make. For the
            everyday that's anything but.
          </p>
          <Link className="button ivory-button" to="/products">
            Explore the edit <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="story">
        <div className="story-art">
          <img
            src="/assets/brand/brand-story.webp"
            alt="Model in a terracotta outfit in a heritage courtyard"
            loading="lazy"
          />
        </div>
        <div className="story-copy">
          <span className="eyebrow">A NOTE FROM US</span>
          <h2>
            Clothes should
            <br />
            feel like <em>coming home.</em>
          </h2>
          <p>
            VIMUHET is a little love letter to the many ways of being a woman
            here. Familiar craft, considered details and easy silhouettes for
            everyday life.
          </p>
          <p>
            Thoughtful style. Comfortable pieces. Prices that feel just right.
          </p>
          <Link to="/about" className="text-link">
            Our story <ArrowRight size={15} />
          </Link>
        </div>
      </section>
      <section className="promise">
        <div>
          ✳ <span>Easy, all-day fits</span>
        </div>
        <div>
          ✳ <span>Thoughtfully chosen fabrics</span>
        </div>
        <div>
          ✳ <span>Prices that feel good</span>
        </div>
        <div>
          ✳ <span>Made for real life</span>
        </div>
      </section>
      <Newsletter />
    </main>
  );
}
function EditorialFallback() {
  return (
    <div className="editorial-fallback">
      <div className="editorial-fallback-head">
        <span className="eyebrow">A LITTLE VIMUHET INSPIRATION</span>
        <p>
          Explore the colors, textures and silhouettes behind our point of view.
        </p>
        <Link to="/about" className="text-link">
          Discover our story <ArrowRight size={14} />
        </Link>
      </div>
      <div className="editorial-fallback-grid">
        {[
          [
            "/assets/categories/western-wear.webp",
            "Terracotta in motion",
            "Color story",
          ],
          [
            "/assets/categories/ethnic-wear.webp",
            "A softer kind of tradition",
            "Heritage notes",
          ],
          [
            "/assets/lookbook/everyday-edit.webp",
            "The beauty of everyday",
            "Texture & tone",
          ],
        ].map(([src, title, label]) => (
          <Link to="/about" className="inspiration-card" key={title}>
            <img src={src} alt="" loading="lazy" />
            <span>{label}</span>
            <h3>{title}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
function HomeArrivals() {
  const [products, setProducts] = useState([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    request("/products?sort=newest")
      .then((rows) => setProducts(rows.slice(0, 4)))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);
  const editorial = failed || (!loading && !products.length);
  return (
    <section className="shop-section home-arrivals">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            {editorial ? "THE VIMUHET EDIT" : "JUST LANDED"}
          </span>
          <h2>
            {editorial ? (
              <>
                A little <em>inspiration.</em>
              </>
            ) : (
              <>
                New <em>arrivals.</em>
              </>
            )}
          </h2>
        </div>
        {!editorial && (
          <Link to="/products" className="text-link">
            View all pieces <ArrowRight size={15} />
          </Link>
        )}
      </div>
      {editorial ? (
        <EditorialFallback />
      ) : loading ? (
        <div className="arrival-skeleton" aria-label="Loading new arrivals">
          <i />
          <i />
          <i />
          <i />
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </section>
  );
}
function ProductGrid({ limit = 0, products: provided }) {
  const { wishlist, setWishlist, notify } = useStore(),
    [products, setProducts] = useState(provided || []),
    [loading, setLoading] = useState(!provided),
    [error, setError] = useState(""),
    [quickProduct, setQuickProduct] = useState(null);
  useEffect(() => {
    if (provided) return;
    request("/products")
      .then((x) => setProducts(x))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [provided]);
  const rows = limit ? products.slice(0, limit) : products;
  if (loading)
    return <div className="empty-catalog">Loading the collection…</div>;
  if (error)
    return (
      <div className="empty-catalog">
        {error}
        <button className="button outline" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!rows.length)
    return (
      <div className="empty-catalog">
        No pieces found. Try another search or category.
      </div>
    );
  return (
    <>
      <div className="product-grid">
        {rows.map((p, i) => (
          <motion.article
            className="product"
            key={p._id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
          >
            <Link to={`/products/${p.slug}`} className="product-image">
              <img
                src={img(p)}
                srcSet={srcSet(p.images?.[0]?.url)}
                sizes="(max-width: 600px) 45vw, (max-width: 1000px) 32vw, 24vw"
                alt={p.images?.[0]?.alt || p.name}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
              {p.badge && <span className="badge">{p.badge}</span>}
            </Link>
            <button
              className={`heart ${wishlist.includes(p._id) ? "active" : ""}`}
              aria-label={`${wishlist.includes(p._id) ? "Remove" : "Add"} ${p.name} ${wishlist.includes(p._id) ? "from" : "to"} wishlist`}
              aria-pressed={wishlist.includes(p._id)}
              onClick={() => {
                setWishlist((w) =>
                  w.includes(p._id)
                    ? w.filter((x) => x !== p._id)
                    : [...w, p._id],
                );
                notify("Wishlist updated");
              }}
            >
              <Heart
                size={17}
                fill={wishlist.includes(p._id) ? "currentColor" : "none"}
              />
            </button>
            <Link to={`/products/${p.slug}`} className="product-info">
              <div>
                <h3>{p.name}</h3>
                <p>{p.colors?.[0] || p.material || p.category}</p>
              </div>
              <span className="product-price">
                {p.salePrice && <del>{money(p.price)}</del>}
                <strong>{money(p.salePrice || p.price)}</strong>
              </span>
            </Link>
            <div className="product-category">
              {p.category} · {p.stock > 0 ? `${p.stock} available` : "Sold out"}
            </div>
            <button
              className="quick-add-trigger"
              disabled={!p.stock}
              onClick={() => setQuickProduct(p)}
              aria-label={`Quick add ${p.name}`}
            >
              Quick add <Plus size={13} />
            </button>
          </motion.article>
        ))}
      </div>
      {quickProduct && (
        <QuickAddDialog
          product={quickProduct}
          close={() => setQuickProduct(null)}
        />
      )}
    </>
  );
}
function QuickAddDialog({ product, close }) {
  const ref = React.useRef(null),
    { cart, setCart, notify } = useStore(),
    first = product.variants?.find((v) => v.stock > 0) || product.variants?.[0],
    [size, setSize] = useState(first?.size || product.sizes?.[0] || ""),
    [color, setColor] = useState(first?.color || product.colors?.[0] || "");
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);
  const variant = product.variants?.length
      ? product.variants.find((v) => v.size === size && v.color === color)
      : null,
    stock = product.variants?.length ? variant?.stock || 0 : product.stock || 0;
  function add() {
    if (!stock) return;
    if (product.sizes?.length && !size) return notify("Choose a size first");
    if (product.colors?.length && !color) return notify("Choose a color first");
    const prior = cart.find(
      (x) =>
        x.productId === product._id && x.size === size && x.color === color,
    );
    if ((prior?.quantity || 0) >= stock)
      return notify("No more stock is available for this selection");
    const photo =
      product.images?.find(
        (x) => x.color && x.color.toLowerCase() === color.toLowerCase(),
      ) || product.images?.[0];
    setCart((items) => {
      const index = items.findIndex(
        (x) =>
          x.productId === product._id && x.size === size && x.color === color,
      );
      if (index >= 0) {
        const next = [...items];
        next[index] = {
          ...next[index],
          quantity: next[index].quantity + 1,
          stock,
        };
        return next;
      }
      return [
        ...items,
        {
          productId: product._id,
          variantId: variant?._id,
          sku: variant?.sku || product.sku,
          slug: product.slug,
          name: product.name,
          price: product.salePrice || product.price,
          image: photo?.url,
          size,
          color,
          quantity: 1,
          stock,
        },
      ];
    });
    notify("Added to your bag");
    close();
  }
  return (
    <dialog
      ref={ref}
      className="quick-add-dialog"
      aria-labelledby="quick-add-title"
      onClose={close}
      onClick={(e) => e.target === ref.current && close()}
    >
      <button
        type="button"
        className="icon quick-add-close"
        onClick={close}
        aria-label="Close quick add"
      >
        <X />
      </button>
      <span className="eyebrow">QUICK ADD</span>
      <h2 id="quick-add-title">{product.name}</h2>
      <p>{money(product.salePrice || product.price)}</p>
      {product.colors?.length > 0 && (
        <fieldset>
          <legend>Color</legend>
          <div className="variant-row">
            {product.colors.map((c) => (
              <button
                type="button"
                className={`variant${color === c ? " selected" : ""}`}
                key={c}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {product.sizes?.length > 0 && (
        <fieldset>
          <legend>Size</legend>
          <div className="variant-row">
            {product.sizes.map((s) => {
              const v = product.variants?.find(
                  (x) => x.size === s && x.color === color,
                ),
                disabled = !!product.variants?.length && (!v || v.stock < 1);
              return (
                <button
                  type="button"
                  className={`variant${size === s ? " selected" : ""}`}
                  key={s}
                  disabled={disabled}
                  aria-pressed={size === s}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <p className="quick-add-stock" aria-live="polite">
        {stock > 0
          ? `${stock} available for this selection`
          : "Sold out for this selection"}
      </p>
      <button
        type="button"
        className="button dark full"
        disabled={!stock}
        onClick={add}
      >
        {stock ? "Add to bag" : "Sold out"}
      </button>
    </dialog>
  );
}

function Catalog() {
  const params = new URLSearchParams(location.search),
    { categories } = useStore(),
    [category, setCategory] = useState(params.get("category") || ""),
    [search, setSearch] = useState(params.get("search") || ""),
    [sort, setSort] = useState("newest"),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [inStock, setInStock] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(
      () => typeof window !== "undefined" && window.innerWidth > 650,
    ),
    [products, setProducts] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    request(
      `/products?${new URLSearchParams({ ...(category ? { category } : {}), ...(search ? { search } : {}), ...(min ? { min } : {}), ...(max ? { max } : {}), ...(size ? { size } : {}), ...(color ? { color } : {}), ...(inStock ? { inStock: "true" } : {}), sort })}`,
    )
      .then(setProducts)
      .catch((e) => {
        setError(e.message);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [category, search, sort, min, max, size, color, inStock]);
  const sizes = [...new Set(products.flatMap((p) => p.sizes || []))],
    colors = [...new Set(products.flatMap((p) => p.colors || []))];
  return (
    <main className="page catalog-page">
      <span className="eyebrow">VIMUHET COLLECTION</span>
      <h1>
        Women's <em>fashion.</em>
      </h1>
      <div className="shop-layout">
        <details
          className="shop-sidebar"
          open={filtersOpen}
          onToggle={(e) => setFiltersOpen(e.currentTarget.open)}
        >
          <summary>
            Filters <span>⌄</span>
          </summary>
          <div className="sidebar-group">
            <h3>Category</h3>
            <label>
              <input
                type="radio"
                name="category"
                checked={!category}
                onChange={() => setCategory("")}
              />{" "}
              All pieces
            </label>
            {categories.map((c) => (
              <label key={c._id}>
                <input
                  type="radio"
                  name="category"
                  checked={category === c.name}
                  onChange={() => setCategory(c.name)}
                />
                {c.name}
              </label>
            ))}
          </div>
          <div className="sidebar-group">
            <h3>Price range</h3>
            <div className="price-range">
              <label>
                ₹
                <input
                  aria-label="Minimum price"
                  type="number"
                  min="0"
                  value={min}
                  onChange={(e) => setMin(e.target.value)}
                  placeholder="Min"
                />
              </label>
              <span>—</span>
              <label>
                ₹
                <input
                  aria-label="Maximum price"
                  type="number"
                  min="0"
                  value={max}
                  onChange={(e) => setMax(e.target.value)}
                  placeholder="Max"
                />
              </label>
            </div>
          </div>
          <div className="sidebar-group">
            <h3>Size</h3>
            <div className="size-filter">
              {(sizes.length ? sizes : ["XS", "S", "M", "L", "XL"]).map((s) => (
                <button
                  className={size === s ? "selected" : ""}
                  key={s}
                  onClick={() => setSize(size === s ? "" : s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="sidebar-group">
            <h3>Color</h3>
            <select
              aria-label="Filter by color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              <option value="">All colors</option>
              {color && !colors.includes(color) && <option>{color}</option>}
              {colors.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <label className="stock-filter">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />{" "}
            Available now
          </label>
          <button
            className="clear-filters"
            onClick={() => {
              setCategory("");
              setSearch("");
              setMin("");
              setMax("");
              setSize("");
              setColor("");
              setInStock(false);
            }}
          >
            Clear all filters
          </button>
        </details>
        <section className="shop-results">
          <div className="results-toolbar">
            <label className="catalog-search">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pieces"
                aria-label="Search pieces"
              />
            </label>
            <span>
              {loading
                ? "…"
                : `${products.length} piece${products.length === 1 ? "" : "s"}`}
            </span>
            <label className="sort-label">
              Sort by{" "}
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price</option>
                <option value="price_desc">Price: high to low</option>
                <option value="popular">Popular</option>
              </select>
            </label>
          </div>
          {loading ? (
            <div className="arrival-skeleton" aria-label="Loading products">
              <i />
              <i />
              <i />
              <i />
            </div>
          ) : error ? (
            <div className="service-pause">
              <span className="eyebrow">A MOMENT, PLEASE</span>
              <h2>We’re refreshing the collection.</h2>
              <p>
                Our shop is taking a short pause. Please try again in a little
                while, or get in touch and we’ll be happy to help.
              </p>
              <button
                className="button outline"
                onClick={() => location.reload()}
              >
                Try again
              </button>
              <Link className="text-link" to="/contact">
                Contact VIMUHET
              </Link>
            </div>
          ) : (
            <ProductGrid products={products} />
          )}
        </section>
      </div>
    </main>
  );
}
function StockAlert({ product, size, color, available }) {
  const { user } = useStore(),
    [email, setEmail] = useState(user?.email || ""),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setEmail(user?.email || "");
    setMessage("");
    setConsent(false);
  }, [product.slug, size, color, user?.email]);
  if (available) return null;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await request(
        `/products/${encodeURIComponent(product.slug)}/stock-alerts`,
        {
          method: "POST",
          body: JSON.stringify({ email, size, color, consent }),
        },
      );
      setMessage(result.message);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stock-alert-form" onSubmit={submit}>
      <b>Want to know if it returns?</b>
      <p>
        Subscribe for one email when this {size || "selected"}{" "}
        {color || "selection"} is back in stock.
      </p>
      <label>
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="stock-consent">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        I agree to receive one email for this stock alert.
      </label>
      <button className="button outline" disabled={busy}>
        {busy ? "Saving…" : "Notify me"}
      </button>
      {message && (
        <small
          className={
            message.startsWith("You are") ? "form-success" : "form-error"
          }
        >
          {message}
        </small>
      )}
    </form>
  );
}
function ProductFeedback({ product }) {
  const { token } = useStore(),
    [reviews, setReviews] = useState(null),
    [questions, setQuestions] = useState(null),
    [loadError, setLoadError] = useState(""),
    [reviewForm, setReviewForm] = useState({
      rating: "5",
      title: "",
      body: "",
    }),
    [question, setQuestion] = useState(""),
    [reviewMessage, setReviewMessage] = useState(""),
    [questionMessage, setQuestionMessage] = useState(""),
    [sending, setSending] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([
      request(`/products/${encodeURIComponent(product.slug)}/reviews`),
      request(`/products/${encodeURIComponent(product.slug)}/questions`),
    ])
      .then(([reviewData, questionData]) => {
        if (active) {
          setReviews(reviewData);
          setQuestions(questionData);
        }
      })
      .catch((e) => {
        if (active) setLoadError(e.message);
      });
    return () => {
      active = false;
    };
  }, [product.slug]);
  async function submitReview(e) {
    e.preventDefault();
    setSending(true);
    setReviewMessage("");
    try {
      const result = await request(
        `/products/${encodeURIComponent(product.slug)}/reviews`,
        {
          token,
          method: "POST",
          body: JSON.stringify({
            ...reviewForm,
            rating: Number(reviewForm.rating),
          }),
        },
      );
      setReviewMessage(result.message);
      setReviewForm({ rating: "5", title: "", body: "" });
    } catch (e) {
      setReviewMessage(e.message);
    } finally {
      setSending(false);
    }
  }
  async function submitQuestion(e) {
    e.preventDefault();
    setSending(true);
    setQuestionMessage("");
    try {
      const result = await request(
        `/products/${encodeURIComponent(product.slug)}/questions`,
        { token, method: "POST", body: JSON.stringify({ question }) },
      );
      setQuestionMessage(result.message);
      setQuestion("");
    } catch (e) {
      setQuestionMessage(e.message);
    } finally {
      setSending(false);
    }
  }
  const count = reviews?.summary?.count || 0,
    average = reviews?.summary?.average;
  return (
    <section className="product-feedback">
      <div className="feedback-heading">
        <div>
          <span className="eyebrow">CUSTOMER FEEDBACK</span>
          <h2>
            Reviews &amp; <em>questions.</em>
          </h2>
        </div>
        {count > 0 ? (
          <p className="feedback-summary">
            <b>{Number(average).toFixed(1)} / 5</b>
            <span>
              Based on {count} published verified-purchase review
              {count === 1 ? "" : "s"}
            </span>
          </p>
        ) : (
          <p className="feedback-summary">No published reviews yet.</p>
        )}
      </div>
      {loadError ? (
        <p className="form-error" role="alert">
          {loadError}
        </p>
      ) : (
        <div className="feedback-columns">
          <div>
            <h3>Verified-purchase reviews</h3>
            {reviews === null ? (
              <p>Loading reviews…</p>
            ) : reviews.items.length ? (
              reviews.items.map((row) => (
                <article className="feedback-card" key={row._id}>
                  <div>
                    <b>{row.title}</b>
                    <span aria-label={`${row.rating} out of 5`}>
                      {row.rating} / 5
                    </span>
                  </div>
                  <p>{row.body}</p>
                  <small>
                    {row.authorLabel} · Verified purchase ·{" "}
                    {new Date(row.createdAt).toLocaleDateString("en-IN")}
                  </small>
                </article>
              ))
            ) : (
              <p className="feedback-empty">
                Reviews will appear here only after a delivered purchaser
                submits one and it is moderated.
              </p>
            )}
            <details className="feedback-form">
              <summary>Write a verified-purchase review</summary>
              {token ? (
                <form onSubmit={submitReview}>
                  <label>
                    Rating
                    <select
                      value={reviewForm.rating}
                      onChange={(e) =>
                        setReviewForm((v) => ({ ...v, rating: e.target.value }))
                      }
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} out of 5
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Title
                    <input
                      required
                      minLength="3"
                      maxLength="120"
                      value={reviewForm.title}
                      onChange={(e) =>
                        setReviewForm((v) => ({ ...v, title: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Your review
                    <textarea
                      required
                      minLength="10"
                      maxLength="2000"
                      value={reviewForm.body}
                      onChange={(e) =>
                        setReviewForm((v) => ({ ...v, body: e.target.value }))
                      }
                    />
                  </label>
                  <button className="button dark" disabled={sending}>
                    Submit for moderation
                  </button>
                  {reviewMessage && (
                    <p
                      className={
                        reviewMessage.startsWith("Thanks")
                          ? "form-success"
                          : "form-error"
                      }
                      role="status"
                    >
                      {reviewMessage}
                    </p>
                  )}
                </form>
              ) : (
                <p>
                  <Link to="/account">Sign in</Link> with the account used for a
                  delivered purchase to submit a review.
                </p>
              )}
            </details>
          </div>
          <div>
            <h3>Product questions</h3>
            {questions === null ? (
              <p>Loading questions…</p>
            ) : questions.items.length ? (
              questions.items.map((row) => (
                <article className="feedback-card question-card" key={row._id}>
                  <b>Q. {row.question}</b>
                  <p>
                    <strong>A.</strong> {row.answer}
                  </p>
                  <small>
                    {row.authorLabel} · Answered{" "}
                    {new Date(
                      row.answeredAt || row.createdAt,
                    ).toLocaleDateString("en-IN")}
                  </small>
                </article>
              ))
            ) : (
              <p className="feedback-empty">No answered questions yet.</p>
            )}
            <details className="feedback-form">
              <summary>Ask about this piece</summary>
              {token ? (
                <form onSubmit={submitQuestion}>
                  <label>
                    Your question
                    <textarea
                      required
                      minLength="5"
                      maxLength="1000"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask about fit, fabric, care or the garment details."
                    />
                  </label>
                  <button className="button dark" disabled={sending}>
                    Send question
                  </button>
                  {questionMessage && (
                    <p
                      className={
                        questionMessage.startsWith("Thanks")
                          ? "form-success"
                          : "form-error"
                      }
                      role="status"
                    >
                      {questionMessage}
                    </p>
                  )}
                </form>
              ) : (
                <p>
                  <Link to="/account">Sign in</Link> to ask a question. Answers
                  are reviewed before they appear.
                </p>
              )}
            </details>
          </div>
        </div>
      )}
    </section>
  );
}
function ProductPage() {
  const { slug } = useParams(),
    [p, setP] = useState(null),
    [loading, setLoading] = useState(true),
    [imageIndex, setImageIndex] = useState(0),
    [imageZoom, setImageZoom] = useState(false),
    [size, setSize] = useState(""),
    [color, setColor] = useState(""),
    [qty, setQty] = useState(1),
    [err, setErr] = useState(""),
    { cart, setCart, notify } = useStore();
  useEffect(() => {
    setLoading(true);
    request(`/products/${slug}`)
      .then((x) => {
        setP(x);
        rememberProduct(x);
        const first = x.variants?.find((v) => v.stock > 0) || x.variants?.[0];
        setSize(first?.size || x.sizes?.[0] || "");
        setColor(first?.color || x.colors?.[0] || "");
        const photo = x.images?.findIndex(
          (im) =>
            im.color &&
            im.color.toLowerCase() ===
              (first?.color || x.colors?.[0] || "").toLowerCase(),
        );
        setImageIndex(photo >= 0 ? photo : 0);
        setImageZoom(false);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [slug]);
  if (loading) return <main className="page">Loading this piece…</main>;
  if (!p)
    return (
      <main className="page">
        <h1>{err || "Piece not found"}</h1>
        <Link to="/products">Back to the collection</Link>
      </main>
    );
  const selectedVariant = p.variants?.length
    ? p.variants.find((v) => v.size === size && v.color === color)
    : null;
  const selectedStock = p.variants?.length
    ? selectedVariant?.stock || 0
    : p.stock || 0;
  const add = () => {
    if (p.sizes?.length && !size) return notify("Choose a size first");
    if (p.colors?.length && !color) return notify("Choose a color first");
    if (p.variants?.length && !selectedVariant)
      return notify("That size and color combination is unavailable");
    if (selectedStock < 1) return notify("This selection is sold out");
    if (qty > selectedStock)
      return notify(`Only ${selectedStock} available for this selection`);
    const inBag = cart.find(
      (i) => i.productId === p._id && i.size === size && i.color === color,
    );
    if ((inBag?.quantity || 0) + qty > selectedStock)
      return notify(
        `Only ${Math.max(0, selectedStock - (inBag?.quantity || 0))} more available for this selection`,
      );
    const selectedImage =
      p.images?.find(
        (photo) =>
          photo.color && photo.color.toLowerCase() === color.toLowerCase(),
      ) ||
      p.images?.[imageIndex] ||
      p.images?.[0];
    setCart((c) => {
      const ix = c.findIndex(
        (i) => i.productId === p._id && i.size === size && i.color === color,
      );
      if (ix >= 0) {
        const a = [...c];
        a[ix] = {
          ...a[ix],
          quantity: Math.min(10, selectedStock, a[ix].quantity + qty),
          stock: selectedStock,
        };
        return a;
      }
      return [
        ...c,
        {
          productId: p._id,
          variantId: selectedVariant?._id,
          sku: selectedVariant?.sku || p.sku,
          slug: p.slug,
          name: p.name,
          price: p.salePrice || p.price,
          image: selectedImage?.url,
          size,
          color,
          quantity: qty,
          stock: selectedStock,
        },
      ];
    });
    trackAnalytics("add_to_bag", {
      path: `/products/${p.slug}`,
      productSlug: p.slug,
    });
    notify("Added to your bag");
  };
  return (
    <main className="page product-detail">
      <section className="product-detail-layout">
        <div className="detail-gallery">
          <div className={`detail-image${imageZoom ? " zoomed" : ""}`}>
            <button
              className="gallery-zoom"
              type="button"
              onClick={() => setImageZoom((z) => !z)}
              aria-label={
                imageZoom
                  ? "Zoom out of product image"
                  : "Zoom in on product image"
              }
              title={imageZoom ? "Zoom out" : "Zoom in"}
            >
              <img
                src={img(
                  { ...p, images: [p.images?.[imageIndex] || p.images?.[0]] },
                  1200,
                )}
                srcSet={srcSet(
                  p.images?.[imageIndex]?.url || p.images?.[0]?.url,
                )}
                sizes="(max-width: 600px) 92vw, 50vw"
                alt={p.images?.[imageIndex]?.alt || p.name}
                onError={(e) => {
                  e.currentTarget.hidden = true;
                }}
              />
            </button>
          </div>
          {p.images?.length > 1 && (
            <div className="detail-thumbs">
              {p.images.map((photo, index) => (
                <button
                  className={index === imageIndex ? "selected" : ""}
                  onClick={() => {
                    setImageIndex(index);
                    setImageZoom(false);
                  }}
                  key={photo.publicId || photo.url}
                  aria-label={`View image ${index + 1}`}
                >
                  <img src={photo.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-copy">
          <span className="eyebrow">{p.category}</span>
          <h1>{p.name}</h1>
          <div className="detail-price">
            {money(p.salePrice || p.price)}{" "}
            {p.salePrice && <del>{money(p.price)}</del>}
          </div>
          <p>{p.description}</p>
          <div className="detail-attribute">
            <b>Color</b>
            <div className="variant-row">
              {(p.colors || []).map((c) => (
                <button
                  className={color === c ? "variant selected" : ""}
                  onClick={() => {
                    setColor(c);
                    const index = p.images?.findIndex(
                      (photo) =>
                        photo.color &&
                        photo.color.toLowerCase() === c.toLowerCase(),
                    );
                    if (index >= 0) setImageIndex(index);
                  }}
                  key={c}
                  aria-pressed={color === c}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="detail-attribute">
            <b>
              Size{" "}
              <button
                className="size-guide"
                onClick={() =>
                  document.getElementById("size-guide").showModal()
                }
              >
                Size guide
              </button>
            </b>
            <div className="variant-row">
              {(p.sizes || []).map((s) => {
                const variant = p.variants?.length
                  ? p.variants.find((v) => v.size === s && v.color === color)
                  : null;
                const unavailable =
                  !!p.variants?.length && (!variant || variant.stock < 1);
                return (
                  <button
                    className={size === s ? "variant selected" : ""}
                    onClick={() => setSize(s)}
                    key={s}
                    disabled={unavailable}
                    aria-pressed={size === s}
                    title={
                      unavailable
                        ? "Sold out for the selected color"
                        : `Select size ${s}`
                    }
                  >
                    {s}
                    {unavailable ? " · sold out" : ""}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="stock-line" aria-live="polite">
            {selectedStock > 0
              ? `In stock · ${selectedStock} available for ${size || "selected size"} / ${color || "selected color"}`
              : "This size and color combination is sold out"}
          </div>
          <div className={`buy-row${selectedStock ? "" : " sold-out-row"}`}>
            {selectedStock > 0 && (
              <div className="qty">
                <button onClick={() => setQty(Math.max(1, qty - 1))}>
                  <Minus size={14} />
                </button>
                <span>{qty}</span>
                <button
                  onClick={() => setQty(Math.min(selectedStock, qty + 1))}
                >
                  <Plus size={14} />
                </button>
              </div>
            )}
            <button
              disabled={!selectedStock}
              className="button dark"
              onClick={add}
            >
              {selectedStock ? "Add to bag" : "Sold out"}{" "}
              <ShoppingBag size={16} />
            </button>
          </div>
          <StockAlert
            product={p}
            size={size}
            color={color}
            available={Boolean(selectedStock)}
          />
          <details open>
            <summary>Details & materials</summary>
            <p>{p.description}</p>
            <p>
              <b>Material:</b> {p.material || "See garment label"}
              <br />
              <b>Care:</b> {p.care || "Follow care label instructions"}
            </p>
          </details>
          <dialog id="size-guide" className="size-dialog">
            <button
              className="icon dialog-close"
              onClick={() => document.getElementById("size-guide").close()}
            >
              <X />
            </button>
            <h2>Size guide</h2>
            <p style={{ whiteSpace: "pre-line" }}>
              {p.sizeGuide ||
                "A product-specific size guide has not been provided yet. Please check the garment label or contact customer care before ordering."}
            </p>
          </dialog>
        </div>
      </section>
      <ProductFeedback product={p} />
      <RelatedProducts product={p} />
      <RecentlyViewed excludeId={p._id} />
    </main>
  );
}
function RelatedProducts({ product }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let active = true;
    request(`/products?category=${encodeURIComponent(product.category || "")}`)
      .then((items) => {
        if (active)
          setRows(items.filter((x) => x._id !== product._id).slice(0, 4));
      })
      .catch(() => setRows([]));
    return () => {
      active = false;
    };
  }, [product._id, product.category]);
  return rows.length ? (
    <section className="product-recommendations">
      <div className="section-head">
        <div>
          <span className="eyebrow">MORE FROM THIS CATEGORY</span>
          <h2>
            You may also <em>like.</em>
          </h2>
        </div>
      </div>
      <ProductGrid products={rows} />
    </section>
  ) : null;
}
function RecentlyViewed({ excludeId }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let active = true;
    const recent = getRecentProducts()
      .filter((x) => x._id !== excludeId)
      .slice(0, 4);
    Promise.all(
      recent.map((x) =>
        request(`/products/${encodeURIComponent(x.slug)}`).catch(() => null),
      ),
    ).then((rows) => {
      if (active) setItems(rows.filter(Boolean));
    });
    return () => {
      active = false;
    };
  }, [excludeId]);
  return items.length ? (
    <section className="product-recommendations recently-viewed">
      <div className="section-head">
        <div>
          <span className="eyebrow">YOUR RECENT PICKS</span>
          <h2>
            Still on your <em>mind.</em>
          </h2>
        </div>
      </div>
      <ProductGrid products={items} />
    </section>
  ) : null;
}
function CartPage() {
  const { cart, setCart } = useStore(),
    subtotal = cart.reduce((s, p) => s + p.price * p.quantity, 0),
    ship = subtotal >= 2499 ? 0 : subtotal ? 99 : 0;
  return (
    <main className="page cart-page">
      <span className="eyebrow">YOUR VIMUHET BAG</span>
      <h1>
        A little <em>something.</em>
      </h1>
      {!cart.length ? (
        <div className="empty-catalog">
          Your bag is waiting for its first favourite.{" "}
          <Link to="/products" className="button dark">
            Explore the collection <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {cart.map((p, i) => (
              <div
                className="cart-row"
                key={`${p.productId}-${p.size}-${p.color}`}
              >
                <img src={p.image} alt={p.name} />
                <div className="cart-row-info">
                  <Link to={`/products/${p.slug}`}>
                    <h3>{p.name}</h3>
                  </Link>
                  <p>
                    {p.color} · Size {p.size}
                  </p>
                  <strong>{money(p.price)}</strong>
                  <div className="qty">
                    <button
                      onClick={() =>
                        setCart((c) =>
                          c.map((x, j) =>
                            j === i
                              ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                              : x,
                          ),
                        )
                      }
                    >
                      −
                    </button>
                    {p.quantity}
                    <button
                      onClick={() =>
                        setCart((c) =>
                          c.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  quantity: Math.min(
                                    x.stock || 10,
                                    x.quantity + 1,
                                  ),
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      +
                    </button>
                    <button
                      className="remove"
                      onClick={() =>
                        setCart((c) => c.filter((_, j) => i !== j))
                      }
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="summary">
            <h2>Order summary</h2>
            <p>
              <span>Subtotal</span>
              <b>{money(subtotal)}</b>
            </p>
            <p>
              <span>Shipping</span>
              <b>{ship ? money(ship) : "Free"}</b>
            </p>
            <small>
              {subtotal < 2499
                ? `Free shipping over ₹2,499 · ${money(2499 - subtotal)} to go`
                : "Free shipping applied"}
            </small>
            <hr />
            <p className="total">
              <span>Total</span>
              <b>{money(subtotal + ship)}</b>
            </p>
            <Link className="button dark full" to="/checkout">
              Continue to checkout <ArrowRight size={16} />
            </Link>
            <Link className="continue" to="/products">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
function Checkout() {
  const { cart, token, auth, notify, setCart } = useStore(),
    navigate = useNavigate(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [form, setForm] = useState({
      name: "",
      email: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
    }),
    [guestCode, setGuestCode] = useState(""),
    [savedAddresses, setSavedAddresses] = useState([]),
    [selectedAddress, setSelectedAddress] = useState(""),
    [couponCode, setCouponCode] = useState(""),
    [gift, setGift] = useState({ wrapped: false, note: "" });
  const sub = cart.reduce((s, p) => s + p.price * p.quantity, 0),
    shippingFee = sub >= 2499 ? 0 : 99,
    giftFee = gift.wrapped ? 99 : 0;
  useEffect(() => {
    try {
      if (
        !cart.length ||
        localStorage.getItem(ANALYTICS_CONSENT_KEY) !== "granted"
      )
        return;
      const fingerprint = cart
          .map(
            (item) =>
              `${item.productId}:${item.quantity}:${item.size || ""}:${item.color || ""}`,
          )
          .sort()
          .join("|"),
        key = "vimuh-analytics-checkout-start";
      if (sessionStorage.getItem(key) === fingerprint) return;
      sessionStorage.setItem(key, fingerprint);
      trackAnalytics("checkout_started", { path: "/checkout" });
    } catch {}
  }, [cart]);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  useEffect(() => {
    if (!token) return;
    request("/auth/me", { token })
      .then((profile) => {
        setSavedAddresses(profile.addresses || []);
        setSelectedAddress(profile.addresses?.[0]?._id || "");
        setForm((old) => ({
          ...old,
          name: old.name || profile.name || "",
          email: old.email || profile.email || "",
          ...(profile.addresses?.[0] || {}),
        }));
      })
      .catch(() => {});
  }, [token]);
  function chooseAddress(e) {
    const found = savedAddresses.find((a) => a._id === e.target.value);
    setSelectedAddress(e.target.value);
    if (found) setForm((old) => ({ ...old, ...found }));
  }
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const basketKey = JSON.stringify({
        items: cart.map(({ productId, quantity, size, color }) => ({
          productId,
          quantity,
          size,
          color,
        })),
        couponCode: couponCode.trim().toUpperCase(),
        gift: { wrapped: gift.wrapped, note: gift.note.trim() },
      });
      const idempotencyStorageKey = `vimuh-order-key:${basketKey}`;
      const key =
        sessionStorage.getItem(idempotencyStorageKey) || crypto.randomUUID();
      sessionStorage.setItem(idempotencyStorageKey, key);
      const created = await request("/orders", {
        method: "POST",
        token,
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          email: form.email,
          shipping: form,
          couponCode: couponCode.trim().toUpperCase(),
          gift: { wrapped: gift.wrapped, note: gift.note.trim() },
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            size: i.size,
            color: i.color,
          })),
        }),
      });
      setGuestCode(created.guestCode);
      sessionStorage.setItem("vimuh-guest-code", created.guestCode);
      if (created.payment?.mode !== "razorpay")
        throw Error(
          "Online payments are not configured for this store yet. Your bag is saved; please contact customer care.",
        );
      if (!window.Razorpay)
        throw Error(
          "Payment checkout could not load. Please refresh and try again.",
        );
      const rzp = new window.Razorpay({
        key: created.payment.keyId,
        order_id: created.payment.orderId,
        amount: created.payment.amount,
        currency: "INR",
        name: "VIMUHET",
        description: `Order ${created.order.number}`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        handler: async (response) => {
          try {
            await request("/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                ...response,
                guestCode: created.guestCode,
              }),
            });
            sessionStorage.removeItem(idempotencyStorageKey);
            setCart([]);
            notify("Payment verified. Thank you!");
            navigate(
              `/orders/${created.order._id}?code=${encodeURIComponent(created.guestCode)}`,
            );
          } catch (e) {
            setError(e.message);
          }
        },
      });
      rzp.on("payment.failed", async (x) => {
        try {
          await request("/payments/fail", {
            method: "POST",
            body: JSON.stringify({
              razorpay_order_id: created.payment.orderId,
              guestCode: created.guestCode,
            }),
          });
        } catch {
        } finally {
          sessionStorage.removeItem(idempotencyStorageKey);
          setError(
            x.error?.description ||
              "Payment failed. Your bag is still saved; you can try checkout again.",
          );
        }
      });
      rzp.open();
    } catch (e) {
      if (/payment attempt is no longer active/i.test(e.message))
        sessionStorage.removeItem(idempotencyStorageKey);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  if (!cart.length)
    return (
      <main className="page">
        <h1>Your bag is empty</h1>
        <Link to="/products">Browse pieces</Link>
      </main>
    );
  return (
    <main className="page checkout-page">
      <span className="eyebrow">SECURE CHECKOUT</span>
      <h1>
        Almost <em>yours.</em>
      </h1>
      <div className="checkout-progress">
        <span className="step active">
          <b>1</b> Delivery
        </span>
        <i />
        <span className="step">
          <b>2</b> Payment
        </span>
        <i />
        <span className="step">
          <b>3</b> Confirm
        </span>
      </div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submit}>
          <h2>Delivery details</h2>
          {token && savedAddresses.length > 0 && (
            <label className="saved-address-select">
              Use a saved address
              <select value={selectedAddress} onChange={chooseAddress}>
                <option value="">Enter a new address</option>
                {savedAddresses.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name} · {[a.city, a.pincode].filter(Boolean).join(" ")}
                  </option>
                ))}
              </select>
            </label>
          )}
          {[
            ["name", "Full name"],
            ["email", "Email address"],
            ["phone", "Phone number"],
            ["line1", "Address"],
            ["line2", "Apartment / landmark"],
            ["city", "City"],
            ["state", "State"],
            ["pincode", "PIN code"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                name={key}
                required={[
                  "name",
                  "email",
                  "phone",
                  "line1",
                  "city",
                  "state",
                  "pincode",
                ].includes(key)}
                type={key === "email" ? "email" : "text"}
                value={form[key]}
                onChange={change}
              />
            </label>
          ))}
          <label className="coupon-entry">
            Coupon code (optional)
            <input
              value={couponCode}
              maxLength="32"
              autoCapitalize="characters"
              autoComplete="off"
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="WELCOME10"
            />
            <small>
              Any discount is validated from live catalog prices by the server
              before Razorpay opens.
            </small>
          </label>
          <fieldset className="gift-options">
            <legend>Gift options</legend>
            <label>
              <input
                type="checkbox"
                checked={gift.wrapped}
                onChange={(e) =>
                  setGift((g) => ({
                    ...g,
                    wrapped: e.target.checked,
                    note: e.target.checked ? g.note : "",
                  }))
                }
              />{" "}
              Add gift wrapping · ₹99
            </label>
            {gift.wrapped && (
              <label>
                Gift note (optional)
                <textarea
                  maxLength="500"
                  value={gift.note}
                  onChange={(e) =>
                    setGift((g) => ({ ...g, note: e.target.value }))
                  }
                  placeholder="Your message will be included with the gift."
                />
              </label>
            )}
            <small>
              Gift wrapping is a per-order service. Its fee is calculated again
              by the server at payment.
            </small>
          </fieldset>
          <p className="help">
            Guest orders can be retrieved with the order number and access code
            shown after the order is created. Signed-in orders appear in your
            account.
          </p>
          {guestCode && (
            <div className="guest-order-code" role="note">
              <b>Save this guest order access code</b>
              <code>{guestCode}</code>
              <p>
                You'll need it with your order number to look up this order on
                another device.
              </p>
              <Link to="/order-lookup">
                Open guest order lookup <ArrowRight size={14} />
              </Link>
            </div>
          )}
          <button className="button dark full" disabled={loading}>
            {loading
              ? "Preparing secure checkout…"
              : couponCode.trim()
                ? "Continue to secure payment"
                : `Pay ${money(sub + shippingFee)} securely`}{" "}
            <ArrowRight size={16} />
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <aside className="summary">
          <h2>Your pieces</h2>
          {cart.map((p) => (
            <p key={`${p.productId}-${p.size}-${p.color}`}>
              <span>
                {p.name} × {p.quantity}
              </span>
              <b>{money(p.price * p.quantity)}</b>
            </p>
          ))}
          <p>
            <span>Shipping</span>
            <b>{shippingFee ? money(shippingFee) : "Free"}</b>
          </p>
          {couponCode.trim() && (
            <p className="coupon-pending">
              <span>Coupon</span>
              <b>Validated at payment</b>
            </p>
          )}
          {gift.wrapped && (
            <p>
              <span>Gift wrapping</span>
              <b>{money(giftFee)}</b>
            </p>
          )}
          <hr />
          <p className="total">
            <span>Total</span>
            <b>{money(sub + shippingFee + giftFee)}</b>
          </p>
        </aside>
      </div>
    </main>
  );
}
function Account() {
  const { auth, notify, token } = useStore(),
    navigate = useNavigate(),
    [profile, setProfile] = useState(null),
    [mode, setMode] = useState("login"),
    [data, setData] = useState({ name: "", email: "", password: "" }),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false),
    [address, setAddress] = useState({
      name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
    }),
    [editingAddress, setEditingAddress] = useState(""),
    [addressError, setAddressError] = useState(""),
    [addressBusy, setAddressBusy] = useState(false);
  useEffect(() => {
    if (auth.user)
      request("/auth/me", { token })
        .then(setProfile)
        .catch(() => setProfile(auth.user));
  }, [auth.user, token]);
  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      if (mode === "forgot") {
        await request("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: data.email }),
        });
        setSent(true);
        return;
      }
      const r = await request(
        mode === "register" ? "/auth/register" : "/auth/login",
        { method: "POST", body: JSON.stringify(data) },
      );
      auth.setAuth(r.token, r.user);
      notify(`Welcome${r.user.name ? `, ${r.user.name}` : ""}`);
      navigate(r.user.role === "admin" ? "/admin" : "/orders");
    } catch (e) {
      setError(e.message);
    }
  }
  async function saveAddress(e) {
    e.preventDefault();
    setAddressBusy(true);
    setAddressError("");
    try {
      const result = await request(
        editingAddress
          ? `/auth/me/addresses/${editingAddress}`
          : "/auth/me/addresses",
        {
          token,
          method: editingAddress ? "PATCH" : "POST",
          body: JSON.stringify(address),
        },
      );
      setProfile((p) => ({ ...p, addresses: result.addresses }));
      setAddress({
        name: "",
        phone: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        pincode: "",
      });
      setEditingAddress("");
      notify(editingAddress ? "Address updated" : "Address saved");
    } catch (e) {
      setAddressError(e.message);
    } finally {
      setAddressBusy(false);
    }
  }
  async function removeAddress(id) {
    if (!confirm("Remove this saved address?")) return;
    try {
      const result = await request(`/auth/me/addresses/${id}`, {
        token,
        method: "DELETE",
      });
      setProfile((p) => ({ ...p, addresses: result.addresses }));
      if (editingAddress === id) {
        setEditingAddress("");
        setAddress({
          name: "",
          phone: "",
          line1: "",
          line2: "",
          city: "",
          state: "",
          pincode: "",
        });
      }
      notify("Address removed");
    } catch (e) {
      setAddressError(e.message);
    }
  }
  async function setCartReminder(consent) {
    try {
      const result = await request("/auth/me/cart-reminder", {
        token,
        method: "PATCH",
        body: JSON.stringify({ consent }),
      });
      setProfile((p) => ({
        ...p,
        cartReminderConsent: result.cartReminderConsent,
      }));
      notify(
        result.cartReminderConsent
          ? "Cart reminder preference saved"
          : "Cart reminders turned off",
      );
    } catch (e) {
      setAddressError(e.message);
    }
  }
  if (auth.user)
    return (
      <main className="page account-page">
        <span className="eyebrow">YOUR VIMUHET</span>
        <h1>
          Hello, <em>{profile?.name || auth.user.name}.</em>
        </h1>
        <div className="profile-dashboard">
          <aside className="profile-nav">
            <b>MY ACCOUNT</b>
            <Link to="/account">Profile information</Link>
            <Link to="/wishlist">My wishlist</Link>
            <Link to="/orders">My orders</Link>
            <Link to="/order-lookup">Guest order lookup</Link>
            <button
              onClick={() => {
                auth.logout();
                notify("Signed out");
              }}
            >
              Sign out <LogOut size={14} />
            </button>
          </aside>
          <section className="profile-card">
            <span className="eyebrow">PROFILE INFORMATION</span>
            <h2>{profile?.name || auth.user.name}</h2>
            <p>{profile?.email || auth.user.email}</p>
            <Link className="text-link" to="/orders">
              See order history across devices <ArrowRight size={15} />
            </Link>
            <label className="cart-reminder-consent">
              <input
                type="checkbox"
                checked={Boolean(profile?.cartReminderConsent)}
                onChange={(e) => setCartReminder(e.target.checked)}
              />{" "}
              Send me one reminder after 48 hours if my saved bag remains
              unpurchased.
            </label>
            <small className="consent-note">
              Optional. You can turn this off here or from the reminder email.
            </small>
            <h3>Saved addresses</h3>
            {profile?.addresses?.length ? (
              profile.addresses.map((item, i) => (
                <div className="saved-address" key={item._id || i}>
                  <b>{item.name}</b>
                  <span>
                    {[
                      item.line1,
                      item.line2,
                      item.city,
                      item.state,
                      item.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  <small>{item.phone}</small>
                  <div className="saved-address-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(item._id);
                        setAddress({
                          name: item.name || "",
                          phone: item.phone || "",
                          line1: item.line1 || "",
                          line2: item.line2 || "",
                          city: item.city || "",
                          state: item.state || "",
                          pincode: item.pincode || "",
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAddress(item._id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No addresses saved yet.</p>
            )}
            <form className="address-editor" onSubmit={saveAddress}>
              <h3>
                {editingAddress ? "Edit saved address" : "Add a saved address"}
              </h3>
              {[
                ["name", "Recipient name"],
                ["phone", "Phone"],
                ["line1", "Street address"],
                ["line2", "Apartment / landmark"],
                ["city", "City"],
                ["state", "State"],
                ["pincode", "Postal code"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    required={key !== "line2"}
                    maxLength={key === "line1" || key === "line2" ? 240 : 120}
                    value={address[key]}
                    onChange={(e) =>
                      setAddress((v) => ({ ...v, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
              {addressError && (
                <p className="form-error" role="alert">
                  {addressError}
                </p>
              )}
              <button className="button dark" disabled={addressBusy}>
                {addressBusy
                  ? "Saving…"
                  : editingAddress
                    ? "Update address"
                    : "Save address"}
              </button>
              {editingAddress && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEditingAddress("");
                    setAddress({
                      name: "",
                      phone: "",
                      line1: "",
                      line2: "",
                      city: "",
                      state: "",
                      pincode: "",
                    });
                  }}
                >
                  Cancel edit
                </button>
              )}
            </form>
          </section>
        </div>
      </main>
    );
  return (
    <main className="page account-page">
      <span className="eyebrow">YOUR VIMUHET</span>
      <h1>{mode === "forgot" ? "Reset your password." : "Come on in."}</h1>
      {sent ? (
        <div className="empty-catalog">
          If your email matches an account, reset instructions are on their way.{" "}
          <button
            className="text-button"
            onClick={() => {
              setMode("login");
              setSent(false);
            }}
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <form className="checkout-form account-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              Your name
              <input
                required
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              required
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </label>
          {mode !== "forgot" && (
            <label>
              Password
              <input
                type="password"
                minLength="10"
                required
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
              />
            </label>
          )}
          <button className="button dark full">
            {mode === "register"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset link"
                : "Sign in"}{" "}
            <ArrowRight size={16} />
          </button>
          {error && <p className="form-error">{error}</p>}
          {mode === "login" && (
            <button
              type="button"
              className="text-button"
              onClick={() => setMode("forgot")}
            >
              Forgot password?
            </button>
          )}
          {mode !== "forgot" && (
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setMode(mode === "register" ? "login" : "register")
              }
            >
              {mode === "register"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              className="text-button"
              onClick={() => setMode("login")}
            >
              Back to sign in
            </button>
          )}
        </form>
      )}
    </main>
  );
}

function ResetPassword() {
  const [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const token = new URLSearchParams(location.search).get("token") || "";
  async function submit(e) {
    e.preventDefault();
    try {
      const r = await request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setMessage(r.message);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <main className="page">
      <span className="eyebrow">ACCOUNT SECURITY</span>
      <h1>
        Choose a new <em>password.</em>
      </h1>
      {message ? (
        <p>
          {message} <Link to="/account">Sign in</Link>
        </p>
      ) : (
        <form className="checkout-form account-form" onSubmit={submit}>
          <label>
            New password (10+ characters)
            <input
              type="password"
              minLength="10"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="button dark">Update password</button>
          {error && <p className="form-error">{error}</p>}
        </form>
      )}
    </main>
  );
}
function PreferenceUnsubscribe({ type }) {
  const token = new URLSearchParams(location.search).get("token") || "",
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (!token) {
      setError("This unsubscribe link is invalid.");
      return;
    }
    request(`/${type}/unsubscribe`, {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((result) => setMessage(result.message))
      .catch((e) => setError(e.message));
  }, [token, type]);
  return (
    <main className="page account-page">
      <span className="eyebrow">EMAIL PREFERENCES</span>
      <h1>{message ? "Preference updated." : "Updating preference…"}</h1>
      {message && <p>{message}</p>}
      {error && <p className="form-error">{error}</p>}
      <Link className="button outline" to="/">
        Back to home
      </Link>
    </main>
  );
}
function OrderLookup() {
  const [form, setForm] = useState({ number: "", accessCode: "" }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    navigate = useNavigate();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await request("/orders/lookup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      sessionStorage.setItem("vimuh-guest-code", form.accessCode.trim());
      navigate(
        `/orders/${result.orderId}?code=${encodeURIComponent(form.accessCode.trim())}`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page order-lookup-page">
      <span className="eyebrow">GUEST ORDER ACCESS</span>
      <h1>
        Find your <em>order.</em>
      </h1>
      <p>
        Enter the order number and the 64-character access code shown when your
        guest order was placed. If you no longer have the code, contact the
        store with your order details.
      </p>
      <form className="checkout-form account-form" onSubmit={submit}>
        <label>
          Order number
          <input
            required
            autoComplete="off"
            value={form.number}
            onChange={(e) =>
              setForm((v) => ({ ...v, number: e.target.value.toUpperCase() }))
            }
            placeholder="VM…"
          />
        </label>
        <label>
          Guest access code
          <input
            required
            minLength="64"
            maxLength="64"
            autoComplete="off"
            value={form.accessCode}
            onChange={(e) =>
              setForm((v) => ({ ...v, accessCode: e.target.value }))
            }
          />
        </label>
        <button className="button dark full" disabled={busy}>
          {busy ? "Looking up…" : "Find order"}
        </button>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
      <Link to="/account" className="text-link">
        Sign in for account orders
      </Link>
    </main>
  );
}
function Orders() {
  const { token } = useStore(),
    [orders, setOrders] = useState(null),
    [err, setErr] = useState("");
  useEffect(() => {
    request("/orders/mine", { token })
      .then(setOrders)
      .catch((e) => setErr(e.message));
  }, [token]);
  return (
    <main className="page">
      <span className="eyebrow">YOUR VIMUHET</span>
      <h1>
        Your <em>orders.</em>
      </h1>
      {orders === null && !err ? (
        "Loading your orders…"
      ) : err ? (
        <p>
          {err} <Link to="/account">Sign in</Link> or{" "}
          <Link to="/order-lookup">look up a guest order</Link>.
        </p>
      ) : !orders.length ? (
        <p>
          No orders yet. <Link to="/products">Find your first favourite.</Link>
        </p>
      ) : (
        orders.map((o) => (
          <Link className="order-card" to={`/orders/${o._id}`} key={o._id}>
            <div>
              <b>{o.number}</b>
              <span>{new Date(o.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
            <div>
              <span>{o.status.replaceAll("_", " ")}</span>
              <b>{money(o.total)}</b>
            </div>
            <ChevronRight />
          </Link>
        ))
      )}
    </main>
  );
}
function OrderDetail() {
  const { id } = useParams(),
    { token } = useStore(),
    [o, setO] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [requestType, setRequestType] = useState(""),
    [requestReason, setRequestReason] = useState(""),
    [requestMessage, setRequestMessage] = useState("");
  const code =
    new URLSearchParams(location.search).get("code") ||
    (!token ? sessionStorage.getItem("vimuh-guest-code") : "") ||
    "";
  const load = () =>
    request(`/orders/${id}?code=${encodeURIComponent(code)}`, {
      token: code ? undefined : token,
    })
      .then(setO)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, [id, token, code]);
  async function cancel() {
    if (!confirm("Cancel this unpaid order?")) return;
    setBusy(true);
    try {
      const changed = await request(`/orders/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ guestCode: code }),
      });
      setO(changed);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submitRequest(e) {
    e.preventDefault();
    if (!requestType) return;
    setBusy(true);
    setRequestMessage("");
    try {
      const changed = await request(`/orders/${id}/requests`, {
        method: "POST",
        token: code ? undefined : token,
        body: JSON.stringify({
          type: requestType,
          reason: requestReason,
          guestCode: code,
        }),
      });
      setO(changed);
      setRequestReason("");
      setRequestType("");
      setRequestMessage(
        "Your request has been submitted for review. This does not itself cancel the order or issue a refund.",
      );
    } catch (e) {
      setRequestMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <main className="page">
        <div className="service-pause">
          <span className="eyebrow">ORDER DETAILS</span>
          <h2>We couldn’t load this order.</h2>
          <p>{error}</p>
          <Link className="button outline" to="/orders">
            Back to my orders
          </Link>
        </div>
      </main>
    );
  if (!o) return <main className="page">Loading order…</main>;
  if (!o.status || !Array.isArray(o.items))
    return (
      <main className="page">
        <div className="service-pause">
          <span className="eyebrow">ORDER DETAILS</span>
          <h2>Order information is unavailable.</h2>
          <p>Please return to your orders or contact our team for help.</p>
          <Link className="button outline" to="/orders">
            Back to my orders
          </Link>
        </div>
      </main>
    );
  const sh = o.shipping || {},
    status = String(o.status),
    canRequestCancel =
      o.paymentStatus === "paid" &&
      ["confirmed", "processing"].includes(status),
    canRequestReturn = o.paymentStatus === "paid" && status === "delivered";
  return (
    <main className="page order-detail-page">
      <span className="eyebrow">ORDER {o.number || ""}</span>
      <h1>{status.replaceAll("_", " ")}</h1>
      <div className="order-status-track">
        <span
          className={
            ["confirmed", "processing", "shipped", "delivered"].includes(status)
              ? "done"
              : ""
          }
        >
          Order placed
        </span>
        <span
          className={
            ["processing", "shipped", "delivered"].includes(status)
              ? "done"
              : ""
          }
        >
          Processing
        </span>
        <span
          className={["shipped", "delivered"].includes(status) ? "done" : ""}
        >
          Shipped
        </span>
        <span className={status === "delivered" ? "done" : ""}>Delivered</span>
      </div>
      <p>
        Payment: {o.paymentStatus || "pending"} · Total {money(o.total)}
      </p>
      {code && !o.user && (
        <div className="guest-order-code" role="note">
          <b>Guest order access code</b>
          <code>{code}</code>
          <p>
            Keep this code with your order number to find the order on another
            device.
          </p>
        </div>
      )}
      {o.trackingUrl && (
        <p className="order-tracking">
          <b>
            {o.carrier || "Shipment"}
            {o.trackingNumber ? ` · ${o.trackingNumber}` : ""}
          </b>{" "}
          <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer">
            Track shipment <ArrowUpRight size={14} />
          </a>
        </p>
      )}
      {!o.trackingUrl && o.trackingNumber && (
        <p>
          Tracking number: {o.trackingNumber}
          {o.carrier ? ` · ${o.carrier}` : ""}
        </p>
      )}
      {o.items.map((i, n) => (
        <div key={n} className="order-line">
          {i.name} · {i.size || "One size"} · {i.color || ""} · Qty {i.quantity}{" "}
          <b>{money(i.unitPrice * i.quantity)}</b>
        </div>
      ))}
      <p>
        Delivering to{" "}
        {[sh.name, sh.line1, sh.city, sh.pincode].filter(Boolean).join(", ")}
      </p>
      <p className="receipt-totals">
        Subtotal {money(o.subtotal)} · Shipping {money(o.shippingFee)}
        {o.discountTotal
          ? ` · ${o.couponCode ? `Coupon ${o.couponCode} ` : "Discount "}−${money(o.discountTotal)}`
          : ""}
        {o.gift?.wrapped ? ` · Gift wrapping ${money(o.gift.fee)}` : ""} · Total{" "}
        {money(o.total)}
      </p>
      <button
        className="button outline print-receipt"
        onClick={() => window.print()}
      >
        Print / save receipt
      </button>
      {status === "pending_payment" && (
        <button disabled={busy} className="button outline" onClick={cancel}>
          Cancel unpaid order
        </button>
      )}
      {(canRequestCancel || canRequestReturn) && !requestType && (
        <button
          className="button outline"
          onClick={() =>
            setRequestType(canRequestCancel ? "cancellation" : "return")
          }
        >
          {canRequestCancel
            ? "Request cancellation review"
            : "Request return review"}
        </button>
      )}
      {requestType && (
        <form className="order-request-form" onSubmit={submitRequest}>
          <h2>
            {requestType === "cancellation"
              ? "Cancellation review request"
              : "Return review request"}
          </h2>
          <p>
            Submitting asks the store to review your request. It does not
            automatically cancel the order, approve a return, or issue a refund.
          </p>
          <label>
            Reason
            <textarea
              required
              minLength="10"
              maxLength="1000"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
            />
          </label>
          <button className="button dark" disabled={busy}>
            {busy ? "Submitting…" : "Send request"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setRequestType("")}
          >
            Keep order as is
          </button>
        </form>
      )}
      {requestMessage && (
        <p role="status" className="order-request-message">
          {requestMessage}
        </p>
      )}
      {!!o.customerRequests?.length && (
        <section className="customer-request-history">
          <h2>Order requests</h2>
          {o.customerRequests.map((r) => (
            <div key={r._id}>
              <b>
                {r.type} · {r.status}
              </b>
              <p>{r.reason}</p>
              {r.reviewNote && <small>Store response: {r.reviewNote}</small>}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function WishlistPage() {
  const { wishlist, setWishlist, notify } = useStore(),
    location = useLocation(),
    [products, setProducts] = useState([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const shareParam = new URLSearchParams(location.search).get("share"),
    sharedSlugs = (shareParam || "")
      .split(",")
      .map((x) => x.trim())
      .filter((x) => /^[a-z0-9-]{1,180}$/i.test(x))
      .slice(0, 24),
    shared = Boolean(shareParam);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    const load = shared
      ? Promise.all(
          sharedSlugs.map((slug) =>
            request(`/products/${encodeURIComponent(slug)}`).catch(() => null),
          ),
        )
      : request("/products").then((rows) =>
          rows.filter((p) => wishlist.includes(p._id)),
        );
    load
      .then((rows) => {
        if (active) setProducts(rows.filter(Boolean));
      })
      .catch((e) => {
        if (active) {
          setProducts([]);
          setError(e.message);
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [shareParam, wishlist.join("|")]);
  const saved = shared
    ? products
    : products.filter((p) => wishlist.includes(p._id));
  async function share() {
    const url = `${window.location.origin}/wishlist?share=${encodeURIComponent(
      saved
        .slice(0, 24)
        .map((p) => p.slug)
        .filter(Boolean)
        .join(","),
    )}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify("Wishlist link copied");
      } else {
        window.prompt("Copy this wishlist link", url);
      }
    } catch {
      window.prompt("Copy this wishlist link", url);
    }
  }
  return (
    <main className="page wishlist-page">
      <span className="eyebrow">
        {shared ? "A WISHLIST TO EXPLORE" : "SAVED FOR LATER"}
      </span>
      <h1>
        {shared ? (
          <>
            A little <em>inspiration.</em>
          </>
        ) : (
          <>
            Your <em>wishlist.</em>
          </>
        )}
      </h1>
      {!shared && saved.length > 0 && (
        <button className="button outline wishlist-share" onClick={share}>
          Copy share link <ArrowUpRight size={15} />
        </button>
      )}
      {busy ? (
        <div className="empty-catalog">Loading saved pieces…</div>
      ) : error ? (
        <div className="empty-catalog" role="alert">
          {error}
          <button className="button outline" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      ) : saved.length ? (
        <>
          <ProductGrid products={saved} />
          {shared && (
            <p className="help">
              Shared products reflect the live catalog and may change.
            </p>
          )}
          <Link className="button outline" to="/products">
            Continue browsing
          </Link>
        </>
      ) : (
        <div className="empty-catalog">
          {shared
            ? "No currently available products were found in this shared wishlist."
            : "No saved pieces yet. Keep an eye out for something lovely."}
          <Link className="button dark" to="/products">
            Explore the collection <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </main>
  );
}
function AboutPage() {
  return (
    <main className="page brand-page">
      <span className="eyebrow">A NOTE FROM US</span>
      <h1>
        Rooted here.
        <br />
        <em>Worn everywhere.</em>
      </h1>
      <div className="brand-story-grid">
        <img
          src="/assets/brand/brand-story.webp"
          alt="Model in a terracotta outfit in a heritage courtyard"
        />
        <div>
          <h2>Clothes should feel like coming home.</h2>
          <p>
            VIMUHET is a little love letter to the many ways of being a woman
            here. Familiar craft, considered details and easy silhouettes—made
            for everyday life.
          </p>
          <p>
            Our promise is simple: thoughtful style, comfortable pieces and
            accessible prices. Clothing that moves with you.
          </p>
          <Link className="button dark" to="/products">
            Discover the collection <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <section className="lookbook-feature">
        <img
          src="/assets/lookbook/everyday-edit.webp"
          alt="A considered everyday wardrobe in warm natural tones"
          loading="lazy"
        />
        <div>
          <span className="eyebrow">THE VIMUHET EDIT</span>
          <h2>More you, every day.</h2>
          <Link to="/products" className="text-link">
            Explore the edit <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </main>
  );
}
function ContactPage() {
  const [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    setError("");
    const f = e.currentTarget;
    try {
      const r = await request("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: f.name.value,
          email: f.email.value,
          message: f.message.value,
        }),
      });
      setStatus(r.message);
      f.reset();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="page contact-page">
      <span className="eyebrow">WE’RE HERE TO HELP</span>
      <h1>
        Get in <em>touch.</em>
      </h1>
      <p className="contact-intro">
        Questions about a piece or an existing order? Send us a note and our
        team will get back to you.
      </p>
      <form className="checkout-form contact-form" onSubmit={submit}>
        <label>
          Name
          <input name="name" required minLength="2" maxLength="100" />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label className="wide">
          How can we help?
          <textarea name="message" required minLength="10" maxLength="4000" />
        </label>
        <button className="button dark" disabled={busy}>
          {busy ? "Sending…" : "Send message"} <ArrowRight size={16} />
        </button>
        {status && <p role="status">{status}</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
function FaqPage() {
  return (
    <main className="page policy-page">
      <span className="eyebrow">A LITTLE HELP</span>
      <h1>
        Frequently <em>asked.</em>
      </h1>
      <details>
        <summary>How do I choose my size?</summary>
        <p>
          Use the available size options on each product page. A size guide can
          be opened there; for exact garment measurements, check the product
          label or contact us before ordering.
        </p>
      </details>
      <details>
        <summary>How do I check product availability?</summary>
        <p>
          Product availability is shown on each item page and is checked again
          when your order is submitted.
        </p>
      </details>
      <details>
        <summary>What are the shipping charges?</summary>
        <p>
          At present, the checkout calculates shipping from the basket total.
          The current free-shipping threshold is ₹2,499; the final charge is
          shown before payment.
        </p>
      </details>
      <details>
        <summary>How can I pay?</summary>
        <p>
          Online payment is handled through Razorpay when payment service
          configuration is active. Do not retry a payment if its status is
          unclear; contact support with your order reference.
        </p>
      </details>
      <details>
        <summary>Can I cancel or return an order?</summary>
        <p>
          Unpaid orders can be cancelled from the order page. For an order
          already paid or being fulfilled, contact our team; eligibility depends
          on the published store policy and order status.
        </p>
      </details>
      <p>
        Still need help? <Link to="/contact">Contact VIMUHET.</Link>
      </p>
    </main>
  );
}
function ShippingPage() {
  return (
    <main className="page policy-page">
      <span className="eyebrow">ORDER CARE</span>
      <h1>
        Shipping & <em>returns.</em>
      </h1>
      <p>
        Shipping is currently ₹99 when the merchandise subtotal is below ₹2,499,
        and free when it reaches ₹2,499. The basket and checkout show the charge
        before payment. Delivery estimates are not configured here, so we do not
        promise a delivery date.
      </p>
      <p>
        Order status appears on your order details page. Courier and tracking
        information will be shown only when the store has actual tracking
        details to share.
      </p>
      <p>
        For cancellation, return, exchange or refund questions, contact the
        VIMUHET team with your order number. Paid orders may require review
        before a refund is initiated; a refund is not complete until the payment
        provider confirms it.
      </p>
      <p>
        This page needs the merchant’s final, legally reviewed shipping/return
        timeframes and eligibility rules before launch.
      </p>
      <Link className="button outline" to="/contact">
        Ask us about an order <ArrowRight size={15} />
      </Link>
    </main>
  );
}
function Admin() {
  const { token, user, auth } = useStore();
  return <AdminConsole token={token} user={user} onLogout={auth.logout} />;
}
function CategoryAdmin({ token, categories, reload }) {
  const [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    try {
      await request("/admin/categories", {
        method: "POST",
        token,
        body: JSON.stringify({ name, description }),
      });
      setName("");
      setDescription("");
      reload();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <form className="admin-create category-form" onSubmit={submit}>
        <h2>Add a category</h2>
        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button className="button dark">Add category</button>
        {error && <p>{error}</p>}
      </form>
      <div className="admin-table">
        {categories.map((c) => (
          <div key={c._id}>
            <span>{c.name}</span>
            <span>{c.slug}</span>
            <span>{c.active ? "Active" : "Hidden"}</span>
          </div>
        ))}
      </div>
    </>
  );
}
function Newsletter() {
  const [status, setStatus] = useState(""),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setStatus("");
    setError("");
    try {
      const email = e.currentTarget.email.value;
      const r = await request("/newsletter", {
        method: "POST",
        body: JSON.stringify({
          email,
          consent: e.currentTarget.consent.checked,
        }),
      });
      setStatus(r.message);
      e.currentTarget.reset();
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <section className="newsletter">
      <span className="eyebrow">A NOTE FROM VIMUHET</span>
      <h2>
        Good things, <em>in your inbox.</em>
      </h2>
      <p>New drops, styling notes and the occasional little surprise.</p>
      <form onSubmit={submit}>
        <input
          name="email"
          type="email"
          placeholder="Your email address"
          required
          aria-label="Your email address"
        />
        <button aria-label="Subscribe">
          <ArrowRight />
        </button>
        <label className="consent">
          <input name="consent" type="checkbox" required /> I agree to receive
          occasional marketing emails. I can unsubscribe anytime.
        </label>
      </form>
      <small>
        {status ||
          error ||
          "We only send marketing updates with your explicit permission."}
      </small>
    </section>
  );
}
function Unsubscribe() {
  const [status, setStatus] = useState("Processing your request…"),
    token = new URLSearchParams(location.search).get("token") || "";
  useEffect(() => {
    request("/newsletter/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((r) => setStatus(r.message))
      .catch((e) => setStatus(e.message));
  }, [token]);
  return (
    <main className="page">
      <span className="eyebrow">EMAIL PREFERENCES</span>
      <h1>
        VIMUHET <em>updates.</em>
      </h1>
      <p>{status}</p>
      <Link to="/">Return to VIMUHET</Link>
    </main>
  );
}
function Footer() {
  return (
    <footer id="footer">
      <div className="footer-top">
        <div>
          <Link to="/" className="wordmark">
            VIMUHET<span>✳</span>
          </Link>
          <p>Clothing that moves with you.</p>
          <a
            className="social"
            href="https://instagram.com"
            aria-label="Instagram"
          >
            <Instagram size={18} />
          </a>
        </div>
        <div>
          <h4>COME ON IN</h4>
          <Link to="/products">Shop all</Link>
          <Link to="/account">Your account</Link>
          <Link to="/wishlist">Wishlist</Link>
          <Link to="/orders">Order history</Link>
          <Link to="/order-lookup">Guest order lookup</Link>
          <Link to="/about">Our story</Link>
        </div>
        <div>
          <h4>HERE TO HELP</h4>
          <Link to="/contact">Get in touch</Link>
          <Link to="/faq">FAQs</Link>
          <Link to="/shipping-returns">Shipping & returns</Link>
          <Link to="/products">Size guide</Link>
        </div>
        <div>
          <h4>THE FINE PRINT</h4>
          <Link to="/shipping-returns">Returns policy</Link>
          <Link to="/contact">Privacy & terms inquiries</Link>
          <button
            className="footer-analytics"
            onClick={() => {
              try {
                localStorage.removeItem(ANALYTICS_CONSENT_KEY);
              } catch {}
              window.location.reload();
            }}
          >
            Analytics preferences
          </button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 VIMUHET. Made with care in India.</span>
        <span>Payments securely processed by Razorpay</span>
        <span>✳ Rooted here. Worn everywhere.</span>
      </div>
    </footer>
  );
}
export default App;
