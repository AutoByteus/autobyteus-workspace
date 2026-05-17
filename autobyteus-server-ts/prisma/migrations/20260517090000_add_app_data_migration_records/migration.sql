CREATE TABLE IF NOT EXISTS "app_data_migration_records" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "migration_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "started_at" DATETIME,
  "completed_at" DATETIME,
  "summary_json" TEXT,
  "error_message" TEXT,
  "log_path" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_data_migration_records_migration_id_key"
  ON "app_data_migration_records"("migration_id");
