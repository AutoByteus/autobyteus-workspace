CREATE TABLE "token_usage_analytics_coverage" (
  "id" INTEGER NOT NULL PRIMARY KEY,
  "coverage_start" DATETIME NOT NULL
);

CREATE TABLE "token_usage_analytics_daily_facets" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "bucket_start" DATETIME NOT NULL,
  "facet_key" TEXT NOT NULL,
  "identity_key" TEXT NOT NULL,
  "provider_key" TEXT NOT NULL,
  "model_key" TEXT NOT NULL,
  "runtime_kind" TEXT NOT NULL,
  "model_provider" TEXT,
  "provider_name" TEXT,
  "model_identifier" TEXT,
  "model_value" TEXT,
  "cache_state" TEXT NOT NULL,
  "pricing_summary_json" TEXT NOT NULL,
  "accounting_input_tokens" BIGINT NOT NULL DEFAULT 0,
  "accounting_output_tokens" BIGINT NOT NULL DEFAULT 0,
  "accounting_total_tokens" BIGINT NOT NULL DEFAULT 0,
  "standard_input_tokens" BIGINT NOT NULL DEFAULT 0,
  "cache_miss_input_tokens" BIGINT NOT NULL DEFAULT 0,
  "cache_read_input_tokens" BIGINT NOT NULL DEFAULT 0,
  "cache_creation_input_tokens" BIGINT NOT NULL DEFAULT 0,
  "cache_creation_5m_input_tokens" BIGINT NOT NULL DEFAULT 0,
  "cache_creation_1h_input_tokens" BIGINT NOT NULL DEFAULT 0,
  "reasoning_output_tokens" BIGINT NOT NULL DEFAULT 0,
  "billable_input_tokens" BIGINT NOT NULL DEFAULT 0,
  "billable_output_tokens" BIGINT NOT NULL DEFAULT 0,
  "estimated_api_input_cost" REAL,
  "estimated_api_standard_input_cost" REAL,
  "estimated_api_cache_read_input_cost" REAL,
  "estimated_api_cache_creation_input_cost" REAL,
  "estimated_api_cache_creation_5m_input_cost" REAL,
  "estimated_api_cache_creation_1h_input_cost" REAL,
  "estimated_api_output_cost" REAL,
  "estimated_api_reasoning_output_cost" REAL,
  "estimated_api_total_cost" REAL,
  "usage_report_count" BIGINT NOT NULL DEFAULT 0,
  "latest_observed_at" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "token_usage_analytics_daily_facets_bucket_start_facet_key_key"
  ON "token_usage_analytics_daily_facets"("bucket_start", "facet_key");
CREATE INDEX "token_usage_analytics_daily_facets_bucket_start_runtime_kind_idx"
  ON "token_usage_analytics_daily_facets"("bucket_start", "runtime_kind");
CREATE INDEX "token_usage_analytics_daily_facets_bucket_start_provider_key_idx"
  ON "token_usage_analytics_daily_facets"("bucket_start", "provider_key");
CREATE INDEX "token_usage_analytics_daily_facets_bucket_start_model_key_idx"
  ON "token_usage_analytics_daily_facets"("bucket_start", "model_key");
CREATE INDEX "token_usage_analytics_daily_facets_identity_key_bucket_start_idx"
  ON "token_usage_analytics_daily_facets"("identity_key", "bucket_start");
