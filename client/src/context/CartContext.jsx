import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cartApi } from '../services/endpoints.js';
import { apiErrorMessage } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './UIContext.jsx';

const CartContext = createContext(null);

const EMPTY_PRICING = {
  mrpTotal: 0,
  subtotal: 0,
  productDiscount: 0,
  couponDiscount: 0,
  couponCode: '',
  shipping: 0,
  tax: 0,
  total: 0,
  freeShippingThreshold: 1999,
  amountToFreeShipping: 0,
};

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cart, setCart] = useState({ items: [], count: 0, pricing: EMPTY_PRICING, coupon: null, warnings: [] });
  const [wishlist, setWishlist] = useState({ items: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [busyItem, setBusyItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [cartRes, wishRes] = await Promise.all([cartApi.get(), cartApi.wishlist()]);
      setCart({ ...cartRes.data, warnings: cartRes.data.warnings || [] });
      setWishlist(wishRes.data);
    } catch {
      /* keep last known state on network errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, user?._id]);

  const addItem = useCallback(
    async (payload, { openDrawer = true } = {}) => {
      try {
        const res = await cartApi.add(payload);
        setCart({ ...res.data, warnings: res.data.warnings || [] });
        toast(res.message || 'Added to your bag');
        if (openDrawer) setDrawerOpen(true);
        return true;
      } catch (err) {
        toast(apiErrorMessage(err, 'Could not add to bag'), 'error');
        return false;
      }
    },
    [toast]
  );

  const updateItem = useCallback(
    async (itemId, quantity) => {
      setBusyItem(itemId);
      try {
        const res = await cartApi.update(itemId, quantity);
        setCart({ ...res.data, warnings: res.data.warnings || [] });
      } catch (err) {
        toast(apiErrorMessage(err, 'Could not update your bag'), 'error');
      } finally {
        setBusyItem(null);
      }
    },
    [toast]
  );

  const removeItem = useCallback(
    async (itemId) => {
      setBusyItem(itemId);
      try {
        const res = await cartApi.remove(itemId);
        setCart({ ...res.data, warnings: [] });
        toast('Removed from your bag', 'info');
      } catch (err) {
        toast(apiErrorMessage(err, 'Could not remove this item'), 'error');
      } finally {
        setBusyItem(null);
      }
    },
    [toast]
  );

  const moveToWishlist = useCallback(
    async (itemId) => {
      try {
        const res = await cartApi.moveToWishlist(itemId);
        setCart({ ...res.data, warnings: [] });
        const wish = await cartApi.wishlist();
        setWishlist(wish.data);
        toast('Moved to wishlist', 'info');
      } catch (err) {
        toast(apiErrorMessage(err, 'Could not move this item'), 'error');
      }
    },
    [toast]
  );

  const applyCoupon = useCallback(
    async (code) => {
      const res = await cartApi.applyCoupon(code);
      setCart({ ...res.data, warnings: [] });
      toast(res.message || 'Coupon applied');
      return res.data;
    },
    [toast]
  );

  const removeCoupon = useCallback(async () => {
    const res = await cartApi.removeCoupon();
    setCart({ ...res.data, warnings: [] });
    toast('Coupon removed', 'info');
  }, [toast]);

  const clearCart = useCallback(async () => {
    const res = await cartApi.clear();
    setCart({ ...res.data, warnings: [] });
  }, []);

  const toggleWishlist = useCallback(
    async (productId) => {
      try {
        const res = await cartApi.toggleWishlist(productId);
        const wish = await cartApi.wishlist();
        setWishlist(wish.data);
        toast(res.data.action === 'added' ? 'Saved to wishlist' : 'Removed from wishlist', res.data.action === 'added' ? 'success' : 'info');
        return res.data.action;
      } catch (err) {
        if (err?.response?.status === 401) {
          toast('Please sign in to save items', 'warning');
        } else {
          toast(apiErrorMessage(err, 'Could not update your wishlist'), 'error');
        }
        return null;
      }
    },
    [toast]
  );

  const isWishlisted = useCallback(
    (productId) => wishlist.items.some((p) => String(p._id) === String(productId)),
    [wishlist.items]
  );

  const refreshWishlist = useCallback(async () => {
    const wish = await cartApi.wishlist();
    setWishlist(wish.data);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      loading,
      busyItem,
      drawerOpen,
      setDrawerOpen,
      addItem,
      updateItem,
      removeItem,
      moveToWishlist,
      applyCoupon,
      removeCoupon,
      clearCart,
      toggleWishlist,
      isWishlisted,
      refresh: load,
      refreshWishlist,
      itemCount: cart.count || 0,
      wishlistCount: wishlist.count || 0,
      pricing: cart.pricing || EMPTY_PRICING,
    }),
    [cart, wishlist, loading, busyItem, drawerOpen, addItem, updateItem, removeItem, moveToWishlist, applyCoupon, removeCoupon, clearCart, toggleWishlist, isWishlisted, load, refreshWishlist]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
