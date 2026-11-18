import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";
import { RuntimeSwitchRecorder } from "../../../src/agent-memory/services/runtime-switch-recorder.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { turnRecords } from "../../agent-work-journal/raw-trace-folder-fixtures.js";

vi.mock("../../../src/run-history/services/root-run-package-readiness-index.js", () => ({
  RootRunPackageReadinessIndex: class { assertAdmitted = async () => undefined; },
}));

/**
 * ARCH-F-007, CRR-002 F-1 (autobyteus-316): the lifecycle with the real recorder and real raw-trace files. A candidate writes a
 * record of its own while it prepares (a native agent's system instruction, Grok's captured instructions). A failed attempt must
 * leave the previous agent's file exactly as it was; a retry, or an abandoned attempt, must never put the candidate's record into
 * the previous agent's segment (I-7).
 */
const RUN_ID = "run-1";
const HOST = { memberExecutionContext: { identity: { agentRunId: RUN_ID }, teamScoped: false } as never };
const NATIVE_SESSION = "22222222-2222-4222-8222-222222222222";

describe("failed attempts of a switch, with the real recorder and files", () => {
  let root: string;
  let runDir: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-switch-attempts-"));
    runDir = path.join(root, "agents", RUN_ID);
    fs.mkdirSync(runDir, { recursive: true });
  });
  afterEach(() => { vi.restoreAllMocks(); fs.rmSync(root, { recursive: true, force: true }); });

  const activePath = () => path.join(runDir, "raw_traces_active.jsonl");
  const lines = (file: string): Array<Record<string, any>> =>
    fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const writeEra = (records: Array<Record<string, unknown>>) =>
    fs.writeFileSync(activePath(), records.map((record) => JSON.stringify(record)).join("\n") + "\n");
  const appendCandidateRecord = (content: string) => fs.appendFileSync(activePath(), JSON.stringify({
    id: `rt_${content}`, ts: 99, trace_type: "system_instruction", content, source_event: "system_instructions_supplied",
  }) + "\n");

  const pendingMetadata = (overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
    runId: RUN_ID, agentDefinitionId: "agent-1", workspaceRootPath: "/w", memoryDir: runDir, llmModelIdentifier: "native-model", llmConfig: null,
    autoExecuteTools: false, runtimeKind: RuntimeKind.AUTOBYTEUS, platformAgentRunId: null, startedAt: "2026-10-29T09:00:00.000Z",
    pendingRuntimeSwitch: { switchId: "switch-1",
      from: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, platformAgentRunId: "thread-1" } },
    ...overrides,
  });

  /** A lifecycle whose manager runs `prepareScript` for every attempt, with the real recorder as the memory port. */
  const lifecycle = (prepareScript: Array<() => Promise<unknown>>, initial: AgentRunMetadata = pendingMetadata()) => {
    let stored = initial;
    const manager = testActivationManager({
      getActiveRun: vi.fn(() => null),
      newPreparation: vi.fn(async () => prepareScript.shift()!()),
      restorePreparation: vi.fn(), platformPreparation: vi.fn(),
    });
    const service = new StandaloneAgentRunLifecycleService("/unused", {
      agentRunManager: manager as never,
      metadataService: { readMetadataState: vi.fn(async () => ({ kind: "present" as const, metadata: stored })) } as never,
      historyCatalogService: { recordRunStarted: vi.fn(async (input: AgentRunMetadata & { clearPendingRuntimeSwitch?: boolean }) => {
        const { clearPendingRuntimeSwitch, ...written } = input;
        stored = written;
        return written;
      }) } as never,
      workspaceManager: { ensureWorkspaceByRootPath: vi.fn(async () => ({ workspaceId: "workspace-1" })) } as never,
      tokenUsageReadiness: { assertCurrentSchemaReady: () => undefined, assertExistingRunRestoreReady: () => undefined },
      modelSelectionValidator: { validate: vi.fn() } as never,
      switching: { memory: new RuntimeSwitchRecorder() },
    });
    return { service, getStored: () => stored };
  };
  const nativeCandidate = (instruction: string) => ({
    runId: RUN_ID, runtimeKind: RuntimeKind.AUTOBYTEUS, platformAgentRunId: NATIVE_SESSION,
    commitPublication: vi.fn(() => ({ runId: RUN_ID })), abort: vi.fn(async () => ({ kind: "aborted" as const })),
    instruction,
  });
  /** A native preparation: it writes its system instruction, then succeeds. */
  const preparesNative = (instruction: string) => async () => { appendCandidateRecord(instruction); return nativeCandidate(instruction); };
  const startFailsAfterInstruction = (instruction: string) => async () => { appendCandidateRecord(instruction); throw new Error("native start failed"); };

  it("a native start that throws after its instruction was written leaves the previous file untouched; the retry archives only the previous agent's records", async () => {
    writeEra(turnRecords("t1", "git status", "clean"));
    const before = fs.readFileSync(activePath(), "utf8");
    const { service, getStored } = lifecycle([startFailsAfterInstruction("instruction-1"), preparesNative("instruction-2")]);

    await expect(service.activateHost(RUN_ID, HOST)).rejects.toThrow("native start failed");
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);
    expect(fs.existsSync(path.join(runDir, "raw_traces_manifest.json"))).toBe(false);
    expect(getStored().pendingRuntimeSwitch).toBeDefined();

    await service.activateHost(RUN_ID, HOST);
    const archived = lines(path.join(runDir, "raw_traces_000001.jsonl"));
    expect(archived.map((record) => record.trace_type)).toEqual(["user", "tool_call", "tool_result", "assistant"]);
    expect(archived.map((record) => record.content)).not.toContain("instruction-1");
    expect(archived.map((record) => record.content)).not.toContain("instruction-2");
    const active = lines(activePath());
    expect(active.map((record) => record.trace_type)).toEqual(["system_task_notification", "system_instruction"]);
    expect(active[1]!.content).toBe("instruction-2");
    expect(getStored().pendingRuntimeSwitch).toBeUndefined();
  });

  it("a failed archive step after a prepared candidate is discarded too, and the retry finds one marker and one segment", async () => {
    writeEra(turnRecords("t1", "ls", "a"));
    const before = fs.readFileSync(activePath(), "utf8");
    vi.spyOn(RuntimeSwitchRecorder.prototype, "record").mockImplementationOnce(() => { throw new Error("disk full"); });
    const { service } = lifecycle([preparesNative("instruction-1"), preparesNative("instruction-2")]);

    await expect(service.activateHost(RUN_ID, HOST)).rejects.toThrow("disk full");
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);

    await service.activateHost(RUN_ID, HOST);
    expect(lines(path.join(runDir, "raw_traces_000001.jsonl"))).toHaveLength(4);
    expect(lines(activePath()).filter((record) => record.trace_type === "system_task_notification")).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(path.join(runDir, "raw_traces_manifest.json"), "utf8")).segments).toHaveLength(1);
  });

  it("a failed attempt that is abandoned leaves no record of the abandoned agent runtime in the previous file", async () => {
    writeEra(turnRecords("t1", "ls", "a"));
    const before = fs.readFileSync(activePath(), "utf8");
    const { service } = lifecycle([startFailsAfterInstruction("abandoned-instruction")]);
    await expect(service.activateHost(RUN_ID, HOST)).rejects.toThrow("native start failed");
    // the user undoes the switch instead of sending again: nothing of the abandoned agent runtime is in the file
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);
  });

  it("a failed attempt on a run that already switched once discards too (the file starts with the earlier marker)", async () => {
    writeEra(turnRecords("t1", "ls", "a"));
    const first = lifecycle([preparesNative("instruction-1")]);
    await first.service.activateHost(RUN_ID, HOST);
    fs.appendFileSync(activePath(), JSON.stringify({ id: "rt_native_reply", ts: 100, trace_type: "assistant", content: "native reply", turn_id: "turn_0001", seq: 1 }) + "\n");
    const before = fs.readFileSync(activePath(), "utf8");

    // a second switch (native -> Codex) whose start fails after the candidate wrote
    const second = lifecycle([startFailsAfterInstruction("codex-instruction")], pendingMetadata({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", pendingRuntimeSwitch: {
        switchId: "switch-2",
        from: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "native-model", llmConfig: null, platformAgentRunId: NATIVE_SESSION } } }));
    await expect(second.service.activateHost(RUN_ID, HOST)).rejects.toThrow("native start failed");
    expect(fs.readFileSync(activePath(), "utf8")).toBe(before);
  });
});
