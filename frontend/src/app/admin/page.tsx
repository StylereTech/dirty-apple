'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || '';

interface ScrapeJob {
  jobId: string;
  retailer: string;
  category?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  productsFound: number;
  productsSaved: number;
  errorMessages: string[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  ourPrice: number;
  originalPrice: number;
  inStock: boolean;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'scrape' | 'products' | 'orders'>('scrape');
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [scrapeForm, setScrapeForm] = useState({ retailer: 'saks', category: '' });
  const [scrapeStatus, setScrapeStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (activeTab === 'products') fetchProducts();
  }, [activeTab]);

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API}/api/scrape/jobs?limit=50`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/products?limit=50`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setScrapeStatus(null);
    
    try {
      const res = await fetch(`${API}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailer: scrapeForm.retailer,
          category: scrapeForm.category || undefined,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setScrapeStatus({ type: 'success', message: `Job started: ${data.jobId}` });
        fetchJobs();
      } else {
        const err = await res.json();
        setScrapeStatus({ type: 'error', message: err.error || 'Failed to start job' });
      }
    } catch (error: any) {
      setScrapeStatus({ type: 'error', message: error.message });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 bg-neutral-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="font-inter text-xs tracking-[0.3em] text-gray-400 mb-2">ADMIN</p>
            <h1 className="font-playfair text-3xl md:text-4xl">Dashboard</h1>
          </div>
          <Link href="/" className="font-inter text-xs tracking-[0.2em] text-gray-500 hover:text-black">
            ← BACK TO SITE
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-gray-200">
          {(['scrape', 'products', 'orders'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-inter text-xs tracking-[0.2em] transition-colors ${
                activeTab === tab
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-600 hover:text-black border border-gray-200 border-b-0'
              }`}
            >
              {tab === 'scrape' && 'SCRAPE JOBS'}
              {tab === 'products' && 'PRODUCTS'}
              {tab === 'orders' && 'ORDERS'}
            </button>
          ))}
        </div>

        {/* Scrape Jobs Tab */}
        {activeTab === 'scrape' && (
          <div className="space-y-8">
            {/* Trigger New Scrape */}
            <div className="bg-white border border-gray-200 p-6">
              <h2 className="font-playfair text-xl mb-4">Trigger New Scrape</h2>
              <form onSubmit={handleScrape} className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block font-inter text-xs tracking-[0.2em] text-gray-500 mb-2">RETAILER</label>
                  <select
                    value={scrapeForm.retailer}
                    onChange={(e) => setScrapeForm({ ...scrapeForm, retailer: e.target.value })}
                    className="border border-gray-300 px-4 py-2 font-inter text-sm min-w-[150px]"
                  >
                    <option value="saks">Saks Fifth Avenue</option>
                    <option value="neiman">Neiman Marcus</option>
                    <option value="nordstrom">Nordstrom</option>
                    <option value="bloomingdales">Bloomingdale's</option>
                  </select>
                </div>
                <div>
                  <label className="block font-inter text-xs tracking-[0.2em] text-gray-500 mb-2">CATEGORY (OPTIONAL)</label>
                  <input
                    type="text"
                    value={scrapeForm.category}
                    onChange={(e) => setScrapeForm({ ...scrapeForm, category: e.target.value })}
                    placeholder="e.g., handbags"
                    className="border border-gray-300 px-4 py-2 font-inter text-sm min-w-[200px]"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-black text-white px-6 py-2 font-inter text-xs tracking-[0.2em] hover:bg-neutral-800"
                >
                  START SCRAPE
                </button>
              </form>
              {scrapeStatus && (
                <div className={`mt-4 p-3 font-inter text-sm ${
                  scrapeStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {scrapeStatus.message}
                </div>
              )}
            </div>

            {/* Jobs List */}
            <div className="bg-white border border-gray-200">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="font-playfair text-xl">Scrape Job History</h2>
                <button
                  onClick={fetchJobs}
                  className="font-inter text-xs tracking-[0.2em] text-gray-500 hover:text-black"
                >
                  REFRESH
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">JOB ID</th>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">RETAILER</th>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">STATUS</th>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">PRODUCTS</th>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">STARTED</th>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">COMPLETED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 font-inter">
                          No scrape jobs yet
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => (
                        <tr key={job.jobId} className="border-t border-gray-100">
                          <td className="p-4 font-inter text-xs text-gray-600">{job.jobId.slice(0, 8)}...</td>
                          <td className="p-4 font-inter text-sm">{job.retailer}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-2 px-2 py-1 font-inter text-xs text-white ${getStatusColor(job.status)}`}>
                              <span className={`w-2 h-2 rounded-full ${job.status === 'running' ? 'animate-pulse bg-white' : 'bg-white/50'}`} />
                              {job.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 font-inter text-sm">
                            {job.productsSaved} / {job.productsFound}
                          </td>
                          <td className="p-4 font-inter text-xs text-gray-500">
                            {job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}
                          </td>
                          <td className="p-4 font-inter text-xs text-gray-500">
                            {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="font-playfair text-xl">Product Inventory</h2>
              <button
                onClick={fetchProducts}
                className="font-inter text-xs tracking-[0.2em] text-gray-500 hover:text-black"
              >
                REFRESH
              </button>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-500 font-inter">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">PRODUCT</th>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">BRAND</th>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">PRICE</th>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">STOCK</th>
                      <th className="text-left font-inter text-xs tracking-[0.2em] text-gray-500 p-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500 font-inter">
                          No products in inventory
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product._id} className="border-t border-gray-100">
                          <td className="p-4">
                            <Link 
                              href={`/product/${product._id}`}
                              className="font-inter text-sm hover:underline"
                            >
                              {product.name}
                            </Link>
                          </td>
                          <td className="p-4 font-inter text-xs text-gray-500">{product.brand}</td>
                          <td className="p-4 font-inter text-sm">
                            ${product.ourPrice.toLocaleString()}
                            <span className="text-gray-400 line-through ml-2">${product.originalPrice.toLocaleString()}</span>
                          </td>
                          <td className="p-4">
                            <span className={`font-inter text-xs ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                              {product.inStock ? 'IN STOCK' : 'OUT OF STOCK'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`font-inter text-xs px-2 py-1 ${
                              product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {product.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="font-playfair text-xl">Orders</h2>
              <p className="font-inter text-sm text-gray-500">View orders by customer email</p>
            </div>
            <div className="p-8 text-center text-gray-500 font-inter">
              Use the API to fetch orders by customer email:
              <code className="block mt-4 p-4 bg-neutral-100 text-left text-xs">
                GET /api/orders/email/:email
              </code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
