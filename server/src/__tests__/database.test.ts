import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import mongoose from 'mongoose';
import { createDatabaseInitializer, databaseConnectionOptions, databaseUri, initializeModelIndexes } from '../database';
import { Cart } from '../models/Cart';
import { PriceHistory } from '../models/PriceHistory';

const savedEnv = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test('concurrent cold requests share a connection and wait for required indexes', async () => {
  const connection = deferred();
  const indexes = deferred();
  let state = 0;
  let connections = 0;
  let indexInitializations = 0;
  const database = createDatabaseInitializer({
    readyState: () => state,
    connect: async () => { connections++; await connection.promise; state = 1; },
    initializeIndexes: async () => { indexInitializations++; await indexes.promise; },
  });
  const first = database.initialize();
  const second = database.initialize();
  assert.equal(first, second);
  await setImmediate();
  assert.equal(connections, 1);
  assert.equal(indexInitializations, 0);
  assert.equal(database.isReady(), false);

  connection.resolve();
  await setImmediate();
  assert.equal(state, 1);
  assert.equal(indexInitializations, 1);
  assert.equal(database.isReady(), false, 'an open connection without unique indexes is not ready');

  indexes.resolve();
  await Promise.all([first, second]);
  await Promise.all(Array.from({ length: 20 }, () => database.initialize()));
  assert.equal(database.isReady(), true);
  assert.equal(connections, 1);
  assert.equal(indexInitializations, 1);
});

test('failed connection is retried after backoff instead of caching rejection forever', async () => {
  let time = 0;
  let state = 0;
  let attempts = 0;
  let indexes = 0;
  const database = createDatabaseInitializer({
    now: () => time,
    retryDelayMs: 100,
    readyState: () => state,
    connect: async () => {
      if (++attempts === 1) throw new Error('Temporary network failure');
      state = 1;
    },
    initializeIndexes: async () => { indexes++; },
  });
  await assert.rejects(database.initialize(), /Temporary network failure/);
  await assert.rejects(database.initialize(), /Temporary network failure/);
  assert.equal(attempts, 1, 'requests during backoff must not start a connection storm');
  assert.equal(indexes, 0);
  assert.equal(database.isReady(), false);
  time = 100;
  await Promise.all([database.initialize(), database.initialize()]);
  assert.equal(attempts, 2);
  assert.equal(indexes, 1);
  assert.equal(database.isReady(), true);
});

test('failed index initialization blocks readiness and retries using the existing connection', async () => {
  let state = 0;
  let time = 0;
  let connections = 0;
  let indexes = 0;
  const database = createDatabaseInitializer({
    readyState: () => state,
    now: () => time,
    retryDelayMs: 100,
    connect: async () => { connections++; state = 1; },
    initializeIndexes: async () => {
      if (++indexes === 1) throw new Error('Index initialization failed');
    },
  });
  await assert.rejects(database.initialize(), /Index initialization failed/);
  assert.equal(database.isReady(), false);
  await assert.rejects(database.initialize(), /Index initialization failed/);
  assert.equal(indexes, 1);
  time = 100;
  await database.initialize();
  assert.equal(database.isReady(), true);
  assert.equal(connections, 1);
  assert.equal(indexes, 2);
});

test('temporary loss of a warm connection fails closed without opening another pool', async () => {
  let state = 0;
  let connections = 0;
  let indexes = 0;
  const database = createDatabaseInitializer({
    readyState: () => state,
    connect: async () => { connections++; state = 1; },
    initializeIndexes: async () => { indexes++; },
  });
  await database.initialize();
  state = 0;
  assert.equal(database.isReady(), false);
  await assert.rejects(database.initialize(), /temporarily unavailable/);
  assert.equal(connections, 1);
  state = 1; // The MongoDB driver's existing client reconnected.
  await database.initialize();
  assert.equal(database.isReady(), true);
  assert.equal(connections, 1);
  assert.equal(indexes, 1);
});

test('Vercel fails closed without database and storefront configuration even outside NODE_ENV production', () => {
  process.env.NODE_ENV = 'development';
  process.env.VERCEL = '1';
  delete process.env.MONGODB_URI;
  assert.throws(databaseUri, /MONGODB_URI is required/);
  process.env.MONGODB_URI = 'mongodb://example.invalid/offline-test';
  delete process.env.CORS_ORIGINS;
  delete process.env.APP_URL;
  assert.throws(databaseUri, /CORS_ORIGINS or APP_URL is required/);
  process.env.APP_URL = 'https://shop.example.com';
  assert.equal(databaseUri(), process.env.MONGODB_URI);
});

test('isolated MongoDB index failure preserves records and existing indexes, then recovers', {
  skip: process.env.RUN_MONGO_TESTS !== '1', timeout: 180000,
}, async () => {
  // Always create our own localhost server. Never read or connect to MONGODB_URI.
  assert.equal(mongoose.connection.readyState, 0);
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const local = await MongoMemoryServer.create({
    binary: { downloadDir: process.env.MONGOMS_DOWNLOAD_DIR || join(tmpdir(), 'dirtyapple-mongodb-binaries') },
    instance: { ip: '127.0.0.1', dbName: 'dirtyapple_startup_integration' },
  });
  try {
    await mongoose.connect(local.getUri(), databaseConnectionOptions);
    const inserted = await Cart.collection.insertMany([
      { sessionHash: 'duplicate-test-session', items: [], expiresAt: new Date(Date.now() + 86400000) },
      { sessionHash: 'duplicate-test-session', items: [], expiresAt: new Date(Date.now() + 86400000) },
    ]);
    await Cart.collection.createIndex({ 'items.productId': 1 }, { name: 'existing_custom_index' });
    const database = createDatabaseInitializer({
      readyState: () => mongoose.connection.readyState,
      connect: async () => { throw new Error('The existing local connection must be reused'); },
      initializeIndexes: initializeModelIndexes,
      retryDelayMs: 0,
    });
    await assert.rejects(database.initialize(), (error: unknown) => (error as { code?: number }).code === 11000);
    assert.equal(database.isReady(), false);
    assert.equal(await Cart.countDocuments(), 2, 'failed unique-index creation must not remove records');
    assert.ok((await Cart.collection.indexes()).some(index => index.name === 'existing_custom_index'));

    // Repair only the deliberately duplicated fixture in this disposable database.
    await Cart.collection.deleteOne({ _id: inserted.insertedIds[1] });
    await database.initialize();
    assert.equal(database.isReady(), true);
    assert.equal(await Cart.countDocuments(), 1);
    const cartIndexes = await Cart.collection.indexes();
    assert.ok(cartIndexes.some(index => index.key.sessionHash === 1 && index.unique === true));
    assert.ok(cartIndexes.some(index => index.name === 'existing_custom_index'));
    assert.ok((await PriceHistory.collection.indexes()).some(index => index.key.product === 1 && index.key.recordedAt === -1));
  } finally {
    await mongoose.disconnect();
    await local.stop();
  }
});
