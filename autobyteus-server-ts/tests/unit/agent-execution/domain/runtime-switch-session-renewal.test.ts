import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildRuntimeSwitch,
  buildSessionRenewal,
  runtimeSwitchMarkerTraceId,
} from "../../../../src/agent-execution/domain/runtime-switch.js";
import { SavedRuntimeSessionMissingError, AgentRunActivationError } from "../../../../src/agent-execution/errors.js";
import { RuntimeSwitchRecorder } from "../../../../src/agent-memory/services/runtime-switch-recorder.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { turnRecords } from "../../../agent-work-journal/raw-trace-folder-fixtures.js";

/**
 * The session renewal of a lost runtime session (autobyteus-599, REQ-004, REQ-005; DEC-003, DEC-004): the same switch value
 * the switch steps take, with `from` = `to`, the lost session's ID in the key and the REQ-004 line.
 */
describe("buildSessionRenewal", () => {
  const renewal = () => buildSessionRenewal({
    runId: "run-1", side: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" }, lostPlatformAgentRunId: "lost-session-1",
  });

  it("is a lost-session switch with the same runtime and model on both sides and the REQ-004 line", () => {
    const value = renewal();
    expect(value).toEqual({
      key: "session_renewal:run-1:lost-session-1",
      markerTraceId: runtimeSwitchMarkerTraceId("session_renewal:run-1:lost-session-1"),
      runId: "run-1",
      from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" },
      to: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" },
      markerText: "The saved Claude Agent SDK session of this run was no longer available, so a new session continues from the work journal.",
    });
    expect(Object.isFrozen(value)).toBe(true);
    expect(value.markerText).not.toContain("Agent runtime changed");
  });

  it("keys by the lost session: a retry builds the same value, a later loss of the renewed session a new one", () => {
    expect(renewal()).toEqual(renewal());
    const later = buildSessionRenewal({ runId: "run-1", side: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" },
      lostPlatformAgentRunId: "renewed-session-2" });
    expect(later.key).not.toBe(renewal().key);
    expect(later.markerTraceId).not.toBe(renewal().markerTraceId);
  });

  it("names each runtime by its product name", () => {
    const name = (runtimeKind: RuntimeKind) => buildSessionRenewal({ runId: "r", side: { runtimeKind, llmModelIdentifier: "m" }, lostPlatformAgentRunId: "s" }).markerText;
    expect(name(RuntimeKind.CODEX_APP_SERVER)).toContain("The saved Codex App Server session of this run");
    expect(name(RuntimeKind.ANTIGRAVITY_CLI)).toContain("The saved Antigravity CLI session of this run");
  });

  it("leaves a runtime change a runtime change", () => {
    const change = buildRuntimeSwitch({
      runId: "run-1", agentDefinitionId: "a", workspaceRootPath: "/w", memoryDir: "/m", llmModelIdentifier: "gpt-5", llmConfig: null,
      autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: null, startedAt: "2026-10-29T09:00:00.000Z",
      pendingRuntimeSwitch: { switchId: "switch-1",
        from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: null, platformAgentRunId: "session-1" } },
    })!;
    expect(change.key).toBe("runtime_switch:run-1:switch-1");
    expect(change.markerText).toBe("Agent runtime changed from Claude Agent SDK (sonnet) to Codex App Server (gpt-5).");
  });
});

describe("SavedRuntimeSessionMissingError", () => {
  it("is an activation error with its own code, the runtime and the lost session", () => {
    const error = new SavedRuntimeSessionMissingError(RuntimeKind.CODEX_APP_SERVER, "thread-1", { cause: new Error("no rollout") });
    expect(error).toBeInstanceOf(AgentRunActivationError);
    expect(error).toMatchObject({ code: "SAVED_RUNTIME_SESSION_MISSING", runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: "thread-1",
      name: "SavedRuntimeSessionMissingError" });
    expect((error.cause as Error).message).toBe("no rollout");
  });
});

describe("a renewal through the real switch memory (REQ-005, AC-004)", () => {
  let root: string;
  let runDir: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "session-renewal-"));
    runDir = path.join(root, "agents", "run-1");
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(path.join(runDir, "raw_traces_active.jsonl"),
      turnRecords("t1", "git status", "clean").map((record) => JSON.stringify(record)).join("\n") + "\n");
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("archives the previous records behind one lost-session marker, and a retry writes neither twice", () => {
    const recorder = new RuntimeSwitchRecorder();
    const renewal = buildSessionRenewal({ runId: "run-1", side: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus" },
      lostPlatformAgentRunId: "lost-session-1" });
    recorder.record(runDir, recorder.begin(runDir, renewal));
    const segmentBytes = () => fs.readFileSync(path.join(runDir, "raw_traces_000001.jsonl"), "utf8");
    const archived = segmentBytes();
    recorder.record(runDir, recorder.begin(runDir, renewal)); // the next message after a failure part-way

    const manifest = JSON.parse(fs.readFileSync(path.join(runDir, "raw_traces_manifest.json"), "utf8"));
    expect(manifest.segments.filter((segment: any) => segment.boundary_key === renewal.key)).toHaveLength(1);
    expect(manifest.segments[0]).toMatchObject({ boundary_type: "runtime_switch", runtime_kind: RuntimeKind.CLAUDE_AGENT_SDK });
    expect(segmentBytes()).toBe(archived);
    const active = fs.readFileSync(path.join(runDir, "raw_traces_active.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
    expect(active.filter((record) => record.id === renewal.markerTraceId)).toHaveLength(1);
    expect(active[0]).toMatchObject({ id: renewal.markerTraceId, sender_id: "system.runtime_handover", correlation_id: renewal.key,
      content: renewal.markerText });
  });
});
