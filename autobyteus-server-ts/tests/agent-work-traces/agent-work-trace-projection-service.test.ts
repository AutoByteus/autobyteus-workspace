import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AgentWorkTraceProjectionContext } from "../../src/agent-work-traces/domain/work-traces.js";
import { AgentWorkTraceProjectionService } from "../../src/agent-work-traces/services/agent-work-trace-projection-service.js";

const rawTrace = (record: Record<string, unknown>): string => JSON.stringify(record);

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const writeActiveRawTraces = async (
  memoryDir: string,
  records: Array<Record<string, unknown>>,
): Promise<void> => {
  await fs.writeFile(
    path.join(memoryDir, "raw_traces_active.jsonl"),
    `${records.map(rawTrace).join("\n")}\n`,
    "utf-8",
  );
};

describe("AgentWorkTraceProjectionService", () => {
  let tempRoot: string;
  let memoryDir: string;
  let context: AgentWorkTraceProjectionContext;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "agent-work-traces-"));
    memoryDir = path.join(tempRoot, "memory", "agents", "target-run-1");
    await fs.mkdir(memoryDir, { recursive: true });
    context = {
      target: { kind: "agent_run", runId: "target-run-1" },
      memoryDir,
      targetDisplayName: "Implementation Engineer",
    };
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("projects readable work traces with canonical labels, clean metadata, tools, trace events, and hidden reasoning/backend fields", async () => {
    await writeActiveRawTraces(memoryDir, [
      {
        id: "trace-user-1",
        trace_type: "user",
        source_event: "backend_protocol",
        correlation_id: "corr-1",
        turn_id: "turn-1",
        seq: 1,
        ts: 1_788_000_000,
        content: "Please inspect the failing command.",
      },
      {
        id: "trace-assistant-1",
        trace_type: "assistant",
        source_event: "backend_protocol",
        turn_id: "turn-1",
        seq: 2,
        ts: 1_788_000_010,
        content: "Plan: I will run the command and check the result.",
      },
      {
        id: "trace-reasoning-1",
        trace_type: "reasoning",
        source_event: "backend_protocol",
        turn_id: "turn-1",
        seq: 3,
        ts: 1_788_000_015,
        content: "INTERNAL_REASONING_SHOULD_NOT_RENDER",
      },
      {
        id: "trace-tool-call-1",
        trace_type: "tool_call",
        tool_name: "run_bash",
        tool_call_id: "tool-call-1",
        turn_id: "turn-1",
        seq: 4,
        ts: 1_788_000_020,
        tool_args: { command: "npm test" },
      },
      {
        id: "trace-tool-result-1",
        trace_type: "tool_result",
        tool_name: "run_bash",
        tool_call_id: "tool-call-1",
        turn_id: "turn-1",
        seq: 5,
        ts: 1_788_000_030,
        tool_result: { exit_code: 1, stderr: "expected true to be false" },
      },
      {
        id: "trace-tool-call-2",
        trace_type: "tool_call",
        tool_name: "read_file",
        tool_call_id: "tool-call-2",
        turn_id: "turn-1",
        seq: 6,
        ts: 1_788_000_035,
        tool_args: { path: "/tmp/missing" },
      },
      {
        id: "trace-tool-result-2",
        trace_type: "tool_result",
        tool_name: "read_file",
        tool_call_id: "tool-call-2",
        turn_id: "turn-1",
        seq: 7,
        ts: 1_788_000_036,
        tool_error: "file not found",
      },
      {
        id: "trace-compaction-1",
        trace_type: "provider_compaction_boundary",
        source_event: "backend_protocol",
        turn_id: "turn-1",
        seq: 8,
        ts: 1_788_000_040,
        tool_result: { status: "completed", boundary_key: "compaction-1" },
      },
    ]);

    const result = await new AgentWorkTraceProjectionService().ensureCurrent(context);

    expect(result.workTraceRootPath).toBe(path.join(memoryDir, "work_traces"));
    expect(result.manifestPath).toBe(path.join(memoryDir, "work_traces", "work_traces_manifest.json"));
    expect(result.manifestPath).not.toContain(`${path.sep}targets${path.sep}`);
    await expect(pathExists(path.join(memoryDir, "self_evolution", "work_traces"))).resolves.toBe(false);
    expect(result).toMatchObject({
      target: { kind: "agent_run", runId: "target-run-1" },
      targetDisplayName: "Implementation Engineer",
      manifest: {
        schemaVersion: 3,
        target: { kind: "agent_run", runId: "target-run-1" },
        targetDisplayName: "Implementation Engineer",
      },
    });
    expect(result.manifest.files).toHaveLength(1);
    expect(result.manifest.files[0]).toMatchObject({
      sourceId: "active",
      sourceKind: "active",
      sourceDisplayName: "active raw traces",
      fileName: "work_trace_active.md",
      recordCount: 8,
    });
    const packageJson = JSON.stringify(result);
    expect(packageJson).not.toContain("renderContext");
    expect(packageJson).not.toContain("subjectLabel");
    expect(packageJson).not.toContain("rendererVersion");
    expect(packageJson).not.toContain("fingerprint");
    expect(result).not.toHaveProperty("targetKey");
    expect(result.manifest).not.toHaveProperty("targetKey");

    const content = await fs.readFile(result.manifest.files[0]!.filePath, "utf-8");
    expect(content.startsWith("# Work Trace\n")).toBe(true);
    expect(content).toContain("user:\nPlease inspect the failing command.");
    expect(content).toContain("assistant:\nPlan: I will run the command and check the result.");
    expect(content).toContain("tool:\nname: run_bash\nstatus: success");
    expect(content).toContain('"command": "npm test"');
    expect(content).toContain('"exit_code": 1');
    expect(content).toContain("tool:\nname: read_file\nstatus: error");
    expect(content).toContain("error:\n  file not found");
    expect(content).toContain("trace_event:\nProvider context compaction boundary recorded");
    expect(content).not.toContain("Implementation Engineer:");
    expect(content).not.toContain("Implementation Engineer reasoning:");
    expect(content).not.toContain("assistant reasoning:");
    expect(content).not.toContain("Implementation Engineer tool call:");
    expect(content).not.toContain("INTERNAL_REASONING_SHOULD_NOT_RENDER");
    expect(content).not.toContain("# Agent Work Trace");
    expect(content).not.toContain("Source:");
    expect(content).not.toContain("Records:");
    expect(content).not.toContain("First timestamp:");
    expect(content).not.toContain("Last timestamp:");
    expect(content).not.toContain("active raw traces");
    expect(content).not.toContain("source_event");
    expect(content).not.toContain("correlation_id");
    expect(content).not.toContain("turn_id");
    expect(content).not.toContain("tool_call_id");
  });

  it("keeps assistant labels independent from blank target display names and preserves team-member identity metadata", async () => {
    await writeActiveRawTraces(memoryDir, [{
      id: "active-message-1",
      trace_type: "assistant",
      ts: 1_788_000_000,
      turn_id: "active-turn",
      seq: 1,
      content: "Canonical assistant response.",
    }]);

    const result = await new AgentWorkTraceProjectionService().ensureCurrent({
      target: { kind: "team_member_run", teamRunId: "team-run-1", memberRunId: "member-run-1" },
      memoryDir,
      targetDisplayName: "   ",
    });

    expect(result.target).toEqual({ kind: "team_member_run", teamRunId: "team-run-1", memberRunId: "member-run-1" });
    expect(result.targetDisplayName).toBeNull();
    expect(result.manifest.targetDisplayName).toBeNull();
    await expect(fs.readFile(result.manifest.files[0]!.filePath, "utf-8"))
      .resolves.toContain("assistant:\nCanonical assistant response.");
    await expect(fs.readFile(result.manifest.files[0]!.filePath, "utf-8"))
      .resolves.not.toContain("Agent:\nCanonical assistant response.");
  });

  it("backfills archived and active raw traces and regenerates archive projections as current generated files", async () => {
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
      id: "archive-assistant-1",
      trace_type: "assistant",
      ts: 1_788_000_000,
      turn_id: "archive-turn",
      seq: 1,
      content: "Archived answer before compaction.",
    })}\n`, "utf-8");
    await writeActiveRawTraces(memoryDir, [{
      id: "active-assistant-1",
      trace_type: "assistant",
      ts: 1_788_000_200,
      turn_id: "active-turn",
      seq: 1,
      content: "Active response after compaction.",
    }]);

    const service = new AgentWorkTraceProjectionService();
    const first = await service.ensureCurrent(context);

    expect(first.manifest.files.map((file) => file.sourceId)).toEqual(["archive:1", "active"]);
    expect(first.manifest.files[0]).toMatchObject({
      sourceKind: "archive_segment",
      sourceDisplayName: "archive 000001",
      fileName: "work_trace_000001.md",
      recordCount: 1,
    });
    await expect(fs.readFile(first.manifest.files[0]!.filePath, "utf-8"))
      .resolves.toContain("assistant:\nArchived answer before compaction.");
    await expect(fs.readFile(first.manifest.files[1]!.filePath, "utf-8"))
      .resolves.toContain("assistant:\nActive response after compaction.");

    await fs.writeFile(first.manifest.files[0]!.filePath, "# Work Trace\n\nstale generated content\n", "utf-8");

    const second = await service.ensureCurrent(context);
    const regeneratedArchive = await fs.readFile(second.manifest.files[0]!.filePath, "utf-8");
    const regeneratedManifest = await fs.readFile(second.manifestPath, "utf-8");

    expect(regeneratedArchive).toContain("# Work Trace");
    expect(regeneratedArchive).toContain("assistant:\nArchived answer before compaction.");
    expect(regeneratedArchive).not.toContain("stale generated cache");
    expect(regeneratedArchive).not.toContain("stale generated content");
    expect(regeneratedManifest).not.toContain("renderContext");
    expect(regeneratedManifest).not.toContain("subjectLabel");
    expect(second.manifest.schemaVersion).toBe(3);
  });

  it("excludes separate reasoning text from Markdown and summary hash while keeping visible assistant rationale", async () => {
    const largeReasoningA = `INTERNAL-LARGE-A-${"x".repeat(10_000)}`;
    const largeReasoningB = `INTERNAL-LARGE-B-${"y".repeat(10_000)}`;
    const records = (reasoning: string) => [
      {
        id: "user-1",
        trace_type: "user",
        ts: 1_788_000_000,
        turn_id: "turn-1",
        seq: 1,
        content: "Need a plan before editing.",
      },
      {
        id: "assistant-visible-plan",
        trace_type: "assistant",
        ts: 1_788_000_010,
        turn_id: "turn-1",
        seq: 2,
        content: "Visible rationale: I will inspect the file first, then patch it.",
      },
      {
        id: "reasoning-1",
        trace_type: "reasoning",
        ts: 1_788_000_020,
        turn_id: "turn-1",
        seq: 3,
        content: reasoning,
      },
    ];

    const service = new AgentWorkTraceProjectionService();
    await writeActiveRawTraces(memoryDir, records(largeReasoningA));
    const first = await service.ensureCurrent(context);
    const firstContent = await fs.readFile(first.manifest.files[0]!.filePath, "utf-8");

    await writeActiveRawTraces(memoryDir, records(largeReasoningB));
    const second = await service.ensureCurrent(context);
    const secondContent = await fs.readFile(second.manifest.files[0]!.filePath, "utf-8");

    expect(firstContent).toBe(secondContent);
    expect(second.summaryHash).toBe(first.summaryHash);
    expect(secondContent).toContain("assistant:\nVisible rationale: I will inspect the file first, then patch it.");
    expect(secondContent).not.toContain("INTERNAL-LARGE-A");
    expect(secondContent).not.toContain("INTERNAL-LARGE-B");
    expect(secondContent).not.toContain("reasoning:");
  });
});
