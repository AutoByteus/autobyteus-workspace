export const MAX_APP_DATA_MIGRATION_SUMMARY_BYTES = 64 * 1024;
export const APP_DATA_MIGRATION_SUMMARY_BYTE_LIMIT_LABEL = "65,536";

export const STORED_SUMMARY_DETAILS_OMITTED_ITEM_ID =
  "__stored_summary_details_omitted__";
export const STORED_SUMMARY_COUNTS_UNAVAILABLE_ITEM_ID =
  "__stored_summary_counts_unavailable__";

const COUNT_FIELDS = [
  "scannedCount",
  "migratedCount",
  "skippedCount",
  "failedCount",
] as const;

const validCountPredicates = COUNT_FIELDS.map((field) => [
  `json_type(summary_json, '$.${field}') IS 'integer'`,
  `json_extract(summary_json, '$.${field}') >= 0`,
  `json_extract(summary_json, '$.${field}') <= 9007199254740991`,
].join(" AND ")).join("\n             AND ");

const unavailableSummarySql = `json_object(
  'scannedCount', 0,
  'migratedCount', 0,
  'skippedCount', 0,
  'failedCount', 0,
  'details', json_array(json_object(
    'itemId', '${STORED_SUMMARY_COUNTS_UNAVAILABLE_ITEM_ID}',
    'status', 'SKIPPED',
    'message', 'Stored summary counts are unavailable; zero values are placeholders because the stored shape could not be safely projected within the ${APP_DATA_MIGRATION_SUMMARY_BYTE_LIMIT_LABEL}-byte limit.'
  ))
)`;

const omittedSummarySql = `json_object(
  'scannedCount', json_extract(summary_json, '$.scannedCount'),
  'migratedCount', json_extract(summary_json, '$.migratedCount'),
  'skippedCount', json_extract(summary_json, '$.skippedCount'),
  'failedCount', json_extract(summary_json, '$.failedCount'),
  'details', json_array(json_object(
    'itemId', '${STORED_SUMMARY_DETAILS_OMITTED_ITEM_ID}',
    'status', 'SKIPPED',
    'message', printf('Stored summary omitted %d detail items because it exceeded the ${APP_DATA_MIGRATION_SUMMARY_BYTE_LIMIT_LABEL}-byte limit.', json_array_length(summary_json, '$.details'))
  ))
)`;

const boundedSummarySql = `CASE
  WHEN summary_json IS NULL THEN NULL
  WHEN json_valid(summary_json) = 0 THEN ${unavailableSummarySql}
  WHEN json_type(summary_json, '$') IS NOT 'object' THEN ${unavailableSummarySql}
  WHEN NOT (${validCountPredicates}) THEN ${unavailableSummarySql}
  WHEN json_type(summary_json, '$.details') IS NOT 'array' THEN ${unavailableSummarySql}
  WHEN length(CAST(summary_json AS BLOB)) <= ${MAX_APP_DATA_MIGRATION_SUMMARY_BYTES}
    THEN summary_json
  ELSE ${omittedSummarySql}
END`;

export const boundedMigrationRecordSelect = (whereClause = ""): string => `
  WITH bounded_records AS (
    SELECT migration_id, display_name, status, attempts, started_at, completed_at,
           ${boundedSummarySql} AS bounded_summary_json,
           error_message, log_path
      FROM app_data_migration_records
      ${whereClause}
  )
  SELECT migration_id, display_name, status, attempts, started_at, completed_at,
         CASE
           WHEN bounded_summary_json IS NULL THEN NULL
           WHEN length(CAST(bounded_summary_json AS BLOB)) <= ${MAX_APP_DATA_MIGRATION_SUMMARY_BYTES}
             THEN bounded_summary_json
           ELSE ${unavailableSummarySql}
         END AS summary_json,
         error_message, log_path
    FROM bounded_records`;
