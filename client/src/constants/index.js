export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

export const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop All', to: '/shop' },
  { label: 'New Arrivals', to: '/new-arrivals' },
  { label: 'Best Sellers', to: '/best-sellers' },
  { label: 'Kurtis', to: '/category/everyday-kurtis', dropdown: 'kurtis' },
  { label: 'Kurti Sets', to: '/category/kurti-sets', dropdown: 'sets' },
  { label: 'Collections', to: '/collections', dropdown: 'collections' },
  { label: 'Offers', to: '/shop?onSale=true' },
  { label: 'About Us', to: '/about' },
];

/**
 * Desktop header shows a condensed nav so the bar never overflows between
 * 1024px and 1180px. These entries stay reachable elsewhere: "Home" is the
 * logo, and the rest are surfaced inside the mega menus / mobile drawer.
 */
export const DESKTOP_NAV_HIDDEN = ['Home', 'Trending'];

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'best-selling', label: 'Best Selling' },
  { value: 'top-rated', label: 'Top Rated' },
  { value: 'discount', label: 'Highest Discount' },
];

export const ORDER_STATUS_LABELS = {
  PENDING: 'Order Placed',
  CONFIRMED: 'Payment Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return Requested',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};

export const ORDER_TIMELINE = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const PAYMENT_STATUS_LABELS = {
  CREATED: 'Created',
  PENDING: 'Pending',
  PAID: 'Successful',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially Refunded',
};

export const FAQ_CATEGORIES = [
  {
    id: 'orders',
    title: 'Orders',
    items: [
      { q: 'How do I place an order?', a: 'Add a piece to your bag, choose your size and colour, then continue to checkout. You can pay securely using UPI, cards or net banking through Razorpay.' },
      { q: 'Can I modify or cancel an order?', a: 'Orders can be cancelled from My Account → Orders while they are still in Placed, Confirmed or Processing status. Once packed, please contact care@vimuhet.com and we will do our best to help.' },
      { q: 'How do I track my order?', a: 'Open My Account → Orders and select Track Order. The timeline shows every confirmed update from our warehouse and courier partner.' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    items: [
      { q: 'Which payment methods are supported?', a: 'UPI, debit cards, credit cards, net banking and supported wallets are processed by Razorpay. All sensitive payment details are handled by the gateway — we never see or store them.' },
      { q: 'Is my payment secure?', a: 'Yes. Every payment is verified on our server using Razorpay signature verification before an order is confirmed. We never confirm an order based on the browser alone.' },
      { q: 'My payment failed but money was deducted.', a: 'Failed or interrupted payments are auto-reversed by your bank, usually within 5–7 working days. If it does not reflect, write to care@vimuhet.com with your order reference.' },
    ],
  },
  {
    id: 'shipping',
    title: 'Shipping',
    items: [
      { q: 'What are the delivery charges?', a: 'Shipping is ₹99 on orders below ₹1,999 and free above that. Any active free-shipping coupon will be applied at checkout.' },
      { q: 'How long does delivery take?', a: 'Metro cities usually receive orders in 3–4 working days; other serviceable PIN codes in about 5–7 working days. You can check your PIN code on any product page.' },
    ],
  },
  {
    id: 'returns',
    title: 'Returns & Refunds',
    items: [
      { q: 'What is the return window?', a: 'You may request a return within 7 days of delivery for unused, unwashed pieces with original tags intact. Raise it from My Account → Orders.' },
      { q: 'When will I receive my refund?', a: 'Approved refunds are initiated to the original payment method within 2 working days and typically reflect in 5–7 working days.' },
    ],
  },
  {
    id: 'products',
    title: 'Products',
    items: [
      { q: 'How do I choose the right size?', a: 'Every product page has a Size Guide with body measurements in inches. If you are between sizes we recommend sizing up for straight kurtis and staying true to size for anarkalis.' },
      { q: 'How should I care for embroidered pieces?', a: 'Dry clean is recommended for embroidered and zari pieces. Cotton and rayon can be gently hand washed in cold water, dried in shade and ironed on reverse.' },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [
      { q: 'Do I need an account to order?', a: 'You can browse and build a bag as a guest, but an account lets you track orders, save addresses and keep a wishlist across devices.' },
      { q: 'How do I reset my password?', a: 'Use Forgot Password on the sign-in screen. A secure reset link is emailed to you and expires in 30 minutes.' },
    ],
  },
  {
    id: 'support',
    title: 'General Support',
    items: [
      { q: 'How do I reach customer care?', a: 'Email care@vimuhet.com or use the contact form. Our team replies within 24 hours on working days.' },
    ],
  },
];

export const TRUST_ITEMS = [
  { title: 'Free Shipping', subtitle: 'On orders above ₹999', icon: 'Truck' },
  { title: 'Secure Payments', subtitle: '100% protected checkout', icon: 'ShieldCheck' },
  { title: 'Easy Returns', subtitle: 'Within 7 days', icon: 'RotateCcw' },
  { title: 'Special Offers', subtitle: 'Members-only access', icon: 'Gift' },
];

export const CATEGORY_META = {
  'everyday-kurtis': { title: 'Everyday Kurtis', description: 'Soft, breathable kurtis you will reach for on repeat.' },
  'office-wear': { title: 'Office Wear', description: 'Polished, minimal silhouettes made for long working days.' },
  'festive-wear': { title: 'Festive Wear', description: 'Hand-embroidered celebration pieces in rich festive tones.' },
  'designer-kurtis': { title: 'Designer Kurtis', description: 'Limited-run craft-led silhouettes with refined detailing.' },
  'cotton-kurtis': { title: 'Cotton Kurtis', description: 'Pure cotton comfort that holds its shape, wash after wash.' },
  'anarkali-kurtis': { title: 'Anarkali Kurtis', description: 'Flared, fluid silhouettes that move beautifully.' },
  'kurti-sets': { title: 'Kurti Sets', description: 'Complete, considered looks paired for you.' },
};
