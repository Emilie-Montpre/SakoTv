CREATE TABLE `episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`episode_number` integer NOT NULL,
	`name` text,
	`overview` text,
	`air_date` text,
	`runtime` integer,
	`still_path` text,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episodes_season_number_unique` ON `episodes` (`season_id`,`episode_number`);--> statement-breakpoint
CREATE TABLE `library_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_id` integer NOT NULL,
	`status` text DEFAULT 'to_watch' NOT NULL,
	`added_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`is_favorite` integer DEFAULT false NOT NULL,
	`watched_at` integer,
	`rewatch_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`title_id`) REFERENCES `titles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `library_items_title_unique` ON `library_items` (`title_id`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_id` integer NOT NULL,
	`season_number` integer NOT NULL,
	`name` text,
	`episode_count` integer DEFAULT 0 NOT NULL,
	`air_date` text,
	`poster_path` text,
	FOREIGN KEY (`title_id`) REFERENCES `titles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_title_number_unique` ON `seasons` (`title_id`,`season_number`);--> statement-breakpoint
CREATE TABLE `titles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tmdb_id` integer NOT NULL,
	`media_type` text NOT NULL,
	`is_anime` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`overview` text,
	`poster_path` text,
	`backdrop_path` text,
	`release_date` text,
	`runtime` integer,
	`genres` text,
	`status_tmdb` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `titles_tmdb_unique` ON `titles` (`tmdb_id`,`media_type`);--> statement-breakpoint
CREATE TABLE `watched_episodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title_id` integer NOT NULL,
	`episode_id` integer NOT NULL,
	`watched_at` integer NOT NULL,
	`rewatch_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`title_id`) REFERENCES `titles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watched_episodes_title_episode_unique` ON `watched_episodes` (`title_id`,`episode_id`);