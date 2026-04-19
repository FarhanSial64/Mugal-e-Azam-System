import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongoState = globalThis.__mugalMongoState || (globalThis.__mugalMongoState = {
  server: null,
});

beforeAll(async () => {
  if (!mongoState.server) {
    mongoState.server = await MongoMemoryServer.create();
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoState.server.getUri());
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1 && process.platform !== 'win32') {
    try {
      await mongoose.connection.dropDatabase();
    } catch (error) {
      // Ignore teardown failures on Windows where MongoMemoryServer may already be terminating.
    }

    try {
      await mongoose.connection.close();
    } catch (error) {
      // Ignore teardown failures so the test run can complete cleanly.
    }
  }

  if (mongoState.server && process.platform !== 'win32') {
    try {
      await mongoState.server.stop();
    } catch (error) {
      // Ignore MongoMemoryServer EPERM cleanup errors on Windows.
    }
  }
});