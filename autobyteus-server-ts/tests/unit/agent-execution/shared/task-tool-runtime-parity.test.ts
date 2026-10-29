import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTools } from "autobyteus-ts/tools/register-tools.js";
import { defaultToolRegistry } from "autobyteus-ts/tools/registry/tool-registry.js";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { resolveAutoByteusAgentTools } from "../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.js";
import { resolveClaudeSessionToolingOptions } from "../../../../src/agent-execution/backends/claude/session/claude-session-tooling-options.js";
import { resolveRuntimeAgentToolExposure } from "../../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";
import { CreateTaskTool, UpdateTaskTool, registerProjectTaskTools } from "../../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { buildProjectTaskToolSchema } from "../../../../src/agent-tools/project-tasks/project-task-tool-contract.js";
import { MemberExecutionContext } from "../../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";

// AC-001, AC-006, AC-007: the same configured tool names give the same task-tool exposure and the same
// tool descriptions/schemas on the AutoByteus (native), Codex and Claude (Agent Tools MCP) runtimes.
const teamMember = testMemberExecutionContext({
  teamRunId: "team-run", rootTeamRunId: "team-run", teamDefinitionId: "team-def", memberAddress: "/worker", agentRunId: "run-worker",
});
const standaloneHost = new MemberExecutionContext({ ...teamMember, teamScoped: false, collaborationRole: "standalone_agent" });
const TASK_TOOLS = ["create_task", "update_task"];

describe("task tool exposure and schemas across runtimes", () => {
  let snapshot: Map<string, ToolDefinition>;
  beforeEach(() => { snapshot = defaultToolRegistry.snapshot(); defaultToolRegistry.clear(); registerTools(); registerProjectTaskTools(); });
  afterEach(() => defaultToolRegistry.restore(snapshot));

  const exposures = (toolNames: string[], context: MemberExecutionContext) => {
    const agentDefinition = new AgentDefinition({ name: "Agent", description: "Parity.", toolNames });
    const runtimeToolExposure = resolveRuntimeAgentToolExposure(agentDefinition, context);
    const logger = { warn: vi.fn(), error: vi.fn() };
    const autobyteus = resolveAutoByteusAgentTools({ agentDefinition, runtimeToolExposure, senderRunId: "run-worker", memberExecutionContext: context, logger })
      .actualToolNames.filter((name) => TASK_TOOLS.includes(name));
    // Codex and Claude both read the exposure through the Agent Tools MCP catalog; Claude also derives its own list.
    const catalog = new AgentToolMcpCatalog({ providers: [new ProjectTaskToolsMcpAdapterProvider()] });
    const mcp = catalog.resolveConfiguredSupportedToolNames(runtimeToolExposure).filter((name) => TASK_TOOLS.includes(name));
    const claude = resolveClaudeSessionToolingOptions({ runtimeToolExposure, memberExecutionContext: context, hasMaterializedSkills: false })
      .agentToolsMcpEnabledToolNames.filter((name) => TASK_TOOLS.includes(name));
    return { autobyteus, codex: mcp, claude, logger };
  };

  it.each([["a Team member", teamMember], ["a standalone Agent host", standaloneHost]])("%s without a task tool selection has none on any runtime", (_label, context) => {
    const result = exposures([], context);
    expect(result).toMatchObject({ autobyteus: [], codex: [], claude: [] });
  });

  it.each([["a Team member", teamMember], ["a standalone Agent host", standaloneHost]])("%s that selected create_task and update_task has exactly those on every runtime", (_label, context) => {
    const result = exposures(TASK_TOOLS, context);
    expect(result.autobyteus).toEqual(TASK_TOOLS);
    expect(result.codex).toEqual(TASK_TOOLS);
    expect(result.claude).toEqual(TASK_TOOLS);
  });

  it("selecting only update_task gives only update_task on every runtime", () => {
    const result = exposures(["update_task"], teamMember);
    expect([result.autobyteus, result.codex, result.claude]).toEqual([["update_task"], ["update_task"], ["update_task"]]);
  });

  it("an agent that still selects create_or_update_task launches with no task tool on every runtime (AC-007)", () => {
    const result = exposures(["create_or_update_task", "read_file"], teamMember);
    expect(result).toMatchObject({ autobyteus: [], codex: [], claude: [] });
    expect(result.logger.error).not.toHaveBeenCalledWith(expect.stringMatching(/task/));
  });

  it("native classes and the Agent Tools MCP adapters publish identical descriptions and schemas, with no old name", () => {
    const adapters = new ProjectTaskToolsMcpAdapterProvider().getAdapters().map((adapter) => adapter.definition);
    expect(adapters.map((definition) => definition.name)).not.toContain("create_or_update_task");
    for (const [Tool, name] of [[CreateTaskTool, "create_task"], [UpdateTaskTool, "update_task"]] as const) {
      const adapter = adapters.find((definition) => definition.name === name)!;
      expect(adapter.description).toBe(Tool.getDescription());
      expect(adapter.inputSchema.toJsonSchema()).toEqual(buildProjectTaskToolSchema(name).toJsonSchema());
      expect(Tool.getName()).toBe(name);
      expect(Tool.getArgumentSchema().toJsonSchema()).toEqual(buildProjectTaskToolSchema(name).toJsonSchema());
      expect(Tool.getDescription()).not.toContain("create_or_update_task");
    }
  });

  it("only update_task's description carries the closing and reopening guidance", () => {
    expect(UpdateTaskTool.getDescription()).toMatch(/Close a Task you delegated when its work is done/);
    expect(UpdateTaskTool.getDescription()).toMatch(/first set the Task to TODO or IN_PROGRESS/);
    expect(CreateTaskTool.getDescription()).not.toMatch(/DONE|CANCELLED|reactivat/);
  });

  it("publishes stable parameter schemas", () => {
    expect(buildProjectTaskToolSchema("create_task").toJsonSchema()).toMatchInlineSnapshot(`
      {
        "properties": {
          "context_files": {
            "description": "Absolute local file paths on this node to copy into the new Task's saved context. Same file types and 25 MiB limit as the app.",
            "items": {
              "type": "string",
            },
            "type": "array",
          },
          "depends_on": {
            "description": "taskIds (keys, e.g. autobyteus-39) of Tasks in the same Project that this Task depends on.",
            "items": {
              "type": "string",
            },
            "type": "array",
          },
          "description": {
            "description": "Trimmed non-empty Task content.",
            "type": "string",
          },
          "part_of": {
            "description": "The taskId (key, e.g. autobyteus-25) of the bigger Task in the same Project this Task is part of; one level only (a part can't have parts).",
            "type": "string",
          },
          "project_id": {
            "description": "Project identity on the current node.",
            "type": "string",
          },
          "title": {
            "description": "The Task's one-line name: trimmed, non-empty; no length limit.",
            "type": "string",
          },
        },
        "required": [
          "project_id",
          "title",
          "description",
        ],
        "type": "object",
      }
    `);
    expect(buildProjectTaskToolSchema("update_task").toJsonSchema()).toMatchInlineSnapshot(`
      {
        "properties": {
          "add_comment": {
            "description": "Project Tasks only: text added as one new comment at the end of the Task's comments; the description is not changed.",
            "type": "string",
          },
          "context_files": {
            "description": "Absolute local file paths on this node to copy into the Project Task's saved context (appended; never removes). Same file types and 25 MiB limit as the app.",
            "items": {
              "type": "string",
            },
            "type": "array",
          },
          "depends_on": {
            "description": "Project Tasks only: the complete list of taskIds of Tasks in the same Project this Task depends on; replaces the saved list, [] clears it, omit to keep.",
            "items": {
              "type": "string",
            },
            "type": "array",
          },
          "description": {
            "description": "Trimmed non-empty Task content; omit to preserve.",
            "type": "string",
          },
          "part_of": {
            "description": "Project Tasks only: the taskId of the bigger Task in the same Project this Task is part of; one level only (a part can't have parts). Replaces the saved one; "" clears it; omit to keep.",
            "type": "string",
          },
          "status": {
            "description": "Explicit business status patch; omit to preserve.",
            "enum": [
              "TODO",
              "IN_PROGRESS",
              "DONE",
              "CANCELLED",
            ],
            "type": "string",
          },
          "task_id": {
            "description": "The Task's ID: a Project Task's key (e.g. autobyteus-42), or the Task ID of a Task with no Project.",
            "type": "string",
          },
          "title": {
            "description": "Project Tasks only: the Task's new one-line name, trimmed non-empty; omit to preserve.",
            "type": "string",
          },
        },
        "required": [
          "task_id",
        ],
        "type": "object",
      }
    `);
  });
});
