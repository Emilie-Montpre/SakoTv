CREATE TABLE `profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pseudo` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
