import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import CartDrawer from '../components/CartDrawer.jsx';
import QuickViewModal from '../components/QuickViewModal.jsx';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { QuickViewProvider } from '../context/QuickViewContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/UIContext.jsx';
import { guardCheckout } from '../utils/checkoutIntent.js';
import { RouteFallback } from '../components/ui/Skeletons.jsx';

export default function CustomerLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  useAnalytics();

  /* The single checkout entry point from the bag drawer. The bag itself lives
     server-side against the guest id, so nothing is lost by sending a guest
     through sign-in first; they come back to /checkout with the bag intact. */
  const handleCheckout = () => {
    const gate = guardCheckout(Boolean(user), '/checkout');
    if (!gate.allowed) toast(gate.message, 'info');
    navigate(gate.allowed ? '/checkout' : gate.to);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);

  return (
    <QuickViewProvider>
      <div className="flex min-h-screen flex-col bg-[var(--surface)]">
        <Header />
        <main className="flex-1">
          {/* Only the page area suspends. Navigating to a route whose chunk is
              still in flight keeps the header, footer and scroll position on
              screen instead of blanking the whole app behind one global
              fallback — the single biggest perceived-speed win on slow links. */}
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
        <CartDrawer onCheckout={handleCheckout} />
        <QuickViewModal />
      </div>
    </QuickViewProvider>
  );
}
