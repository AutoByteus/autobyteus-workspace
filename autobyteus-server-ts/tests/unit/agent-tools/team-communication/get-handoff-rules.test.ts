import { describe, expect, it } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { GetHandoffRulesService } from "../../../../src/agent-communication/services/get-handoff-rules-service.js";
import { createBoundAutoByteusGetHandoffRulesTool } from "../../../../src/agent-tools/agent-communication/get-handoff-rules.js";
import { GetHandoffRulesMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/get-handoff-rules-mcp-adapter-provider.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testMemberTeamContext } from "../../../fixtures/current-team-run-fixtures.js";

const buildContext = (handoffs: Array<{ from: string; to: string; rules: string[] }>) =>
  testMemberTeamContext({
    rootTeamRunId: "root-run",
    memberAddress: "/research_team/research_lead",
    agentRunId: "run-research-lead",
    outgoingHandoffs: handoffs,
  });

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

    expect(parsed).toEqual({ handoffs: [
      { recipient_address: "/research_team/field_team", when: "When field research is required." },
      { recipient_address: "/research_team/field_team", when: "When interviews are approved." },
      { recipient_address: "/product_manager", when: "When approved research is ready." },
    ] });
  });

  it("treats no outgoing handoffs as a successful empty result", () => {
    expect(new GetHandoffRulesService().getRules(buildContext([]).collaboration)).toEqual({ handoffs: [] });
  });

  it("rejects outside Team collaboration context", () => {
    expect(() => new GetHandoffRulesService().getRules(null)).toThrowError(
      expect.objectContaining({ code: "COLLABORATION_CONTEXT_REQUIRED" }),
    );
  });

  it("keeps the MCP adapter unavailable outside Team context", () => {
    const service = new GetHandoffRulesService();
    const adapter = new GetHandoffRulesMcpAdapterProvider(service).getAdapters()[0]!;
    expect(adapter.isAvailable?.({ sender: null } as never)).toBe(false);
    expect(adapter.isAvailable?.({ sender: buildAgentRunMessageSenderContext({
      senderRunId: "run-research-lead",
      senderName: "research_lead",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberTeamContext: buildContext([]),
    }) } as never)).toBe(true);
  });

  it("keeps the actual MCP provider envelope equal to the native service result", async () => {
    const service = new GetHandoffRulesService();
    const memberTeamContext = buildContext([]);
    const sender = buildAgentRunMessageSenderContext({
      senderRunId: memberTeamContext.identity.agentRunId,
      senderName: "research_lead",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberTeamContext,
    });
    const adapter = new GetHandoffRulesMcpAdapterProvider(service).getAdapters()[0]!;
    const expectedResult = service.getRules(memberTeamContext.collaboration);
    const expectedText = JSON.stringify(expectedResult);

    const projected = await adapter.execute({
      session: { sender } as never,
      rawArguments: {},
    });

    expect(projected.kind).toBe("mcp_tool_result");
    if (projected.kind !== "mcp_tool_result") throw new Error("Expected MCP tool result.");
    expect(projected.result.content).toEqual([{ type: "text", text: expectedText }]);
    expect(projected.result.structuredContent).toEqual(expectedResult);
    expect(projected.result).not.toHaveProperty("isError");
  });
});
