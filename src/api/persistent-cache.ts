const KEY_PREFIX = 'api-cache:';

type CacheEntry<T> = { fetchedAt: number; data: T };

async function getStorage() {
  try {
    return (await import('expo-sqlite/kv-store')).default;
  } catch {
    return null;
  }
}

async function readEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const storage = await getStorage();
    const raw = storage ? await storage.getItemAsync(KEY_PREFIX + key) : null;
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

async function writeEntry<T>(key: string, data: T) {
  try {
    const storage = await getStorage();
    if (!storage) return;
    await storage.setItemAsync(KEY_PREFIX + key, JSON.stringify({ fetchedAt: Date.now(), data } satisfies CacheEntry<T>));
  } catch {}
}

export async function cachedFetch<T>(key: string, maxAgeMs: number, fetcher: () => Promise<T>): Promise<T> {
  const entry = await readEntry<T>(key);
  if (entry && Date.now() - entry.fetchedAt < maxAgeMs) return entry.data;

  try {
    const data = await fetcher();
    await writeEntry(key, data);
    return data;
  } catch (error) {
    if (entry) return entry.data;
    throw error;
  }
}

export type QuotaInfo = { used: number; granted: number; reset: string | null; at: number };

export async function saveQuota(name: string, info: QuotaInfo) {
  try {
    const storage = await getStorage();
    await storage?.setItemAsync(`api-quota:${name}`, JSON.stringify(info));
  } catch {}
}

export async function readQuota(name: string): Promise<QuotaInfo | null> {
  try {
    const storage = await getStorage();
    const raw = storage ? await storage.getItemAsync(`api-quota:${name}`) : null;
    return raw ? (JSON.parse(raw) as QuotaInfo) : null;
  } catch {
    return null;
  }
}
