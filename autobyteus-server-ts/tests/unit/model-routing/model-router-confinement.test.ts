import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { resolveEffectiveCodexSandboxModeForRunConfig } from "../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js";
import { buildClaudeWorkspaceConfinement, isInsideWorkspace } from "../../../src/agent-execution/backends/claude/session/claude-workspace-confinement.js";
import { resolveClaudeSessionToolingOptions } from "../../../src/agent-execution/backends/claude/session/claude-session-tooling-options.js";
import { isCollaborationEligibleStandaloneRun } from "../../../src/agent-execution/services/standalone-agent-run-eligibility.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * autobyteus-32 AC-011, REQ-003, QR-004, AR-001/AR-002: the Model Router agent's run has exactly its template's tools
 * (no collaboration tools: it is system-owned, so it has no member context) plus its runtime's file tools, confined to
 * its workspace where the runtime allows it. The template is the shipped one.
 */
const templateDir = path.resolve(import.meta.dirname, "../../../src/built-in-agents/templates/model-router");
const templateTools = async (): Promise<string[]> =>
  (JSON.parse(await fs.readFile(path.join(templateDir, "agent-config.json"), "utf8")) as { toolNames: string[] }).toolNames;

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

const metadata = (overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId: "router_1", agentDefinitionId: "autobyteus-model-router", workspaceRootPath: "/tmp/router", memoryDir: "/tmp/memory/agents/router_1",
  llmModelIdentifier: "gpt-sol", llmConfig: null, autoExecuteTools: true, runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null, preparedAt: null, preparedExpiresAt: null, startedAt: null, applicationExecutionContext: null, ...overrides,
});

describe("The Model Router agent's tools and confinement per runtime (AC-011)", () => {
  it("the shipped template is internal and lists exactly its tools: no shell, no collaboration tools", async () => {
    const config = JSON.parse(await fs.readFile(path.join(templateDir, "agent-config.json"), "utf8")) as { internal?: boolean; toolNames: string[] };
    expect(config.internal).toBe(true);
    expect(config.toolNames).toEqual([
      "list_available_agent_runtimes", "submit_launch_choices", "search_web", "read_url", "read_file", "write_file", "edit_file",
    ]);
  });

  it("AR-001: a system-owned run is never a collaboration member (no member context), and the marker survives a restore", async () => {
    expect(isCollaborationEligibleStandaloneRun(metadata({ systemRunOwner: "model_router" }))).toBe(false);
    expect(isCollaborationEligibleStandaloneRun(metadata())).toBe(true);
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "router-metadata-")); dirs.push(memoryDir);
    const store = new AgentRunMetadataStore(memoryDir);
    await store.writeMetadata("router_1", metadata({ memoryDir: path.join(memoryDir, "agents", "router_1"), systemRunOwner: "model_router", toolConfinement: "workspace" }));
    await expect(store.readMetadata("router_1")).resolves.toMatchObject({ systemRunOwner: "model_router", toolConfinement: "workspace" });
    // Runs recorded before this change read as ordinary, unconfined runs.
    await store.writeMetadata("ordinary", metadata({ runId: "ordinary", memoryDir: path.join(memoryDir, "agents", "ordinary") }));
    const ordinary = await store.readMetadata("ordinary");
    expect(ordinary).not.toHaveProperty("systemRunOwner");
    expect(ordinary).not.toHaveProperty("toolConfinement");
  });

  it("all runtimes: without a member context the requested tools are exactly the template list (no send_message_to, delegate_task, get_handoff_rules)", async () => {
    const exposure = buildRuntimeAgentToolExposure(await templateTools(), null);
    expect(exposure.requestedToolNames).toEqual(await templateTools());
    expect(exposure.sendMessageToEnabled).toBe(false);
    expect(exposure.enabledTaskDelegationToolNames).toEqual([]);
    expect(exposure.getHandoffRulesEnabled).toBe(false);
  });

  it("Codex: a confined run starts its thread with the workspace-write sandbox even with auto-approve; others keep today's", () => {
    expect(resolveEffectiveCodexSandboxModeForRunConfig({ autoExecuteTools: true, toolConfinement: "workspace" })).toBe("workspace-write");
    expect(resolveEffectiveCodexSandboxModeForRunConfig({ autoExecuteTools: true, toolConfinement: null })).toBe("danger-full-access");
  });

  it("Claude: our tools are the template's MCP tools (no collaboration tools); a confined session has no shell tool and only user settings", async () => {
    const tooling = resolveClaudeSessionToolingOptions({
      runtimeToolExposure: buildRuntimeAgentToolExposure(await templateTools(), null),
      hasMaterializedSkills: false,
      memberExecutionContext: null,
      agentToolsMcpEnabledToolNames: ["list_available_agent_runtimes", "submit_launch_choices"],
    });
    expect(tooling.sendMessageToToolingEnabled).toBe(false);
    expect(tooling.taskDelegationToolingEnabled).toBe(false);
    expect(tooling.allowedTools.filter((name) => !name.startsWith("mcp__"))).toEqual(["list_available_agent_runtimes", "submit_launch_choices"]);
    const confinement = buildClaudeWorkspaceConfinement("/tmp/router");
    expect(confinement.settingSources).toEqual(["user"]);
    expect(confinement.disallowedTools).toEqual(["Bash", "BashOutput", "KillShell"]);
  });

  it("Claude AR-002: the PreToolUse hook denies a write outside the workspace (also through a symlink), allows one inside, ignores other tools", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "router-workspace-")); dirs.push(root);
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), "router-outside-")); dirs.push(outside);
    await fs.symlink(outside, path.join(root, "escape"));
    const hook = buildClaudeWorkspaceConfinement(root).hooks.PreToolUse[0]!.hooks[0]!;
    const decide = (tool_name: string, tool_input: Record<string, unknown>) => hook({ hook_event_name: "PreToolUse", tool_name, tool_input });
    await expect(decide("Write", { file_path: path.join(root, "knowledge.md") })).resolves.toEqual({});
    await expect(decide("Edit", { file_path: "knowledge.md" })).resolves.toEqual({});
    for (const [tool, input] of [["Write", { file_path: path.join(outside, "x.md") }], ["Edit", { file_path: "../x.md" }],
      ["MultiEdit", { file_path: path.join(root, "escape", "x.md") }], ["NotebookEdit", { notebook_path: "/etc/x.ipynb" }]] as const) {
      await expect(decide(tool, input), tool).resolves.toMatchObject({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny" } });
    }
    await expect(decide("Read", { file_path: "/etc/hosts" })).resolves.toEqual({});
    expect(isInsideWorkspace(root, root)).toBe(true);
  });

  it("AutoByteus: the run gets only the listed tools, with no shell tool", async () => {
    expect((await templateTools()).some((name) => ["run_bash", "start_background_process"].includes(name))).toBe(false);
  });
});
