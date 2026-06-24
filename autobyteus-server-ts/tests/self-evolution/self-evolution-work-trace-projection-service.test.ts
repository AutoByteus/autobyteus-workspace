import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentDefinition } from "../../src/agent-definition/domain/models.js";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import type { SelfEvolutionTargetContext } from "../../src/self-evolution/services/self-evolution-target-context-resolver.js";
import { SelfEvolutionWorkTraceProjectionService } from "../../src/self-evolution/services/work-traces/self-evolution-work-trace-projection-service.js";

const rawTrace = (record: Record<string, unknown>): string => JSON.stringify(record);

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
};

describe("SelfEvolutionWorkTraceProjectionService", () => {
  let tempRoot: string;
  let memoryDir: string;
  let context: SelfEvolutionTargetContext;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "self-evolution-work-traces-"));
    memoryDir = path.join(tempRoot, "memory", "agents", "target-run-1");
    await fs.mkdir(memoryDir, { recursive: true });
    context = {
      target: { kind: "agent_run", runId: "target-run-1" },
      sourceRunIds: ["target-run-1"],
      targetAgentDefinition: new AgentDefinition({
        id: "target-agent",
        name: "Target Agent",
        description: "Target agent",
        instructions: "Use skills.",
      }),
      agentDefinitionId: "target-agent",
      agentName: "Target Agent",
      workspaceRootPath: tempRoot,
      memoryDir,
      runMetadataPath: path.join(memoryDir, "run_metadata.json"),
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      llmModelIdentifier: "model",
      llmConfig: null,
      effectiveConfig: null,
      targetMetadata: {} as any,
    };
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("projects readable work trace files with merged tools and hidden backend fields", async () => {
    await fs.writeFile(path.join(memoryDir, "raw_traces.jsonl"), [
      rawTrace({
        id: "trace-user-1",
        trace_type: "user",
        source_event: "backend_protocol",
        correlation_id: "corr-1",
        turn_id: "turn-1",
        seq: 1,
        ts: 1_788_000_000,
        content: "Please inspect the failing command.",
      }),
      rawTrace({
        id: "trace-worker-1",
        trace_type: "assistant",
        source_event: "backend_protocol",
        turn_id: "turn-1",
        seq: 2,
        ts: 1_788_000_010,
        content: "I will run the command and check the result.",
      }),
      rawTrace({
        id: "trace-tool-call-1",
        trace_type: "tool_call",
        tool_name: "run_bash",
        tool_call_id: "tool-call-1",
        turn_id: "turn-1",
        seq: 3,
        ts: 1_788_000_020,
        tool_args: { command: "npm test" },
      }),
      rawTrace({
        id: "trace-tool-result-1",
        trace_type: "tool_result",
        tool_name: "run_bash",
        tool_call_id: "tool-call-1",
        turn_id: "turn-1",
        seq: 4,
        ts: 1_788_000_030,
        tool_result: { exit_code: 1, stderr: "expected true to be false" },
      }),
    ].join("\n") + "\n", "utf-8");

    const result = await new SelfEvolutionWorkTraceProjectionService().ensureCurrent(context);

    expect(result.workTraceRootPath).toBe(path.join(memoryDir, "self_evolution", "work_traces"));
    expect(result.manifestPath).toBe(path.join(memoryDir, "self_evolution", "work_traces", "work_traces_manifest.json"));
    expect(result.manifestPath).not.toContain(`${path.sep}targets${path.sep}`);
    expect(result).not.toHaveProperty("targetKey");
    expect(result.manifest).not.toHaveProperty("targetKey");
    expect(result.manifest.files).toHaveLength(1);
    expect(result.manifest.files[0]).toMatchObject({ sourceKind: "active", fileName: "work_trace_active.md", recordCount: 4 });

    const content = await fs.readFile(result.manifest.files[0]!.filePath, "utf-8");
    expect(content).toContain("user:\nPlease inspect the failing command.");
    expect(content).toContain("worker:\nI will run the command and check the result.");
    expect(content).toContain("tool: run_bash");
    expect(content).toContain('"command": "npm test"');
    expect(content).toContain('"exit_code": 1');
    expect(content).not.toContain("source_event");
    expect(content).not.toContain("correlation_id");
    expect(content).not.toContain("turn_id");
    expect(content).not.toContain("tool_call_id");
  });

  it("backfills archived and active raw traces and reuses unchanged archive projections on catch-up", async () => {
    await fs.writeFile(path.join(memoryDir, "raw_traces_archive_manifest.json"), JSON.stringify({
      schema_version: 1,
      next_segment_index: 2,
      segments: [{
        index: 1,
        file_name: "raw_traces_000001.jsonl",
        boundary_type: "provider_compaction_boundary",
        boundary_key: "compaction-1",
        archived_at: 1_788_000_100,
        record_count: 1,
        status: "complete",
      }],
    }, null, 2), "utf-8");
    await fs.writeFile(path.join(memoryDir, "raw_traces_000001.jsonl"), `${rawTrace({
      id: "archive-user-1",
      trace_type: "user",
      ts: 1_788_000_000,
      turn_id: "archive-turn",
      seq: 1,
      content: "Archived request before compaction.",
    })}\n`, "utf-8");
    await fs.writeFile(path.join(memoryDir, "raw_traces.jsonl"), `${rawTrace({
      id: "active-worker-1",
      trace_type: "assistant",
      ts: 1_788_000_200,
      turn_id: "active-turn",
      seq: 1,
      content: "Active response after compaction.",
    })}\n`, "utf-8");

    const service = new SelfEvolutionWorkTraceProjectionService();
    const first = await service.ensureCurrent(context);

    expect(first.manifest.files).toHaveLength(2);
    expect(first.manifest.files.map((file) => file.sourceId)).toEqual(["archive:1", "active"]);
    expect(first.manifest.files[0]).toMatchObject({
      sourceKind: "archive_segment",
      fileName: "work_trace_000001.md",
      recordCount: 1,
    });
    expect(first.manifest.files[1]).toMatchObject({
      sourceKind: "active",
      fileName: "work_trace_active.md",
      recordCount: 1,
    });
    await expect(pathExists(first.manifestPath)).resolves.toBe(true);

    const archiveContent = await fs.readFile(first.manifest.files[0]!.filePath, "utf-8");
    const activeContent = await fs.readFile(first.manifest.files[1]!.filePath, "utf-8");
    expect(archiveContent).toContain("Archived request before compaction.");
    expect(activeContent).toContain("Active response after compaction.");
    expect(archiveContent).toContain("[2026-");
    expect(activeContent).toContain("[2026-");

    const archiveGeneratedAt = first.manifest.files[0]!.generatedAt;
    await fs.appendFile(path.join(memoryDir, "raw_traces.jsonl"), `${rawTrace({
      id: "active-worker-2",
      trace_type: "assistant",
      ts: 1_788_000_300,
      turn_id: "active-turn-2",
      seq: 1,
      content: "New active response before the later click.",
    })}\n`, "utf-8");

    const second = await service.ensureCurrent(context);

    expect(second.manifest.files).toHaveLength(2);
    expect(second.manifest.files[0]!.generatedAt).toBe(archiveGeneratedAt);
    expect(second.manifest.files[1]).toMatchObject({ sourceKind: "active", recordCount: 2 });
    await expect(fs.readFile(second.manifest.files[1]!.filePath, "utf-8"))
      .resolves.toContain("New active response before the later click.");
  });
});
