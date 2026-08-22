import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const sqliteDb = openDatabaseSync('sako-tv.db', { enableChangeListener: true });

// SQLite ignores "on delete cascade" unless this is set per connection — without it, deleting a title
// would leave orphaned seasons/episodes/library_items/watched_episodes behind.
sqliteDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqliteDb, { schema });
