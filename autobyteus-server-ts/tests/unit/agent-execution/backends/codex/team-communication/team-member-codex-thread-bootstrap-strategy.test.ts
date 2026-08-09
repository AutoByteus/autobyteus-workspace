import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { buildConfiguredAgentToolExposure } from "../../../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { TeamMemberCodexThreadBootstrapStrategy } from "../../../../../../src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.js";
import { testMemberTeamContext } from "../../../../../fixtures/current-team-run-fixtures.js";

const createMemberTeamContext = () =>
  testMemberTeamContext({
    teamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    rootTeamRunId: "team-1",
    teamAddress: "/",
    memberAddress: "/professor",
    coordinatorAddress: "/professor",
    agentRunId: "run-professor",
    teamInstruction: "Coordinate carefully.",
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
  });

describe("TeamMemberCodexThreadBootstrapStrategy", () => {
  it("uses the runtime-local member team context for Agent Tools MCP send_message_to instructions", () => {
    const strategy = new TeamMemberCodexThreadBootstrapStrategy();
    const memberTeamContext = createMemberTeamContext();
    const runContext = new AgentRunContext({
      runId: "run-professor",
      config: new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "gpt-test",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberTeamContext,
      }),
      runtimeContext: null,
    });

    expect(strategy.appliesTo(runContext)).toBe(true);

    const preparation = strategy.prepare({
      runContext,
      agentInstruction: "Solve the task.",
      configuredToolExposure: buildConfiguredAgentToolExposure(["send_message_to"]),
    });

    expect(preparation.baseInstructions).toContain("Team Instruction");
    expect(preparation.baseInstructions).toContain("Agent Instruction");
    expect(preparation.developerInstructions).toContain("Your address in the AgentTeam is:\n\n/professor");
    expect(preparation.developerInstructions).toContain("call `get_handoff_rules`");
    expect(preparation.dynamicToolRegistrations).toBeNull();
  });

  it("keeps hierarchical Team and exact-run send_message_to instructions without dynamic registrations", () => {
    const strategy = new TeamMemberCodexThreadBootstrapStrategy();
    const memberTeamContext = createMemberTeamContext();
    const runContext = new AgentRunContext({
      runId: "run-professor",
      config: new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "gpt-test",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberTeamContext,
      }),
      runtimeContext: null,
    });

    const preparation = strategy.prepare({
      runContext,
      agentInstruction: "Solve the task.",
      configuredToolExposure: buildConfiguredAgentToolExposure(["send_message_to"]),
    });

    expect(preparation.dynamicToolRegistrations).toBeNull();
    expect(preparation.developerInstructions).toContain("Bare member names, `../`, and backslashes are not valid addresses.");
    expect(preparation.developerInstructions).not.toContain("target_agent_run_id");
    expect(preparation.developerInstructions).not.toContain("Team membership roster");
  });

  it("keeps task delegation as Agent Tools MCP instructions without dynamic registrations", () => {
    const strategy = new TeamMemberCodexThreadBootstrapStrategy();
    const memberTeamContext = createMemberTeamContext();
    const runContext = new AgentRunContext({
      runId: "run-professor",
      config: new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "gpt-test",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberTeamContext,
      }),
      runtimeContext: null,
    });

    const preparation = strategy.prepare({
      runContext,
      agentInstruction: "Solve the task.",
      configuredToolExposure: buildConfiguredAgentToolExposure([
        "delegate_task",
        ["mark", "task", "completed"].join("_"),
        ["mark", "task", "failed"].join("_"),
        ["accept", "task"].join("_"),
        "submit_task_result",
        "review_task_result",
        "create_task",
      ]),
    });

    expect(preparation.developerInstructions).toContain("`delegate_task.recipient_address` uses the same logical-address grammar");
    expect(preparation.developerInstructions).toContain("direct Agent or AgentTeam child of your immediate AgentTeam");
    expect(preparation.developerInstructions).not.toContain("delegator");
    expect(preparation.dynamicToolRegistrations).toBeNull();
  });
});
