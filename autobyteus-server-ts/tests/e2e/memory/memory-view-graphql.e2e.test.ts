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
        getRunMemoryView(runId: $runId, includeRawTraces: true, includeArchive: true) {
          runId
          workingContext { role content reasoning }
          episodic
          semantic
          rawTraces { id traceType sourceEvent content }
        }
      }
    `;

    const data = await execGraphql<{ getRunMemoryView: { runId: string; workingContext: Array<{ role: string }>; rawTraces: Array<{ id: string | null; traceType: string; sourceEvent: string | null }> } }>(
      query,
      { runId: agentId },
    );

    expect(data.getRunMemoryView.runId).toBe(agentId);
    expect(data.getRunMemoryView.workingContext[0]?.role).toBe("user");
    expect(data.getRunMemoryView.rawTraces.length).toBeGreaterThan(0);
    expect(data.getRunMemoryView.rawTraces.map((trace) => [trace.id, trace.traceType, trace.sourceEvent])).toEqual([
      ["rt-archive", "assistant", "SEGMENT_END"],
      ["rt-user", "user", "AgentRun.postUserMessage"],
      ["rt-tool-call", "tool_call", "TOOL_EXECUTION_STARTED"],
      ["rt-tool-result", "tool_result", "TOOL_EXECUTION_SUCCEEDED"],
    ]);
  });
});
