CREATE TABLE "password_reset_verifications" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_verifications" ADD CONSTRAINT "password_reset_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
