import "./globals.css";
import Preloader from "@/components/Preloader";
import VisitTracker from "@/components/VisitTracker";

export const metadata = {
  title: "VIMUHET — Clothing that moves with you",
  description:
    "VIMUHET is a modern Indian clothing label. Shop our tees, kurtas, hoodies and dresses live on Amazon, Flipkart, Meesho and Myntra.",
  keywords: [
    "VIMUHET",
    "clothing",
    "tshirts",
    "kurtas",
    "hoodies",
    "amazon",
    "flipkart",
    "meesho",
  ],
  openGraph: {
    title: "VIMUHET — Clothing that moves with you",
    description: "Shop VIMUHET on Amazon, Flipkart, Meesho and Myntra.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="google-site-verification"
          content="fAE-nuklo8OiGBwJfWX-Vz7zK_UqQI8VgQSS8iDkLUw"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@200..800&family=Playfair+Display:ital,wght@0,500;0,700;1,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Preloader />
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
