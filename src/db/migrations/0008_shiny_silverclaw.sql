CREATE TABLE `episode_imported_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`episode_id` integer NOT NULL,
	`kind` text NOT NULL,
	`code` integer NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `episode_imported_votes_unique` ON `episode_imported_votes` (`episode_id`,`kind`,`code`);