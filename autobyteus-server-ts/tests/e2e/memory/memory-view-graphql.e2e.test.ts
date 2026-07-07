import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";

const writeJson = (filePath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf-8");
};

const writeJsonl = (filePath: string, payloads: unknown[]) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, payloads.map((p) => JSON.stringify(p)).join("\n"), "utf-8");
};

describe("Memory view GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let tempRoot: string;
  let usingTemp = false;
  let memoryDir: string;
  const createdAgentIds: string[] = [];
  const createdImportedSourceIds: string[] = [];
  const config = appConfigProvider.config;

  beforeAll(async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-memory-view-"));
    if (!config.isInitialized()) {
      config.setCustomAppDataDir(tempRoot);
      usingTemp = true;
    }
    memoryDir = config.getMemoryDir();

    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(() => {
    for (const agentId of createdAgentIds.splice(0)) {
      const dir = path.join(memoryDir, "agents", agentId);
      fs.rmSync(dir, { recursive: true, force: true });
    }
    for (const sourceNodeId of createdImportedSourceIds.splice(0)) {
      fs.rmSync(path.join(memoryDir, "imports", sourceNodeId), { recursive: true, force: true });
    }
  });

  afterAll(() => {
    if (usingTemp) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  const execGraphql = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const memoryViewRawTraceFilesQuery = `
    query MemoryViewRawTraceFiles(
      $runId: String!
      $source: MemoryExplorerSourceInput
      $includeRawTraceFiles: Boolean
      $includeArchive: Boolean
      $rawTraceFileName: String
      $rawTraceLimit: Int
    ) {
      getAgentRunMemoryView(
        runId: $runId
        source: $source
        includeWorkingContext: false
        includeEpisodic: false
        includeSemantic: false
        includeRawTraces: true
        includeRawTraceFiles: $includeRawTraceFiles
        includeArchive: $includeArchive
        rawTraceFileName: $rawTraceFileName
        rawTraceLimit: $rawTraceLimit
      ) {
        runId
        rawTraceFiles {
          fileName
          kind
          recordCount
          segmentIndex
          firstTimestamp
          lastTimestamp
        }
        selectedRawTraceFileName
        rawTraces { id traceType content seq ts }
      }
    }
  `;

  const segmentEntry = (
    index: number,
    fileName: string,
    ts: number,
    recordCount: number,
    status: "complete" | "pending",
  ) => ({
    index,
    file_name: fileName,
    boundary_type: "provider_compaction_boundary",
    boundary_key: `boundary-${index}`,
    boundary_trace_id: null,
    runtime_kind: null,
    source_event: null,
    archived_at: ts,
    first_trace_id: `segment-${index}-first`,
    last_trace_id: `segment-${index}-last`,
    first_ts: ts,
    last_ts: ts + recordCount - 1,
    record_count: recordCount,
    status,
  });

  const writeRawTraceManifest = (
    agentDir: string,
    segments: Array<ReturnType<typeof segmentEntry>>,
    nextSegmentIndex = 4,
  ) => {
    writeJson(path.join(agentDir, "raw_traces_manifest.json"), {
      schema_version: 1,
      next_segment_index: nextSegmentIndex,
      segments,
    });
  };

  it("returns memory view with conversation and raw traces", async () => {
    const agentId = "memory-view-agent";
    createdAgentIds.push(agentId);

    const agentDir = path.join(memoryDir, "agents", agentId);
    writeJson(path.join(agentDir, "working_context_snapshot.json"), {
      messages: [{ role: "user", content: "hello", reasoning_content: "why" }],
    });

    writeJsonl(path.join(agentDir, "episodic.jsonl"), [{ summary: "episode" }]);
    writeJsonl(path.join(agentDir, "semantic.jsonl"), [{ fact: "fact" }]);

    const runStore = new RunMemoryFileStore(agentDir);
    runStore.appendRawTrace(new RawTraceItem({
      id: "rt-archive",
      traceType: "assistant",
      sourceEvent: "SEGMENT_END",
      content: "old",
      ts: 0,
      turnId: "t0",
      seq: 1,
    }));
    runStore.pruneRawTracesById(["rt-archive"]);
    for (const trace of [
      new RawTraceItem({ id: "rt-user", traceType: "user", sourceEvent: "AgentRun.postUserMessage", content: "hello", ts: 1, turnId: "t1", seq: 1 }),
      new RawTraceItem({ id: "rt-tool-call", traceType: "tool_call", sourceEvent: "TOOL_EXECUTION_STARTED", content: "", toolCallId: "1", toolName: "search", toolArgs: { q: "x" }, ts: 2, turnId: "t1", seq: 2 }),
      new RawTraceItem({ id: "rt-tool-result", traceType: "tool_result", sourceEvent: "TOOL_EXECUTION_SUCCEEDED", content: "", toolCallId: "1", toolResult: { ok: true }, ts: 3, turnId: "t1", seq: 3 }),
    ]) {
      runStore.appendRawTrace(trace);
    }

    const query = `
      query MemoryView($runId: String!) {
        getAgentRunMemoryView(runId: $runId, includeRawTraces: true, includeArchive: true) {
          runId
          workingContext { role content reasoning }
          episodic
          semantic
          rawTraces { id traceType sourceEvent content }
        }
      }
    `;

    const data = await execGraphql<{ getAgentRunMemoryView: { runId: string; workingContext: Array<{ role: string }>; rawTraces: Array<{ id: string | null; traceType: string; sourceEvent: string | null }> } }>(
      query,
      { runId: agentId },
    );

    expect(data.getAgentRunMemoryView.runId).toBe(agentId);
    expect(data.getAgentRunMemoryView.workingContext[0]?.role).toBe("user");
    expect(data.getAgentRunMemoryView.rawTraces.length).toBeGreaterThan(0);
    expect(data.getAgentRunMemoryView.rawTraces.map((trace) => [trace.id, trace.traceType, trace.sourceEvent])).toEqual([
      ["rt-archive", "assistant", "SEGMENT_END"],
      ["rt-user", "user", "AgentRun.postUserMessage"],
      ["rt-tool-call", "tool_call", "TOOL_EXECUTION_STARTED"],
      ["rt-tool-result", "tool_result", "TOOL_EXECUTION_SUCCEEDED"],
    ]);
  });

  it("returns active raw trace file metadata and defaults to the active file", async () => {
    const agentId = "memory-view-active-raw-traces";
    createdAgentIds.push(agentId);
    const agentDir = path.join(memoryDir, "agents", agentId);
    writeJsonl(path.join(agentDir, "raw_traces_active.jsonl"), [
      { id: "active-1", trace_type: "user", content: "active one", ts: 1, turn_id: "t1", seq: 1 },
      { id: "active-2", trace_type: "assistant", content: "active two", ts: 2, turn_id: "t1", seq: 2 },
    ]);

    const data = await execGraphql<{
      getAgentRunMemoryView: {
        rawTraceFiles: Array<{ fileName: string; kind: string; recordCount: number; segmentIndex: number | null }>;
        selectedRawTraceFileName: string | null;
        rawTraces: Array<{ id: string | null; content: string | null }>;
      };
    }>(memoryViewRawTraceFilesQuery, {
      runId: agentId,
      includeRawTraceFiles: true,
      rawTraceLimit: 1,
    });

    expect(data.getAgentRunMemoryView.rawTraceFiles).toEqual([
      {
        fileName: "raw_traces_active.jsonl",
        kind: "active",
        recordCount: 2,
        segmentIndex: null,
        firstTimestamp: null,
        lastTimestamp: null,
      },
    ]);
    expect(data.getAgentRunMemoryView.selectedRawTraceFileName).toBe("raw_traces_active.jsonl");
    expect(data.getAgentRunMemoryView.rawTraces.map((trace) => [trace.id, trace.content])).toEqual([
      ["active-2", "active two"],
    ]);
  });

  it("selects complete segment files, hides pending files, rejects absolute selectors, and preserves merged corpus mode", async () => {
    const agentId = "memory-view-segmented-raw-traces";
    createdAgentIds.push(agentId);
    const agentDir = path.join(memoryDir, "agents", agentId);

    writeJsonl(path.join(agentDir, "raw_traces_active.jsonl"), [
      { id: "active-1", trace_type: "assistant", content: "active only", ts: 30, turn_id: "t3", seq: 3 },
    ]);
    writeJsonl(path.join(agentDir, "raw_traces_000001.jsonl"), [
      { id: "segment-1a", trace_type: "user", content: "old segment", ts: 10, turn_id: "t1", seq: 1 },
    ]);
    writeJsonl(path.join(agentDir, "raw_traces_000002.jsonl"), [
      { id: "segment-2a", trace_type: "assistant", content: "new segment one", ts: 20, turn_id: "t2", seq: 1 },
      { id: "segment-2b", trace_type: "assistant", content: "new segment two", ts: 21, turn_id: "t2", seq: 2 },
    ]);
    writeJsonl(path.join(agentDir, "raw_traces_000003.jsonl"), [
      { id: "pending-1", trace_type: "assistant", content: "pending should stay hidden", ts: 25, turn_id: "tp", seq: 1 },
    ]);
    writeRawTraceManifest(agentDir, [
      segmentEntry(1, "raw_traces_000001.jsonl", 10, 1, "complete"),
      segmentEntry(2, "raw_traces_000002.jsonl", 20, 2, "complete"),
      segmentEntry(3, "raw_traces_000003.jsonl", 25, 1, "pending"),
    ]);

    const selectedData = await execGraphql<{
      getAgentRunMemoryView: {
        rawTraceFiles: Array<{ fileName: string; kind: string; recordCount: number; segmentIndex: number | null }>;
        selectedRawTraceFileName: string | null;
        rawTraces: Array<{ id: string | null; content: string | null }>;
      };
    }>(memoryViewRawTraceFilesQuery, {
      runId: agentId,
      includeRawTraceFiles: true,
      rawTraceFileName: "raw_traces_000002.jsonl",
    });

    expect(selectedData.getAgentRunMemoryView.rawTraceFiles.map((file) => [
      file.fileName,
      file.kind,
      file.recordCount,
      file.segmentIndex,
    ])).toEqual([
      ["raw_traces_active.jsonl", "active", 1, null],
      ["raw_traces_000002.jsonl", "segment", 2, 2],
      ["raw_traces_000001.jsonl", "segment", 1, 1],
    ]);
    expect(selectedData.getAgentRunMemoryView.selectedRawTraceFileName).toBe("raw_traces_000002.jsonl");
    expect(selectedData.getAgentRunMemoryView.rawTraces.map((trace) => [trace.id, trace.content])).toEqual([
      ["segment-2a", "new segment one"],
      ["segment-2b", "new segment two"],
    ]);

    const invalidSelectorData = await execGraphql<{
      getAgentRunMemoryView: {
        selectedRawTraceFileName: string | null;
        rawTraces: Array<{ id: string | null; content: string | null }>;
      };
    }>(memoryViewRawTraceFilesQuery, {
      runId: agentId,
      includeRawTraceFiles: true,
      rawTraceFileName: path.join(agentDir, "raw_traces_000002.jsonl"),
    });

    expect(invalidSelectorData.getAgentRunMemoryView.selectedRawTraceFileName).toBe("raw_traces_active.jsonl");
    expect(invalidSelectorData.getAgentRunMemoryView.rawTraces.map((trace) => [trace.id, trace.content])).toEqual([
      ["active-1", "active only"],
    ]);

    const staleOldSelectorData = await execGraphql<{
      getAgentRunMemoryView: {
        selectedRawTraceFileName: string | null;
        rawTraces: Array<{ id: string | null; content: string | null }>;
      };
    }>(memoryViewRawTraceFilesQuery, {
      runId: agentId,
      includeRawTraceFiles: true,
      rawTraceFileName: "raw_traces.jsonl",
    });

    expect(staleOldSelectorData.getAgentRunMemoryView.selectedRawTraceFileName).toBe("raw_traces_active.jsonl");
    expect(staleOldSelectorData.getAgentRunMemoryView.rawTraces.map((trace) => [trace.id, trace.content])).toEqual([
      ["active-1", "active only"],
    ]);

    const mergedData = await execGraphql<{
      getAgentRunMemoryView: {
        rawTraceFiles: null;
        selectedRawTraceFileName: null;
        rawTraces: Array<{ id: string | null; content: string | null }>;
      };
    }>(memoryViewRawTraceFilesQuery, {
      runId: agentId,
      includeArchive: true,
    });

    expect(mergedData.getAgentRunMemoryView.rawTraceFiles).toBeNull();
    expect(mergedData.getAgentRunMemoryView.selectedRawTraceFileName).toBeNull();
    expect(mergedData.getAgentRunMemoryView.rawTraces.map((trace) => [trace.id, trace.content])).toEqual([
      ["segment-1a", "old segment"],
      ["segment-2a", "new segment one"],
      ["segment-2b", "new segment two"],
      ["active-1", "active only"],
    ]);
  });

  it("uses raw trace file selection for imported read-only memory sources", async () => {
    const sourceNodeId = "imported-raw-trace-source";
    const agentId = "memory-view-imported-agent";
    createdImportedSourceIds.push(sourceNodeId);
    const importRoot = path.join(memoryDir, "imports", sourceNodeId);
    const agentDir = path.join(importRoot, "agents", agentId);

    writeJson(path.join(importRoot, "source-node.json"), {
      schemaVersion: 1,
      sourceNodeId,
      displayName: "Imported Raw Trace Source",
      firstImportedAt: "2026-06-25T00:00:00.000Z",
      lastImportedAt: "2026-06-25T00:00:00.000Z",
      lastKnownEndpoint: null,
      lastSyncStatus: null,
      lastError: null,
    });
    writeJsonl(path.join(agentDir, "raw_traces_active.jsonl"), [
      { id: "imported-active", trace_type: "assistant", content: "imported active", ts: 12, turn_id: "ti", seq: 2 },
    ]);
    writeJsonl(path.join(agentDir, "raw_traces_000001.jsonl"), [
      { id: "imported-segment", trace_type: "user", content: "imported segment", ts: 11, turn_id: "ti", seq: 1 },
    ]);
    writeRawTraceManifest(agentDir, [
      segmentEntry(1, "raw_traces_000001.jsonl", 11, 1, "complete"),
    ], 2);

    const data = await execGraphql<{
      getAgentRunMemoryView: {
        rawTraceFiles: Array<{ fileName: string; kind: string; recordCount: number }>;
        selectedRawTraceFileName: string | null;
        rawTraces: Array<{ id: string | null; content: string | null }>;
      };
    }>(memoryViewRawTraceFilesQuery, {
      runId: agentId,
      source: { type: "IMPORTED", sourceNodeId },
      includeRawTraceFiles: true,
      rawTraceFileName: "raw_traces_000001.jsonl",
    });

    expect(data.getAgentRunMemoryView.rawTraceFiles.map((file) => [file.fileName, file.kind, file.recordCount])).toEqual([
      ["raw_traces_active.jsonl", "active", 1],
      ["raw_traces_000001.jsonl", "segment", 1],
    ]);
    expect(data.getAgentRunMemoryView.selectedRawTraceFileName).toBe("raw_traces_000001.jsonl");
    expect(data.getAgentRunMemoryView.rawTraces.map((trace) => [trace.id, trace.content])).toEqual([
      ["imported-segment", "imported segment"],
    ]);
  });
});
