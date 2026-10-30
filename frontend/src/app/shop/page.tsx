import { Suspense } from 'react';
import { Shop } from '@/components/Atelier';
export default function ShopPage() { return <Suspense fallback={<div className="atelier-loading">Loading...</div>}><Shop /></Suspense>; }
