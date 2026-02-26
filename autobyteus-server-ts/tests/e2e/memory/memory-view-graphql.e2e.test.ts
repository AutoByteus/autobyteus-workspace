import "reflect-metadata";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
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

    writeJsonl(path.join(agentDir, "raw_traces.jsonl"), [
      { trace_type: "user", content: "hello", ts: 1, turn_id: "t1", seq: 1 },
      { trace_type: "tool_call", tool_call_id: "1", tool_name: "search", tool_args: { q: "x" }, ts: 2, turn_id: "t1", seq: 2 },
      { trace_type: "tool_result", tool_call_id: "1", tool_result: { ok: true }, ts: 3, turn_id: "t1", seq: 3 },
    ]);

    writeJsonl(path.join(agentDir, "raw_traces_archive.jsonl"), [
      { trace_type: "assistant", content: "old", ts: 0, turn_id: "t0", seq: 1 },
    ]);

    const query = `
      query MemoryView($runId: String!) {
        getRunMemoryView(runId: $runId, includeRawTraces: true, includeArchive: true) {
          runId
          workingContext { role content reasoning }
          episodic
          semantic
          conversation { kind toolName toolResult }
          rawTraces { traceType content }
        }
      }
    `;

    const data = await execGraphql<{ getRunMemoryView: { runId: string; workingContext: Array<{ role: string }>; conversation: Array<{ kind: string }>; rawTraces: Array<{ traceType: string }> } }>(
      query,
      { runId: agentId },
    );

    expect(data.getRunMemoryView.runId).toBe(agentId);
    expect(data.getRunMemoryView.workingContext[0]?.role).toBe("user");
    expect(data.getRunMemoryView.conversation[0]?.kind).toBe("message");
    expect(data.getRunMemoryView.rawTraces.length).toBeGreaterThan(0);
  });
});
