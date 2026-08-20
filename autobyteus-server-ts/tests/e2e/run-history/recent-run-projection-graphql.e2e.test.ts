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
import { CompleteResponse } from "autobyteus-ts/llm/utils/response-types.js";
import { MemoryManager } from "autobyteus-ts/memory/memory-manager.js";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { FileMemoryStore } from "autobyteus-ts/memory/store/file-store.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { TeamRunExecutionTreeStore } from "../../../src/run-history/store/team-run-execution-tree-store.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

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
  query TeamRunProjection($teamRunId: String!, $agentRunId: String!) {
    getTeamMemberRunProjection(teamRunId: $teamRunId, agentRunId: $agentRunId) {
      agentRunId
      summary
      lastActivityAt
      conversation
      activities
    }
  }
`;

const ACTIVE_TRACE_PAGE_FIELDS = `
  beforeCursor
  hasEarlier
  loadedEarlierCount
  activeGeneration
  cursorStatus
  events {
    eventId
    turnGroupId
    occurredAtMs
    visuals {
      __typename
      ... on EventMonitorUserVisual {
        kind visualId eventId kindOrdinal text
        attachments { attachmentId mediaType locator }
      }
      ... on EventMonitorAssistantTextVisual { kind visualId eventId kindOrdinal content }
      ... on EventMonitorThinkingVisual { kind visualId eventId kindOrdinal content }
      ... on EventMonitorToolCardVisual {
        kind visualId eventId kindOrdinal invocationId cardKind toolName statusKey errorMessage
        summaryArgs { path command query }
      }
      ... on EventMonitorMediaVisual { kind visualId eventId kindOrdinal mediaType urls }
      ... on EventMonitorCompactionVisual {
        kind visualId eventId kindOrdinal activityId phase message turnId rawTraceCount semanticFactCount provider
      }
    }
  }
`;

const STANDALONE_ACTIVE_TRACE_PAGE_QUERY = `
  query RunActiveTracePage($runId: String!, $beforeCursor: String) {
    getRunEventMonitorActiveTracePage(runId: $runId, beforeCursor: $beforeCursor) {
      ${ACTIVE_TRACE_PAGE_FIELDS}
    }
  }
`;

const TEAM_ACTIVE_TRACE_PAGE_QUERY = `
  query TeamActiveTracePage($teamRunId: String!, $agentRunId: String!, $beforeCursor: String) {
    getTeamMemberEventMonitorActiveTracePage(
      teamRunId: $teamRunId, agentRunId: $agentRunId, beforeCursor: $beforeCursor
    ) {
      ${ACTIVE_TRACE_PAGE_FIELDS}
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

type PageVisual = {
  __typename: string;
  kind: string;
  visualId: string;
  eventId: string;
  kindOrdinal: number;
  [key: string]: unknown;
};

type ActiveTracePagePayload = {
  beforeCursor: string | null;
  hasEarlier: boolean;
  loadedEarlierCount: number;
  activeGeneration: string;
  cursorStatus: "VALID" | "EXPIRED";
  events: Array<{
    eventId: string;
    turnGroupId: string;
    occurredAtMs: number | null;
    visuals: PageVisual[];
  }>;
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

const systemInstructionTrace = (
  id: string,
  content: string,
  ts = 1_800_000_000.25,
): Record<string, unknown> => ({
  id,
  ts,
  trace_type: "system_instruction",
  content,
  source_event: "SYSTEM_INSTRUCTIONS_SUPPLIED",
});

const assistantTrace = (
  id: string,
  index: number,
  content: string,
  media?: Record<string, string[]>,
): Record<string, unknown> => ({
  id,
  trace_type: "assistant",
  content,
  ...(media ? { media } : {}),
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

  const writeStandaloneMetadata = async (runId: string, runDir: string): Promise<void> => {
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
  };

  const writeTeamMetadata = async (input: {
    teamRunId: string;
    memberRunId: string;
    memberRouteKey: string;
  }): Promise<string> => {
    const layout = new AgentMemoryLayout(memoryDir);
    const memberAddress = `/${input.memberRouteKey}`;
    const rootDir = layout.getTeamDirPath({
      rootTeamRunId: input.teamRunId,
      ancestorTeamRunIds: [],
    });
    await new TeamRunExecutionTreeStore().write(rootDir, testExecutionTree({
      rootTeamRunId: input.teamRunId,
      rootTeamDefinitionId: "recent-window-team-definition",
      teamDefinitionName: "Recent Window Team",
      coordinatorAddress: memberAddress,
      createdAt: new Date(1_800_000_000_000).toISOString(),
      children: [testAgentNode(memberAddress, {
        agentRunId: input.memberRunId,
        agentDefinitionId: "recent-window-agent",
        llmModelIdentifier: "model",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        workspaceRootPath,
      })],
    }));
    return layout.getTeamAgentRunDirPath(
      { rootTeamRunId: input.teamRunId, ancestorTeamRunIds: [] },
      input.memberRunId,
    );
  };

  const pageEventIndexes = (page: ActiveTracePagePayload): number[] =>
    page.events.map((event) => {
      const match = event.visuals[0]?.["text"]?.toString().match(/^event-(\d+)$/);
      if (!match) throw new Error(`Unexpected page event: ${JSON.stringify(event)}`);
      return Number(match[1]);
    });

  const expectStableUniquePageIdentity = (page: ActiveTracePagePayload): void => {
    const eventIds = page.events.map((event) => event.eventId);
    const visualIds = page.events.flatMap((event) => event.visuals.map((visual) => visual.visualId));
    expect(new Set(eventIds).size).toBe(eventIds.length);
    expect(new Set(visualIds).size).toBe(visualIds.length);
    expect(page.events.every((event) => event.visuals.every((visual) => visual.eventId === event.eventId))).toBe(true);
  };

  const persistNativeReasoningResponse = (
    runDir: string,
    reasoning: string,
    content: string,
  ): void => {
    const manager = new MemoryManager({
      store: new FileMemoryStore(runDir, path.basename(runDir), { agentRootSubdir: "" }),
    });
    const turnId = manager.startTurn();
    manager.ingestAssistantResponse(
      new CompleteResponse({ reasoning, content }),
      turnId,
      "LlmPhase",
    );
  };

  it("hydrates native reasoning through standalone and team GraphQL projections", async () => {
    const standaloneRunId = "native-reasoning-standalone";
    const standaloneRunDir = path.join(memoryDir, "agents", standaloneRunId);
    await writeStandaloneMetadata(standaloneRunId, standaloneRunDir);
    persistNativeReasoningResponse(
      standaloneRunDir,
      "standalone private reasoning",
      "standalone visible answer",
    );

    const standaloneProjection = (await execGraphql<{
      getRunProjection: ProjectionPayload;
    }>(GRAPHQL_QUERY, { runId: standaloneRunId })).getRunProjection;
    expect(standaloneProjection.conversation).toEqual([
      expect.objectContaining({ kind: "reasoning", content: "standalone private reasoning" }),
      expect.objectContaining({ kind: "message", role: "assistant", content: "standalone visible answer" }),
    ]);
    const standalonePage = (await execGraphql<{
      getRunEventMonitorActiveTracePage: ActiveTracePagePayload;
    }>(STANDALONE_ACTIVE_TRACE_PAGE_QUERY, {
      runId: standaloneRunId,
      beforeCursor: null,
    })).getRunEventMonitorActiveTracePage;
    expect(standalonePage.events.flatMap((event) => event.visuals)).toEqual([
      expect.objectContaining({ kind: "thinking", content: "standalone private reasoning" }),
      expect.objectContaining({ kind: "assistant_text", content: "standalone visible answer" }),
    ]);

    const teamRunId = "native-reasoning-team";
    const memberRunId = "native-reasoning-member";
    const memberRouteKey = "worker";
    const memberDir = await writeTeamMetadata({ teamRunId, memberRunId, memberRouteKey });
    persistNativeReasoningResponse(
      memberDir,
      "team member private reasoning",
      "team member visible answer",
    );

    const teamProjection = (await execGraphql<{
      getTeamMemberRunProjection: ProjectionPayload;
    }>(TEAM_GRAPHQL_QUERY, { teamRunId, agentRunId: memberRunId })).getTeamMemberRunProjection;
    expect(teamProjection.agentRunId).toBe(memberRunId);
    expect(teamProjection.conversation).toEqual([
      expect.objectContaining({ kind: "reasoning", content: "team member private reasoning" }),
      expect.objectContaining({ kind: "message", role: "assistant", content: "team member visible answer" }),
    ]);
    const teamPage = (await execGraphql<{
      getTeamMemberEventMonitorActiveTracePage: ActiveTracePagePayload;
    }>(TEAM_ACTIVE_TRACE_PAGE_QUERY, {
      teamRunId,
      agentRunId: memberRunId,
      beforeCursor: null,
    })).getTeamMemberEventMonitorActiveTracePage;
    expect(teamPage.events.flatMap((event) => event.visuals)).toEqual([
      expect.objectContaining({ kind: "thinking", content: "team member private reasoning" }),
      expect.objectContaining({ kind: "assistant_text", content: "team member visible answer" }),
    ]);
  });

  it("hydrates active system instructions with raw-ID parity for standalone and team runs without changing Event Monitor visuals", async () => {
    const instructionId = "rt-system-shared-parity";
    const instructionContent = "System preface\n\n  preserve indentation\nfinal line";
    const sharedTurnRows = [
      userTrace("system-parity-user", 1, "same user message"),
      assistantTrace("system-parity-assistant", 2, "same assistant answer"),
    ];

    const baselineRunId = "system-instruction-baseline";
    const baselineRunDir = path.join(memoryDir, "agents", baselineRunId);
    await writeStandaloneMetadata(baselineRunId, baselineRunDir);
    await writeJsonl(path.join(baselineRunDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), sharedTurnRows);
    const baselinePage = (await execGraphql<{
      getRunEventMonitorActiveTracePage: ActiveTracePagePayload;
    }>(STANDALONE_ACTIVE_TRACE_PAGE_QUERY, {
      runId: baselineRunId,
      beforeCursor: null,
    })).getRunEventMonitorActiveTracePage;

    const standaloneRunId = "system-instruction-standalone";
    const standaloneRunDir = path.join(memoryDir, "agents", standaloneRunId);
    await writeStandaloneMetadata(standaloneRunId, standaloneRunDir);
    await writeJsonl(path.join(standaloneRunDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), [
      systemInstructionTrace(instructionId, instructionContent),
      ...sharedTurnRows,
    ]);
    const standaloneProjection = (await execGraphql<{
      getRunProjection: ProjectionPayload;
    }>(GRAPHQL_QUERY, { runId: standaloneRunId })).getRunProjection;
    expect(standaloneProjection.activities).toEqual([
      {
        kind: "system_instruction",
        activityId: instructionId,
        content: instructionContent,
        ts: 1_800_000_000.25,
      },
    ]);
    const standalonePage = (await execGraphql<{
      getRunEventMonitorActiveTracePage: ActiveTracePagePayload;
    }>(STANDALONE_ACTIVE_TRACE_PAGE_QUERY, {
      runId: standaloneRunId,
      beforeCursor: null,
    })).getRunEventMonitorActiveTracePage;
    expect(standalonePage.events).toEqual(baselinePage.events);

    const teamRunId = "system-instruction-team";
    const memberRunId = "system-instruction-member";
    const memberDir = await writeTeamMetadata({
      teamRunId,
      memberRunId,
      memberRouteKey: "worker",
    });
    await writeJsonl(path.join(memberDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), [
      systemInstructionTrace(instructionId, instructionContent),
      ...sharedTurnRows,
    ]);
    const teamProjection = (await execGraphql<{
      getTeamMemberRunProjection: ProjectionPayload;
    }>(TEAM_GRAPHQL_QUERY, {
      teamRunId,
      agentRunId: memberRunId,
    })).getTeamMemberRunProjection;
    expect(teamProjection.activities).toEqual(standaloneProjection.activities);
    const teamPage = (await execGraphql<{
      getTeamMemberEventMonitorActiveTracePage: ActiveTracePagePayload;
    }>(TEAM_ACTIVE_TRACE_PAGE_QUERY, {
      teamRunId,
      agentRunId: memberRunId,
      beforeCursor: null,
    })).getTeamMemberEventMonitorActiveTracePage;
    expect(teamPage.events).toEqual(baselinePage.events);
  });

  it("omits a rotated system instruction from active hydration without reading its archive", async () => {
    const runId = "system-instruction-rotated";
    const runDir = path.join(memoryDir, "agents", runId);
    await writeStandaloneMetadata(runId, runDir);
    const activePath = path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
    await writeJsonl(activePath, [
      systemInstructionTrace("rt-system-rotated", "ARCHIVED-SYSTEM-INSTRUCTION-SENTINEL"),
      boundaryTrace("system-instruction-boundary", 1),
      userTrace("system-instruction-active-user", 2, "active user remains"),
    ]);
    const store = new RunMemoryFileStore(runDir);
    const segment = store.rotateActiveRawTracesBeforeBoundary({
      boundaryType: "provider_compaction_boundary",
      boundaryKey: "system-instruction:boundary",
      boundaryTraceId: "system-instruction-boundary",
      runtimeKind: "AUTOBYTEUS",
      sourceEvent: "api-e2e",
    });
    if (!segment) throw new Error("Expected the system-instruction prefix to rotate");
    const archivePath = path.join(runDir, segment.file_name);
    expect(await fs.readFile(archivePath, "utf-8")).toContain("ARCHIVED-SYSTEM-INSTRUCTION-SENTINEL");
    expect(await fs.readFile(activePath, "utf-8")).not.toContain("ARCHIVED-SYSTEM-INSTRUCTION-SENTINEL");

    const reads = trackRawTraceReads();
    let projection: ProjectionPayload;
    try {
      projection = (await execGraphql<{ getRunProjection: ProjectionPayload }>(
        GRAPHQL_QUERY,
        { runId },
      )).getRunProjection;
    } finally {
      reads.restore();
    }
    expect(projection.activities).toEqual([
      expect.objectContaining({
        kind: "compaction",
        activityId: "compaction:boundary:system-instruction-boundary",
      }),
    ]);
    expect(projection.activities.some((activity) => activity.kind === "system_instruction")).toBe(false);
    expect(projection.conversation).toEqual([
      expect.objectContaining({ kind: "message", role: "user", content: "active user remains" }),
    ]);
    expect(reads.paths).toContain(path.resolve(activePath));
    expect(reads.paths).not.toContain(path.resolve(archivePath));
  });

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
    const memberDir = await writeTeamMetadata({ teamRunId, memberRunId, memberRouteKey });
    const activeRows = Array.from({ length: 105 }, (_, index) =>
      userTrace(`team-active-${index}`, index + 3, `team-active-${index}`));
    const files = await archivePrefix(memberDir, "team", activeRows);
    const archiveHashBefore = await sha256(files.archivePath);
    const reads = trackRawTraceReads();
    let projection: ProjectionPayload;
    try {
      const result = await execGraphql<{ getTeamMemberRunProjection: ProjectionPayload }>(
        TEAM_GRAPHQL_QUERY,
        { teamRunId, agentRunId: memberRunId },
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

  it("traverses exactly 275 standalone active events in fixed pages without opening archives", async () => {
    const runId = "active-page-275-standalone";
    const runDir = path.join(memoryDir, "agents", runId);
    await writeStandaloneMetadata(runId, runDir);
    const rows = Array.from({ length: 275 }, (_, index) =>
      userTrace(`page-standalone-${index}`, index + 3, `event-${index}`));
    const files = await archivePrefix(runDir, "page-standalone", rows);
    await writeJsonl(files.activePath, rows);
    const hashesBefore = await Promise.all([
      sha256(files.activePath), sha256(files.archivePath), sha256(files.manifestPath),
    ]);

    const reads = trackRawTraceReads();
    const pages: ActiveTracePagePayload[] = [];
    try {
      const latest = await execGraphql<{ getRunProjection: ProjectionPayload }>(GRAPHQL_QUERY, { runId });
      expect(latest.getRunProjection.conversation.map((entry) => entry["content"]))
        .toEqual(Array.from({ length: 100 }, (_, index) => `event-${index + 175}`));

      let beforeCursor: string | null = null;
      do {
        const result = await execGraphql<{ getRunEventMonitorActiveTracePage: ActiveTracePagePayload }>(
          STANDALONE_ACTIVE_TRACE_PAGE_QUERY,
          { runId, beforeCursor },
        );
        pages.push(result.getRunEventMonitorActiveTracePage);
        beforeCursor = result.getRunEventMonitorActiveTracePage.beforeCursor;
      } while (pages.at(-1)?.hasEarlier);
    } finally {
      reads.restore();
    }

    expect(pages).toHaveLength(4);
    expect(pages.map((page) => ({
      indexes: pageEventIndexes(page),
      loadedEarlierCount: page.loadedEarlierCount,
      hasEarlier: page.hasEarlier,
      cursorStatus: page.cursorStatus,
    }))).toEqual([
      { indexes: Array.from({ length: 150 }, (_, index) => index + 125), loadedEarlierCount: 50, hasEarlier: true, cursorStatus: "VALID" },
      { indexes: Array.from({ length: 50 }, (_, index) => index + 75), loadedEarlierCount: 50, hasEarlier: true, cursorStatus: "VALID" },
      { indexes: Array.from({ length: 50 }, (_, index) => index + 25), loadedEarlierCount: 50, hasEarlier: true, cursorStatus: "VALID" },
      { indexes: Array.from({ length: 25 }, (_, index) => index), loadedEarlierCount: 25, hasEarlier: false, cursorStatus: "VALID" },
    ]);
    pages.forEach(expectStableUniquePageIdentity);
    const allEventIds = pages.flatMap((page) => page.events.map((event) => event.eventId));
    expect(new Set(allEventIds).size).toBe(275);
    expect(JSON.stringify(pages)).not.toContain("ARCHIVE-ONLY-MARKER");
    expect(reads.paths).toContain(path.resolve(files.activePath));
    expect(reads.paths).not.toContain(path.resolve(files.archivePath));
    expect(reads.paths).toContain(path.resolve(files.manifestPath));
    expect(await Promise.all([
      sha256(files.activePath), sha256(files.archivePath), sha256(files.manifestPath),
    ])).toEqual(hashesBefore);
  });

  it("traverses exactly 275 team-member active events and rejects its cursor for another subject", async () => {
    const teamRunId = "active-page-275-team";
    const memberRunId = "active-page-275-member";
    const memberRouteKey = "worker";
    const memberDir = await writeTeamMetadata({ teamRunId, memberRunId, memberRouteKey });
    const rows = Array.from({ length: 275 }, (_, index) =>
      userTrace(`page-team-${index}`, index + 3, `event-${index}`));
    const files = await archivePrefix(memberDir, "page-team", rows);
    await writeJsonl(files.activePath, rows);
    const archiveHashBefore = await sha256(files.archivePath);

    const reads = trackRawTraceReads();
    const pages: ActiveTracePagePayload[] = [];
    try {
      const latest = await execGraphql<{ getTeamMemberRunProjection: ProjectionPayload }>(
        TEAM_GRAPHQL_QUERY,
        { teamRunId, agentRunId: memberRunId },
      );
      expect(latest.getTeamMemberRunProjection.conversation.map((entry) => entry["content"]))
        .toEqual(Array.from({ length: 100 }, (_, index) => `event-${index + 175}`));

      let beforeCursor: string | null = null;
      do {
        const result = await execGraphql<{ getTeamMemberEventMonitorActiveTracePage: ActiveTracePagePayload }>(
          TEAM_ACTIVE_TRACE_PAGE_QUERY,
          { teamRunId, agentRunId: memberRunId, beforeCursor },
        );
        pages.push(result.getTeamMemberEventMonitorActiveTracePage);
        beforeCursor = result.getTeamMemberEventMonitorActiveTracePage.beforeCursor;
      } while (pages.at(-1)?.hasEarlier);

      await expect(execGraphql(
        STANDALONE_ACTIVE_TRACE_PAGE_QUERY,
        { runId: memberRunId, beforeCursor: pages[0]?.beforeCursor },
      )).rejects.toThrow("does not belong to this run subject");
    } finally {
      reads.restore();
    }

    expect(pages.map(pageEventIndexes)).toEqual([
      Array.from({ length: 150 }, (_, index) => index + 125),
      Array.from({ length: 50 }, (_, index) => index + 75),
      Array.from({ length: 50 }, (_, index) => index + 25),
      Array.from({ length: 25 }, (_, index) => index),
    ]);
    pages.forEach(expectStableUniquePageIdentity);
    expect(new Set(pages.flatMap((page) => page.events.map((event) => event.eventId))).size).toBe(275);
    expect(reads.paths).toContain(path.resolve(files.activePath));
    expect(reads.paths).not.toContain(path.resolve(files.archivePath));
    expect(reads.paths).toContain(path.resolve(files.manifestPath));
    expect(await sha256(files.archivePath)).toBe(archiveHashBefore);
  });

  it("keeps a cursor valid across append and expires it after an atomic active rewrite", async () => {
    const runId = "active-page-cursor-lifecycle";
    const runDir = path.join(memoryDir, "agents", runId);
    await writeStandaloneMetadata(runId, runDir);
    const rows = Array.from({ length: 275 }, (_, index) =>
      userTrace(`cursor-event-${index}`, index + 3, `event-${index}`));
    const files = await archivePrefix(runDir, "cursor", rows);
    const archiveHashBefore = await sha256(files.archivePath);

    const first = (await execGraphql<{ getRunEventMonitorActiveTracePage: ActiveTracePagePayload }>(
      STANDALONE_ACTIVE_TRACE_PAGE_QUERY,
      { runId, beforeCursor: null },
    )).getRunEventMonitorActiveTracePage;
    expect(pageEventIndexes(first)).toEqual(Array.from({ length: 150 }, (_, index) => index + 125));
    expect(first.beforeCursor).toBeTruthy();

    await fs.appendFile(
      files.activePath,
      `${JSON.stringify(userTrace("cursor-event-275", 278, "event-275"))}\n`,
      "utf8",
    );
    const afterAppend = (await execGraphql<{ getRunEventMonitorActiveTracePage: ActiveTracePagePayload }>(
      STANDALONE_ACTIVE_TRACE_PAGE_QUERY,
      { runId, beforeCursor: first.beforeCursor },
    )).getRunEventMonitorActiveTracePage;
    expect(afterAppend.activeGeneration).toBe(first.activeGeneration);
    expect(afterAppend.cursorStatus).toBe("VALID");
    expect(pageEventIndexes(afterAppend)).toEqual(Array.from({ length: 50 }, (_, index) => index + 75));

    const replacementPath = `${files.activePath}.replacement`;
    await writeJsonl(replacementPath, rows.slice(1));
    await fs.rename(replacementPath, files.activePath);
    const afterRewrite = (await execGraphql<{ getRunEventMonitorActiveTracePage: ActiveTracePagePayload }>(
      STANDALONE_ACTIVE_TRACE_PAGE_QUERY,
      { runId, beforeCursor: afterAppend.beforeCursor },
    )).getRunEventMonitorActiveTracePage;
    expect(afterRewrite).toMatchObject({
      events: [],
      beforeCursor: null,
      hasEarlier: false,
      loadedEarlierCount: 0,
      cursorStatus: "EXPIRED",
    });
    expect(afterRewrite.activeGeneration).not.toBe(first.activeGeneration);
    expect(await sha256(files.archivePath)).toBe(archiveHashBefore);
  });

  it("serializes production media and shallow tool state without multi-megabyte result or log payload", async () => {
    const runId = "active-page-closed-payload";
    const runDir = path.join(memoryDir, "agents", runId);
    await writeStandaloneMetadata(runId, runDir);
    const activePath = path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
    const resultSentinel = "ACTIVE_PAGE_RESULT_SENTINEL".repeat(180_000);
    const baseRows: Record<string, unknown>[] = [
      {
        ...userTrace("media-user", 1, "user media"),
        media: { images: ["workspace://images/user.png"] },
      },
      assistantTrace("media-assistant", 2, "assistant media", {
        images: ["https://example.invalid/assistant.png"],
        audio: ["workspace://audio/assistant.wav"],
      }),
      {
        id: "tool-call", trace_type: "tool_call", tool_call_id: "call-1", tool_name: "search_web",
        tool_args: { query: "cats", hidden: { deep: true } },
        media: { images: ["workspace://images/tool.png"] },
        turn_id: "turn-tool", seq: 3, ts: 1_800_000_003, source_event: "api-e2e",
      },
    ];
    const resultRow = (toolResult: unknown): Record<string, unknown> => ({
      id: "tool-result", trace_type: "tool_result", tool_call_id: "call-1", tool_name: "search_web",
      tool_args: { query: "cats", hidden: { deep: true } }, tool_result: toolResult,
      content: "visible result summary", turn_id: "turn-tool", seq: 4,
      ts: 1_800_000_004, source_event: "api-e2e",
    });

    await writeJsonl(activePath, [...baseRows, resultRow({ resultSentinel, logs: ["HIDDEN_TOOL_LOG"] })]);
    const activeBytes = (await fs.stat(activePath)).size;
    expect(activeBytes).toBeGreaterThan(4 * 1024 * 1024);
    const startedAt = performance.now();
    const withHugeResult = (await execGraphql<{ getRunEventMonitorActiveTracePage: ActiveTracePagePayload }>(
      STANDALONE_ACTIVE_TRACE_PAGE_QUERY,
      { runId, beforeCursor: null },
    )).getRunEventMonitorActiveTracePage;
    const elapsedMs = performance.now() - startedAt;
    const hugeEvents = JSON.stringify(withHugeResult.events);
    expect(hugeEvents).not.toContain("ACTIVE_PAGE_RESULT_SENTINEL");
    expect(hugeEvents).not.toContain("HIDDEN_TOOL_LOG");
    expect(hugeEvents).not.toContain("hidden");
    expect(elapsedMs).toBeLessThan(2_000);

    await writeJsonl(activePath, [...baseRows, resultRow(null)]);
    const withNullResult = (await execGraphql<{ getRunEventMonitorActiveTracePage: ActiveTracePagePayload }>(
      STANDALONE_ACTIVE_TRACE_PAGE_QUERY,
      { runId, beforeCursor: null },
    )).getRunEventMonitorActiveTracePage;
    expect(JSON.stringify(withNullResult.events)).toBe(hugeEvents);
    expect(withHugeResult.events.flatMap((event) => event.visuals.map((visual) => visual.kind))).toEqual([
      "user", "assistant_text", "media", "media", "tool_card", "assistant_text", "media",
    ]);
    expect(withHugeResult.events[0]?.visuals[0]).toMatchObject({
      kind: "user",
      attachments: [{ mediaType: "image", locator: "workspace://images/user.png" }],
    });
    expect(withHugeResult.events.at(-1)?.visuals[0]).toMatchObject({
      kind: "tool_card",
      invocationId: "call-1",
      toolName: "search_web",
      statusKey: "success",
      summaryArgs: { query: "cats" },
    });
    console.info("[active-trace-page-closed-payload-metrics]", JSON.stringify({
      fixtureBytes: activeBytes,
      returnedEvents: withHugeResult.events.length,
      returnedVisuals: withHugeResult.events.reduce((sum, event) => sum + event.visuals.length, 0),
      serializedEventBytes: Buffer.byteLength(hugeEvents),
      totalMs: Number(elapsedMs.toFixed(3)),
    }));
  }, 15_000);
});
