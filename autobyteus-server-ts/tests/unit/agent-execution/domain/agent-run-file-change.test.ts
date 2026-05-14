import { describe, expect, it } from "vitest";
import {
  buildAgentRunFileChangeId,
  normalizeAgentRunFileChangePath,
} from "../../../../src/agent-execution/domain/agent-run-file-change.js";
import { FileChangeInvocationContextStore } from "../../../../src/agent-execution/events/processors/file-change/file-change-invocation-context-store.js";

const contextInput = (targetPath: string) => ({
  toolName: "write_file",
  arguments: { path: targetPath },
  sourceTool: "write_file" as const,
  targetPath,
  generatedOutputPath: null,
});

describe("agent-run-file-change helpers", () => {
  it("keeps file-change path normalization separate from invocation identity", () => {
    expect(normalizeAgentRunFileChangePath("  C:\\tmp\\file.txt  ")).toBe("C:/tmp/file.txt");
    expect(buildAgentRunFileChangeId("run-1", "nested\\file.txt")).toBe("run-1:nested/file.txt");
  });
});

describe("FileChangeInvocationContextStore exact invocation identity", () => {
  it("does not resolve legacy semantic or approval suffixes to their base ids", () => {
    const store = new FileChangeInvocationContextStore();
    const runId = "run-file-change-exact";

    store.record(runId, "call_3", contextInput("/tmp/base.txt"));

    expect(store.find(runId, "call_3:write_file")).toBeNull();
    expect(store.find(runId, "call_3:edit_file")).toBeNull();
    expect(store.find(runId, "call_3:approval-1")).toBeNull();
    expect(store.consume(runId, "call_3")?.targetPath).toBe("/tmp/base.txt");
  });

  it("keeps Kimi-style numeric ids and base ids as separate exact keys", () => {
    const store = new FileChangeInvocationContextStore();
    const runId = "run-kimi-file-change";

    store.record(runId, "run_bash", contextInput("/tmp/base.txt"));
    store.record(runId, "run_bash:1", contextInput("/tmp/ordinal.txt"));

    expect(store.consume(runId, "run_bash:2")).toBeNull();
    expect(store.consume(runId, "run_bash")?.targetPath).toBe("/tmp/base.txt");
    expect(store.consume(runId, "run_bash:1")?.targetPath).toBe("/tmp/ordinal.txt");
  });

  it("consumes only the exact recorded key", () => {
    const store = new FileChangeInvocationContextStore();
    const runId = "run-file-change-consume";

    store.record(runId, "call_4:write_file", contextInput("/tmp/suffixed.txt"));

    expect(store.consume(runId, "call_4")).toBeNull();
    expect(store.find(runId, "call_4:write_file")?.targetPath).toBe("/tmp/suffixed.txt");
    expect(store.consume(runId, "call_4:write_file")?.targetPath).toBe("/tmp/suffixed.txt");
    expect(store.find(runId, "call_4:write_file")).toBeNull();
  });
});
