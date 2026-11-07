import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { useAdminAuth } from './context/AdminAuthContext.jsx';
import { QuickViewProvider } from './context/QuickViewContext.jsx';
import CustomerLayout from './layouts/CustomerLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import { Skeleton } from './components/ui/States.jsx';
import { RouteFallback } from './components/ui/Skeletons.jsx';

/* ------------------------------- Customer ------------------------------- */
import Home from './pages/Home.jsx';
const Shop = lazy(() => import('./pages/shop/Shop.jsx'));
const CategoryPage = lazy(() => import('./pages/shop/CategoryPage.jsx'));
const NewArrivals = lazy(() => import('./pages/shop/ListingPages.jsx').then((m) => ({ default: m.NewArrivals })));
const BestSellers = lazy(() => import('./pages/shop/ListingPages.jsx').then((m) => ({ default: m.BestSellers })));
const Trending = lazy(() => import('./pages/shop/ListingPages.jsx').then((m) => ({ default: m.Trending })));
const CollectionDetail = lazy(() =>
  import('./pages/shop/CollectionsPage.jsx').then((m) => ({ default: m.CollectionDetail }))
);
const SearchPage = lazy(() => import('./pages/shop/SearchPage.jsx'));
const ProductDetail = lazy(() => import('./pages/shop/ProductDetail.jsx'));
const Cart = lazy(() => import('./pages/shop/Cart.jsx'));
const Wishlist = lazy(() => import('./pages/shop/Wishlist.jsx'));

const Checkout = lazy(() => import('./pages/checkout/Checkout.jsx'));
const OrderSuccess = lazy(() => import('./pages/checkout/OrderSuccess.jsx'));
const PaymentFailed = lazy(() => import('./pages/checkout/PaymentFailed.jsx'));

const Login = lazy(() => import('./pages/auth/AuthPages.jsx').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/auth/AuthPages.jsx').then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/auth/AuthPages.jsx').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/auth/AuthPages.jsx').then((m) => ({ default: m.ResetPassword })));
const VerifyEmail = lazy(() => import('./pages/auth/AuthPages.jsx').then((m) => ({ default: m.VerifyEmail })));

const AccountLayout = lazy(() => import('./pages/account/AccountLayout.jsx'));
const Dashboard = lazy(() => import('./pages/account/Dashboard.jsx'));
const Orders = lazy(() => import('./pages/account/Orders.jsx').then((m) => ({ default: m.Orders })));
const OrderDetail = lazy(() => import('./pages/account/Orders.jsx').then((m) => ({ default: m.OrderDetail })));
const Profile = lazy(() => import('./pages/account/AccountPages.jsx').then((m) => ({ default: m.Profile })));
const Addresses = lazy(() => import('./pages/account/AccountPages.jsx').then((m) => ({ default: m.Addresses })));
const MyReviews = lazy(() => import('./pages/account/AccountPages.jsx').then((m) => ({ default: m.MyReviews })));
const AccountSettings = lazy(() => import('./pages/account/AccountPages.jsx').then((m) => ({ default: m.AccountSettings })));

const About = lazy(() => import('./pages/info/InfoPages.jsx').then((m) => ({ default: m.About })));
const Contact = lazy(() => import('./pages/info/InfoPages.jsx').then((m) => ({ default: m.Contact })));
const FAQs = lazy(() => import('./pages/info/InfoPages.jsx').then((m) => ({ default: m.FAQs })));
const TrackOrder = lazy(() => import('./pages/info/InfoPages.jsx').then((m) => ({ default: m.TrackOrder })));
const PolicyPage = lazy(() => import('./pages/info/InfoPages.jsx').then((m) => ({ default: m.PolicyPage })));
const CookieConsent = lazy(() => import('./components/consent/CookieConsent.jsx'));
const WhatsAppButton = lazy(() => import('./components/whatsapp/WhatsAppButton.jsx'));
const NotFound = lazy(() => import('./pages/info/InfoPages.jsx').then((m) => ({ default: m.NotFound })));
const CategoriesIndex = lazy(() => import('./pages/shop/CategoriesIndex.jsx'));
const CollectionIndex = lazy(() =>
  import('./pages/shop/CategoriesIndex.jsx').then((m) => ({ default: m.CollectionIndex }))
);

/* --------------------------------- Admin --------------------------------
 * Wrapped in an explicit `webpackChunkName`-style factory that is only called
 * from inside the /admin route. React's `lazy()` already defers the import, but
 * keeping the admin tree behind one helper makes it unmistakable that a
 * storefront visitor never downloads it — the whole block is ~350 kB of
 * components no customer needs.
 */
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Analytics = lazy(() => import('./pages/admin/Analytics.jsx'));
const LiveVisitors = lazy(() => import('./pages/admin/LiveVisitors.jsx'));
const AdminVisitors = lazy(() => import('./pages/admin/Visitors.jsx'));
const AdminProducts = lazy(() => import('./pages/admin/Products.jsx'));
const AdminProductForm = lazy(() => import('./pages/admin/ProductForm.jsx'));
const AdminCategories = lazy(() => import('./pages/admin/Categories.jsx'));
const AdminCollections = lazy(() => import('./pages/admin/Collections.jsx'));
const AdminInventory = lazy(() => import('./pages/admin/Inventory.jsx'));
const AdminOrders = lazy(() => import('./pages/admin/Orders.jsx'));
const AdminOrderDetail = lazy(() => import('./pages/admin/OrderDetail.jsx'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers.jsx'));
const AdminCustomerDetail = lazy(() => import('./pages/admin/CustomerDetail.jsx'));
const AdminPayments = lazy(() => import('./pages/admin/Payments.jsx'));
const AdminPaymentDetail = lazy(() => import('./pages/admin/PaymentDetail.jsx'));
const AdminCoupons = lazy(() => import('./pages/admin/Coupons.jsx'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews.jsx'));
const AdminHomepage = lazy(() => import('./pages/admin/Homepage.jsx'));
const AdminBanners = lazy(() => import('./pages/admin/Banners.jsx'));
const AdminReports = lazy(() => import('./pages/admin/Reports.jsx'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogs.jsx'));
const AdminMessages = lazy(() => import('./pages/admin/Messages.jsx'));
const AdminSubscribers = lazy(() => import('./pages/admin/Subscribers.jsx'));
const AdminAbandonedCarts = lazy(() => import('./pages/admin/AbandonedCarts.jsx'));

function AuthShell() {
  return (
    <QuickViewProvider>
      <main className="min-h-screen bg-[var(--surface)]">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </QuickViewProvider>
  );
}

function FullPageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-56 space-y-3">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

/* Admin pages are the heaviest chunks in the app (tables, charts, forms). This
   mirrors the admin shell's sidebar + content frame so opening a report never
   blanks the whole screen — the frame stays, only the panel fills in. */
function AdminShellLoader() {
  return (
    <div className="flex min-h-screen bg-[var(--surface-sunken)]">
      <div className="hidden w-[236px] shrink-0 bg-[#3d101d] lg:block" />
      <div className="min-w-0 flex-1 p-6">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to="/account" replace />;
  return children;
}

export default function App() {
  /* The consent banner belongs to the storefront only — never to /admin. */
  const { pathname } = useLocation();
  const showConsent = !pathname.startsWith('/admin');

  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        {/* ----------------------------- Storefront ---------------------------- */}
        <Route element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="new-arrivals" element={<NewArrivals />} />
          <Route path="best-sellers" element={<BestSellers />} />
          <Route path="trending" element={<Trending />} />
          <Route path="categories" element={<CategoriesIndex />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="collections" element={<CollectionIndex />} />
          <Route path="collections/:slug" element={<CollectionDetail />} />
          <Route path="product/:slug" element={<ProductDetail />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="cart" element={<Cart />} />

          <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="order-success/:orderId" element={<RequireAuth><OrderSuccess /></RequireAuth>} />
          <Route path="payment-failed/:orderId" element={<RequireAuth><PaymentFailed /></RequireAuth>} />

          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="faqs" element={<FAQs />} />
          <Route path="track-order" element={<TrackOrder />} />
          <Route path="shipping-policy" element={<PolicyPage />} />
          <Route path="return-policy" element={<PolicyPage />} />
          <Route path="cookie-policy" element={<PolicyPage />} />
          <Route path="privacy-policy" element={<PolicyPage />} />
          <Route path="terms" element={<PolicyPage />} />

          <Route path="account" element={<RequireAuth><AccountLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:orderId" element={<OrderDetail />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="reviews" element={<MyReviews />} />
            <Route path="settings" element={<AccountSettings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ------------------------------- Auth -------------------------------- */}
        <Route element={<AuthShell />}>
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
        </Route>

        {/* -------------------------------- Admin ------------------------------ */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Suspense fallback={<AdminShellLoader />}>
                <AdminLayout />
              </Suspense>
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="live-visitors" element={<LiveVisitors />} />
          <Route path="visitors" element={<AdminVisitors />} />

          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id/edit" element={<AdminProductForm />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="collections" element={<AdminCollections />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="reviews" element={<AdminReviews />} />

          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="payments/:id" element={<AdminPaymentDetail />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="abandoned-carts" element={<AdminAbandonedCarts />} />

          <Route path="customers" element={<AdminCustomers />} />
          <Route path="customers/:id" element={<AdminCustomerDetail />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="subscribers" element={<AdminSubscribers />} />

          <Route path="homepage" element={<AdminHomepage />} />
          <Route path="banners" element={<AdminBanners />} />

          <Route path="reports/sales" element={<AdminReports type="sales" />} />
          <Route path="reports/customers" element={<AdminReports type="customers" />} />
          <Route path="reports/inventory" element={<AdminReports type="inventory" />} />
          <Route path="reports/visitors" element={<AdminReports type="visitors" />} />

          <Route path="admins" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings section="general" />} />
          <Route path="settings/payment" element={<AdminSettings section="payment" />} />
          <Route path="settings/shipping" element={<AdminSettings section="shipping" />} />
          <Route path="settings/notifications" element={<AdminSettings section="notifications" />} />
          <Route path="settings/security" element={<AdminSettings section="security" />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
      {showConsent && <CookieConsent />}
      {showConsent && <WhatsAppButton />}
    </Suspense>
  );
}
