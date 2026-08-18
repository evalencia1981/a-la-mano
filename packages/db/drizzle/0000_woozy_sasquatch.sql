CREATE SCHEMA "core";
--> statement-breakpoint
CREATE SCHEMA "directory";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"primary_color" text DEFAULT '#3B82F6',
	"secondary_color" text DEFAULT '#1E40AF',
	"default_language" text DEFAULT 'es',
	"timezone" text DEFAULT 'America/Bogota',
	"status" text DEFAULT 'active',
	"plan" text DEFAULT 'free',
	"type" text DEFAULT 'residential' NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."tenant_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"removed_at" timestamp with time zone,
	"removed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."tenant_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"invited_by" uuid,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core"."audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directory"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"group_name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"icon_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directory"."providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"city" text NOT NULL,
	"neighborhood" text,
	"phone" text NOT NULL,
	"phone_normalized" text NOT NULL,
	"is_whatsapp" boolean DEFAULT true NOT NULL,
	"whatsapp_number" text,
	"whatsapp_normalized" text,
	"instagram_handle" text,
	"website_url" text,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directory"."provider_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text NOT NULL,
	"alt_text" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directory"."community_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"local_notes" text,
	"rating_average" numeric(3, 2),
	"rating_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"added_by" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directory"."ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"community_provider_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stars" smallint NOT NULL,
	"comment" text,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"hidden_by" uuid,
	"hidden_at" timestamp with time zone,
	"hidden_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_stars_check" CHECK ("directory"."ratings"."stars" >= 1 AND "directory"."ratings"."stars" <= 5)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "directory"."suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"suggested_by" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"phone_normalized" text NOT NULL,
	"category_id" uuid NOT NULL,
	"description" text,
	"city" text NOT NULL,
	"neighborhood" text,
	"is_whatsapp" boolean DEFAULT true,
	"whatsapp_number" text,
	"instagram_handle" text,
	"member_note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"resulting_community_provider_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."tenant_members" ADD CONSTRAINT "tenant_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."tenant_members" ADD CONSTRAINT "tenant_members_removed_by_profiles_id_fk" FOREIGN KEY ("removed_by") REFERENCES "core"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."tenant_invitations" ADD CONSTRAINT "tenant_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "core"."tenant_invitations" ADD CONSTRAINT "tenant_invitations_invited_by_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "core"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."providers" ADD CONSTRAINT "providers_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "directory"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."providers" ADD CONSTRAINT "providers_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "core"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."provider_photos" ADD CONSTRAINT "provider_photos_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "directory"."providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."provider_photos" ADD CONSTRAINT "provider_photos_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "core"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."community_providers" ADD CONSTRAINT "community_providers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."community_providers" ADD CONSTRAINT "community_providers_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "directory"."providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."community_providers" ADD CONSTRAINT "community_providers_added_by_profiles_id_fk" FOREIGN KEY ("added_by") REFERENCES "core"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."ratings" ADD CONSTRAINT "ratings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."ratings" ADD CONSTRAINT "ratings_community_provider_id_community_providers_id_fk" FOREIGN KEY ("community_provider_id") REFERENCES "directory"."community_providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."ratings" ADD CONSTRAINT "ratings_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."ratings" ADD CONSTRAINT "ratings_hidden_by_profiles_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "core"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."suggestions" ADD CONSTRAINT "suggestions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "core"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."suggestions" ADD CONSTRAINT "suggestions_suggested_by_profiles_id_fk" FOREIGN KEY ("suggested_by") REFERENCES "core"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."suggestions" ADD CONSTRAINT "suggestions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "directory"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."suggestions" ADD CONSTRAINT "suggestions_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "core"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "directory"."suggestions" ADD CONSTRAINT "suggestions_resulting_community_provider_id_community_providers_id_fk" FOREIGN KEY ("resulting_community_provider_id") REFERENCES "directory"."community_providers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_idx" ON "core"."tenants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_member_unique" ON "core"."tenant_members" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_idx" ON "directory"."categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_active_order_idx" ON "directory"."categories" USING btree ("is_active","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "providers_phone_normalized_idx" ON "directory"."providers" USING btree ("phone_normalized");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "providers_name_idx" ON "directory"."providers" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "providers_category_city_idx" ON "directory"."providers" USING btree ("category_id","city");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_photos_provider_order_idx" ON "directory"."provider_photos" USING btree ("provider_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "provider_photos_primary_unique" ON "directory"."provider_photos" USING btree ("provider_id") WHERE is_primary = true;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "community_providers_unique_idx" ON "directory"."community_providers" USING btree ("tenant_id","provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_providers_tenant_rating_idx" ON "directory"."community_providers" USING btree ("tenant_id","rating_average");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "community_providers_provider_idx" ON "directory"."community_providers" USING btree ("provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ratings_unique_idx" ON "directory"."ratings" USING btree ("tenant_id","community_provider_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_by_provider_idx" ON "directory"."ratings" USING btree ("community_provider_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ratings_by_user_idx" ON "directory"."ratings" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suggestions_pending_idx" ON "directory"."suggestions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "suggestions_by_user_idx" ON "directory"."suggestions" USING btree ("suggested_by");