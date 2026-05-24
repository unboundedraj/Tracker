import { MongoClient, type Db, type Collection } from "mongodb";
import type { HabitMonthDbDocument } from "@/types/habits";
import type { MiscTodoDbDocument } from "@/types/misc-todos";
import type { ShoppingItemDbDocument } from "@/types/shopping-list";

const DATABASE_NAME = process.env.MONGODB_DB ?? "tracker";
const COLLECTION_NAME = process.env.MONGODB_COLLECTION ?? "habit_months";
const MISC_TODOS_COLLECTION_NAME = "misc_todos";
const SHOPPING_LIST_COLLECTION_NAME = "shopping_list";

declare global {
  // eslint-disable-next-line no-var
  var __trackerMongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __trackerHabitMonthsIndexesReady: Promise<void> | undefined;
  // eslint-disable-next-line no-var
  var __trackerMiscTodosIndexesReady: Promise<void> | undefined;
  // eslint-disable-next-line no-var
  var __trackerShoppingListIndexesReady: Promise<void> | undefined;
}

function getMongoClientPromise(): Promise<MongoClient> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!globalThis.__trackerMongoClientPromise) {
    const client = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 10_000,
    });

    globalThis.__trackerMongoClientPromise = client.connect().catch((error) => {
      globalThis.__trackerMongoClientPromise = undefined;
      throw error;
    });
  }

  return globalThis.__trackerMongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClientPromise();
  return client.db(DATABASE_NAME);
}

export async function getHabitMonthsCollection(): Promise<Collection<HabitMonthDbDocument>> {
  const db = await getMongoDb();
  return db.collection<HabitMonthDbDocument>(COLLECTION_NAME);
}

export async function ensureHabitMonthsIndexes(): Promise<void> {
  if (!globalThis.__trackerHabitMonthsIndexesReady) {
    globalThis.__trackerHabitMonthsIndexesReady = (async () => {
      const collection = await getHabitMonthsCollection();
      await collection.createIndex({ monthKey: 1 }, { unique: true });
      await collection.createIndex({ monthStart: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });
    })().catch((error) => {
      globalThis.__trackerHabitMonthsIndexesReady = undefined;
      throw error;
    });
  }

  await globalThis.__trackerHabitMonthsIndexesReady;
}

export async function getMiscTodosCollection(): Promise<Collection<MiscTodoDbDocument>> {
  const db = await getMongoDb();
  return db.collection<MiscTodoDbDocument>(MISC_TODOS_COLLECTION_NAME);
}

export async function ensureMiscTodosIndexes(): Promise<void> {
  if (!globalThis.__trackerMiscTodosIndexesReady) {
    globalThis.__trackerMiscTodosIndexesReady = (async () => {
      const collection = await getMiscTodosCollection();
      await collection.createIndex({ createdAt: 1 });
      await collection.createIndex({ level: 1, sortOrder: -1 });
    })().catch((error) => {
      globalThis.__trackerMiscTodosIndexesReady = undefined;
      throw error;
    });
  }

  await globalThis.__trackerMiscTodosIndexesReady;
}

export async function getShoppingListCollection(): Promise<Collection<ShoppingItemDbDocument>> {
  const db = await getMongoDb();
  return db.collection<ShoppingItemDbDocument>(SHOPPING_LIST_COLLECTION_NAME);
}

export async function ensureShoppingListIndexes(): Promise<void> {
  if (!globalThis.__trackerShoppingListIndexesReady) {
    globalThis.__trackerShoppingListIndexesReady = (async () => {
      const collection = await getShoppingListCollection();
      await collection.createIndex({ createdAt: 1 });
      await collection.createIndex({ isCompleted: 1, sortOrder: -1 });
    })().catch((error) => {
      globalThis.__trackerShoppingListIndexesReady = undefined;
      throw error;
    });
  }

  await globalThis.__trackerShoppingListIndexesReady;
}