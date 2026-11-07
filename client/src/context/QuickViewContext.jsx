import { createContext, useContext, useMemo, useState } from 'react';

const QuickViewContext = createContext(null);

export function QuickViewProvider({ children }) {
  const [product, setProduct] = useState(null);
  const value = useMemo(() => ({ product, openQuickView: setProduct, closeQuickView: () => setProduct(null) }), [product]);
  return <QuickViewContext.Provider value={value}>{children}</QuickViewContext.Provider>;
}

export const useQuickView = () => {
  const ctx = useContext(QuickViewContext);
  if (!ctx) throw new Error('useQuickView must be used inside QuickViewProvider');
  return ctx;
};
