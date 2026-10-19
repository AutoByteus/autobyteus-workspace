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
import { CreateProjectTool, UpdateProjectTool, registerProjectTaskTools } from "../../../../src/agent-tools/project-tasks/project-task-native-tools.js";
import { buildProjectTaskToolSchema } from "../../../../src/agent-tools/project-tasks/project-task-tool-contract.js";
import { MemberExecutionContext } from "../../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { testMemberExecutionContext } from "../../../fixtures/current-team-run-fixtures.js";

// project-tool-split AC-003 and remove-create-or-update-project AC-002: the same configured tool names give the same
// Project tool exposure and the same descriptions/schemas on the AutoByteus (native), Codex and Claude (Agent Tools MCP)
// runtimes, and a definition that still lists the removed create_or_update_project launches without it.
const teamMember = testMemberExecutionContext({
  teamRunId: "team-run", rootTeamRunId: "team-run", teamDefinitionId: "team-def", memberAddress: "/worker", agentRunId: "run-worker",
});
const standaloneHost = new MemberExecutionContext({ ...teamMember, teamScoped: false, collaborationRole: "standalone_agent" });
// Every *_project name, so a Project mutation tool that should not exist would still show up here.
const projectMutation = (name: string) => /_project$/.test(name);

describe("Project tool exposure and schemas across runtimes", () => {
  let snapshot: Map<string, ToolDefinition>;
  beforeEach(() => { snapshot = defaultToolRegistry.snapshot(); defaultToolRegistry.clear(); registerTools(); registerProjectTaskTools(); });
  afterEach(() => defaultToolRegistry.restore(snapshot));

  const exposures = (toolNames: string[], context: MemberExecutionContext) => {
    const agentDefinition = new AgentDefinition({ name: "Agent", description: "Parity.", toolNames });
    const runtimeToolExposure = resolveRuntimeAgentToolExposure(agentDefinition, context);
    const logger = { warn: vi.fn(), error: vi.fn() };
    const autobyteusAll = resolveAutoByteusAgentTools({ agentDefinition, runtimeToolExposure, senderRunId: "run-worker", memberExecutionContext: context, logger })
      .actualToolNames;
    // Codex and Claude both read the exposure through the Agent Tools MCP catalog; Claude also derives its own list.
    const catalog = new AgentToolMcpCatalog({ providers: [new ProjectTaskToolsMcpAdapterProvider()] });
    const codexAll = catalog.resolveConfiguredSupportedToolNames(runtimeToolExposure);
    const claudeAll = resolveClaudeSessionToolingOptions({ runtimeToolExposure, memberExecutionContext: context, hasMaterializedSkills: false })
      .agentToolsMcpEnabledToolNames;
    return { autobyteus: autobyteusAll.filter(projectMutation), codex: codexAll.filter(projectMutation), claude: claudeAll.filter(projectMutation),
      autobyteusAll, codexAll, claudeAll, logger };
  };

  it.each([["a Team member", teamMember], ["a standalone Agent host", standaloneHost]])("%s without a Project tool selection has none on any runtime", (_label, context) => {
    expect(exposures(["read_file"], context)).toMatchObject({ autobyteus: [], codex: [], claude: [] });
  });

  it.each([
    [["create_project"], ["create_project"]],
    [["update_project"], ["update_project"]],
    [["create_project", "update_project"], ["create_project", "update_project"]],
  ])("selecting %j gives exactly %j on every runtime", (selected, expected) => {
    for (const context of [teamMember, standaloneHost]) {
      const result = exposures([...selected, "read_file"], context);
      expect([result.autobyteus, result.codex, result.claude]).toEqual([expected, expected, expected]);
      expect(result.logger.error).not.toHaveBeenCalled();
      expect(result.logger.warn).not.toHaveBeenCalledWith(expect.stringMatching(/project/));
    }
  });

  it.each([
    [["create_or_update_project", "read_file"], []],
    [["create_or_update_project", "create_project", "update_project", "list_projects", "read_file"], ["create_project", "update_project"]],
  ])("a definition that still lists the removed create_or_update_project launches without it and with every other listed tool on every runtime: %j", (selected, expected) => {
    for (const context of [teamMember, standaloneHost]) {
      const result = exposures(selected, context);
      expect([result.autobyteus, result.codex, result.claude]).toEqual([expected, expected, expected]);
      expect(result.autobyteusAll).toContain("read_file");
      for (const all of [result.autobyteusAll, result.codexAll, result.claudeAll]) {
        expect(all).toEqual(expect.arrayContaining(selected.filter((name) => name !== "create_or_update_project" && name !== "read_file")));
        expect(all).not.toContain("create_or_update_project");
      }
      expect(result.logger.warn).toHaveBeenCalledWith(expect.stringMatching(/'create_or_update_project'.*not found in registry\. Skipping\./));
      expect(result.logger.error).not.toHaveBeenCalled();
    }
    const adapters = new ProjectTaskToolsMcpAdapterProvider().getAdapters().map((adapter) => adapter.definition.name);
    expect(adapters).not.toContain("create_or_update_project");
    expect(defaultToolRegistry.getToolDefinition("create_or_update_project")).toBeUndefined();
  });

  it("native classes and the Agent Tools MCP adapters publish identical names, descriptions and schemas", () => {
    const adapters = new ProjectTaskToolsMcpAdapterProvider().getAdapters().map((adapter) => adapter.definition);
    for (const [Tool, name] of [[CreateProjectTool, "create_project"], [UpdateProjectTool, "update_project"]] as const) {
      const adapter = adapters.find((definition) => definition.name === name)!;
      expect(Tool.getName()).toBe(name);
      expect(adapter.description).toBe(Tool.getDescription());
      expect(adapter.inputSchema.toJsonSchema()).toEqual(buildProjectTaskToolSchema(name).toJsonSchema());
      expect(Tool.getArgumentSchema().toJsonSchema()).toEqual(buildProjectTaskToolSchema(name).toJsonSchema());
    }
  });

  it("publishes stable parameter schemas for the new tools", () => {
    expect(buildProjectTaskToolSchema("create_project").toJsonSchema()).toMatchInlineSnapshot(`
      {
        "properties": {
          "description": {
            "description": "Optional Project description.",
            "type": "string",
          },
          "name": {
            "description": "Trimmed non-empty Project name.",
            "type": "string",
          },
          "workspaces": {
            "description": "Optional workspace links. Use absolute folder paths on this node; registration and existence are not required.",
            "items": {
              "properties": {
                "description": {
                  "description": "Optional link description.",
                  "type": "string",
                },
                "workspace_path": {
                  "description": "Absolute folder path on this node; no shell expansion or registration required.",
                  "type": "string",
                },
              },
              "required": [
                "workspace_path",
              ],
              "type": "object",
            },
            "type": "array",
          },
        },
        "required": [
          "name",
        ],
        "type": "object",
      }
    `);
    expect(buildProjectTaskToolSchema("update_project").toJsonSchema()).toMatchInlineSnapshot(`
      {
        "properties": {
          "description": {
            "description": "Project description; omit to keep, blank to clear.",
            "type": "string",
          },
          "name": {
            "description": "Trimmed non-empty Project name; omit to keep.",
            "type": "string",
          },
          "project_id": {
            "description": "Known Project identity to update. Never resolved by name.",
            "type": "string",
          },
          "workspaces": {
            "description": "Complete desired workspace links, not append. Omit to keep; [] unlinks all without deleting folders. Use absolute folder paths on this node; registration and existence are not required.",
            "items": {
              "properties": {
                "description": {
                  "description": "Link description; omit to keep a retained link's description, blank to clear. New links default to blank.",
                  "type": "string",
                },
                "workspace_path": {
                  "description": "Absolute folder path on this node; no shell expansion or registration required.",
                  "type": "string",
                },
              },
              "required": [
                "workspace_path",
              ],
              "type": "object",
            },
            "type": "array",
          },
        },
        "required": [
          "project_id",
        ],
        "type": "object",
      }
    `);
  });
});
