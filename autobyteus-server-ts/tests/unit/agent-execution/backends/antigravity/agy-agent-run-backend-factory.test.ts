import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { AgyAgentRunBackendFactory } from "../../../../../src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.js";
import { listAntigravityModels, readAntigravityCliVersion } from "../../../../../src/runtime-management/antigravity-cli-capability.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import type { AgyStreamMessage } from "../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-message.js";
import { Skill } from "../../../../../src/skills/domain/models.js";
import { AgentCreationError } from "../../../../../src/agent-execution/errors.js";
const { start, stop, streamListeners } = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(),
  streamListeners: [] as Array<(message: unknown) => void> }));

vi.mock("../../../../../src/runtime-management/antigravity-cli-capability.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../../../src/runtime-management/antigravity-cli-capability.js")>(),
  listAntigravityModels: vi.fn(),
  readAntigravityCliVersion: vi.fn(),
}));
vi.mock("../../../../../src/agent-execution/backends/antigravity/stream/agy-stream-process.js", () => ({
  AgyStreamProcess: class {
    start = start;
    stop = stop;
    subscribe = vi.fn((listener: (message: unknown) => void) => { streamListeners.push(listener); });
    onClose = vi.fn();
    sendUserMessage = vi.fn(async () => undefined);
  },
}));

describe("AGY backend capability admission and preserved bindings", () => {
  let base: string;
  let workspace: string;
  let config: AgentRunConfig;
  let factory: AgyAgentRunBackendFactory;
  let instructions: string;
  let initOverride: Record<string, unknown>;
  let conversationId: string | null;
  // Only discovery/transport are mocked; capsule lifecycle and factory validation stay real.

  beforeEach(async () => {
    vi.clearAllMocks();
    base = await fs.mkdtemp(path.join(os.tmpdir(), "agy-factory-unit-"));
    workspace = path.join(base, "workspace");
    await fs.mkdir(workspace);
    instructions = "Original identity";
    initOverride = {};
    conversationId = null;
    vi.mocked(listAntigravityModels).mockResolvedValue([{ id: "test-model", name: "Test Model" }]);
    vi.mocked(readAntigravityCliVersion).mockResolvedValue("1.2.16");
    streamListeners.length = 0;
    start.mockImplementation(async (input) => ({
      event: "init", conversation_id: conversationId ?? input.conversationId ?? "provider-conversation",
      init: { agent: input.agentName, model: input.model, cwd: input.capsulePath,
        permission_mode: "always-proceed", ...initOverride },
    }));
    factory = new AgyAgentRunBackendFactory(
      { getAgentDefinitionById: async () => ({ name: "Test agent", description: "Unit test",
        instructions, toolNames: [], skillNames: [] }) } as never,
      { resolveSkillScope: () => "CONFIGURED", hasEffectiveSkills: () => false, resolveConfiguredSkillBindingsForAgent: () => [] } as never,
      { resolveWorkingDirectory: async () => workspace } as never,
      { activateForRun: () => ({ kind: "not_exposed" }) } as never,
    );
    config = new AgentRunConfig({ agentDefinitionId: "test-agent", llmModelIdentifier: "test-model",
      autoExecuteTools: true, workspaceId: "workspace", memoryDir: path.join(base, "memory"),
      runtimeKind: RuntimeKind.ANTIGRAVITY_CLI });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(base, { recursive: true, force: true });
  });

  it.each([["ALL_INSTALLED", "skips"], ["CONFIGURED", "rejects"]] as const)(
    "derives skill request strength from SkillService.resolveSkillScope: %s %s a workspace-owned skill (D-15 Rule 1)", async (scope, outcome) => {
      const source = path.join(base, "installed", "example-skill");
      await fs.mkdir(source, { recursive: true });
      await fs.writeFile(path.join(source, "SKILL.md"), "---\nname: example-skill\n---\n# Installed");
      await fs.mkdir(path.join(workspace, ".agents", "skills", "example-skill"), { recursive: true });
      const binding = { kind: "resolved", skill: new Skill({ name: "example-skill", description: "d", content: "", rootPath: source }) };
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const scoped = new AgyAgentRunBackendFactory(
        { getAgentDefinitionById: async () => ({ name: "Test agent", description: "Unit test", instructions, toolNames: [], skillNames: [] }) } as never,
        { resolveSkillScope: () => scope, hasEffectiveSkills: () => true, resolveConfiguredSkillBindingsForAgent: () => [binding] } as never,
        { resolveWorkingDirectory: async () => workspace } as never,
        { activateForRun: () => ({ kind: "not_exposed" }) } as never,
      );
      const preloaded = new AgentRunConfig({ ...config } as never);
      if (outcome === "rejects") {
        const failure = await scoped.createBackend(preloaded, "run").catch((error: unknown) => error);
        expect(failure).toBeInstanceOf(AgentCreationError);
        expect((failure as Error).message).toBe("Antigravity could not use skill 'example-skill': the selected workspace already has a skill with this name.");
        return;
      }
      const backend = await scoped.createBackend(preloaded, "run");
      const manifest = JSON.parse(await fs.readFile(path.join(config.memoryDir!, "agy-project", "manifest.json"), "utf8"));
      expect(manifest.skills).toEqual([]);
      await backend.terminate();
    });

  it("uses the catalog for new and restore while retaining capsule bytes and exact conversation", async () => {
    const initial = await factory.createBackend(config, "run");
    const context = initial.getContext();
    await initial.terminate();
    const manifestPath = path.join(config.memoryDir!, "agy-project", "manifest.json");
    const manifest = await fs.readFile(manifestPath, "utf8");
    const agentName = JSON.parse(manifest).agentName;
    const agentPath = path.join(config.memoryDir!, "agy-project", ".agents", "agents", agentName, "agent.md");
    const markdown = await fs.readFile(agentPath, "utf8");
    expect(markdown).toContain("tools: [view_file, write_to_file, replace_file_content, grep_search, list_dir, find_by_name, run_command, generate_image]");
    instructions = "Changed identity";
    const restored = await factory.restoreBackend(context);
    expect(listAntigravityModels).toHaveBeenCalledTimes(2);
    expect(restored.getPlatformAgentRunId()).toBe("provider-conversation");
    expect(start).toHaveBeenLastCalledWith(expect.objectContaining({ conversationId: "provider-conversation" }));
    expect(await fs.readFile(manifestPath, "utf8")).toBe(manifest);
    expect(await fs.readFile(agentPath, "utf8")).toBe(markdown);
    await restored.terminate();
  });

  it("always launches and restores with auto-approve, even when the run config stores it off", async () => {
    const off = new AgentRunConfig({ ...config, autoExecuteTools: false } as never);
    const initial = await factory.createBackend(off, "run");
    await initial.terminate();
    const restored = await factory.restoreBackend(initial.getContext());
    await restored.terminate();
    expect(start).toHaveBeenCalledTimes(2);
    for (const [input] of start.mock.calls) expect(input).not.toHaveProperty("autoExecuteTools");
  });

  it("requires the always-proceed permission mode when the run config stores auto-approve off", async () => {
    initOverride = { permission_mode: "default" };
    const off = new AgentRunConfig({ ...config, autoExecuteTools: false } as never);
    await expect(factory.createBackend(off, "run")).rejects.toThrow("AGY_PERMISSION_MODE_MISMATCH");
    expect(stop).toHaveBeenCalled();
  });

  it("rejects a missing selected model before creating a capsule or launching", async () => {
    vi.mocked(listAntigravityModels).mockResolvedValue([]);
    await expect(factory.createBackend(config, "run")).rejects.toThrow("AGY_MODEL_UNAVAILABLE");
    expect(start).not.toHaveBeenCalled();
    await expect(fs.stat(config.memoryDir!)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each([
    [{ agent: "other" }, "AGY_AGENT_NOT_LOADED"],
    [{ model: "other" }, "AGY_MODEL_MISMATCH"],
    [{ permission_mode: "default" }, "AGY_PERMISSION_MODE_MISMATCH"],
  ])("retains launch validation for %j", async (override, error) => {
    initOverride = override;
    await expect(factory.createBackend(config, "run")).rejects.toThrow(error);
    expect(stop).toHaveBeenCalled();
  });

  it("retains capsule project validation", async () => {
    initOverride = { cwd: workspace };
    await expect(factory.createBackend(config, "run")).rejects.toThrow("AGY_PROJECT_MISMATCH");
    expect(stop).toHaveBeenCalled();
  });

  it("propagates actual discovery failure without starting a process", async () => {
    vi.mocked(listAntigravityModels).mockRejectedValue(new Error("AGY_CLI_UNSUPPORTED"));
    await expect(factory.createBackend(config, "run")).rejects.toThrow("AGY_CLI_UNSUPPORTED");
    expect(start).not.toHaveBeenCalled();
  });

  it("rejects a mismatched restored conversation", async () => {
    const initial = await factory.createBackend(config, "run");
    await initial.terminate();
    conversationId = "different-conversation";
    await expect(factory.restoreBackend(initial.getContext())).rejects.toThrow("AGY_CONVERSATION_ID_CONFLICT");
  });

  it("still checks model availability on restore", async () => {
    const initial = await factory.createBackend(config, "run");
    await initial.terminate();
    vi.mocked(listAntigravityModels).mockResolvedValue([]);
    await expect(factory.restoreBackend(initial.getContext())).rejects.toThrow("AGY_MODEL_UNAVAILABLE");
    expect(start).toHaveBeenCalledTimes(1);
  });

  describe("compaction detection version gate (REQ-A04)", () => {
    const checkpoint = (conversation: string): AgyStreamMessage => ({ event: "step_update", step_update: {
      conversation_id: conversation, step_index: 9, state: "DONE", step_type: "checkpoint", duration_seconds: 7.293076 } });
    /** Starts one turn on the created backend and replays a DONE checkpoint through its stream subscription. */
    const replayCheckpoint = async (create: () => Promise<Awaited<ReturnType<typeof factory.createBackend>>>) => {
      const backend = await create();
      const events: AgentRunEvent[] = [];
      backend.subscribeToSourceEventBatches(async (batch) => { events.push(...batch); });
      await backend.dispatchUserInput({ kind: "start_turn", message: { content: "work" } } as never);
      streamListeners.at(-1)!(checkpoint(backend.getPlatformAgentRunId()));
      await new Promise((resolve) => setTimeout(resolve, 20));
      await backend.terminate();
      return { context: backend.getContext(),
        compactions: events.filter((event) => event.eventType === AgentRunEventType.COMPACTION_STATUS) };
    };

    it.each(["1.2.16", "1.2.17", "agy version 1.10.0"])("maps checkpoints on create and restore for CLI version %s", async (version) => {
      vi.mocked(readAntigravityCliVersion).mockResolvedValue(version);
      const created = await replayCheckpoint(() => factory.createBackend(config, "run"));
      expect(created.compactions).toHaveLength(1);
      expect(created.compactions[0]!.payload).toMatchObject({
        boundary_key: "agy:provider-conversation:checkpoint:9", rotation_eligible: true });
      const restored = await replayCheckpoint(() => factory.restoreBackend(created.context));
      expect(restored.compactions).toHaveLength(1);
    });

    it.each([["1.2.15"], ["1.1.99"], [null], ["garbage"]])("ignores checkpoints and logs the reason for CLI version %j", async (version) => {
      vi.mocked(readAntigravityCliVersion).mockResolvedValue(version);
      const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
      expect((await replayCheckpoint(() => factory.createBackend(config, "run-old"))).compactions).toEqual([]);
      expect(info).toHaveBeenCalledTimes(1);
      expect(String(info.mock.calls[0]![0])).toContain(`AGY compaction detection off for run run-old: CLI version ${version ?? "unknown"}`);
    });
  });
});
