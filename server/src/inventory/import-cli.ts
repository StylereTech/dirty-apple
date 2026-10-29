import 'dotenv/config';
import { readFile, stat } from 'node:fs/promises';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { isRetailerId } from './retailers';
import { previewOffers } from './normalize';
import { importOffers } from './importer';

async function main() {
  const args = process.argv.slice(2);
  const value = (flag: string) => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1]; };
  const retailer = value('--retailer');
  const filename = value('--file');
  if (!isRetailerId(retailer) || !filename) throw new Error('Usage: npm run inventory:import -- --retailer mrporter --file offers.json [--commit]');
  if ((await stat(filename)).size > 50_000_000) throw new Error('Split feed files larger than 50 MB');
  const raw = JSON.parse(await readFile(filename, 'utf8'));
  const records = Array.isArray(raw) ? raw : raw.records;
  if (!Array.isArray(records) || records.length === 0 || records.length > 50_000) throw new Error('Feed must contain 1–50,000 normalized offers');
  // Validate the entire input before the first write; batch limits do not truncate large feeds.
  const batches: unknown[][] = [];
  let errors = 0, saleOffers = 0;
  for (let offset = 0; offset < records.length; offset += 500) {
    const batch = records.slice(offset, offset + 500);
    const preview = previewOffers(batch, retailer);
    saleOffers += preview.saleOffers;
    for (const issue of preview.errors) { console.error(`Row ${offset + issue.row}: ${issue.error}`); errors++; }
    batches.push(batch);
  }
  const identities = new Set<string>();
  for (const record of records) {
    const identity = JSON.stringify([record?.externalProductId, record?.variantId || '']);
    if (identities.has(identity)) { console.error('Repeated retailer/product/variant identity across feed batches'); errors++; }
    identities.add(identity);
  }
  console.log(JSON.stringify({ records: records.length, saleOffers, invalid: errors, mode: args.includes('--commit') ? 'commit' : 'preview' }));
  if (errors) throw new Error('Feed validation failed; nothing imported');
  if (!args.includes('--commit')) return;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required to commit an import');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await Product.init();
    for (const batch of batches) {
      const result = await importOffers(batch, retailer);
      console.log(JSON.stringify(result));
      if (result.errors.length || result.failures.length) throw new Error('Import partially failed; inspect summary and retry safely');
    }
  } finally { await mongoose.disconnect(); }
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Import failed'); process.exitCode = 1; });
