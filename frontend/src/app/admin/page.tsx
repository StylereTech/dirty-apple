'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest, errorMessage } from '@/lib/api';

type Retailer = { id: string; name: string; saleUrls: string[] };
type Product = { _id: string; name: string; brand: string; category: string; gender?: string; retailerSource: string; retailerUrl: string; ourPrice: number; originalPrice: number; status: string; purchaseMode?: string; lastVerifiedAt?: string; inStock: boolean; sourceType?: string };
type Job = { jobId: string; retailer: string; sourceType?: string; status: string; productsFound: number; productsSaved: number; pagesVisited?: number; truncated?: boolean; errorMessages: string[]; createdAt: string };
type Preview = { total: number; valid: number; saleOffers: number; errors: { row: number; error: string }[]; offers?: Product[]; created?: number; updated?: number; skipped?: number; failures?: { sku: string; error: string }[]; warnings?: string[] };
type Order = { _id: string; orderNumber: string; total: number; paymentStatus: string; fulfillmentStatus: string; createdAt: string; customer?: { email?: string } };
const categories = ['bags', 'shoes', 'clothing', 'accessories', 'kids', 'other'];
const field = 'border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black rounded-none';
const button = 'bg-black text-white px-5 py-3 text-xs tracking-widest disabled:opacity-40 hover:bg-neutral-800';
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function AdminDashboard() {
  // Keep the administrator credential in this tab's memory, never in public build variables or local storage.
  const [token, setToken] = useState('');
  const [credential, setCredential] = useState('');
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [tab, setTab] = useState<'inventory' | 'imports' | 'orders'>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [retailerFilter, setRetailerFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<{ _id: string; count: number }[]>([]);
  const [stale, setStale] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [retailer, setRetailer] = useState('saks');
  const [feed, setFeed] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [maxPages, setMaxPages] = useState(5);
  const [collectionCategory, setCollectionCategory] = useState('');
  const request = useCallback(<T,>(path: string, init: RequestInit = {}) => apiRequest<T>(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      if (tab === 'inventory') {
        const params = new URLSearchParams({ page: String(page), limit: '25' });
        if (status) params.set('status', status);
        if (retailerFilter) params.set('retailer', retailerFilter);
        if (search) params.set('search', search);
        const data = await request<{ products: Product[]; total: number; totalPages: number; counts: { _id: string; count: number }[]; stale: number }>(`/inventory/products?${params}`);
        setProducts(data.products); setTotal(data.total); setPages(data.totalPages); setCounts(data.counts); setStale(data.stale);
      } else if (tab === 'imports') {
        const data = await request<{ jobs: Job[]; total: number; totalPages: number }>(`/scrape/jobs?limit=25&page=${page}`);
        setJobs(data.jobs); setTotal(data.total); setPages(data.totalPages);
      } else {
        const data = await request<{ orders: Order[]; total: number; totalPages: number }>(`/orders?limit=25&page=${page}`);
        setOrders(data.orders); setTotal(data.total); setPages(data.totalPages);
      }
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [token, request, tab, page, status, retailerFilter, search]);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 200); return () => clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (tab !== 'imports' || !jobs.some(job => ['pending', 'running'].includes(job.status))) return;
    const timer = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(timer);
  }, [tab, jobs, load]);

  async function unlock(event: React.FormEvent) {
    event.preventDefault(); setBusy('login'); setError('');
    try {
      const data = await apiRequest<{ retailers: Retailer[] }>('/inventory/retailers', { headers: { Authorization: `Bearer ${credential}` } });
      setRetailers(data.retailers); setToken(credential); setCredential('');
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(''); }
  }

  async function update(product: Product, change: Record<string, string>) {
    setBusy(product._id); setError(''); setNotice('');
    try { await request(`/inventory/products/${product._id}`, { method: 'PATCH', body: JSON.stringify(change) }); setNotice(`${product.name} updated.`); await load(); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(''); }
  }

  async function importFeed(dryRun: boolean) {
    setBusy('feed'); setError(''); setNotice('');
    try {
      let parsed;
      try { parsed = JSON.parse(feed); } catch { throw new Error('Enter valid JSON or choose a JSON feed file.'); }
      const records = Array.isArray(parsed) ? parsed : parsed.records;
      const result = await request<Preview>('/inventory/import', { method: 'POST', body: JSON.stringify({ retailer, records, dryRun }) });
      setPreview(result);
      if (!dryRun) {
        setNotice(`Import saved: ${result.created ?? 0} new, ${result.updated ?? 0} refreshed, ${result.skipped ?? 0} skipped. Review new offers in Inventory before publishing.`);
        await load();
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Import failed.'); }
    finally { setBusy(''); }
  }

  async function collect(event: React.FormEvent) {
    event.preventDefault(); setBusy('collect'); setError(''); setNotice('');
    try {
      const result = await request<{ jobId: string; message: string }>('/scrape', { method: 'POST', body: JSON.stringify({ retailer, url: sourceUrl || undefined, maxPages, category: collectionCategory || undefined }) });
      setNotice(`${result.message} Job ${result.jobId.slice(0, 8)}.`); setPage(1); await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(''); }
  }

  if (!token) return (
    <div className="min-h-screen pt-36 pb-20 px-4 bg-neutral-50">
      <form onSubmit={unlock} className="max-w-md mx-auto bg-white p-8 border border-neutral-200 space-y-5">
        <p className="text-xs tracking-[.3em] text-neutral-500">DIRTYAPPLE ADMIN</p>
        <h1 className="font-playfair text-3xl">Manage your inventory</h1>
        <p className="text-sm text-neutral-600">Use your administrator access token to review offers, organize inventory, and manage imports.</p>
        <label className="block text-sm" htmlFor="admin-token">Administrator token</label>
        <input id="admin-token" type="password" autoComplete="off" required value={credential} onChange={event => setCredential(event.target.value)} className={`${field} w-full`} />
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button className={`${button} w-full`} disabled={!!busy}>{busy ? 'CONNECTING…' : 'OPEN DASHBOARD'}</button>
        <Link href="/" className="block text-sm underline">Back to storefront</Link>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 bg-neutral-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs tracking-[.3em] text-neutral-500 mb-2">DIRTYAPPLE ADMIN</p><h1 className="font-playfair text-3xl">Inventory & sources</h1></div>
          <div className="flex gap-5 text-sm"><Link href="/shop" className="underline">View storefront</Link><button onClick={() => { setToken(''); setProducts([]); setJobs([]); setOrders([]); setPreview(null); setError(''); setNotice(''); }}>Lock dashboard</button></div>
        </div>
        <nav className="flex gap-2 border-b border-neutral-300" aria-label="Dashboard sections">
          {(['inventory', 'imports', 'orders'] as const).map(name => <button key={name} onClick={() => { setTab(name); setPage(1); setNotice(''); }} className={`px-5 py-3 text-xs uppercase tracking-widest ${tab === name ? 'bg-black text-white' : 'bg-white'}`}>{name}</button>)}
        </nav>
        {error && <div role="alert" className="bg-red-50 border border-red-200 p-4 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="bg-green-50 border border-green-200 p-4 text-sm text-green-900">{notice}</div>}

        {tab === 'inventory' && <>
          <div className="flex flex-wrap gap-3">{counts.map(count => <div key={count._id} className="bg-white border p-4 min-w-28"><p className="text-xs text-neutral-500 uppercase">{count._id}</p><p className="text-2xl">{count.count}</p></div>)}<div className="bg-white border p-4"><p className="text-xs text-neutral-500 uppercase">Stale external offers</p><p className="text-2xl">{stale}</p></div></div>
          <p className="text-sm text-neutral-600">New retailer offers start as drafts. Organize their category and audience, then publish. Out-of-stock offers, expired price checks, and demo inventory stay out of the storefront.</p>
          <div className="flex flex-wrap gap-3">
            <input aria-label="Search inventory" placeholder="Search name, brand or SKU" className={`${field} min-w-56`} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
            <select aria-label="Filter inventory status" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className={field}><option value="">All statuses</option>{['draft', 'active', 'sold_out', 'delisted'].map(value => <option key={value}>{value}</option>)}</select>
            <select aria-label="Filter retailer" value={retailerFilter} onChange={event => { setRetailerFilter(event.target.value); setPage(1); }} className={field}><option value="">All retailers</option>{retailers.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select>
            <button onClick={() => { void load(); }} className={`${field} ml-auto`} disabled={loading}>Refresh</button>
          </div>
          <div className="overflow-auto border bg-white"><table className="w-full text-sm"><thead className="bg-neutral-100 text-left"><tr>{['Product / source', 'Price', 'Category / audience', 'Checked', 'Publication'].map(title => <th className="p-4 font-medium" key={title}>{title}</th>)}</tr></thead><tbody>
            {!products.length && <tr><td colSpan={5} className="p-10 text-center text-neutral-500">{loading ? 'Loading inventory…' : 'No inventory matches. Import verified retailer offers to get started.'}</td></tr>}
            {products.map(product => <tr key={product._id} className="border-t align-top">
              <td className="p-4 min-w-64"><p className="text-xs uppercase text-neutral-500">{product.brand}</p><p className="font-medium my-1">{product.name}</p><p className="text-xs text-neutral-500">{product.retailerSource} · {product.sourceType || 'legacy'}</p>{product.status === 'active' && <Link className="text-xs underline" href={`/product/${product._id}`}>View listing</Link>}</td>
              <td className="p-4 whitespace-nowrap">{money(product.ourPrice)}<p className="text-xs text-neutral-400 line-through">{money(product.originalPrice)}</p><p className={`text-xs mt-1 ${product.inStock ? 'text-green-800' : 'text-red-700'}`}>{product.inStock ? 'In stock' : 'Unavailable'}</p></td>
              <td className="p-4 space-y-2"><select aria-label={`Category for ${product.name}`} className={`${field} w-full`} value={product.category.toLowerCase()} disabled={!!busy} onChange={event => { void update(product, { category: event.target.value }); }}>{categories.map(value => <option key={value}>{value}</option>)}</select><select aria-label={`Audience for ${product.name}`} className={`${field} w-full`} value={product.gender || ''} disabled={!!busy} onChange={event => { void update(product, { gender: event.target.value }); }}><option value="" disabled>Set audience</option>{['women', 'men', 'unisex', 'kids'].map(value => <option key={value}>{value}</option>)}</select></td>
              <td className="p-4 text-xs text-neutral-500 min-w-36">{product.lastVerifiedAt ? new Date(product.lastVerifiedAt).toLocaleString() : 'Not verified'}</td>
              <td className="p-4"><select aria-label={`Status for ${product.name}`} className={field} value={product.status} disabled={!!busy} onChange={event => { void update(product, { status: event.target.value }); }}>{['draft', 'active', 'sold_out', 'delisted'].map(value => <option value={value} key={value}>{value === 'active' ? 'Published' : value.replace('_', ' ')}</option>)}</select></td>
            </tr>)}
          </tbody></table></div>
        </>}

        {tab === 'imports' && <>
          <div className="bg-white border p-6 space-y-4">
            <div><h2 className="font-playfair text-2xl">Retailer sources</h2><p className="text-sm text-neutral-600 mt-2">Import a normalized product feed or collect a limited set of accessible public pages. Feed access must be connected through each retailer’s approved program. A collection only saves offers with verifiable sale prices and availability.</p></div>
            <label className="block text-sm" htmlFor="source-retailer">Retailer</label><select id="source-retailer" className={field} value={retailer} onChange={event => { setRetailer(event.target.value); setSourceUrl(''); setPreview(null); }}>{retailers.map(value => <option value={value.id} key={value.id}>{value.name}</option>)}</select>
            <div className="grid lg:grid-cols-2 gap-8 pt-4 border-t">
              <section className="space-y-3"><h3 className="font-medium">Import product feed</h3><p className="text-sm text-neutral-500">JSON array or an object with a records array. Maximum 500 offers per batch. Include product ID, brand, category, prices, USD currency, retailer URL, product images, stock, and an observedAt timestamp.</p>
                <input aria-label="Upload product feed JSON" type="file" accept=".json,application/json" className="block text-sm w-full" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1_900_000) { setError('Use a JSON file smaller than 1.9 MB.'); return; } setFeed(await file.text()); setPreview(null); }} />
                <textarea aria-label="Product feed JSON" className={`${field} w-full font-mono text-xs min-h-52`} value={feed} onChange={event => { setFeed(event.target.value); setPreview(null); }} placeholder='[{ "externalProductId": "retailer-product-id", … }]' />
                <div className="flex flex-wrap gap-3"><button className={button} disabled={!feed || !!busy} onClick={() => { void importFeed(true); }}>VALIDATE & PREVIEW</button><button className={button} disabled={!preview || preview.errors.length > 0 || !!busy} onClick={() => { void importFeed(false); }}>IMPORT TO INVENTORY</button></div>
                {preview && <div className="text-sm space-y-2"><p>{preview.valid} of {preview.total} valid · {preview.saleOffers} in-stock sale offers</p>{preview.errors.map(issue => <p className="text-red-700" key={issue.row}>Row {issue.row}: {issue.error}</p>)}{preview.failures?.map(issue => <p className="text-red-700" key={issue.sku}>{issue.error}</p>)}{preview.warnings?.map((warning, index) => <p className="text-amber-800" key={index}>{warning}</p>)}{preview.offers?.slice(0, 5).map((offer, index) => <p key={index} className="text-xs text-neutral-600">{offer.brand} — {offer.name} · {money(offer.ourPrice)} · {offer.category}</p>)}</div>}
              </section>
              <form onSubmit={collect} className="space-y-3"><h3 className="font-medium">Collect public sale pages</h3><p className="text-sm text-neutral-500">The collector respects robots rules and stops on blocked or unverifiable pages. Page limits mean each run covers a bounded sample, not the retailer’s entire inventory.</p>
                <label htmlFor="source-url" className="block text-sm">Product or sale page URL (optional for configured retailers)</label><input id="source-url" type="url" className={`${field} w-full`} value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder={retailers.find(value => value.id === retailer)?.saleUrls[0] || 'https://…'} />
                <label htmlFor="source-category" className="block text-sm">Category (only for a page containing this category)</label><select id="source-category" className={`${field} w-full`} value={collectionCategory} onChange={event => setCollectionCategory(event.target.value)}><option value="">Use source category</option>{categories.filter(value => value !== 'other').map(value => <option key={value}>{value}</option>)}</select>
                <label htmlFor="page-limit" className="block text-sm">Maximum pages (1–10)</label><input id="page-limit" type="number" min={1} max={10} className={field} value={maxPages} onChange={event => setMaxPages(Number(event.target.value))} required />
                <button type="submit" className={`${button} block`} disabled={!!busy}>QUEUE COLLECTION</button>
              </form>
            </div>
          </div>
          <div className="bg-white border overflow-auto"><div className="p-5 flex justify-between"><h2 className="font-playfair text-xl">Import history</h2><button className="text-sm underline" onClick={() => { void load(); }}>Refresh</button></div><table className="w-full text-sm"><thead className="bg-neutral-100 text-left"><tr>{['Retailer / run', 'Status', 'Offers saved / found', 'Result'].map(title => <th key={title} className="p-4 font-medium">{title}</th>)}</tr></thead><tbody>
            {!jobs.length && <tr><td className="p-10 text-center text-neutral-500" colSpan={4}>{loading ? 'Loading…' : 'No import jobs yet.'}</td></tr>}
            {jobs.map(job => <tr key={job.jobId} className="border-t align-top"><td className="p-4">{job.retailer}<p className="text-xs text-neutral-500">{job.sourceType || 'scrape'} · {new Date(job.createdAt).toLocaleString()}</p><p className="text-xs text-neutral-400">{job.jobId.slice(0, 8)}</p></td><td className={`p-4 ${job.status === 'failed' ? 'text-red-700' : ''}`}>{job.status}</td><td className="p-4">{job.productsSaved} / {job.productsFound}<p className="text-xs text-neutral-500">{job.pagesVisited || 0} public pages</p></td><td className="p-4 max-w-lg text-xs text-neutral-600">{job.truncated && <p className="text-amber-800">Page limit reached; coverage is partial.</p>}{job.errorMessages.map((message, index) => <p key={index}>{message}</p>)}</td></tr>)}
          </tbody></table></div>
        </>}

        {tab === 'orders' && <div className="bg-white border overflow-auto"><table className="w-full text-sm"><thead className="bg-neutral-100 text-left"><tr>{['Order', 'Customer', 'Total', 'Payment', 'Fulfillment'].map(title => <th key={title} className="p-4 font-medium">{title}</th>)}</tr></thead><tbody>{!orders.length && <tr><td colSpan={5} className="p-10 text-center text-neutral-500">{loading ? 'Loading…' : 'No direct orders. Purchases from retailer links are completed with the retailer.'}</td></tr>}{orders.map(order => <tr key={order._id} className="border-t"><td className="p-4">{order.orderNumber}<p className="text-xs text-neutral-500">{new Date(order.createdAt).toLocaleString()}</p></td><td className="p-4">{order.customer?.email}</td><td className="p-4">{money(order.total)}</td><td className="p-4">{order.paymentStatus}</td><td className="p-4">{order.fulfillmentStatus}</td></tr>)}</tbody></table></div>}
        <div className="flex items-center justify-between text-sm"><p className="text-neutral-500">{total} {tab === 'inventory' ? 'products' : tab === 'imports' ? 'jobs' : 'orders'}</p><div className="flex items-center gap-4"><button className={field} disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><span>{page} / {Math.max(1, pages)}</span><button className={field} disabled={page >= pages || loading} onClick={() => setPage(value => value + 1)}>Next</button></div></div>
      </div>
    </div>
  );
}
