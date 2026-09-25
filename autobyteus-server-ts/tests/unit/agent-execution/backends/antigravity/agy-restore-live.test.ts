import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { AgyAgentRunBackendFactory } from "../../../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.js";
import { AgyAgentRunContext } from "../../../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-context.js";
import type { AgyAgentRunBackend } from "../../../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.js";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";

const ask = async (backend: AgyAgentRunBackend, question: string): Promise<string> => {
  const events: { eventType: AgentRunEventType; payload: Record<string, unknown> }[] = [];
  const unsubscribe = backend.subscribeToSourceEventBatches((batch) => { events.push(...batch); });
  try {
    const dispatched = await backend.dispatchUserInput({ kind: "start_turn", message: new AgentInputUserMessage(question) });
    expect(dispatched.forwarded).toBe(true);
    for (let attempt = 0; attempt < 180 && !events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED); attempt++)
      await new Promise((resolve) => setTimeout(resolve, 500));
    expect(events.some((event) => event.eventType === AgentRunEventType.TURN_COMPLETED)).toBe(true);
    return events.filter((event) => event.eventType === AgentRunEventType.SEGMENT_CONTENT)
      .map((event) => String(event.payload.delta ?? "")).join("");
  } finally { unsubscribe(); }
};

it.skipIf(process.env.AGY_LIVE !== "1")("restores the exact AGY conversation, immutable identity and workspace binding", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-restore-live-"));
  const workspace = path.join(base, "workspace");
  const changedWorkspace = path.join(base, "changed-workspace");
  await fs.mkdir(workspace); await fs.mkdir(changedWorkspace);
  let definitionInstructions = "Your exact identity marker is ORIGINAL-AGY-4481.";
  let selectedWorkspace = workspace;
  const factory = new AgyAgentRunBackendFactory(
    { getAgentDefinitionById: async () => ({ name: "Restore agent", description: "Exact restore probe.",
      instructions: definitionInstructions, toolNames: [], skillNames: [] }) } as never,
    { resolveConfiguredSkillBindingsForAgent: () => [] } as never,
    { resolveWorkingDirectory: async () => selectedWorkspace } as never,
    { activateForRun: () => ({ kind: "not_exposed" }) } as never,
  );
  const config = new AgentRunConfig({ agentDefinitionId: "restore-agent", llmModelIdentifier: "gemini-3.8-flash-low",
    autoExecuteTools: true, workspaceId: "workspace", memoryDir: path.join(base, "memory"),
    skillAccessMode: SkillAccessMode.NONE, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI });
  const initial = await factory.createBackend(config, "restore-run");
  const providerId = initial.getPlatformAgentRunId();
  expect(providerId).toMatch(/^[a-f\d-]{36}$/i);
  expect(providerId).not.toBe("restore-run");
  const first = await ask(initial, "What is your exact identity marker? Reply with the marker only.");
  await initial.terminate();
  expect(first).toContain("ORIGINAL-AGY-4481");
  definitionInstructions = "Your exact identity marker is REVISED-AGY-0000.";
  const context = new AgentRunContext({ runId: "restore-run", config, runtimeContext: new AgyAgentRunContext(providerId) });
  const restored = await factory.restoreBackend(context);
  try {
    expect(restored.getPlatformAgentRunId()).toBe(providerId);
    const second = await ask(restored, "What is your exact identity marker? Reply with the marker only.");
    expect(second).toContain("ORIGINAL-AGY-4481");
    expect(second).not.toContain("REVISED-AGY-0000");
  } finally { await restored.terminate(); }
  selectedWorkspace = changedWorkspace;
  await expect(factory.restoreBackend(context)).rejects.toThrow("AGY_WORKSPACE_CHANGED");
  selectedWorkspace = workspace;
  await expect(factory.restoreBackend(new AgentRunContext({ runId: "restore-run", config,
    runtimeContext: new AgyAgentRunContext("00000000-0000-4000-8000-000000000000") }))).rejects.toThrow(/AGY_CONVERSATION_ID_CONFLICT|AGY_STARTUP_TIMEOUT/);
}, 240_000);
