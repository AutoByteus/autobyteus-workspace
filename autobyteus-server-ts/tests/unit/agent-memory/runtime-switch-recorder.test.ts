import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildRuntimeSwitch, runtimeSwitchMarkerTraceId, type RuntimeSwitch } from "../../../src/agent-execution/domain/runtime-switch.js";
import { RuntimeSwitchRecorder } from "../../../src/agent-memory/services/runtime-switch-recorder.js";
import { RawTraceFileSourceService } from "../../../src/agent-memory/services/raw-trace-file-source-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { turnRecords } from "../../agent-work-journal/raw-trace-folder-fixtures.js";

/**
 * AC-002, AC-009 and invariants I-2, I-3, I-5, I-7, I-8 of the run runtime switch contract, on synthetic run folders: the ticket
 * (`begin`), the archive step (`record`) and the removal of a failed attempt's records (`discard`).
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
    pendingRuntimeSwitch: { switchId: "switch-1",
      from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null, platformAgentRunId: "session-1" } },
  });
  const theSwitch = (): RuntimeSwitch => buildRuntimeSwitch(metadata())!;
  const writeOld = () => fs.writeFileSync(path.join(runDir, "raw_traces_active.jsonl"),
    [...turnRecords("t1", "git status", "clean"), ...turnRecords("t2", "pytest -q", "1 passed")].map((record) => JSON.stringify(record)).join("\n") + "\n");
  const manifest = () => JSON.parse(fs.readFileSync(path.join(runDir, "raw_traces_manifest.json"), "utf8"));

  const activePath = () => path.join(runDir, "raw_traces_active.jsonl");
  const appendActive = (...records: Array<Record<string, unknown>>) =>
    fs.appendFileSync(activePath(), records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  /** A record the new agent's candidate writes while it prepares (a native agent's system instruction). */
  const candidateRecord = (id = "rt_candidate_instruction") => ({
    id, ts: 5, trace_type: "system_instruction", content: "You are the new agent.", source_event: "system_instructions_supplied",
  });
  const activeIds = () => lines(activePath()).map((record) => record.id);

  it("builds the marker sentence with the agent runtime names of the glossary, the key from the switch ID and a marker ID derived from the key", () => {
    expect(theSwitch()).toMatchObject({
      key: "runtime_switch:run-1:switch-1",
      markerTraceId: runtimeSwitchMarkerTraceId("runtime_switch:run-1:switch-1"),
      markerText: "Agent runtime changed from Claude Agent SDK (sonnet) to Codex App Server (gpt-5).",
    });
    expect(theSwitch().markerTraceId).toMatch(/^rt_runtime_switch_[0-9a-f]{24}$/);
    expect(runtimeSwitchMarkerTraceId("runtime_switch:run-1:switch-2")).not.toBe(theSwitch().markerTraceId);
    expect(buildRuntimeSwitch({ ...metadata(), pendingRuntimeSwitch: undefined })).toBeNull();
  });

  it("begin takes the last record as the watermark and writes nothing", () => {
    const recorder = new RuntimeSwitchRecorder();
    expect(recorder.begin(runDir, theSwitch()).watermarkTraceId).toBeNull();
    writeOld();
    const before = fs.readFileSync(activePath(), "utf8");
    const ticket = recorder.begin(runDir, theSwitch());
    expect(ticket.watermarkTraceId).toBe(activeIds().at(-1));
    expect(ticket.runtimeSwitch).toEqual(theSwitch());
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);
    expect(fs.existsSync(path.join(runDir, "raw_traces_manifest.json"))).toBe(false);
  });

  it("archives the previous agent's records and starts the new file with the marker (I-2, I-3, I-7)", () => {
    writeOld();
    const before = fs.readFileSync(activePath(), "utf8");
    const recorder = new RuntimeSwitchRecorder();
    recorder.record(runDir, recorder.begin(runDir, theSwitch()));

    const archived = lines(path.join(runDir, "raw_traces_000001.jsonl"));
    expect(archived).toHaveLength(8);
    expect(archived.map((record) => record.trace_type)).not.toContain("system_task_notification");
    // The archived segment holds the old records byte for byte (I-8).
    expect(fs.readFileSync(path.join(runDir, "raw_traces_000001.jsonl"), "utf8")).toBe(before);

    const active = lines(activePath());
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      id: theSwitch().markerTraceId, trace_type: "system_task_notification", sender_id: "system.runtime_handover", correlation_id: theSwitch().key,
      content: "Agent runtime changed from Claude Agent SDK (sonnet) to Codex App Server (gpt-5).",
    });
    expect(manifest().segments).toEqual([expect.objectContaining({
      index: 1, file_name: "raw_traces_000001.jsonl", boundary_type: "runtime_switch", boundary_key: theSwitch().key,
      boundary_trace_id: theSwitch().markerTraceId, runtime_kind: "claude_agent_sdk", source_event: "runtime_switch", record_count: 8, status: "complete",
    })]);
  });

  it("keeps the records the new agent's candidate wrote while it prepared out of the previous agent's segment (I-7)", () => {
    writeOld();
    const recorder = new RuntimeSwitchRecorder();
    const ticket = recorder.begin(runDir, theSwitch());
    appendActive(candidateRecord());
    recorder.record(runDir, ticket);
    expect(lines(path.join(runDir, "raw_traces_000001.jsonl")).map((record) => record.id)).not.toContain("rt_candidate_instruction");
    expect(lines(path.join(runDir, "raw_traces_000001.jsonl"))).toHaveLength(8);
    expect(activeIds()).toEqual([theSwitch().markerTraceId, "rt_candidate_instruction"]);
  });

  it("is idempotent by key: a repeated call and a retry with a new ticket write no second marker and no second segment (I-5, AC-009)", () => {
    writeOld();
    const recorder = new RuntimeSwitchRecorder();
    const ticket = recorder.begin(runDir, theSwitch());
    appendActive(candidateRecord());
    recorder.record(runDir, ticket);
    recorder.record(runDir, ticket);
    // a failed commit, then sending again: the new ticket's watermark is the last record now, and it is ignored
    appendActive(turnRecords("t3", "ls", "a")[0]!);
    new RuntimeSwitchRecorder().record(runDir, recorder.begin(runDir, theSwitch()));
    expect(manifest().segments).toHaveLength(1);
    expect(lines(activePath()).filter((record) => record.correlation_id === theSwitch().key)).toHaveLength(1);
    expect(activeIds()[0]).toBe(theSwitch().markerTraceId);
    expect(activeIds()).toHaveLength(3);
    expect(fs.readdirSync(runDir).filter((name) => /^raw_traces_\d+\.jsonl$/.test(name))).toEqual(["raw_traces_000001.jsonl"]);
  });

  it("a failed attempt leaves nothing behind: discard removes what the candidate wrote, and the retry archives the same records (AC-009)", () => {
    writeOld();
    const before = fs.readFileSync(activePath(), "utf8");
    const recorder = new RuntimeSwitchRecorder();
    const ticket = recorder.begin(runDir, theSwitch());
    appendActive(candidateRecord("rt_failed_candidate"));
    recorder.discard(runDir, ticket);
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);
    expect(fs.existsSync(path.join(runDir, "raw_traces_manifest.json"))).toBe(false);

    const retry = recorder.begin(runDir, theSwitch());
    appendActive(candidateRecord("rt_second_candidate"));
    recorder.record(runDir, retry);
    expect(lines(path.join(runDir, "raw_traces_000001.jsonl"))).toHaveLength(8);
    expect(activeIds()).toEqual([theSwitch().markerTraceId, "rt_second_candidate"]);
  });

  it("discard is a no-op once the marker is in the file (the attempt reached record)", () => {
    writeOld();
    const recorder = new RuntimeSwitchRecorder();
    const ticket = recorder.begin(runDir, theSwitch());
    appendActive(candidateRecord());
    recorder.record(runDir, ticket);
    recorder.discard(runDir, ticket);
    expect(activeIds()).toEqual([theSwitch().markerTraceId, "rt_candidate_instruction"]);
  });

  it("a failed attempt on a run that already switched once still discards: the file starts with the earlier marker", () => {
    writeOld();
    const recorder = new RuntimeSwitchRecorder();
    recorder.record(runDir, recorder.begin(runDir, theSwitch()));
    appendActive(...turnRecords("t3", "ls", "a"));
    const before = fs.readFileSync(activePath(), "utf8");

    const second = buildRuntimeSwitch({
      ...metadata(), runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini",
      pendingRuntimeSwitch: { switchId: "switch-2",
        from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, platformAgentRunId: "thread-9" } },
    })!;
    const ticket = recorder.begin(runDir, second);
    appendActive(candidateRecord("rt_failed_candidate"));
    recorder.discard(runDir, ticket);
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);
    expect(manifest().segments).toHaveLength(1);
  });

  it("finishes a switch whose archive was written and whose rewrite was interrupted", () => {
    writeOld();
    const recorder = new RuntimeSwitchRecorder();
    const ticket = recorder.begin(runDir, theSwitch());
    appendActive(candidateRecord());
    const preRewrite = fs.readFileSync(activePath(), "utf8");
    recorder.record(runDir, ticket);
    fs.writeFileSync(activePath(), preRewrite);
    recorder.record(runDir, recorder.begin(runDir, theSwitch()));
    expect(activeIds()).toEqual([theSwitch().markerTraceId, "rt_candidate_instruction"]);
    expect(manifest().segments).toHaveLength(1);
  });

  it("a run with no earlier records only gets the marker as the first record: no empty segment", () => {
    const recorder = new RuntimeSwitchRecorder();
    recorder.record(runDir, recorder.begin(runDir, theSwitch()));
    expect(lines(activePath())).toHaveLength(1);
    expect(fs.existsSync(path.join(runDir, "raw_traces_manifest.json"))).toBe(false);
  });

  it("two switches in a row: every segment has its own runtime and the second segment starts with the first marker (I-4, I-7)", () => {
    writeOld();
    const recorder = new RuntimeSwitchRecorder();
    recorder.record(runDir, recorder.begin(runDir, theSwitch()));
    appendActive(...turnRecords("t3", "ls", "a"));
    const second = buildRuntimeSwitch({
      ...metadata(), runtimeKind: RuntimeKind.ANTIGRAVITY_CLI, llmModelIdentifier: "gemini",
      pendingRuntimeSwitch: { switchId: "switch-2",
        from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, platformAgentRunId: "thread-9" } },
    })!;
    recorder.record(runDir, recorder.begin(runDir, second));

    expect(manifest().segments.map((segment: any) => [segment.index, segment.runtime_kind, segment.boundary_type])).toEqual([
      [1, "claude_agent_sdk", "runtime_switch"], [2, "codex_app_server", "runtime_switch"]]);
    const secondSegment = lines(path.join(runDir, "raw_traces_000002.jsonl"));
    expect(secondSegment[0]).toMatchObject({ correlation_id: theSwitch().key });
    expect(secondSegment).toHaveLength(5);
    expect(activeIds()).toEqual([second.markerTraceId]);
    const source = new RawTraceFileSourceService(new MemoryFileStore(path.dirname(runDir), { runRootSubdir: "", warnOnMissingFiles: false }));
    expect(source.listFiles("run-1", "chronological").map((file) => [file.fileName, file.runtimeKind])).toEqual([
      ["raw_traces_000001.jsonl", RuntimeKind.CLAUDE_AGENT_SDK],
      ["raw_traces_000002.jsonl", RuntimeKind.CODEX_APP_SERVER],
      ["raw_traces_active.jsonl", null],
    ]);
  });
});
