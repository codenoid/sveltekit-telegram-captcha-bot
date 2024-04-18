PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE [tg_user] ("user_id" integer,"first_name" text,"last_name" text,"data" text,"automated_account" integer DEFAULT 0);
CREATE TABLE [tg_waitlist] ("request_id" text PRIMARY KEY,"user_id" integer,"group_id" integer,"join_date" integer,"status" text, "code" TEXT, "bot_message_id" INTEGER);
