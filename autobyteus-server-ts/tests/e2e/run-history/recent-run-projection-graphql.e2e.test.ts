import "reflect-metadata";
import { createHash } from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { TeamRunMetadataStore } from "../../../src/run-history/store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";

const GRAPHQL_QUERY = `
  query RunProjection($runId: String!) {
    getRunProjection(runId: $runId) {
      runId
      summary
      lastActivityAt
      conversation
      activities
    }
  }
`;

const TEAM_GRAPHQL_QUERY = `
  query TeamRunProjection($teamRunId: String!, $memberRouteKey: String!) {
    getTeamMemberRunProjection(teamRunId: $teamRunId, memberRouteKey: $memberRouteKey) {
      agentRunId
      summary
      lastActivityAt
      conversation
      activities
    }
  }
`;

type ProjectionPayload = {
  runId?: string;
  agentRunId?: string;
  summary: string | null;
  lastActivityAt: string | null;
  conversation: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
};

const sha256 = async (filePath: string): Promise<string> =>
  createHash("sha256").update(await fs.readFile(filePath)).digest("hex");

const userTrace = (id: string, index: number, content: string): Record<string, unknown> => ({
  id,
  trace_type: "user",
  content,
  turn_id: `turn-${index}`,
  seq: index,
  ts: 1_800_000_000 + index,
  source_event: "api-e2e",
});

const boundaryTrace = (id: string, index: number): Record<string, unknown> => ({
  id,
  trace_type: "provider_compaction_boundary",
  content: "boundary",
  correlation_id: `boundary:${id}`,
  turn_id: `turn-${index}`,
  seq: index,
  ts: 1_800_000_000 + index,
  source_event: "api-e2e",
});

const writeJsonl = async (filePath: string, rows: Record<string, unknown>[]): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf-8");
};

const archivePrefix = (runDir: string, prefix: string, activeRows: Record<string, unknown>[]) => {
  const activePath = path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
  return writeJsonl(activePath, [
    userTrace(`${prefix}-archive-only`, 1, `${prefix}-ARCHIVE-ONLY-MARKER`),
    boundaryTrace(`${prefix}-boundary`, 2),
    ...activeRows,
  ]).then(() => {
    const store = new RunMemoryFileStore(runDir);
    const segment = store.rotateActiveRawTracesBeforeBoundary({
      boundaryType: "provider_compaction_boundary",
      boundaryKey: `${prefix}:boundary`,
      boundaryTraceId: `${prefix}-boundary`,
      runtimeKind: "AUTOBYTEUS",
      sourceEvent: "api-e2e",
    });
    if (!segment) throw new Error("Expected an archived segment");
    return {
      activePath,
      archivePath: path.join(runDir, segment.file_name),
      manifestPath: store.getRawTracesArchiveManifestPath(),
    };
  });
};

const normalizeReadPath = (input: unknown): string | null => {
  if (typeof input === "string") return path.resolve(input);
  if (Buffer.isBuffer(input)) return path.resolve(input.toString());
  if (input instanceof URL && input.protocol === "file:") return path.resolve(input.pathname);
  return null;
};

const trackRawTraceReads = () => {
  const paths: string[] = [];
  const originalReadFileSync = fsSync.readFileSync.bind(fsSync);
  const spy = vi.spyOn(fsSync, "readFileSync").mockImplementation(((...args: Parameters<typeof fsSync.readFileSync>) => {
    const readPath = normalizeReadPath(args[0]);
    if (readPath && /raw_traces_(?:active|\d{6})\.jsonl$|raw_traces_(?:archive_)?manifest\.json$/.test(readPath)) {
      paths.push(readPath);
    }
    return originalReadFileSync(...args as [any, any]);
  }) as typeof fsSync.readFileSync);
  return { paths, restore: () => spy.mockRestore() };
};

describe("recent run projection GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let testDataDir: string;
  let workspaceRootPath: string;
  let memoryDir: string;

  beforeAll(async () => {
    testDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "recent-run-projection-gql-"));
    await fs.writeFile(
      path.join(testDataDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n",
      "utf-8",
    );
    workspaceRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "recent-run-projection-workspace-"));
    appConfigProvider.config.setCustomAppDataDir(testDataDir);
    memoryDir = appConfigProvider.config.getMemoryDir();
    schema = await buildGraphqlSchema();

    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  beforeEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
    await fs.mkdir(memoryDir, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(workspaceRootPath, { recursive: true, force: true });
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  const execGraphql = async <T>(query: string, variables: Record<string, unknown>): Promise<T> => {
    const result = await graphql({ schema, source: query, variableValues: variables });
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  it("projects the newest 100 events from a >=5 MB active file without reading or changing its standalone archive", async () => {
    const runId = "recent-window-large-standalone";
    const runDir = path.join(memoryDir, "agents", runId);
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata(runId, {
      runId,
      agentDefinitionId: "recent-window-agent",
      workspaceRootPath,
      memoryDir: runDir,
      llmModelIdentifier: "model",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
      lastKnownStatus: "IDLE",
    } satisfies AgentRunMetadata);

    const padding = "x".repeat(8_600);
    const activeRows = Array.from({ length: 620 }, (_, index) =>
      userTrace(`active-${index}`, index + 3, `active-${index}:${padding}`));
    const files = await archivePrefix(runDir, "standalone", activeRows);
    const activeStat = await fs.stat(files.activePath);
    expect(activeStat.size).toBeGreaterThanOrEqual(5 * 1024 * 1024);

    const hashesBefore = await Promise.all([
      sha256(files.activePath), sha256(files.archivePath), sha256(files.manifestPath),
    ]);
    const reads = trackRawTraceReads();
    const startedAt = performance.now();
    let projection: ProjectionPayload;
    try {
      const result = await execGraphql<{ getRunProjection: ProjectionPayload }>(GRAPHQL_QUERY, { runId });
      projection = result.getRunProjection;
    } finally {
      reads.restore();
    }
    const elapsedMs = performance.now() - startedAt;
    console.info('[recent-run-projection-metrics]', JSON.stringify({
      fixtureBytes: activeStat.size,
      canonicalActiveEvents: activeRows.length,
      returnedConversationRows: projection.conversation.length,
      returnedActivityRows: projection.activities.length,
      payloadBytes: Buffer.byteLength(JSON.stringify(projection)),
      totalMs: Number(elapsedMs.toFixed(3)),
    }));

    expect(projection.conversation).toHaveLength(100);
    expect(projection.activities).toEqual([]);
    expect(projection.conversation[0]).toEqual(expect.objectContaining({ content: expect.stringMatching(/^active-520:/) }));
    expect(projection.conversation.at(-1)).toEqual(expect.objectContaining({ content: expect.stringMatching(/^active-619:/) }));
    expect(JSON.stringify(projection)).not.toContain("ARCHIVE-ONLY-MARKER");
    expect(elapsedMs).toBeLessThan(2_000);
    expect(reads.paths).toContain(path.resolve(files.activePath));
    expect(reads.paths).not.toContain(path.resolve(files.archivePath));
    expect(reads.paths).not.toContain(path.resolve(files.manifestPath));
    expect(await Promise.all([
      sha256(files.activePath), sha256(files.archivePath), sha256(files.manifestPath),
    ])).toEqual(hashesBefore);
  }, 15_000);

  it("projects a team member from active traces only and preserves its archive bytes", async () => {
    const teamRunId = "recent-window-team";
    const memberRunId = "recent-window-member";
    const memberRouteKey = "worker";
    const teamStore = new TeamRunMetadataStore(memoryDir);
    await teamStore.writeMetadata(teamRunId, {
      teamRunId,
      teamDefinitionId: "recent-window-team-definition",
      teamDefinitionName: "Recent Window Team",
      coordinatorMemberRouteKey: memberRouteKey,
      createdAt: new Date(1_800_000_000_000).toISOString(),
      memberTree: [{
        memberKind: "agent",
        memberRouteKey,
        memberPath: [memberRouteKey],
        memberName: "Worker",
        memberRunId,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        platformAgentRunId: null,
        agentDefinitionId: "recent-window-agent",
        llmModelIdentifier: "model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        llmConfig: null,
        workspaceRootPath,
        applicationExecutionContext: null,
      }],
    } satisfies TeamRunMetadata);

    const memberDir = new AgentMemoryLayout(memoryDir).getTeamAgentRunDirPath(
      { rootTeamRunId: teamRunId, teamRunPath: [] },
      memberRunId,
    );
    const activeRows = Array.from({ length: 105 }, (_, index) =>
      userTrace(`team-active-${index}`, index + 3, `team-active-${index}`));
    const files = await archivePrefix(memberDir, "team", activeRows);
    const archiveHashBefore = await sha256(files.archivePath);
    const reads = trackRawTraceReads();
    let projection: ProjectionPayload;
    try {
      const result = await execGraphql<{ getTeamMemberRunProjection: ProjectionPayload }>(
        TEAM_GRAPHQL_QUERY,
        { teamRunId, memberRouteKey },
      );
      projection = result.getTeamMemberRunProjection;
    } finally {
      reads.restore();
    }

    expect(projection.agentRunId).toBe(memberRunId);
    expect(projection.conversation).toHaveLength(100);
    expect(projection.conversation[0]).toEqual(expect.objectContaining({ content: "team-active-5" }));
    expect(projection.conversation.at(-1)).toEqual(expect.objectContaining({ content: "team-active-104" }));
    expect(JSON.stringify(projection)).not.toContain("ARCHIVE-ONLY-MARKER");
    expect(reads.paths).toContain(path.resolve(files.activePath));
    expect(reads.paths).not.toContain(path.resolve(files.archivePath));
    expect(reads.paths).not.toContain(path.resolve(files.manifestPath));
    expect(await sha256(files.archivePath)).toBe(archiveHashBefore);
  });
});
