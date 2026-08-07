import type { OfflineQueueItem } from "@/pwa/types";

const DB_NAME = "watchbox-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "pending-writes";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp");
        store.createIndex("userId", "userId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueue(item: Omit<OfflineQueueItem, "id" | "timestamp" | "retryCount"> & { userId: string }): Promise<string> {
  const db = await openDB();
  const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const record: OfflineQueueItem & { userId: string } = {
    ...item,
    id,
    timestamp: Date.now(),
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(record);
    tx.oncomplete = () => {
      db.close();
      resolve(id);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getAll(): Promise<(OfflineQueueItem & { userId: string })[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).index("timestamp").getAll();
    request.onsuccess = () => {
      db.close();
      resolve(request.result as (OfflineQueueItem & { userId: string })[]);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function getByUser(userId: string): Promise<(OfflineQueueItem & { userId: string })[]> {
  const all = await getAll();
  return all.filter((item) => item.userId === userId);
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function clearByUser(userId: string): Promise<void> {
  const items = await getByUser(userId);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const item of items) {
      store.delete(item.id);
    }
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getStats(): Promise<{ total: number; byAction: Record<string, number> }> {
  const items = await getAll();
  const byAction: Record<string, number> = {};
  for (const item of items) {
    byAction[item.action] = (byAction[item.action] || 0) + 1;
  }
  return { total: items.length, byAction };
}
