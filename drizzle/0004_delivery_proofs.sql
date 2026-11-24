ALTER TABLE "orders" ADD COLUMN "delivery_proofs" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "orders" SET "delivery_proofs" = ARRAY["delivery_proof"] WHERE "delivery_proof" IS NOT NULL;
