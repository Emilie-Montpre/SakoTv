import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { customListItems, customLists, titles } from '@/db/schema';
import type { MediaType } from '@/db/schema';

export const LIST_PREVIEW_POSTERS = 4;

export interface CustomListSummary {
  id: number;
  name: string;
  count: number;
  posters: (string | null)[];
}

export async function listCustomLists(): Promise<CustomListSummary[]> {
  const lists = await db.select().from(customLists).orderBy(customLists.id);

  const items = await db
    .select({ listId: customListItems.listId, posterPath: titles.posterPath })
    .from(customListItems)
    .innerJoin(titles, eq(customListItems.titleId, titles.id))
    .orderBy(desc(customListItems.id));

  return lists.map((list) => {
    const own = items.filter((item) => item.listId === list.id);
    return {
      id: list.id,
      name: list.name,
      count: own.length,
      posters: own.slice(0, LIST_PREVIEW_POSTERS).map((item) => item.posterPath),
    };
  });
}

export async function countCustomLists() {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(customLists);
  return row?.count ?? 0;
}

export async function getCustomListName(listId: number) {
  const [row] = await db.select({ name: customLists.name }).from(customLists).where(eq(customLists.id, listId)).limit(1);
  return row?.name ?? 'Liste';
}

export async function getListIdsForTitle(titleId: number) {
  const rows = await db
    .select({ listId: customListItems.listId })
    .from(customListItems)
    .where(eq(customListItems.titleId, titleId));
  return rows.map((row) => row.listId);
}

export async function createCustomList(name: string) {
  const [created] = await db
    .insert(customLists)
    .values({ name: name.trim() })
    .returning({ id: customLists.id });
  return created.id;
}

export async function renameCustomList(listId: number, name: string) {
  await db.update(customLists).set({ name: name.trim() }).where(eq(customLists.id, listId));
}

export async function deleteCustomList(listId: number) {
  await db.delete(customLists).where(eq(customLists.id, listId));
}

export async function toggleTitleInList(listId: number, titleId: number) {
  const condition = and(eq(customListItems.listId, listId), eq(customListItems.titleId, titleId));
  const existing = await db.select({ id: customListItems.id }).from(customListItems).where(condition).limit(1);

  if (existing.length > 0) {
    await db.delete(customListItems).where(condition);
    return;
  }
  await db.insert(customListItems).values({ listId, titleId });
}

export async function addTitleToList(listId: number, titleId: number) {
  await db.insert(customListItems).values({ listId, titleId }).onConflictDoNothing();
}

export async function removeTitleFromList(listId: number, titleId: number) {
  await db
    .delete(customListItems)
    .where(and(eq(customListItems.listId, listId), eq(customListItems.titleId, titleId)));
}

export interface CustomListTitle {
  titleId: number;
  tmdbId: number;
  mediaType: MediaType;
  isAnime: boolean;
  name: string;
  posterPath: string | null;
}

export async function listCustomListTitles(listId: number): Promise<CustomListTitle[]> {
  return db
    .select({
      titleId: titles.id,
      tmdbId: titles.tmdbId,
      mediaType: titles.mediaType,
      isAnime: titles.isAnime,
      name: titles.name,
      posterPath: titles.posterPath,
    })
    .from(customListItems)
    .innerJoin(titles, eq(customListItems.titleId, titles.id))
    .where(eq(customListItems.listId, listId))
    .orderBy(desc(customListItems.id));
}
