import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const APP_PATH = "/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app";
const DATA_ROOT = path.join(os.homedir(), ".autobyteus", "server-data");
const MEMORY_ROOT = path.join(DATA_ROOT, "memory");
const DATABASE_PATH = path.join(DATA_ROOT, "db", "production.db");
const OUTPUT_PATH = new URL("./api-rev-009-live-migration-audit.json", import.meta.url);
const MIGRATION_ID = "20260731_migrate_native_working_context_snapshots_v5";
const SUPPORTING_MIGRATION_IDS = [
  "20260731_remove_external_runtime_working_context_snapshots",
  "20260617_raw_trace_rotation_layout",
  "20260707_raw_trace_active_file_name",
];
const OBSOLETE_FILE_NAMES = [
  "episodic.jsonl",
  "semantic.jsonl",
  "compacted_memory_manifest.json",
];

const classifierUrl = new URL(
  `file://${APP_PATH}/Contents/Resources/server/dist/agent-memory/services/runtime-memory-location-classifier.js`,
);
const serializerUrl = new URL(
  `file://${APP_PATH}/Contents/Resources/server/node_modules/autobyteus-ts/dist/memory/working-context-snapshot-serializer.js`,
);
const { RuntimeMemoryLocationClassifier } = await import(classifierUrl.href);
const { WorkingContextSnapshotSerializer } = await import(serializerUrl.href);

const tokenFor = (value) => crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
const isoFromDatabaseTime = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
const millisecondsFromDatabaseTime = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = new Date(String(value)).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};
const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, "utf8"));
const statOrNull = async (filePath) => {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
};
const sha256File = async (filePath) => {
  const hash = crypto.createHash("sha256");
  hash.update(await fs.readFile(filePath));
  return hash.digest("hex");
};
const isWithinWindow = (mtimeMs, startMs, completedMs) =>
  startMs !== null && completedMs !== null && mtimeMs >= startMs && mtimeMs <= completedMs;

const walkFiles = async (rootDir) => {
  const output = [];
  const visit = async (current) => {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const itemPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await visit(itemPath);
      else if (entry.isFile()) output.push(itemPath);
    }
  };
  await visit(rootDir);
  return output.sort();
};

const isRawEvidenceFile = (filePath) => {
  const base = path.basename(filePath);
  return base === "raw_traces_active.jsonl"
    || base === "raw_traces.jsonl"
    || base === "raw_traces_manifest.json"
    || base === "raw_traces_archive_manifest.json"
    || /^raw_traces_\d+\.jsonl$/.test(base)
    || filePath.split(path.sep).includes("raw_traces_archive");
};

const inventory = async (rootDir, predicate, startMs, completedMs) => {
  const rootStat = await statOrNull(rootDir);
  if (!rootStat?.isDirectory()) {
    return {
      fileCount: 0,
      totalBytes: 0,
      aggregateSha256: null,
      modifiedWithinMigrationWindowCount: 0,
      modifiedAfterMigrationCount: 0,
    };
  }
  const files = (await walkFiles(rootDir)).filter(predicate);
  const hash = crypto.createHash("sha256");
  let totalBytes = 0;
  let modifiedWithinMigrationWindowCount = 0;
  let modifiedAfterMigrationCount = 0;
  for (const filePath of files) {
    const stat = await fs.stat(filePath);
    const relative = path.relative(rootDir, filePath).split(path.sep).join("/");
    const contentHash = await sha256File(filePath);
    totalBytes += stat.size;
    modifiedWithinMigrationWindowCount += isWithinWindow(stat.mtimeMs, startMs, completedMs) ? 1 : 0;
    modifiedAfterMigrationCount += completedMs !== null && stat.mtimeMs > completedMs ? 1 : 0;
    hash.update(`${relative}\0${stat.size}\0${contentHash}\n`);
  }
  return {
    fileCount: files.length,
    totalBytes,
    aggregateSha256: files.length ? hash.digest("hex") : null,
    modifiedWithinMigrationWindowCount,
    modifiedAfterMigrationCount,
  };
};

const categoryForDetail = (detail) => {
  const message = String(detail.message ?? "");
  if (message.includes("no current metadata")) return "diagnostic_metadata_missing";
  if (message.includes("metadata exists but is not valid") || message.includes("Could not classify")) {
    return "diagnostic_metadata_invalid";
  }
  if (message.includes("directory") && (message.includes("traversed") || message.includes("inspect"))) {
    return "diagnostic_directory";
  }
  if (message.includes("no WorkingContext snapshot")) return "native_no_snapshot";
  if (message.includes("Nonempty compaction lineage")) return "native_nonempty_lineage";
  if (message.includes("already strict v5")) return "native_already_strict_clean";
  if (message.includes("Retained strict-v5 snapshot bytes")) return "native_retained_strict_cleaned";
  if (message.includes("with omissions ")) return "native_migrated_with_omissions";
  if (message.startsWith("Converted native WorkingContext snapshot")) return "native_migrated_clean";
  if (message.includes("identity was rejected")) return "native_identity_rejected";
  return "other";
};

const omissionMetadata = (detail) => {
  const message = String(detail.message ?? "");
  const marker = "with omissions ";
  const markerIndex = message.indexOf(marker);
  if (markerIndex < 0) return null;
  const encoded = message.slice(markerIndex + marker.length).replace(/\.$/, "");
  try {
    const parsed = JSON.parse(encoded);
    return {
      droppedFieldCount: Number(parsed.droppedFieldCount ?? 0),
      droppedMessageCount: Number(parsed.droppedMessageCount ?? 0),
      droppedToolGroupCount: Number(parsed.droppedToolGroupCount ?? 0),
      reasonCodes: Array.isArray(parsed.reasonCodes) ? [...parsed.reasonCodes].sort() : [],
    };
  } catch {
    return { parseError: true };
  }
};

const database = new DatabaseSync(DATABASE_PATH, { readOnly: true });
const selectMigration = database.prepare(`
  SELECT migration_id, display_name, status, attempts, started_at, completed_at,
         summary_json, error_message, log_path, updated_at
    FROM app_data_migration_records
   WHERE migration_id = ?
`);
const ledgerRow = selectMigration.get(MIGRATION_ID);
if (!ledgerRow) throw new Error(`Missing migration ledger row '${MIGRATION_ID}'.`);
const summary = JSON.parse(ledgerRow.summary_json ?? "{}");
const startMs = millisecondsFromDatabaseTime(ledgerRow.started_at);
const completedMs = millisecondsFromDatabaseTime(ledgerRow.completed_at);
const classification = await new RuntimeMemoryLocationClassifier(MEMORY_ROOT).classify();
const locationsByItemId = new Map(classification.locations.map((location) => [location.itemId, location]));
const nativeLocations = classification.locations.filter((location) => location.runtimeKind === "autobyteus");
const nativePaths = new Set(nativeLocations.map((location) => path.resolve(location.workingContextSnapshotPath)));

const auditLocation = async (location, ledgerDetail) => {
  const snapshotPath = location.workingContextSnapshotPath;
  const snapshotStat = await statOrNull(snapshotPath);
  let snapshot = {
    exists: false,
    schemaVersion: null,
    agentIdMatchesMetadata: false,
    strictV5Valid: false,
    restorable: false,
    messageCount: null,
    sha256: null,
    modifiedWithinMigrationWindow: false,
    modifiedAfterMigration: false,
  };
  if (snapshotStat?.isFile()) {
    try {
      const payload = await readJson(snapshotPath);
      const strictV5Valid = WorkingContextSnapshotSerializer.validate(payload);
      let restorable = false;
      let messageCount = null;
      try {
        const restored = WorkingContextSnapshotSerializer.deserialize(payload);
        messageCount = restored.workingContext.buildMessages().length;
        restorable = strictV5Valid;
      } catch {
        restorable = false;
      }
      snapshot = {
        exists: true,
        schemaVersion: payload?.schema_version ?? null,
        agentIdMatchesMetadata: payload?.agent_id === location.snapshotAgentId,
        strictV5Valid,
        restorable,
        messageCount,
        sha256: await sha256File(snapshotPath),
        modifiedWithinMigrationWindow: isWithinWindow(snapshotStat.mtimeMs, startMs, completedMs),
        modifiedAfterMigration: completedMs !== null && snapshotStat.mtimeMs > completedMs,
      };
    } catch {
      snapshot.exists = true;
      snapshot.sha256 = await sha256File(snapshotPath);
      snapshot.modifiedWithinMigrationWindow = isWithinWindow(snapshotStat.mtimeMs, startMs, completedMs);
      snapshot.modifiedAfterMigration = completedMs !== null && snapshotStat.mtimeMs > completedMs;
    }
  }

  const lineagePath = path.join(location.memoryDir, "compaction_lineage.jsonl");
  const lineageStat = await statOrNull(lineagePath);
  const lineage = !lineageStat?.isFile()
    ? { state: "absent", byteLength: 0, sha256: null, modifiedWithinMigrationWindow: false }
    : {
        state: lineageStat.size === 0 ? "empty" : "nonempty",
        byteLength: lineageStat.size,
        sha256: await sha256File(lineagePath),
        modifiedWithinMigrationWindow: isWithinWindow(lineageStat.mtimeMs, startMs, completedMs),
      };

  const obsoleteFiles = [];
  for (const fileName of OBSOLETE_FILE_NAMES) {
    const filePath = path.join(location.memoryDir, fileName);
    const fileStat = await statOrNull(filePath);
    if (!fileStat?.isFile()) continue;
    obsoleteFiles.push({
      fileName,
      byteLength: fileStat.size,
      sha256: await sha256File(filePath),
      modifiedWithinMigrationWindow: isWithinWindow(fileStat.mtimeMs, startMs, completedMs),
      modifiedAfterMigration: completedMs !== null && fileStat.mtimeMs > completedMs,
    });
  }

  return {
    target: `target-${tokenFor(location.itemId)}`,
    subjectKind: location.subject.kind,
    runtimeKind: location.runtimeKind,
    ledgerStatus: ledgerDetail?.status ?? null,
    ledgerCategory: ledgerDetail ? categoryForDetail(ledgerDetail) : null,
    omissionMetadata: ledgerDetail ? omissionMetadata(ledgerDetail) : null,
    snapshot,
    lineage,
    obsoleteFiles,
    rawEvidence: await inventory(location.memoryDir, isRawEvidenceFile, startMs, completedMs),
  };
};

const ledgerDetails = Array.isArray(summary.details) ? summary.details : [];
const ledgerDetailsByItemId = new Map(ledgerDetails.map((detail) => [detail.itemId, detail]));
const nativeAudits = [];
for (const location of nativeLocations) {
  nativeAudits.push(await auditLocation(location, ledgerDetailsByItemId.get(location.itemId)));
}

const ledgerItems = ledgerDetails.map((detail) => {
  const category = categoryForDetail(detail);
  const location = locationsByItemId.get(detail.itemId);
  return {
    target: `target-${tokenFor(detail.itemId)}`,
    status: detail.status,
    category,
    matchedCurrentClassification: Boolean(location),
    runtimeKind: location?.runtimeKind ?? null,
    omissionMetadata: omissionMetadata(detail),
  };
});

const countBy = (items, selector) => {
  const counts = {};
  for (const item of items) {
    const key = selector(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
};

const allMemoryFiles = await walkFiles(MEMORY_ROOT);
const filesModifiedDuringNativeWindow = [];
for (const filePath of allMemoryFiles) {
  const stat = await fs.stat(filePath);
  if (!isWithinWindow(stat.mtimeMs, startMs, completedMs)) continue;
  const resolved = path.resolve(filePath);
  const isMigratedSnapshot = nativePaths.has(resolved)
    && ledgerDetailsByItemId.get(
      nativeLocations.find((location) => path.resolve(location.workingContextSnapshotPath) === resolved)?.itemId,
    )?.status === "MIGRATED";
  filesModifiedDuringNativeWindow.push({
    token: `file-${tokenFor(path.relative(MEMORY_ROOT, filePath))}`,
    category: isMigratedSnapshot ? "migrated_native_snapshot" : "other_memory_file",
    byteLength: stat.size,
    sha256: await sha256File(filePath),
  });
}

const classifiedSnapshotPaths = new Set(
  classification.locations.map((location) => path.resolve(location.workingContextSnapshotPath)),
);
const candidateSnapshotFiles = allMemoryFiles.filter(
  (filePath) => path.basename(filePath) === "working_context_snapshot.json",
);
const unclassifiedSnapshotFiles = candidateSnapshotFiles.filter(
  (filePath) => !classifiedSnapshotPaths.has(path.resolve(filePath)),
);
const unclassifiedSnapshotInventory = [];
for (const filePath of unclassifiedSnapshotFiles) {
  const stat = await fs.stat(filePath);
  unclassifiedSnapshotInventory.push({
    target: `target-${tokenFor(path.relative(MEMORY_ROOT, filePath))}`,
    byteLength: stat.size,
    sha256: await sha256File(filePath),
    modifiedWithinMigrationWindow: isWithinWindow(stat.mtimeMs, startMs, completedMs),
    modifiedAfterMigration: completedMs !== null && stat.mtimeMs > completedMs,
  });
}

const excludedLocationAudits = [];
for (const location of classification.locations.filter((item) => item.runtimeKind !== "autobyteus")) {
  const snapshotStat = await statOrNull(location.workingContextSnapshotPath);
  excludedLocationAudits.push({
    target: `target-${tokenFor(location.itemId)}`,
    runtimeKind: location.runtimeKind,
    snapshotExists: Boolean(snapshotStat?.isFile()),
    snapshotModifiedWithinMigrationWindow: snapshotStat?.isFile()
      ? isWithinWindow(snapshotStat.mtimeMs, startMs, completedMs)
      : false,
    rawEvidence: await inventory(location.memoryDir, isRawEvidenceFile, startMs, completedMs),
  });
}

const importsInventory = await inventory(
  path.join(MEMORY_ROOT, "imports"),
  () => true,
  startMs,
  completedMs,
);

const logPath = ledgerRow.log_path ? String(ledgerRow.log_path) : null;
let logEvidence = null;
if (logPath) {
  const logText = await fs.readFile(logPath, "utf8");
  const lines = logText.split(/\r?\n/);
  const detailsIndex = lines.indexOf("details=");
  const logDetails = detailsIndex >= 0
    ? lines.slice(detailsIndex + 1).filter((line) => line.trim()).map((line) => JSON.parse(line))
    : [];
  logEvidence = {
    fileName: path.basename(logPath),
    sha256: await sha256File(logPath),
    detailCount: logDetails.length,
    detailsMatchLedgerSummary: JSON.stringify(logDetails) === JSON.stringify(ledgerDetails),
  };
}

const supportingMigrations = SUPPORTING_MIGRATION_IDS.map((migrationId) => selectMigration.get(migrationId))
  .filter(Boolean)
  .map((row) => {
    const supportingSummary = JSON.parse(row.summary_json ?? "{}");
    return {
      migrationId: row.migration_id,
      status: row.status,
      attempts: Number(row.attempts),
      startedAt: isoFromDatabaseTime(row.started_at),
      completedAt: isoFromDatabaseTime(row.completed_at),
      summary: {
        scannedCount: Number(supportingSummary.scannedCount ?? 0),
        migratedCount: Number(supportingSummary.migratedCount ?? 0),
        skippedCount: Number(supportingSummary.skippedCount ?? 0),
        failedCount: Number(supportingSummary.failedCount ?? 0),
      },
    };
  });
database.close();

const migratedAudits = nativeAudits.filter((item) => item.ledgerStatus === "MIGRATED");
const noSnapshotAudits = nativeAudits.filter((item) => item.ledgerCategory === "native_no_snapshot");
const nonemptyLineageAudits = nativeAudits.filter((item) => item.ledgerCategory === "native_nonempty_lineage");
const migratedObsoleteFiles = migratedAudits.flatMap((item) => item.obsoleteFiles);
const currentPostMigrationObsoleteFiles = migratedObsoleteFiles.filter((item) => item.modifiedAfterMigration);
const audit = {
  generatedAt: new Date().toISOString(),
  auditMode: "read-only product data; evidence file written outside product app-data",
  privacy: "No message, tool, raw-trace, episode, semantic, workspace, or user-file content is emitted. Target IDs and paths are pseudonymized.",
  package: {
    appPath: APP_PATH,
    expectedProductVersion: "1.4.34",
  },
  ledger: {
    migrationId: ledgerRow.migration_id,
    displayName: ledgerRow.display_name,
    status: ledgerRow.status,
    attempts: Number(ledgerRow.attempts),
    startedAt: isoFromDatabaseTime(ledgerRow.started_at),
    completedAt: isoFromDatabaseTime(ledgerRow.completed_at),
    errorPresent: Boolean(ledgerRow.error_message),
    summary: {
      scannedCount: Number(summary.scannedCount ?? 0),
      migratedCount: Number(summary.migratedCount ?? 0),
      skippedCount: Number(summary.skippedCount ?? 0),
      failedCount: Number(summary.failedCount ?? 0),
    },
    categoryCounts: countBy(ledgerItems, (item) => `${item.status}:${item.category}`),
    log: logEvidence,
  },
  supportingMigrations,
  classification: {
    locationCount: classification.locations.length,
    diagnosticCount: classification.diagnostics.length,
    runtimeKindCounts: countBy(classification.locations, (item) => item.runtimeKind ?? "unsupported_or_unknown"),
    nativeLocationCount: nativeLocations.length,
    nativeLedgerMatchCount: nativeAudits.filter((item) => item.ledgerStatus !== null).length,
  },
  nativeResultChecks: {
    migratedCount: migratedAudits.length,
    migratedWithOmissionsCount: migratedAudits.filter((item) => item.ledgerCategory === "native_migrated_with_omissions").length,
    migratedWithoutOmissionsCount: migratedAudits.filter((item) => item.ledgerCategory === "native_migrated_clean").length,
    skippedNonemptyLineageCount: nonemptyLineageAudits.length,
    skippedNoSnapshotCount: noSnapshotAudits.length,
    failedOrRejectedCount: nativeAudits.filter((item) => item.ledgerStatus === "FAILED").length,
    migratedSnapshotsPresentCount: migratedAudits.filter((item) => item.snapshot.exists).length,
    migratedSnapshotsStrictV5ValidCount: migratedAudits.filter((item) => item.snapshot.strictV5Valid).length,
    migratedSnapshotsIdentityMatchCount: migratedAudits.filter((item) => item.snapshot.agentIdMatchesMetadata).length,
    migratedSnapshotsRestorableCount: migratedAudits.filter((item) => item.snapshot.restorable).length,
    migratedSnapshotsModifiedAfterMigrationCount: migratedAudits.filter((item) => item.snapshot.modifiedAfterMigration).length,
    migratedTargetsWithCurrentObsoleteFileCount: migratedAudits.filter((item) => item.obsoleteFiles.length > 0).length,
    migratedCurrentObsoleteFileCount: migratedObsoleteFiles.length,
    migratedCurrentObsoleteFilesWrittenAfterMigrationCount: currentPostMigrationObsoleteFiles.length,
    migratedCurrentObsoleteFilesNotPostMigrationCount: migratedObsoleteFiles.length - currentPostMigrationObsoleteFiles.length,
    migratedRawEvidenceFileCount: migratedAudits.reduce((sum, item) => sum + item.rawEvidence.fileCount, 0),
    migratedRawEvidenceFilesModifiedWithinMigrationWindowCount: migratedAudits.reduce(
      (sum, item) => sum + item.rawEvidence.modifiedWithinMigrationWindowCount,
      0,
    ),
    nonemptyLineageSnapshotViolations: nonemptyLineageAudits.filter(
      (item) => item.snapshot.modifiedWithinMigrationWindow || item.rawEvidence.modifiedWithinMigrationWindowCount > 0,
    ).length,
    noSnapshotTargetsNowHavingSnapshotCount: noSnapshotAudits.filter((item) => item.snapshot.exists).length,
  },
  preservationChecks: {
    filesModifiedDuringNativeWindowCount: filesModifiedDuringNativeWindow.length,
    migratedSnapshotFilesModifiedDuringNativeWindowCount: filesModifiedDuringNativeWindow.filter(
      (item) => item.category === "migrated_native_snapshot",
    ).length,
    otherMemoryFilesModifiedDuringNativeWindowCount: filesModifiedDuringNativeWindow.filter(
      (item) => item.category === "other_memory_file",
    ).length,
    externalOrUnsupportedLocationCount: excludedLocationAudits.length,
    externalOrUnsupportedRawFilesModifiedWithinMigrationWindowCount: excludedLocationAudits.reduce(
      (sum, item) => sum + item.rawEvidence.modifiedWithinMigrationWindowCount,
      0,
    ),
    externalOrUnsupportedSnapshotsModifiedWithinMigrationWindowCount: excludedLocationAudits.filter(
      (item) => item.snapshotModifiedWithinMigrationWindow,
    ).length,
    unclassifiedSnapshotCount: unclassifiedSnapshotInventory.length,
    unclassifiedSnapshotsModifiedWithinMigrationWindowCount: unclassifiedSnapshotInventory.filter(
      (item) => item.modifiedWithinMigrationWindow,
    ).length,
    importedFileCount: importsInventory.fileCount,
    importedFilesModifiedWithinMigrationWindowCount: importsInventory.modifiedWithinMigrationWindowCount,
    importedAggregateSha256: importsInventory.aggregateSha256,
  },
  verdict: {
    ledgerSucceededWithoutFailedItems:
      ["SUCCEEDED", "SUCCEEDED_WITH_WARNINGS"].includes(ledgerRow.status)
      && Number(summary.failedCount ?? 0) === 0,
    allMigratedSnapshotsStrictV5IdentityMatchedAndRestorable:
      migratedAudits.length === Number(summary.migratedCount ?? 0)
      && migratedAudits.every(
        (item) => item.snapshot.exists
          && item.snapshot.strictV5Valid
          && item.snapshot.agentIdMatchesMetadata
          && item.snapshot.restorable,
      ),
    cleanupBoundaryValidAtAudit:
      migratedObsoleteFiles.every((item) => item.modifiedAfterMigration),
    noRawOrExcludedMutationObservedInNativeWindow:
      migratedAudits.every((item) => item.rawEvidence.modifiedWithinMigrationWindowCount === 0)
      && excludedLocationAudits.every(
        (item) => item.rawEvidence.modifiedWithinMigrationWindowCount === 0
          && !item.snapshotModifiedWithinMigrationWindow,
      )
      && unclassifiedSnapshotInventory.every((item) => !item.modifiedWithinMigrationWindow)
      && importsInventory.modifiedWithinMigrationWindowCount === 0,
    migrationSuccessful: false,
  },
  ledgerItems,
  nativeTargets: nativeAudits,
  excludedTargets: excludedLocationAudits,
  unclassifiedSnapshots: unclassifiedSnapshotInventory,
  filesModifiedDuringNativeWindow,
};
audit.verdict.migrationSuccessful = Object.entries(audit.verdict)
  .filter(([key]) => key !== "migrationSuccessful")
  .every(([, value]) => value === true);

await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  generatedAt: audit.generatedAt,
  ledger: audit.ledger,
  classification: audit.classification,
  nativeResultChecks: audit.nativeResultChecks,
  preservationChecks: audit.preservationChecks,
  verdict: audit.verdict,
  evidencePath: OUTPUT_PATH.pathname,
}, null, 2));
