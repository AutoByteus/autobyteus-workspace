import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { buildConfiguredAgentToolExposure } from "../../../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamMemberCodexThreadBootstrapStrategy } from "../../../../../../src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.js";

const createMemberTeamContext = () =>
  new MemberTeamContext({
    teamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: "Professor",
    memberPath: ["professor"],
    memberRouteKey: "professor",
    memberRunId: "run-professor",
    teamInstruction: "Coordinate carefully.",
    collaboration: {
      addressing: {
        rootTeamRunId: "team-1",
        memberAddress: "/professor",
      },
      deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    },
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
    expect(preparation.developerInstructions).toContain("If you use `send_message_to`");
    expect(preparation.developerInstructions).toContain("`target_agent_run_id` for an exact live AgentRun");
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
    expect(preparation.developerInstructions).toContain("Bare names are invalid.");
    expect(preparation.developerInstructions).toContain("`target_agent_run_id` for an exact live AgentRun");
    expect(preparation.developerInstructions).not.toContain("roster recipient");
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

    expect(preparation.developerInstructions).toContain("Task delegation protocol");
    expect(preparation.developerInstructions).toContain("Use `delegate_task`");
    expect(preparation.developerInstructions).toContain("one `delegate_task` call for each bounded task");
    expect(preparation.developerInstructions).toContain("same `/...` and `./...` logical address grammar");
    expect(preparation.developerInstructions).not.toContain("do not pass delegator");
    expect(preparation.developerInstructions).toContain("`submit_task_result`");
    expect(preparation.developerInstructions).toContain("`review_task_result`");
    expect(preparation.dynamicToolRegistrations).toBeNull();
  });
});
