import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { resolveClaudeSessionToolingOptions } from "../../../src/agent-execution/backends/claude/session/claude-session-tooling-options.js";
import { isCollaborationEligibleStandaloneRun } from "../../../src/agent-execution/services/standalone-agent-run-eligibility.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * autobyteus-32 AC-011, REQ-003, AR-001: the Model Router agent's run has exactly its template's tools (no collaboration
 * tools: it is system-owned, so it has no member context) plus its runtime's normal tools under auto-approve, like any
 * auto-approved agent (no router-specific sandbox, SR-018). The template is the shipped one.
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

describe("The Model Router agent's tools per runtime (AC-011)", () => {
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
    await store.writeMetadata("router_1", metadata({ memoryDir: path.join(memoryDir, "agents", "router_1"), systemRunOwner: "model_router" }));
    await expect(store.readMetadata("router_1")).resolves.toMatchObject({ systemRunOwner: "model_router" });
    // Runs recorded before this change read as ordinary runs.
    await store.writeMetadata("ordinary", metadata({ runId: "ordinary", memoryDir: path.join(memoryDir, "agents", "ordinary") }));
    const ordinary = await store.readMetadata("ordinary");
    expect(ordinary).not.toHaveProperty("systemRunOwner");
  });

  it("all runtimes: without a member context the requested tools are exactly the template list (no send_message_to, delegate_task, get_handoff_rules)", async () => {
    const exposure = buildRuntimeAgentToolExposure(await templateTools(), null);
    expect(exposure.requestedToolNames).toEqual(await templateTools());
    expect(exposure.sendMessageToEnabled).toBe(false);
    expect(exposure.enabledTaskDelegationToolNames).toEqual([]);
    expect(exposure.getHandoffRulesEnabled).toBe(false);
  });


  it("Claude: our tools are the template's MCP tools (no collaboration tools)", async () => {
    const tooling = resolveClaudeSessionToolingOptions({
      runtimeToolExposure: buildRuntimeAgentToolExposure(await templateTools(), null),
      hasMaterializedSkills: false,
      memberExecutionContext: null,
      agentToolsMcpEnabledToolNames: ["list_available_agent_runtimes", "submit_launch_choices"],
    });
    expect(tooling.sendMessageToToolingEnabled).toBe(false);
    expect(tooling.taskDelegationToolingEnabled).toBe(false);
    expect(tooling.agentToolsMcpEnabledToolNames).toEqual(["list_available_agent_runtimes", "submit_launch_choices"]);
    // Agent Tools are allowed per call from the run's current descriptor, never through allowedTools (autobyteus-324).
    expect(tooling.allowedTools).toEqual([]);
  });


  it("AutoByteus: the run gets only the listed tools, with no shell tool", async () => {
    expect((await templateTools()).some((name) => ["run_bash", "start_background_process"].includes(name))).toBe(false);
  });
});
