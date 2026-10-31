import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildRuntimeSwitch } from "../../../../src/agent-execution/domain/runtime-switch.js";
import { RuntimeSwitchRecorder } from "../../../../src/agent-memory/services/runtime-switch-recorder.js";
import { ExternalRuntimeMemoryWriter } from "../../../../src/agent-memory/store/external-runtime-memory-writer.js";
import { LocalMemoryRunViewProjectionProvider } from "../../../../src/run-history/projection/providers/local-memory-run-view-projection-provider.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

/**
 * REQ-014, AC-010, I-10 (CRR-002 F-2): the chat of a switched run is built from its `runtime_switch` segments in index order,
 * then the active file, so a reload shows the earlier conversation, the marker and the new agent's records. Real files, the
 * real recorder and the real projection provider.
 */
describe("the chat of a run that switched agent runtimes (reload)", () => {
  let root: string;
  let runDir: string;
  /** The clock moves forward at every step, as in a real run: records are ordered by their time. */
  let clock = 0;
  const tick = () => { clock += 10_000; vi.setSystemTime(new Date(Date.UTC(2026, 9, 31, 8, 0, 0) + clock)); return Date.now() / 1000; };
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    clock = 0;
    root = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-switch-chat-"));
    runDir = path.join(root, "agents", "run-1");
    fs.mkdirSync(runDir, { recursive: true });
  });
  afterEach(() => { vi.useRealTimers(); fs.rmSync(root, { recursive: true, force: true }); });

  const exchange = (turnId: string, user: string, assistant: string) => {
    const ts = tick();
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir: runDir });
    writer.appendRawTrace({ traceType: "user", turnId, content: user, sourceEvent: "AgentRun.postUserMessage", ts });
    writer.appendRawTrace({ traceType: "assistant", turnId, content: assistant, sourceEvent: "test", ts: ts + 1 });
  };
  const metadata = (switchId: string, from: RuntimeKind, to: RuntimeKind): AgentRunMetadata => ({
    runId: "run-1", agentDefinitionId: "a", workspaceRootPath: "/w", memoryDir: runDir, llmModelIdentifier: "model-to", llmConfig: null,
    autoExecuteTools: false, runtimeKind: to, platformAgentRunId: null, startedAt: "2026-10-29T09:00:00.000Z",
    pendingRuntimeSwitch: { switchId, from: { runtimeKind: from, llmModelIdentifier: "model-from", llmConfig: null, platformAgentRunId: "s" } },
  });
  const switchTo = (switchId: string, from: RuntimeKind, to: RuntimeKind) => {
    tick();
    const recorder = new RuntimeSwitchRecorder();
    recorder.record(runDir, recorder.begin(runDir, buildRuntimeSwitch(metadata(switchId, from, to))!));
  };
  const provider = () => new LocalMemoryRunViewProjectionProvider(root);
  const source = () => ({
    runId: "run-1", runtimeKind: RuntimeKind.AUTOBYTEUS, workspaceRootPath: "/w", memoryDir: runDir, platformRunId: "p",
    metadata: metadata("x", RuntimeKind.AUTOBYTEUS, RuntimeKind.AUTOBYTEUS),
  });
  const conversation = async () => {
    const projection = await provider().buildProjection({ source: source() as never });
    return projection.conversation.map((entry) => `${entry.kind}:${entry.role ?? ""}:${entry.content ?? ""}`);
  };

  it("a run that never switched reads its active file only, as before", async () => {
    exchange("turn_0001", "first", "answer one");
    expect(await conversation()).toEqual(["message:user:first", "message:assistant:answer one"]);
  });

  it("shows the earlier conversation, the marker and the new agent's records after one switch", async () => {
    exchange("turn_0001", "first", "answer one");
    switchTo("switch-1", RuntimeKind.AUTOBYTEUS, RuntimeKind.CODEX_APP_SERVER);
    exchange("codex-turn-1", "second", "answer two");
    const lines = await conversation();
    expect(lines[0]).toBe("message:user:first");
    expect(lines[1]).toBe("message:assistant:answer one");
    expect(lines.slice(2)).toEqual(expect.arrayContaining(["message:user:second", "message:assistant:answer two"]));
    expect(lines.join("\n")).toContain("Agent runtime changed");
    expect(lines.indexOf("message:user:second")).toBeGreaterThan(lines.findIndex((line) => line.includes("Agent runtime changed")));
  });

  it("native → other → native: two native eras that both restart at turn_0001 keep their own messages, in order", async () => {
    exchange("turn_0001", "first", "answer one");
    switchTo("switch-1", RuntimeKind.AUTOBYTEUS, RuntimeKind.CODEX_APP_SERVER);
    exchange("codex-turn-1", "second", "answer two");
    switchTo("switch-2", RuntimeKind.CODEX_APP_SERVER, RuntimeKind.AUTOBYTEUS);
    exchange("turn_0001", "third", "answer three");
    const lines = await conversation();
    const messages = lines.filter((line) => line.startsWith("message:"));
    expect(messages).toEqual([
      "message:user:first", "message:assistant:answer one", "message:user:second", "message:assistant:answer two",
      "message:user:third", "message:assistant:answer three",
    ]);
    expect(lines.filter((line) => line.includes("Agent runtime changed"))).toHaveLength(2);
  });

  it("segments of any other boundary (compaction) stay unread", async () => {
    exchange("turn_0001", "before compaction", "hidden");
    const writer = new ExternalRuntimeMemoryWriter({ memoryDir: runDir });
    const boundary = writer.appendRawTrace({ traceType: "provider_compaction_boundary", turnId: "turn_0001", content: "compacted", sourceEvent: "test", ts: tick(), correlationId: "codex:compaction:1" });
    writer.rotateActiveRawTracesBeforeBoundary({ boundaryTraceId: boundary.id, boundaryKey: "codex:compaction:1", boundaryType: "provider_compaction_boundary", runtimeKind: "codex_app_server" });
    exchange("turn_0002", "after compaction", "visible");
    const lines = (await conversation()).join("\n");
    expect(lines).not.toContain("before compaction");
    expect(lines).toContain("after compaction");
  });

  it("the page of earlier events reads the same sequence and its cursor generation is the active file's", async () => {
    exchange("turn_0001", "first", "answer one");
    switchTo("switch-1", RuntimeKind.AUTOBYTEUS, RuntimeKind.CODEX_APP_SERVER);
    exchange("codex-turn-1", "second", "answer two");
    const page = await provider().buildActiveTracePage({ source: source() as never, subjectFingerprint: "fp" });
    const text = JSON.stringify(page.events);
    expect(text).toContain("first");
    expect(text).toContain("second");
    expect(page.activeGeneration).toBeTruthy();
  });
});
