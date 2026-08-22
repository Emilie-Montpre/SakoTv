import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { profile } from '@/db/schema';

export async function getPseudo(): Promise<string | null> {
  const row = await db.query.profile.findFirst({ where: eq(profile.id, 1) });
  return row?.pseudo ?? null;
}

export async function setPseudo(pseudo: string) {
  const existing = await db.query.profile.findFirst({ where: eq(profile.id, 1) });
  if (existing) {
    await db.update(profile).set({ pseudo, updatedAt: Date.now() }).where(eq(profile.id, 1));
  } else {
    await db.insert(profile).values({ id: 1, pseudo });
  }
}
