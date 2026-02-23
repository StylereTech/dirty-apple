import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'DIRTY APPLE | Curated Luxury Fashion',
  description: 'Discover luxury fashion at uncovered prices. Shop Gucci, Prada, Saint Laurent, Balenciaga and more at up to 40% off retail.',
  keywords: ['luxury fashion', 'designer deals', 'Gucci sale', 'Prada sale', 'luxury markdowns'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-white text-black">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
