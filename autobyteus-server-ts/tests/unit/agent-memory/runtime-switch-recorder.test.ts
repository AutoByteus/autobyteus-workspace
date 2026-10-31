import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildRuntimeSwitch, type RuntimeSwitch } from "../../../src/agent-execution/domain/runtime-switch.js";
import { RuntimeSwitchRecorder } from "../../../src/agent-memory/services/runtime-switch-recorder.js";
import { RawTraceFileSourceService } from "../../../src/agent-memory/services/raw-trace-file-source-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { turnRecords } from "../../agent-work-journal/raw-trace-folder-fixtures.js";

/**
 * AC-002, AC-009 and invariants I-2, I-3, I-5, I-7, I-8 of the run runtime switch contract, on synthetic run folders.
 */
const lines = (file: string): Array<Record<string, any>> =>
  fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));

describe("RuntimeSwitchRecorder", () => {
  let root: string;
  let runDir: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-switch-recorder-"));
    runDir = path.join(root, "agents", "run-1");
    fs.mkdirSync(runDir, { recursive: true });
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const metadata = (): AgentRunMetadata => ({
    runId: "run-1", agentDefinitionId: "a", workspaceRootPath: "/w", memoryDir: runDir, llmModelIdentifier: "gpt-5", llmConfig: null,
    autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, startedAt: "2026-10-29T09:00:00.000Z",
    pendingRuntimeSwitch: { requestedAt: "2026-10-30T10:00:00.000Z",
      from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null, platformAgentRunId: "session-1" } },
  });
  const theSwitch = (): RuntimeSwitch => buildRuntimeSwitch(metadata())!;
  const writeOld = () => fs.writeFileSync(path.join(runDir, "raw_traces_active.jsonl"),
    [...turnRecords("t1", "git status", "clean"), ...turnRecords("t2", "pytest -q", "1 passed")].map((record) => JSON.stringify(record)).join("\n") + "\n");
  const manifest = () => JSON.parse(fs.readFileSync(path.join(runDir, "raw_traces_manifest.json"), "utf8"));

  it("builds the marker sentence with the agent runtime names of the glossary, and the key from the first save", () => {
    expect(theSwitch()).toMatchObject({
      key: "runtime_switch:run-1:2026-10-30T10:00:00.000Z",
      markerText: "Agent runtime changed from Claude Agent SDK (sonnet) to Codex App Server (gpt-5).",
    });
    expect(buildRuntimeSwitch({ ...metadata(), pendingRuntimeSwitch: undefined })).toBeNull();
  });

  it("archives the previous agent's records and starts the new file with the marker (I-2, I-3, I-7)", () => {
    writeOld();
    const before = fs.readFileSync(path.join(runDir, "raw_traces_active.jsonl"), "utf8");
    new RuntimeSwitchRecorder().record(runDir, theSwitch());

    const archived = lines(path.join(runDir, "raw_traces_000001.jsonl"));
    expect(archived).toHaveLength(8);
    expect(archived.map((record) => record.trace_type)).not.toContain("system_task_notification");
    // The archived segment holds the old records byte for byte (I-8).
    expect(fs.readFileSync(path.join(runDir, "raw_traces_000001.jsonl"), "utf8")).toBe(before);

    const active = lines(path.join(runDir, "raw_traces_active.jsonl"));
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      trace_type: "system_task_notification", sender_id: "system.runtime_handover", correlation_id: theSwitch().key,
      content: "Agent runtime changed from Claude Agent SDK (sonnet) to Codex App Server (gpt-5).",
    });
    expect(manifest().segments).toEqual([expect.objectContaining({
      index: 1, file_name: "raw_traces_000001.jsonl", boundary_type: "runtime_switch", boundary_key: theSwitch().key,
      boundary_trace_id: active[0]!.id, runtime_kind: "claude_agent_sdk", source_event: "runtime_switch", record_count: 8, status: "complete",
    })]);
  });

  it("is idempotent by key: a retry writes no second marker and no second segment (I-5, AC-009)", () => {
    writeOld();
    const recorder = new RuntimeSwitchRecorder();
    recorder.record(runDir, theSwitch());
    recorder.record(runDir, theSwitch());
    new RuntimeSwitchRecorder().record(runDir, theSwitch());
    expect(manifest().segments).toHaveLength(1);
    const markers = lines(path.join(runDir, "raw_traces_active.jsonl")).filter((record) => record.correlation_id === theSwitch().key);
    expect(markers).toHaveLength(1);
    expect(fs.readdirSync(runDir).filter((name) => /^raw_traces_\d+\.jsonl$/.test(name))).toEqual(["raw_traces_000001.jsonl"]);
  });

  it("finishes a switch that stopped after the marker was written (the rotation did not run)", () => {
    writeOld();
    const recorder = new RuntimeSwitchRecorder();
    // The first attempt wrote the marker and then failed before the rotation: simulate it with the marker alone.
    const active = lines(path.join(runDir, "raw_traces_active.jsonl"));
    fs.appendFileSync(path.join(runDir, "raw_traces_active.jsonl"), JSON.stringify({
      id: "rt_marker", ts: 1, turn_id: "runtime_switch", seq: 1, trace_type: "system_task_notification", content: theSwitch().markerText,
      source_event: "runtime_switch", sender_id: "system.runtime_handover", correlation_id: theSwitch().key,
    }) + "\n");
    expect(active).toHaveLength(8);
    recorder.record(runDir, theSwitch());
    expect(lines(path.join(runDir, "raw_traces_000001.jsonl"))).toHaveLength(8);
    expect(lines(path.join(runDir, "raw_traces_active.jsonl")).map((record) => record.id)).toEqual(["rt_marker"]);
    expect(manifest().segments[0]).toMatchObject({ boundary_trace_id: "rt_marker", runtime_kind: "claude_agent_sdk" });
  });

  it("a run with no earlier records only gets the marker as the first record: no empty segment", () => {
    new RuntimeSwitchRecorder().record(runDir, theSwitch());
    expect(lines(path.join(runDir, "raw_traces_active.jsonl"))).toHaveLength(1);
    expect(fs.existsSync(path.join(runDir, "raw_traces_manifest.json"))).toBe(false);
  });

  it("two switches in a row: every segment has its own runtime and the second marker follows the first agent's records (I-4, I-7)", () => {
    writeOld();
    const recorder = new RuntimeSwitchRecorder();
    recorder.record(runDir, theSwitch());
    fs.appendFileSync(path.join(runDir, "raw_traces_active.jsonl"), turnRecords("t3", "ls", "a").map((record) => JSON.stringify(record)).join("\n") + "\n");
    const second = buildRuntimeSwitch({
      ...metadata(), runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini",
      pendingRuntimeSwitch: { requestedAt: "2026-10-31T08:00:00.000Z",
        from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, platformAgentRunId: "thread-9" } },
    })!;
    recorder.record(runDir, second);

    expect(manifest().segments.map((segment: any) => [segment.index, segment.runtime_kind, segment.boundary_type])).toEqual([
      [1, "claude_agent_sdk", "runtime_switch"], [2, "codex_app_server", "runtime_switch"]]);
    // The second segment starts with the first marker, then the Codex records; nothing of Claude's is in it.
    const secondSegment = lines(path.join(runDir, "raw_traces_000002.jsonl"));
    expect(secondSegment[0]).toMatchObject({ correlation_id: theSwitch().key });
    expect(secondSegment).toHaveLength(5);
    const source = new RawTraceFileSourceService(new MemoryFileStore(path.dirname(runDir), { runRootSubdir: "", warnOnMissingFiles: false }));
    expect(source.listFiles("run-1", "chronological").map((file) => [file.fileName, file.runtimeKind])).toEqual([
      ["raw_traces_000001.jsonl", RuntimeKind.CLAUDE_AGENT_SDK],
      ["raw_traces_000002.jsonl", RuntimeKind.CODEX_APP_SERVER],
      ["raw_traces_active.jsonl", null],
    ]);
  });
});
