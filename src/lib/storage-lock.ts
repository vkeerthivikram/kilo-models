const LOCK_STORE = "locks";
const LOCK_TIMEOUT_MS = 8000;
let fallbackDatabase: IDBDatabase | undefined;

export class StorageLockTimeoutError extends Error {
  constructor() {
    super("Browser storage is busy. Try again in a moment.");
  }
}

function openFallbackDatabase(signal: AbortSignal): Promise<IDBDatabase> {
  if (fallbackDatabase) return Promise.resolve(fallbackDatabase);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("kilo-models-storage-locks", 1);
    let stopped = false;
    function fail(error: unknown) {
      stopped = true;
      signal.removeEventListener("abort", abort);
      reject(error);
    }
    const abort = () => fail(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    request.onupgradeneeded = () => {
      if (stopped) request.transaction?.abort();
      else request.result.createObjectStore(LOCK_STORE);
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new Error("The storage lock database is blocked by another tab."));
    request.onsuccess = () => {
      signal.removeEventListener("abort", abort);
      const database = request.result;
      if (stopped || fallbackDatabase) {
        database.close();
        if (!stopped && fallbackDatabase) resolve(fallbackDatabase);
        return;
      }
      const forget = () => {
        if (fallbackDatabase === database) fallbackDatabase = undefined;
      };
      database.onclose = forget;
      database.onversionchange = () => {
        database.close();
        forget();
      };
      fallbackDatabase = database;
      resolve(database);
    };
  });
}

function waitForTransaction<T>(database: IDBDatabase, key: string, update: () => T, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCK_STORE, "readwrite");
    const turn = transaction.objectStore(LOCK_STORE).get(key);
    const cleanup = () => signal.removeEventListener("abort", abort);
    function abort() {
      reject(signal.reason);
      // An independently failed transaction may already be ending.
      try { transaction.abort(); } catch {}
    }
    signal.addEventListener("abort", abort, { once: true });
    transaction.onabort = () => {
      cleanup();
      reject(transaction.error);
    };
    turn.onsuccess = () => {
      try { resolve(update()); } catch (error) { reject(error); } finally { cleanup(); }
    };
  });
}

/** Serialize localStorage read-modify-write operations across same-origin tabs. */
export async function withStorageLock<T>(key: string, update: () => T): Promise<T> {
  // The SDK proceeds after 15 seconds. Both opening and acquiring the lock share this deadline.
  const controller = new AbortController();
  const { signal } = controller;
  const deadline = performance.now() + LOCK_TIMEOUT_MS;
  const expire = () => controller.abort(new StorageLockTimeoutError());
  const timer = setTimeout(expire, LOCK_TIMEOUT_MS);
  function checkDeadline() {
    if (performance.now() >= deadline) expire();
    if (signal.aborted) throw signal.reason;
  }
  function updateInTime() {
    checkDeadline();
    return update();
  }
  try {
    if (navigator.locks) return await navigator.locks.request(key, { signal }, updateInTime);
    // A read-write transaction also serializes writes on insecure origins.
    const database = await openFallbackDatabase(signal);
    checkDeadline();
    return await waitForTransaction(database, key, updateInTime, signal);
  } catch (error) {
    throw signal.aborted ? signal.reason : error;
  } finally {
    clearTimeout(timer);
  }
}
