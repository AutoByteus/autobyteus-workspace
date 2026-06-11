import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { buildConfiguredAgentToolExposure } from "../../../../../../src/agent-execution/shared/configured-agent-tool-exposure.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { MemberTeamContext } from "../../../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamMemberCodexThreadBootstrapStrategy } from "../../../../../../src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.js";

const createMemberTeamContext = (input: {
  allowedRecipientNames?: string[];
  communicationRecipients?: [];
} = {}) =>
  new MemberTeamContext({
    teamRunId: "team-1",
    teamDefinitionId: "team-def-1",
    teamBackendKind: TeamBackendKind.MIXED,
    memberName: "Professor",
    memberRouteKey: "professor",
    memberRunId: "run-professor",
    teamInstruction: "Coordinate carefully.",
    members: [
      {
        memberKind: "agent",
        memberName: "Professor",
        memberPath: ["Professor"],
        memberRouteKey: "professor",
        memberRunId: "run-professor",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        role: "lead",
        description: "Leads the work.",
      },
      {
        memberKind: "agent",
        memberName: "Writer",
        memberPath: ["Writer"],
        memberRouteKey: "writer",
        memberRunId: "run-writer",
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        role: "writer",
        description: "Drafts the answer.",
      },
    ],
    communicationRecipients: input.communicationRecipients,
    allowedRecipientNames: input.allowedRecipientNames ?? ["Writer"],
    sendMessageToEnabled: true,
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
  });

describe("TeamMemberCodexThreadBootstrapStrategy", () => {
  it("uses the runtime-local member team context for dynamic send_message_to exposure", () => {
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
    expect(preparation.dynamicToolRegistrations).toHaveLength(1);
    expect(preparation.dynamicToolRegistrations?.[0]?.spec).toEqual(
      expect.objectContaining({
        name: "send_message_to",
        inputSchema: expect.objectContaining({
          properties: expect.objectContaining({
            recipient_name: expect.not.objectContaining({ enum: expect.anything() }),
          }),
        }),
      }),
    );
  });

  it("exposes send_message_to for exact-run-only contexts with no static recipients", () => {
    const strategy = new TeamMemberCodexThreadBootstrapStrategy();
    const memberTeamContext = createMemberTeamContext({
      allowedRecipientNames: [],
      communicationRecipients: [],
    });
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

    expect(preparation.dynamicToolRegistrations?.map((registration) => registration.spec.name))
      .toEqual(["send_message_to"]);
    expect(preparation.developerInstructions).toContain(
      "No logical `recipient_name` roster recipients are currently listed for this run.",
    );
    expect(preparation.developerInstructions).toContain("Set `target_agent_run_id`");
    expect(preparation.developerInstructions).not.toContain("Use recipient_name for one logical roster recipient:");
  });

  it("adds task delegation dynamic tools only when the agent configuration enables them", () => {
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
        "delegate_tasks",
        ["mark", "task", "completed"].join("_"),
        ["mark", "task", "failed"].join("_"),
        ["accept", "task"].join("_"),
        "submit_task_result",
        "review_task_result",
        "create_task",
      ]),
    });

    expect(preparation.developerInstructions).toContain("Task delegation protocol");
    expect(preparation.developerInstructions).toContain("Do not use `create_task`");
    expect(preparation.dynamicToolRegistrations?.map((registration) => registration.spec.name))
      .toEqual([
        "delegate_tasks",
        "submit_task_result",
        "review_task_result",
      ]);
  });
});
