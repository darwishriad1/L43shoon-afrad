CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"soldier_id" text NOT NULL,
	"date" text NOT NULL,
	"status_code" text NOT NULL,
	"recorded_by" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text NOT NULL,
	"user_role" text NOT NULL,
	"action_type" text NOT NULL,
	"table_name" text NOT NULL,
	"details" text NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"soldier_id" text,
	"target_soldier_id" text,
	"military_number" text,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"type" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sick_leaves" (
	"id" text PRIMARY KEY NOT NULL,
	"soldier_id" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"illness_type" text NOT NULL,
	"duration" integer NOT NULL,
	"doctor_name" text NOT NULL,
	"status" text DEFAULT 'نشط' NOT NULL,
	"hospital" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "soldier_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"survey_id" text,
	"soldier_id" text NOT NULL,
	"soldier_name" text NOT NULL,
	"soldier_rank" text,
	"military_number" text,
	"unit_id" text,
	"request_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"proposed_data" text,
	"attachments" text,
	"status" text DEFAULT 'new' NOT NULL,
	"rejection_reason" text,
	"review_notes" text,
	"history_logs" text,
	"submitted_at" text NOT NULL,
	"reviewed_at" text,
	"reviewed_by" text
);
--> statement-breakpoint
CREATE TABLE "soldiers" (
	"id" text PRIMARY KEY NOT NULL,
	"military_number" text NOT NULL,
	"full_name" text NOT NULL,
	"rank" text NOT NULL,
	"unit_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"national_id" text,
	"birth_date" text,
	"blood_type" text,
	"phone_number" text,
	"address" text,
	"emergency_contact" text,
	"qualification" text,
	"specialization" text,
	"join_date" text,
	"battalion" text,
	"company" text,
	"platoon" text,
	"military_status" text DEFAULT 'على رأس العمل' NOT NULL,
	"medical_history" text,
	"promotion_history" text,
	"assignments_history" text,
	"custodies_history" text,
	"attachments" text,
	"photo_url" text,
	"has_account" boolean DEFAULT false,
	"account_username" text,
	"account_password" text,
	"assigned_tasks" text,
	"allow_profile_edit" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'تحديث بيانات' NOT NULL,
	"description" text NOT NULL,
	"instructions" text,
	"target_scope" text DEFAULT 'all' NOT NULL,
	"target_id" text,
	"deadline" text,
	"is_recurring" boolean DEFAULT false,
	"frequency" text DEFAULT 'مرة واحدة',
	"auto_reminder" boolean DEFAULT true,
	"fields_needed" text,
	"status" text DEFAULT 'نشط' NOT NULL,
	"created_by" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"warning_threshold" integer DEFAULT 70 NOT NULL,
	"daily_reminder_enabled" boolean DEFAULT true NOT NULL,
	"daily_reminder_time" text DEFAULT '08:00' NOT NULL,
	"auto_backup_enabled" boolean DEFAULT true NOT NULL,
	"hijri_support" boolean DEFAULT true NOT NULL,
	"high_contrast_mode" boolean DEFAULT false,
	"print_settings" text
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"commander_id" text,
	"commander_name" text,
	"type" text,
	"location" text,
	"approved_strength" integer,
	"status" text,
	"code" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"password" text,
	"role" text NOT NULL,
	"unit_id" text,
	"soldier_id" text,
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE INDEX "att_soldier_idx" ON "attendance" USING btree ("soldier_id");--> statement-breakpoint
CREATE INDEX "att_date_idx" ON "attendance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "att_soldier_date_idx" ON "attendance" USING btree ("soldier_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_soldier_date_unique" ON "attendance" USING btree ("soldier_id","date");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "sick_leave_soldier_idx" ON "sick_leaves" USING btree ("soldier_id");--> statement-breakpoint
CREATE INDEX "req_soldier_idx" ON "soldier_requests" USING btree ("soldier_id");--> statement-breakpoint
CREATE INDEX "req_status_idx" ON "soldier_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "req_survey_idx" ON "soldier_requests" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "mil_num_idx" ON "soldiers" USING btree ("military_number");--> statement-breakpoint
CREATE UNIQUE INDEX "soldiers_military_number_unique" ON "soldiers" USING btree ("military_number");--> statement-breakpoint
CREATE INDEX "full_name_idx" ON "soldiers" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "rank_idx" ON "soldiers" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "unit_idx" ON "soldiers" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "active_idx" ON "soldiers" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_soldier_unique" ON "users" USING btree ("soldier_id");