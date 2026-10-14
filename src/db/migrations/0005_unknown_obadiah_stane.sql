CREATE TABLE `favorite_people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdb_person_id` integer NOT NULL,
	`name` text NOT NULL,
	`profile_path` text,
	`known_for_department` text,
	`added_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `favorite_people_tmdb_person_id_unique` ON `favorite_people` (`tmdb_person_id`);