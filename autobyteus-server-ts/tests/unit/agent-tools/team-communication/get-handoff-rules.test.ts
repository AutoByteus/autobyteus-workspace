import { describe, expect, it } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { GetHandoffRulesService } from "../../../../src/agent-communication/services/get-handoff-rules-service.js";
import { serializeAgentCommunicationToolResult } from "../../../../src/agent-communication/services/agent-communication-tool-result.js";
import { MemberCollaborationContext } from "../../../../src/agent-team-execution/domain/member-collaboration-context.js";
import { createMemberLogicalAddressContext } from "../../../../src/agent-team-execution/domain/member-logical-address-context.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { createBoundAutoByteusGetHandoffRulesTool } from "../../../../src/agent-tools/agent-communication/get-handoff-rules.js";
import { toAgentCommunicationMcpToolResult } from "../../../../src/agent-tools/mcp/agent-communication-mcp-result-mapper.js";
import { GetHandoffRulesMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/get-handoff-rules-mcp-adapter-provider.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const buildContext = (handoffs: Array<{ from: string; to: string; rules: string[] }>) => {
  const collaboration = new MemberCollaborationContext({
    addressing: createMemberLogicalAddressContext({
      rootTeamRunId: "root-run",
      memberAddress: "/research_team/research_lead",
    }),
    outgoingHandoffs: handoffs,
  });
  return new MemberTeamContext({
    teamRunId: "research-run",
    teamDefinitionId: "research-team",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: "research_lead",
    memberPath: ["research_lead"],
    memberRouteKey: "research_lead",
    memberRunId: "run-research-lead",
    collaboration,
  });
};

describe("get_handoff_rules", () => {
  it("returns only the bound sender's ordered outgoing handoffs in canonical AutoByteus JSON", async () => {
    const handoffs = [
      {
        from: "/research_team/research_lead",
        to: "/research_team/field_team",
        rules: ["When field research is required.", "When interviews are approved."],
      },
      {
        from: "/research_team/research_lead",
        to: "/product_manager",
        rules: ["When approved research is ready."],
      },
    ];
    const tool = createBoundAutoByteusGetHandoffRulesTool(buildContext(handoffs));

    const parsed = JSON.parse(await tool.execute({}, {}));

    expect(parsed).toEqual({
      accepted: true,
      code: "HANDOFF_RULES_RETRIEVED",
      message: "Retrieved 2 outgoing handoff rule edges.",
      result: {
        member_address: "/research_team/research_lead",
        handoffs,
      },
    });
  });

  it("treats no outgoing handoffs as a successful empty result", () => {
    expect(new GetHandoffRulesService().getRules(buildContext([]).collaboration)).toEqual({
      accepted: true,
      code: "HANDOFF_RULES_RETRIEVED",
      message: "Retrieved 0 outgoing handoff rule edges.",
      result: {
        member_address: "/research_team/research_lead",
        handoffs: [],
      },
    });
  });

  it("returns the required typed rejection outside Team collaboration context", () => {
    expect(new GetHandoffRulesService().getRules(null)).toEqual({
      accepted: false,
      code: "COLLABORATION_CONTEXT_REQUIRED",
      message: "get_handoff_rules requires an active Team collaboration context.",
      result: null,
    });
  });

  it("projects identical MCP text and structuredContent with rejection-only isError", () => {
    const service = new GetHandoffRulesService();
    const accepted = toAgentCommunicationMcpToolResult(service.getRules(buildContext([]).collaboration));
    const rejected = toAgentCommunicationMcpToolResult(service.getRules(null));

    expect(JSON.parse((accepted.content[0] as { text: string }).text)).toEqual(accepted.structuredContent);
    expect(accepted).not.toHaveProperty("isError");
    expect(JSON.parse((rejected.content[0] as { text: string }).text)).toEqual(rejected.structuredContent);
    expect(rejected.isError).toBe(true);
    expect(rejected.structuredContent).toMatchObject({
      accepted: false,
      code: "COLLABORATION_CONTEXT_REQUIRED",
      result: null,
    });
  });

  it.each([
    { label: "accepted", memberTeamContext: buildContext([]), isError: undefined },
    { label: "rejected", memberTeamContext: null, isError: true },
  ])("keeps the actual MCP provider $label envelope equal to the native service envelope", async ({ memberTeamContext, isError }) => {
    const service = new GetHandoffRulesService();
    const sender = buildAgentRunMessageSenderContext({
      senderRunId: memberTeamContext?.memberRunId ?? "standalone-run",
      senderName: memberTeamContext?.memberName ?? "standalone",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberTeamContext,
    });
    const adapter = new GetHandoffRulesMcpAdapterProvider(service).getAdapters()[0]!;
    const expectedText = serializeAgentCommunicationToolResult(
      service.getRules(memberTeamContext?.collaboration),
    );

    const projected = await adapter.execute({
      session: { sender } as never,
      rawArguments: {},
    });

    expect(projected.kind).toBe("mcp_tool_result");
    if (projected.kind !== "mcp_tool_result") throw new Error("Expected MCP tool result.");
    expect(projected.result.content).toEqual([{ type: "text", text: expectedText }]);
    expect(projected.result.structuredContent).toEqual(JSON.parse(expectedText));
    expect(projected.result.isError).toBe(isError);
  });
});
