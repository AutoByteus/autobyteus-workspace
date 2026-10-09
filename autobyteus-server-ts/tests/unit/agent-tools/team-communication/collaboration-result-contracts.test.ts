import { describe, expect, it } from "vitest";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import Ajv2020 from "ajv/dist/2020.js";
import {
  SendMessageToResultSchema,
  toSendMessageToResult,
} from "../../../../src/agent-communication/services/send-message-to-tool-result-contract.js";
import { DelegateTaskResultSchema } from "../../../../src/agent-team-execution/task-delegation/task-delegation-result-contract.js";
import { AgentToolMcpCatalog } from "../../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { SendMessageToMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.js";
import { TaskDelegationToolsMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/task-delegation-tools-mcp-adapter-provider.js";
import { DELEGATE_TASK_TOOL_NAME } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-contract.js";
import { SEND_MESSAGE_TO_TOOL_NAME } from "../../../../src/agent-communication/services/send-message-to-tool-contract.js";

const buildSession = () => ({
  enabledTools: [SEND_MESSAGE_TO_TOOL_NAME, DELEGATE_TASK_TOOL_NAME],
  toolRoutes: {
    [SEND_MESSAGE_TO_TOOL_NAME]: {
      kind: "static_adapter",
      toolName: SEND_MESSAGE_TO_TOOL_NAME,
    },
    [DELEGATE_TASK_TOOL_NAME]: {
      kind: "static_adapter",
      toolName: DELEGATE_TASK_TOOL_NAME,
    },
  },
}) as never;

describe("collaboration public result contracts", () => {
  it("requires exact existing-run identity for send success and null for rejection", () => {
    expect(toSendMessageToResult({
      accepted: true,
      code: "DELIVERED",
      message: "Delivered.",
      agentRunId: "existing-run",
    })).toEqual({
      accepted: true,
      code: "DELIVERED",
      message: "Delivered.",
      target_agent_run_id: "existing-run",
    });
    expect(toSendMessageToResult({
      accepted: false,
      code: "TARGET_NOT_FOUND",
      message: "Missing.",
      agentRunId: "must-not-leak",
    })).toEqual({
      accepted: false,
      code: "TARGET_NOT_FOUND",
      message: "Missing.",
      target_agent_run_id: null,
    });
    expect(() => toSendMessageToResult({ accepted: true })).toThrow();
    expect(() => SendMessageToResultSchema.parse({
      accepted: true,
      code: "DELIVERED",
      message: "Delivered.",
      target_agent_run_id: "existing-run",
      result: null,
    })).toThrow();
  });

  it("keeps the delegate results strict, explicitly named and mutually exclusive (REQ-001, DEC-008)", () => {
    const team = { delegated: true, target_kind: "team", target_team_run_id: "team-copy", target_team_coordinator_agent_run_id: "team-copy-lead" };
    const agent = { delegated: true, target_kind: "agent", target_agent_run_id: "agent-copy", task_id: "ad_hoc_task_1" };
    expect(DelegateTaskResultSchema.parse(team)).toEqual(team);
    expect(DelegateTaskResultSchema.parse(agent)).toEqual(agent);
    // A Team copy is never named by an agent run ID alone, and an Agent copy has no team fields.
    expect(() => DelegateTaskResultSchema.parse({ ...team, target_agent_run_id: "team-copy-lead" })).toThrow();
    expect(() => DelegateTaskResultSchema.parse({ delegated: true, target_kind: "team", target_team_run_id: "team-copy" })).toThrow();
    expect(() => DelegateTaskResultSchema.parse({ delegated: true, target_kind: "agent", target_team_run_id: "team-copy" })).toThrow();
    // The kind is required on success and is only `agent` or `team`; never on failure.
    expect(() => DelegateTaskResultSchema.parse({ delegated: true, target_agent_run_id: "agent-copy" })).toThrow();
    expect(() => DelegateTaskResultSchema.parse({ delegated: true, target_kind: "agent_team", target_agent_run_id: "x" })).toThrow();
    expect(DelegateTaskResultSchema.parse({ delegated: false, message: "Activation failed." })).toEqual({ delegated: false, message: "Activation failed." });
    expect(() => DelegateTaskResultSchema.parse({ delegated: false, target_kind: "agent", message: "Activation failed." })).toThrow();
    expect(() => DelegateTaskResultSchema.parse({ delegated: false, target_agent_run_id: "fabricated-run", message: "Activation failed." })).toThrow();
    expect(() => DelegateTaskResultSchema.parse({ target_agent_run_id: null, message: "Activation failed." })).toThrow();
    expect(() => DelegateTaskResultSchema.parse({ delegated: false })).toThrow();
  });

  it.each(["2025-06-18", "2025-11-25"])(
    "advertises legal operation-owned output schemas for MCP %s",
    (protocolVersion) => {
      const adapters = [
        ...new SendMessageToMcpAdapterProvider({} as never).getAdapters(),
        ...new TaskDelegationToolsMcpAdapterProvider({} as never).getAdapters(),
      ].filter((adapter) =>
        adapter.definition.name === SEND_MESSAGE_TO_TOOL_NAME ||
        adapter.definition.name === DELEGATE_TASK_TOOL_NAME,
      );
      const tools = new AgentToolMcpCatalog({ adapters })
        .listMcpToolsForSession(buildSession(), protocolVersion);

      expect(tools.map((tool) => tool.name)).toEqual([
        SEND_MESSAGE_TO_TOOL_NAME,
        DELEGATE_TASK_TOOL_NAME,
      ]);
      for (const tool of tools) {
        expect(tool.outputSchema?.type).toBe("object");
        const branches = (tool.outputSchema as { oneOf?: unknown[]; anyOf?: unknown[] }).oneOf
          ?? (tool.outputSchema as { anyOf?: unknown[] }).anyOf;
        expect(branches).toHaveLength(tool.name === DELEGATE_TASK_TOOL_NAME ? 3 : 2);
        expect(() => ToolSchema.parse(tool)).not.toThrow();
      }
      const ajv = new Ajv2020({ strict: false });
      const sendSchema = tools.find((tool) => tool.name === SEND_MESSAGE_TO_TOOL_NAME)!.outputSchema!;
      const delegateSchema = tools.find((tool) => tool.name === DELEGATE_TASK_TOOL_NAME)!.outputSchema!;
      expect(ajv.validate(sendSchema, {
        accepted: true,
        code: "DELIVERED",
        message: "Delivered.",
        target_agent_run_id: "existing-run",
      })).toBe(true);
      expect(ajv.validate(sendSchema, {
        accepted: false,
        code: "TARGET_NOT_FOUND",
        message: "Missing.",
        target_agent_run_id: null,
      })).toBe(true);
      expect(ajv.validate(delegateSchema, {
        delegated: true, target_kind: "agent", target_agent_run_id: "fresh-task-ingress",
      })).toBe(true);
      expect(ajv.validate(delegateSchema, {
        delegated: true, target_kind: "team", target_team_run_id: "team-copy", target_team_coordinator_agent_run_id: "team-copy-lead",
      })).toBe(true);
      expect(ajv.validate(delegateSchema, {
        delegated: true, target_kind: "team", target_agent_run_id: "team-copy-lead",
      })).toBe(false);
      expect(ajv.validate(delegateSchema, {
        target_agent_run_id: "fresh-task-ingress",
      })).toBe(false);
      expect(ajv.validate(delegateSchema, {
        delegated: false,
        message: "Activation failed.",
      })).toBe(true);
      expect(ajv.validate(delegateSchema, {
        task_id: "task-1",
        status: "active",
        target_agent_run_id: "fresh-task-ingress",
      })).toBe(false);
    },
  );

  it("omits post-2025-03 output schemas for MCP 2025-03-26", () => {
    const adapters = [
      ...new SendMessageToMcpAdapterProvider({} as never).getAdapters(),
      ...new TaskDelegationToolsMcpAdapterProvider({} as never).getAdapters(),
    ].filter((adapter) =>
      adapter.definition.name === SEND_MESSAGE_TO_TOOL_NAME ||
      adapter.definition.name === DELEGATE_TASK_TOOL_NAME,
    );
    const tools = new AgentToolMcpCatalog({ adapters })
      .listMcpToolsForSession(buildSession(), "2025-03-26");

    expect(tools).toHaveLength(2);
    expect(tools.every((tool) => !("outputSchema" in tool))).toBe(true);
  });
});
