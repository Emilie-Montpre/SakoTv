import { db } from '@/db/client';
import { importFailures, profile, titles } from '@/db/schema';

/** Wipes everything local: titles cascade-delete seasons/episodes/library_items/watched_episodes; profile and import failures are cleared separately. */
export async function resetAllData() {
  await db.delete(titles);
  await db.delete(profile);
  await db.delete(importFailures);
}
