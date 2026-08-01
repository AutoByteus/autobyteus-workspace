import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const memoryDir = path.resolve(
  process.argv[2] ?? `${process.env.HOME}/.autobyteus/server-data/memory`,
);
const serverDistDir = path.resolve(process.argv[3] ?? "autobyteus-server-ts/dist");
const delayMs = Number(process.argv[4] ?? 1500);

// The repository readers intentionally log invalid metadata paths. This audit reports
// only aggregate validation counts, so suppress those path-bearing warnings.
console.warn = () => {};

const importDist = async (relativePath) => import(pathToFileURL(path.join(serverDistDir, relativePath)).href);
const { AgentMemoryLayout } = await importDist("agent-memory/store/agent-memory-layout.js");
const { AgentMemoryLocationService } = await importDist("agent-memory/services/agent-memory-location-service.js");
const { AgentRunMetadataStore } = await importDist("run-history/store/agent-run-metadata-store.js");
const { TeamRunMetadataStore } = await importDist("run-history/store/team-run-metadata-store.js");
const {
  RuntimeKind,
  isExternalProviderRuntimeKind,
  runtimeKindFromString,
} = await importDist("runtime-management/runtime-kind-enum.js");

const SNAPSHOT_FILE = "working_context_snapshot.json";
const ACTIVE_RAW_FILE = "raw_traces_active.jsonl";
const RAW_SEGMENT_PATTERN = /^raw_traces_\d{6}\.jsonl$/;
const RAW_MANIFEST_FILE = "raw_traces_manifest.json";
const COMPACTED_MANIFEST_FILE = "compacted_memory_manifest.json";

const isNotFound = (error) => error?.code === "ENOENT";
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const aggregate = () => ({ count: 0, bytes: 0 });
const addStat = (bucket, stat) => {
  bucket.count += 1;
  bucket.bytes += stat.size;
};
const increment = (record, key, amount = 1) => {
  record[key] = (record[key] ?? 0) + amount;
};
const under = (candidate, root) => candidate === root || candidate.startsWith(`${root}${path.sep}`);

const listDirectoriesLikeMigration = async (rootDir, diagnostics) => {
  try {
    const rootStat = await fs.lstat(rootDir);
    if (rootStat.isSymbolicLink()) {
      diagnostics.symbolicLinkRoots += 1;
      return [];
    }
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch (error) {
    if (isNotFound(error)) return [];
    diagnostics.rootInspectionErrors += 1;
    return [];
  }
};

const discoverFilesWithoutPayloadReads = async (rootDir, output, diagnostics) => {
  let entries;
  try {
    const rootStat = await fs.lstat(rootDir);
    if (rootStat.isSymbolicLink()) {
      diagnostics.symbolicLinkDirectoriesSkipped += 1;
      return;
    }
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch (error) {
    if (!isNotFound(error)) diagnostics.inventoryErrors += 1;
    return;
  }

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      await discoverFilesWithoutPayloadReads(entryPath, output, diagnostics);
      continue;
    }
    if (entry.isSymbolicLink() && entry.name !== SNAPSHOT_FILE) {
      diagnostics.symbolicLinksNotFollowed += 1;
      continue;
    }
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;
    try {
      output.push({ filePath: path.resolve(entryPath), name: entry.name, stat: await fs.lstat(entryPath) });
    } catch (error) {
      if (!isNotFound(error)) diagnostics.inventoryErrors += 1;
    }
  }
};

const auditOnce = async () => {
  const startedAt = new Date().toISOString();
  const layout = new AgentMemoryLayout(memoryDir);
  const runMetadataStore = new AgentRunMetadataStore(memoryDir);
  const teamMetadataStore = new TeamRunMetadataStore(memoryDir);
  const locationService = new AgentMemoryLocationService({ memoryDir });
  const diagnostics = {
    symbolicLinkRoots: 0,
    symbolicLinkDirectoriesSkipped: 0,
    symbolicLinksNotFollowed: 0,
    rootInspectionErrors: 0,
    inventoryErrors: 0,
  };
  const metadata = {
    standaloneDirectories: 0,
    standaloneValidCurrent: 0,
    standaloneMissing: 0,
    standaloneInvalidOrUnreadable: 0,
    standaloneRunIdMismatch: 0,
    teamDirectories: 0,
    teamValidCurrent: 0,
    teamMissing: 0,
    teamInvalidOrUnreadable: 0,
    teamRunIdMismatch: 0,
    classifiedTeamMembers: 0,
    conflictingResolvedLocations: 0,
  };
  const targets = new Map();
  const blockedPaths = new Set();

  const registerTarget = (target) => {
    const filePath = path.resolve(target.filePath);
    const existing = targets.get(filePath);
    if (!existing) {
      targets.set(filePath, { ...target, filePath });
      return;
    }
    targets.delete(filePath);
    blockedPaths.add(filePath);
    metadata.conflictingResolvedLocations += 1;
  };

  const standaloneIds = await listDirectoriesLikeMigration(layout.getStandaloneRootDirPath(), diagnostics);
  metadata.standaloneDirectories = standaloneIds.length;
  for (const runId of standaloneIds) {
    const metadataPath = runMetadataStore.getMetadataPath(runId);
    let parsed;
    try {
      parsed = await runMetadataStore.readMetadata(runId);
      if (!parsed) {
        try {
          await fs.access(metadataPath);
          metadata.standaloneInvalidOrUnreadable += 1;
        } catch (error) {
          if (isNotFound(error)) metadata.standaloneMissing += 1;
          else metadata.standaloneInvalidOrUnreadable += 1;
        }
        continue;
      }
      if (parsed.runId !== runId) {
        metadata.standaloneRunIdMismatch += 1;
        continue;
      }
      metadata.standaloneValidCurrent += 1;
      registerTarget({
        filePath: path.join(layout.getStandaloneRunDirPath(runId), SNAPSHOT_FILE),
        source: "standalone",
        runtimeKind: runtimeKindFromString(parsed.runtimeKind),
        providerResumeIdentifierPresent: isNonEmptyString(parsed.platformAgentRunId),
      });
    } catch {
      metadata.standaloneInvalidOrUnreadable += 1;
    }
  }

  const teamIds = await listDirectoriesLikeMigration(layout.getTeamRootDirPath(), diagnostics);
  metadata.teamDirectories = teamIds.length;
  for (const teamRunId of teamIds) {
    try {
      const parsed = await teamMetadataStore.readMetadata(teamRunId);
      if (!parsed) {
        metadata.teamMissing += 1;
        continue;
      }
      if (parsed.teamRunId !== teamRunId) {
        metadata.teamRunIdMismatch += 1;
        continue;
      }
      const locations = locationService.listTeamMemberLocationsFromMetadata(parsed);
      metadata.teamValidCurrent += 1;
      metadata.classifiedTeamMembers += locations.length;
      for (const location of locations) {
        registerTarget({
          filePath: path.join(location.memoryDir, SNAPSHOT_FILE),
          source: "team_member_recursive",
          runtimeKind: runtimeKindFromString(location.member.runtimeKind),
          providerResumeIdentifierPresent: isNonEmptyString(location.member.platformAgentRunId),
        });
      }
    } catch {
      metadata.teamInvalidOrUnreadable += 1;
    }
  }

  const files = [];
  await discoverFilesWithoutPayloadReads(memoryDir, files, diagnostics);
  const importsRoot = path.resolve(memoryDir, "imports");
  const targetByRunDir = new Map([...targets.values()].map((target) => [path.dirname(target.filePath), target]));
  const snapshotCorpus = {
    total: aggregate(),
    eligibleExternalRemaining: aggregate(),
    eligibleExternalRemainingByRuntime: {},
    nativeAutobyteusPreserved: aggregate(),
    unsupportedRuntimePreserved: aggregate(),
    unclassifiedPreserved: aggregate(),
    importedPreserved: aggregate(),
    conflictingClassificationPreserved: aggregate(),
  };
  const controlAndRawCorpus = {
    activeRawTraces: aggregate(),
    completeRotatedRawSegments: aggregate(),
    rawTraceManifests: aggregate(),
    compactedMemoryManifests: aggregate(),
    runMetadataFiles: aggregate(),
    teamMetadataFiles: aggregate(),
  };
  const byRuntime = {};
  const ensureRuntime = (runtimeKind) => {
    const key = runtimeKind ?? "unsupported_or_unknown";
    byRuntime[key] ??= {
      classifiedTargetCount: 0,
      standaloneTargetCount: 0,
      recursiveTeamMemberTargetCount: 0,
      providerResumeIdentifierPresentCount: 0,
      snapshotPresent: aggregate(),
      activeRawTraces: aggregate(),
      completeRotatedRawSegments: aggregate(),
      rawTraceManifests: aggregate(),
    };
    return byRuntime[key];
  };
  for (const target of targets.values()) {
    const bucket = ensureRuntime(target.runtimeKind);
    bucket.classifiedTargetCount += 1;
    increment(bucket, target.source === "standalone" ? "standaloneTargetCount" : "recursiveTeamMemberTargetCount");
    if (target.providerResumeIdentifierPresent) bucket.providerResumeIdentifierPresentCount += 1;
  }

  for (const file of files) {
    const { filePath, name, stat } = file;
    if (name === SNAPSHOT_FILE) {
      addStat(snapshotCorpus.total, stat);
      let bucket;
      if (under(filePath, importsRoot)) {
        bucket = snapshotCorpus.importedPreserved;
      } else if (blockedPaths.has(filePath)) {
        bucket = snapshotCorpus.conflictingClassificationPreserved;
      } else {
        const target = targets.get(filePath);
        if (!target) {
          bucket = snapshotCorpus.unclassifiedPreserved;
        } else if (isExternalProviderRuntimeKind(target.runtimeKind)) {
          bucket = snapshotCorpus.eligibleExternalRemaining;
          const runtimeKey = target.runtimeKind;
          snapshotCorpus.eligibleExternalRemainingByRuntime[runtimeKey] ??= aggregate();
          addStat(snapshotCorpus.eligibleExternalRemainingByRuntime[runtimeKey], stat);
        } else if (target.runtimeKind === RuntimeKind.AUTOBYTEUS) {
          bucket = snapshotCorpus.nativeAutobyteusPreserved;
        } else {
          bucket = snapshotCorpus.unsupportedRuntimePreserved;
        }
        if (target) addStat(ensureRuntime(target.runtimeKind).snapshotPresent, stat);
      }
      addStat(bucket, stat);
      continue;
    }

    let globalBucket = null;
    let runtimeBucketName = null;
    if (name === ACTIVE_RAW_FILE) {
      globalBucket = controlAndRawCorpus.activeRawTraces;
      runtimeBucketName = "activeRawTraces";
    } else if (RAW_SEGMENT_PATTERN.test(name)) {
      globalBucket = controlAndRawCorpus.completeRotatedRawSegments;
      runtimeBucketName = "completeRotatedRawSegments";
    } else if (name === RAW_MANIFEST_FILE) {
      globalBucket = controlAndRawCorpus.rawTraceManifests;
      runtimeBucketName = "rawTraceManifests";
    } else if (name === COMPACTED_MANIFEST_FILE) {
      globalBucket = controlAndRawCorpus.compactedMemoryManifests;
    } else if (name === "run_metadata.json") {
      globalBucket = controlAndRawCorpus.runMetadataFiles;
    } else if (name === "team_run_metadata.json") {
      globalBucket = controlAndRawCorpus.teamMetadataFiles;
    }
    if (globalBucket) addStat(globalBucket, stat);
    if (runtimeBucketName) {
      const target = targetByRunDir.get(path.dirname(filePath));
      if (target) addStat(ensureRuntime(target.runtimeKind)[runtimeBucketName], stat);
    }
  }

  const externalRuntimeSummary = {};
  for (const runtimeKind of [RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK]) {
    externalRuntimeSummary[runtimeKind] = ensureRuntime(runtimeKind);
  }

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    metadataClassification: metadata,
    classifiedTargetsByRuntime: byRuntime,
    exactExternalRuntimeSummary: externalRuntimeSummary,
    snapshotCorpus,
    controlAndRawCorpus,
    diagnostics,
  };
};

const first = await auditOnce();
await new Promise((resolve) => setTimeout(resolve, Math.max(0, delayMs)));
const second = await auditOnce();
const stability = {
  delayMs,
  eligibleExternalRemainingCountStable:
    first.snapshotCorpus.eligibleExternalRemaining.count === second.snapshotCorpus.eligibleExternalRemaining.count,
  eligibleExternalRemainingCountDelta:
    second.snapshotCorpus.eligibleExternalRemaining.count - first.snapshotCorpus.eligibleExternalRemaining.count,
  totalSnapshotCountDelta: second.snapshotCorpus.total.count - first.snapshotCorpus.total.count,
  activeRawTraceCountDelta:
    second.controlAndRawCorpus.activeRawTraces.count - first.controlAndRawCorpus.activeRawTraces.count,
  classifiedTargetCountDelta:
    Object.values(second.classifiedTargetsByRuntime).reduce((sum, item) => sum + item.classifiedTargetCount, 0) -
    Object.values(first.classifiedTargetsByRuntime).reduce((sum, item) => sum + item.classifiedTargetCount, 0),
};

process.stdout.write(`${JSON.stringify({
  auditVersion: 1,
  privacyPosture:
    "Read current run/team metadata only for exact runtime/location classification and file metadata only for corpus counts/sizes; no snapshot or raw-trace payload was read or emitted.",
  classifierAuthority:
    "Repository-built AgentRunMetadataStore, TeamRunMetadataStore, AgentMemoryLocationService, AgentMemoryLayout, and RuntimeKind helpers from the tested Electron server build.",
  memoryRoot: memoryDir,
  observations: [first, second],
  stability,
}, null, 2)}\n`);
