ALTER TABLE "ai_analyses" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD COLUMN "strengths" jsonb;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD COLUMN "considerations" jsonb;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD COLUMN "use_case" text;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD COLUMN "target_audience" text;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "open_issues" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "size" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "topics" jsonb;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "license" varchar(255);--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "is_archived" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "is_disabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "default_branch" varchar(100) DEFAULT 'main';--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "github_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "github_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "github_pushed_at" timestamp;