import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const mediaTypeValues = ['movie', 'tv'] as const;
export type MediaType = (typeof mediaTypeValues)[number];

export const libraryStatusValues = ['to_watch', 'watching', 'completed', 'dropped'] as const;
export type LibraryStatus = (typeof libraryStatusValues)[number];

export const titles = sqliteTable(
  'titles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tmdbId: integer('tmdb_id').notNull(),
    mediaType: text('media_type').$type<MediaType>().notNull(),
    isAnime: integer('is_anime', { mode: 'boolean' }).notNull().default(false),
    name: text('name').notNull(),
    overview: text('overview'),
    posterPath: text('poster_path'),
    backdropPath: text('backdrop_path'),
    releaseDate: text('release_date'),
    runtime: integer('runtime'),
    genres: text('genres', { mode: 'json' }).$type<string[]>(),
    statusTmdb: text('status_tmdb'),
    updatedAt: integer('updated_at').notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => [uniqueIndex('titles_tmdb_unique').on(table.tmdbId, table.mediaType)],
);

export const seasons = sqliteTable(
  'seasons',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    titleId: integer('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),
    seasonNumber: integer('season_number').notNull(),
    name: text('name'),
    episodeCount: integer('episode_count').notNull().default(0),
    airDate: text('air_date'),
    posterPath: text('poster_path'),
  },
  (table) => [uniqueIndex('seasons_title_number_unique').on(table.titleId, table.seasonNumber)],
);

export const episodes = sqliteTable(
  'episodes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    seasonId: integer('season_id')
      .notNull()
      .references(() => seasons.id, { onDelete: 'cascade' }),
    episodeNumber: integer('episode_number').notNull(),
    name: text('name'),
    overview: text('overview'),
    airDate: text('air_date'),
    runtime: integer('runtime'),
    stillPath: text('still_path'),
  },
  (table) => [uniqueIndex('episodes_season_number_unique').on(table.seasonId, table.episodeNumber)],
);

export const libraryItems = sqliteTable(
  'library_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    titleId: integer('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),
    status: text('status').$type<LibraryStatus>().notNull().default('to_watch'),
    addedAt: integer('added_at').notNull().default(sql`(unixepoch() * 1000)`),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    /** Films uniquement (pas de découpage en épisodes) : date du dernier visionnage. */
    watchedAt: integer('watched_at'),
    rewatchCount: integer('rewatch_count').notNull().default(0),
  },
  (table) => [uniqueIndex('library_items_title_unique').on(table.titleId)],
);

/** Single-row table (id always 1) holding local, non-sensitive profile info such as the imported pseudo. */
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pseudo: text('pseudo'),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch() * 1000)`),
});

export const importFailureKindValues = ['tv', 'movie'] as const;
export type ImportFailureKind = (typeof importFailureKindValues)[number];

/** Titres qu'on n'a pas su rattacher à TMDB (ou qu'on a volontairement ignorés) pendant un import — pour pouvoir les retrouver et les traiter à part. */
export const importFailures = sqliteTable('import_failures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  displayName: text('display_name').notNull(),
  kind: text('kind').$type<ImportFailureKind>().notNull(),
  /** JSON-serialized ImportCandidate (episode watches, follow/for-later/archived flags, dates…) so a manual match can replay the real history instead of adding an empty title. */
  payload: text('payload'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
});

export const watchedEpisodes = sqliteTable(
  'watched_episodes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    titleId: integer('title_id')
      .notNull()
      .references(() => titles.id, { onDelete: 'cascade' }),
    episodeId: integer('episode_id')
      .notNull()
      .references(() => episodes.id, { onDelete: 'cascade' }),
    watchedAt: integer('watched_at').notNull(),
    rewatchCount: integer('rewatch_count').notNull().default(0),
  },
  (table) => [uniqueIndex('watched_episodes_title_episode_unique').on(table.titleId, table.episodeId)],
);
