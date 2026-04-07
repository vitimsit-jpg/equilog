// ─── Offline Mutation Queue (IndexedDB) ──────────────────────────────────────
// Stores pending Supabase inserts when the device is offline.
// The ServiceWorkerRegistrar flushes this queue when connectivity resumes.
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'equistra_offline';
const DB_VERSION = 1;
const STORE = 'mutations';

export type OfflineMutation = {
  id: string;         // uuid, generated client-side
  table: string;      // supabase table name
  method: 'insert';   // only inserts for now
  payload: Record<string, unknown>;
  queuedAt: number;   // timestamp ms
};

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(mutation: Omit<OfflineMutation, 'id' | 'queuedAt'>): Promise<string> {
  const id = crypto.randomUUID();
  const entry: OfflineMutation = { ...mutation, id, queuedAt: Date.now() };
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(entry);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAll(): Promise<OfflineMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function count(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result ?? 0);
    req.onerror = () => reject(req.error);
  });
}

// ── Flush — called by ServiceWorkerRegistrar when online ──────────────────────
export async function flushQueue(
  supabase: ReturnType<typeof import('@/lib/supabase/client').createClient>
): Promise<number> {
  const pending = await getAll();
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const mutation of pending) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from as any)(mutation.table).insert(mutation.payload);
      if (!error) {
        await remove(mutation.id);
        synced++;
      }
    } catch {
      // Leave failed mutations in the queue to retry later
    }
  }
  return synced;
}
