import { desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { favoritePeople } from '@/db/schema';

export interface FavoritePersonInput {
  tmdbPersonId: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null;
}

export async function isFavoritePerson(tmdbPersonId: number) {
  const rows = await db
    .select({ id: favoritePeople.id })
    .from(favoritePeople)
    .where(eq(favoritePeople.tmdbPersonId, tmdbPersonId))
    .limit(1);
  return rows.length > 0;
}

export async function addFavoritePerson(person: FavoritePersonInput) {
  await db
    .insert(favoritePeople)
    .values(person)
    .onConflictDoUpdate({
      target: favoritePeople.tmdbPersonId,
      set: { name: person.name, profilePath: person.profilePath, knownForDepartment: person.knownForDepartment },
    });
}

export async function removeFavoritePerson(tmdbPersonId: number) {
  await db.delete(favoritePeople).where(eq(favoritePeople.tmdbPersonId, tmdbPersonId));
}

export async function countFavoritePeople() {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(favoritePeople);
  return row?.count ?? 0;
}

export async function listFavoritePeople() {
  return db.select().from(favoritePeople).orderBy(desc(favoritePeople.addedAt));
}
