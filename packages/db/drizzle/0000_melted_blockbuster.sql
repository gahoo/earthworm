CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text(256) NOT NULL,
	`description` text DEFAULT '',
	`video` text DEFAULT '',
	`order` integer NOT NULL,
	`course_pack_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`course_pack_id`) REFERENCES `course_packs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `course_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_id` text NOT NULL,
	`course_pack_id` text NOT NULL,
	`completion_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `course_packs` (
	`id` text PRIMARY KEY NOT NULL,
	`order` integer NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '',
	`is_free` integer,
	`cover` text,
	`creator_id` text NOT NULL,
	`share_level` text DEFAULT 'private',
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `statements` (
	`id` text PRIMARY KEY NOT NULL,
	`order` integer NOT NULL,
	`chinese` text NOT NULL,
	`english` text NOT NULL,
	`soundmark` text NOT NULL,
	`course_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_learn_record` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`day` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `user_course_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`course_pack_id` text NOT NULL,
	`course_id` text NOT NULL,
	`statement_index` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`isActive` integer DEFAULT true,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`type` text DEFAULT 'regular' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_learning_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`activity_type` text NOT NULL,
	`course_id` text,
	`duration` integer NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `mastered_elements` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	`mastered_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `course_history_user_id_course_id_course_pack_id_unique` ON `course_history` (`user_id`,`course_id`,`course_pack_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_learn_record_user_id_day_unique` ON `user_learn_record` (`user_id`,`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_course_progress_user_id_course_pack_id_unique` ON `user_course_progress` (`user_id`,`course_pack_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_learning_activities_user_id_date_activity_type_unique` ON `user_learning_activities` (`user_id`,`date`,`activity_type`);