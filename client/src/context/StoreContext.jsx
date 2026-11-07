import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { WHATSAPP_DISPLAY } from '../constants/whatsapp.js';
import { homeApi, catalogApi, consentApi } from '../services/endpoints.js';
import { readConsentSync } from './ConsentContext.jsx';

const StoreContext = createContext(null);

const RECENT_KEY = 'vimuhet_recently_viewed';
const SEARCH_KEY = 'vimuhet_recent_searches';

export function StoreProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [home, setHome] = useState(null);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [recent, setRecent] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(true);

  /* Bootstrap the four storefront requests in parallel but commit each one the
     moment *it* lands, rather than waiting for the slowest.

     They used to be joined behind a single Promise.all, so the hero — the LCP
     element — could not paint until categories, collections and settings had
     also arrived. Over a congested connection those four requests queue behind
     each other, and the whole above-the-fold experience was gated on the slowest
     one. Now the hero renders as soon as the homepage payload is in; the
     sections that actually need categories/collections render when those land.
     `loading` still means "something is still in flight", so existing skeleton
     logic is unchanged. */
  useEffect(() => {
    let alive = true;
    const settle = (p, apply) =>
      p
        .then((res) => {
          if (alive) apply(res.data);
        })
        .catch(() => {
          /* that one slice falls back to cached/static content */
        });
    Promise.all([
      settle(homeApi.homepage(), setHome),
      settle(catalogApi.categories(), setCategories),
      settle(catalogApi.collections(), setCollections),
      settle(homeApi.settings(), setSettings),
    ]).then(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'));
      setRecentSearches(JSON.parse(localStorage.getItem(SEARCH_KEY) || '[]'));
    } catch {
      setRecent([]);
    }
  }, []);

  /**
   * Recently viewed is a functional feature: it only records when the visitor
   * has granted functional consent. It is mirrored to the account so the list
   * follows them across devices after sign-in.
   */
  const trackRecentlyViewed = (product) => {
    if (!product?._id) return;
    if (!readConsentSync().functional) return;
    setRecent((prev) => {
      const next = [product, ...prev.filter((p) => String(p._id) !== String(product._id))].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
    consentApi.trackRecentView(product._id).catch(() => {});
  };

  const clearRecentlyViewed = () => {
    localStorage.removeItem(RECENT_KEY);
    setRecent([]);
  };

  const addRecentSearch = (term) => {
    if (!term?.trim()) return;
    setRecentSearches((prev) => {
      const next = [term.trim(), ...prev.filter((t) => t.toLowerCase() !== term.trim().toLowerCase())].slice(0, 6);
      localStorage.setItem(SEARCH_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clearRecentSearches = () => {
    localStorage.removeItem(SEARCH_KEY);
    setRecentSearches([]);
  };

  const value = useMemo(
    () => ({
      settings,
      home,
      categories,
      collections,
      loading,
      shipping: settings?.shipping || { shippingCharge: 99, freeShippingThreshold: 1999, estimatedDeliveryDays: 5, returnWindowDays: 7 },
      general: settings?.general || { storeName: 'Vimuhet', email: 'care@vimuhet.com', phone: WHATSAPP_DISPLAY },
      recent,
      recentSearches,
      trackRecentlyViewed,
      clearRecentlyViewed,
      addRecentSearch,
      clearRecentSearches,
      refreshHome: async () => {
        const res = await homeApi.homepage();
        setHome(res.data);
      },
    }),
    [settings, home, categories, collections, loading, recent, recentSearches]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
};
