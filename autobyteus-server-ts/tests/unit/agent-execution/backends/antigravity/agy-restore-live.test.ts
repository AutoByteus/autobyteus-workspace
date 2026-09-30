import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
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
    { resolveSkillScope: () => "CONFIGURED", resolveConfiguredSkillBindingsForAgent: () => [] } as never,
    { resolveWorkingDirectory: async () => selectedWorkspace } as never,
    { activateForRun: () => ({ kind: "not_exposed" }) } as never,
  );
  const config = new AgentRunConfig({ agentDefinitionId: "restore-agent", llmModelIdentifier: "gemini-3.8-flash-low",
    autoExecuteTools: true, workspaceId: "workspace", memoryDir: path.join(base, "memory"),
    runtimeKind: RuntimeKind.ANTIGRAVITY_CLI });
  let active: AgyAgentRunBackend | undefined;
  const evidence: Record<string, unknown> = { base, workspace };
  try {
    const initial = await factory.createBackend(config, "restore-run");
    active = initial;
    const capsulePath = path.join(base, "memory", "agy-project");
    const manifestBefore = await fs.readFile(path.join(capsulePath, "manifest.json"), "utf8");
    const manifest = JSON.parse(manifestBefore) as { agentName: string; agentMarkdownHash: string };
    const markdownPath = path.join(capsulePath, ".agents", "agents", manifest.agentName, "agent.md");
    const markdownBefore = await fs.readFile(markdownPath, "utf8");
    evidence.manifest = manifest;
    evidence.capsuleMarkdown = markdownBefore;
    const providerId = initial.getPlatformAgentRunId();
    evidence.providerId = providerId;
    expect(providerId).toMatch(/^[a-f\d-]{36}$/i);
    expect(providerId).not.toBe("restore-run");
    const first = await ask(initial, "What is your exact identity marker? Reply with the marker only.");
    await initial.terminate();
    evidence.first = first;
    expect(first).toContain("ORIGINAL-AGY-4481");
    definitionInstructions = "Your exact identity marker is REVISED-AGY-0000.";
    const context = new AgentRunContext({ runId: "restore-run", config, runtimeContext: new AgyAgentRunContext(providerId) });
    const restored = await factory.restoreBackend(context);
    active = restored;
    try {
      expect(restored.getPlatformAgentRunId()).toBe(providerId);
      const second = await ask(restored, "What is your exact identity marker? Reply with the marker only.");
      evidence.second = second;
      expect(second).toContain("ORIGINAL-AGY-4481");
      expect(second).not.toContain("REVISED-AGY-0000");
    } finally { await restored.terminate(); }
    expect(await fs.readFile(path.join(capsulePath, "manifest.json"), "utf8")).toBe(manifestBefore);
    expect(await fs.readFile(markdownPath, "utf8")).toBe(markdownBefore);
    evidence.capsuleBytesUnchanged = true;
    selectedWorkspace = changedWorkspace;
    await expect(factory.restoreBackend(context)).rejects.toThrow("AGY_WORKSPACE_CHANGED");
    selectedWorkspace = workspace;
    await expect(factory.restoreBackend(new AgentRunContext({ runId: "restore-run", config,
      runtimeContext: new AgyAgentRunContext("00000000-0000-4000-8000-000000000000") }))).rejects.toThrow(/AGY_CONVERSATION_ID_CONFLICT|AGY_STARTUP_TIMEOUT/);
    evidence.result = "Pass";
  } catch (error) {
    evidence.result = "Fail";
    evidence.error = String(error);
    throw error;
  } finally {
    await active?.terminate();
    const evidenceDir = process.env["AGY_LIVE_EVIDENCE_DIR"];
    if (evidenceDir) {
      await fs.mkdir(evidenceDir, { recursive: true });
      await fs.writeFile(path.join(evidenceDir, "factory-restore-live.json"), JSON.stringify(evidence, null, 2));
    }
    await fs.rm(base, { recursive: true, force: true });
  }
}, 240_000);
