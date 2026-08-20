BEGIN IMMEDIATE;

CREATE TEMP TABLE "app_data_migration_summary_validation" (
  "migration_id" TEXT NOT NULL PRIMARY KEY,
  "scanned_count" INTEGER NOT NULL
    CONSTRAINT "scanned_count" CHECK (typeof("scanned_count") = 'integer' AND "scanned_count" >= 0),
  "migrated_count" INTEGER NOT NULL
    CONSTRAINT "migrated_count" CHECK (typeof("migrated_count") = 'integer' AND "migrated_count" >= 0),
  "skipped_count" INTEGER NOT NULL
    CONSTRAINT "skipped_count" CHECK (typeof("skipped_count") = 'integer' AND "skipped_count" >= 0),
  "failed_count" INTEGER NOT NULL
    CONSTRAINT "failed_count" CHECK (typeof("failed_count") = 'integer' AND "failed_count" >= 0),
  "scanned_json_type" TEXT NOT NULL
    CONSTRAINT "scanned_json_type" CHECK ("scanned_json_type" = 'integer'),
  "migrated_json_type" TEXT NOT NULL
    CONSTRAINT "migrated_json_type" CHECK ("migrated_json_type" = 'integer'),
  "skipped_json_type" TEXT NOT NULL
    CONSTRAINT "skipped_json_type" CHECK ("skipped_json_type" = 'integer'),
  "failed_json_type" TEXT NOT NULL
    CONSTRAINT "failed_json_type" CHECK ("failed_json_type" = 'integer')
);

INSERT INTO "app_data_migration_summary_validation" (
  "migration_id",
  "scanned_count",
  "migrated_count",
  "skipped_count",
  "failed_count",
  "scanned_json_type",
  "migrated_json_type",
  "skipped_json_type",
  "failed_json_type"
)
SELECT
  "migration_id",
  json_extract("summary_json", '$.scannedCount'),
  json_extract("summary_json", '$.migratedCount'),
  json_extract("summary_json", '$.skippedCount'),
  json_extract("summary_json", '$.failedCount'),
  json_type("summary_json", '$.scannedCount'),
  json_type("summary_json", '$.migratedCount'),
  json_type("summary_json", '$.skippedCount'),
  json_type("summary_json", '$.failedCount')
FROM "app_data_migration_records"
WHERE "summary_json" IS NOT NULL;

UPDATE "app_data_migration_records"
SET "summary_json" = (
  SELECT printf(
    'Scanned %d; migrated %d; skipped %d; failed %d.',
    "scanned_count",
    "migrated_count",
    "skipped_count",
    "failed_count"
  )
  FROM "app_data_migration_summary_validation"
  WHERE "app_data_migration_summary_validation"."migration_id" = "app_data_migration_records"."migration_id"
)
WHERE "summary_json" IS NOT NULL;

ALTER TABLE "app_data_migration_records" RENAME COLUMN "summary_json" TO "summary";

DROP TABLE "app_data_migration_summary_validation";

COMMIT;
