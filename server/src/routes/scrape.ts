import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ScrapeJob } from '../models/ScrapeJob';
import { Product } from '../models/Product';
import { SaksScraper } from '../scrapers/saks';
import { NeimanScraper } from '../scrapers/neiman';
import { NordstromScraper } from '../scrapers/nordstrom';

const router = express.Router();

// Map of scraper instances
const scrapers: Record<string, any> = {
  saks: new SaksScraper(),
  neiman: new NeimanScraper(),
  nordstrom: new NordstromScraper(),
  bloomingdales: null,
};

// GET /api/scrape/jobs - List scrape jobs with pagination
router.get('/jobs', async (req, res) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;
    
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    
    const total = await ScrapeJob.countDocuments(filter);
    const jobs = await ScrapeJob.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();
    
    res.json({
      jobs,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching scrape jobs:', error);
    res.status(500).json({ error: 'Failed to fetch scrape jobs' });
  }
});

// GET /api/scrape/jobs/:id - Get single scrape job
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await ScrapeJob.findOne({ jobId: req.params.id }).lean();
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/scrape - Trigger a new scrape job
router.post('/', async (req, res) => {
  const { retailer, category, url } = req.body;
  
  if (!retailer) {
    return res.status(400).json({ error: 'Retailer is required' });
  }
  
  const validRetailers = ['saks', 'neiman', 'nordstrom', 'bloomingdales'];
  if (!validRetailers.includes(retailer)) {
    return res.status(400).json({ error: `Invalid retailer. Must be one of: ${validRetailers.join(', ')}` });
  }
  
  try {
    const jobId = uuidv4();
    const job = new ScrapeJob({
      jobId,
      retailer,
      category,
      url,
      status: 'pending',
      productsFound: 0,
      productsSaved: 0,
      errorMessages: [],
    });
    await job.save();
    
    runScrapeJob(jobId, retailer, category, url);
    
    res.status(202).json({
      jobId,
      status: 'pending',
      message: 'Scrape job started',
    });
  } catch (error: any) {
    console.error('Error starting scrape job:', error);
    res.status(500).json({ error: error.message || 'Failed to start scrape job' });
  }
});

// POST /api/scrape/run - Run scrape synchronously (for testing)
router.post('/run', async (req, res) => {
  const { retailer, category, url } = req.body;
  
  if (!retailer) {
    return res.status(400).json({ error: 'Retailer is required' });
  }
  
  try {
    const jobId = uuidv4();
    const job = new ScrapeJob({
      jobId,
      retailer,
      category,
      url,
      status: 'running',
      productsFound: 0,
      productsSaved: 0,
      errorMessages: [],
      startedAt: new Date(),
    });
    await job.save();
    
    const result = await executeScrape(jobId, retailer, category, url);
    res.json(result);
  } catch (error: any) {
    console.error('Error running scrape:', error);
    res.status(500).json({ error: error.message || 'Scrape failed' });
  }
});

// DELETE /api/scrape/jobs/:id - Delete a scrape job
router.delete('/jobs/:id', async (req, res) => {
  try {
    await ScrapeJob.findOneAndDelete({ jobId: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

async function runScrapeJob(jobId: string, retailer: string, category?: string, url?: string) {
  try {
    await ScrapeJob.findOneAndUpdate(
      { jobId },
      { status: 'running', startedAt: new Date() }
    );
    
    await executeScrape(jobId, retailer, category, url);
  } catch (error: any) {
    console.error(`Scrape job ${jobId} failed:`, error);
    await ScrapeJob.findOneAndUpdate(
      { jobId },
      { 
        status: 'failed', 
        completedAt: new Date(),
        $push: { errorMessages: error.message || 'Unknown error' }
      }
    );
  }
}

async function executeScrape(jobId: string, retailer: string, category?: string, url?: string) {
  const scraper = scrapers[retailer];
  
  if (!scraper) {
    throw new Error(`Scraper for ${retailer} is not implemented`);
  }
  
  let productsFound = 0;
  let productsSaved = 0;
  const errorMessages: string[] = [];
  
  try {
    const products = await scraper.scrapeProducts(category || 'all', 1);
    productsFound = products.length;
    
    for (const productData of products) {
      try {
        const existing = await Product.findOne({ sku: productData.sku });
        
        if (existing) {
          await Product.findByIdAndUpdate(existing._id, {
            ...productData,
            lastScraped: new Date(),
            updatedAt: new Date(),
          });
        } else {
          const product = new Product({
            ...productData,
            lastScraped: new Date(),
          });
          await product.save();
        }
        productsSaved++;
      } catch (err: any) {
        errorMessages.push(`Failed to save product ${productData.sku}: ${err.message}`);
      }
    }
    
    await ScrapeJob.findOneAndUpdate(
      { jobId },
      {
        status: errorMessages.length > 0 && productsSaved === 0 ? 'failed' : 'completed',
        productsFound,
        productsSaved,
        errorMessages,
        completedAt: new Date(),
      }
    );
    
    return {
      jobId,
      status: errorMessages.length > 0 && productsSaved === 0 ? 'failed' : 'completed',
      productsFound,
      productsSaved,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    };
  } catch (error: any) {
    await ScrapeJob.findOneAndUpdate(
      { jobId },
      {
        status: 'failed',
        productsFound,
        productsSaved,
        errorMessages: [...errorMessages, error.message || 'Unknown error'],
        completedAt: new Date(),
      }
    );
    throw error;
  }
}

export default router;
