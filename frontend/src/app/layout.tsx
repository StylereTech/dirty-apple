import type { Metadata } from 'next';
import './globals.css';
import './atelier.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'DIRTY APPLE | Curated Luxury Fashion',
  description: 'Discover fashion sale listings from mainstream retailers. Explore brands, compare prices and visit the retailer for current availability.',
  keywords: ['luxury fashion', 'designer deals', 'Gucci sale', 'Prada sale', 'luxury markdowns'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="atelier-shell min-h-screen flex flex-col">
        <Navbar />
        <main id="main-content" className="site-main flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
