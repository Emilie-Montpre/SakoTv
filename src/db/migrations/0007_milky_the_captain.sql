ALTER TABLE `episode_reactions` ADD `slot` integer;
--> statement-breakpoint
UPDATE `episode_reactions` SET `slot` = (SELECT count(*) FROM `episode_reactions` AS `r2` WHERE `r2`.`episode_id` = `episode_reactions`.`episode_id` AND `r2`.`id` <= `episode_reactions`.`id`) WHERE (SELECT count(*) FROM `episode_reactions` AS `r2` WHERE `r2`.`episode_id` = `episode_reactions`.`episode_id` AND `r2`.`id` <= `episode_reactions`.`id`) <= 3;
