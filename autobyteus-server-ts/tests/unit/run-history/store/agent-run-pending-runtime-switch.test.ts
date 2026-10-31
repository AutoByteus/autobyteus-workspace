import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import { openRawTraceRuntimeKind, parsePendingRuntimeSwitch } from "../../../../src/run-history/store/agent-run-pending-runtime-switch.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

const PENDING = {
  requestedAt: "2026-10-30T10:00:00.000Z",
  from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "sonnet", llmConfig: { effort: "low" }, platformAgentRunId: "session-1" },
};

describe("pendingRuntimeSwitch in run_metadata.json (a field that is absent for every other run)", () => {
  let memoryDir: string;
  beforeEach(async () => { memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "pending-switch-")); });
  afterEach(async () => { await fs.rm(memoryDir, { recursive: true, force: true }); });

  const metadata = (overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
    runId: "run-1", agentDefinitionId: "agent-1", workspaceRootPath: "/work", memoryDir: path.join(memoryDir, "agents", "run-1"),
    llmModelIdentifier: "gpt-5", llmConfig: null, autoExecuteTools: false, runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    platformAgentRunId: null, startedAt: "2026-10-29T09:00:00.000Z", ...overrides,
  });

  it("is written and read back exactly, and a run without it has none", async () => {
    const store = new AgentRunMetadataStore(memoryDir);
    await store.writeMetadata("run-1", metadata({ pendingRuntimeSwitch: PENDING }));
    const read = await store.readMetadata("run-1");
    expect(read?.pendingRuntimeSwitch).toEqual(PENDING);
    await store.writeMetadata("run-1", metadata());
    expect(Object.hasOwn((await store.readMetadata("run-1"))!, "pendingRuntimeSwitch")).toBe(false);
  });

  it("a malformed section makes only that run's file unreadable", async () => {
    const store = new AgentRunMetadataStore(memoryDir);
    await store.writeMetadata("run-1", metadata());
    const file = store.getMetadataPath("run-1");
    const stored = JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, unknown>;
    await fs.writeFile(file, JSON.stringify({ ...stored, pendingRuntimeSwitch: { requestedAt: "yesterday", from: {} } }));
    expect((await store.readMetadataState("run-1")).kind).toBe("unreadable");
    expect(() => parsePendingRuntimeSwitch({ ...PENDING, from: { ...PENDING.from, runtimeKind: "CLAUDE" } })).toThrow("agent runtime kind");
  });

  it("the open raw-trace file's runtime is the previous one while a switch is pending, otherwise the run's own (I-4, I-9)", () => {
    expect(openRawTraceRuntimeKind(metadata({ pendingRuntimeSwitch: PENDING }))).toBe(RuntimeKind.CLAUDE_AGENT_SDK);
    expect(openRawTraceRuntimeKind(metadata())).toBe(RuntimeKind.CODEX_APP_SERVER);
  });
});
