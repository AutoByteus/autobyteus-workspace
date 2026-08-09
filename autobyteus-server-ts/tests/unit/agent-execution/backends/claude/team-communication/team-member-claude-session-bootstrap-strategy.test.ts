import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";
import { TeamMemberClaudeSessionBootstrapStrategy } from "../../../../../../src/agent-execution/backends/claude/team-communication/team-member-claude-session-bootstrap-strategy.js";
import { testMemberTeamContext } from "../../../../../fixtures/current-team-run-fixtures.js";

const memberTeamContext = testMemberTeamContext({
  teamRunId: "team-1",
  teamDefinitionId: "team-def-1",
  rootTeamRunId: "team-1",
  teamAddress: "/",
  memberAddress: "/Professor",
  coordinatorAddress: "/Professor",
  agentRunId: "run-professor",
});

describe("TeamMemberClaudeSessionBootstrapStrategy", () => {
  it("returns the runtime-local memberTeamContext when available", () => {
    const strategy = new TeamMemberClaudeSessionBootstrapStrategy();
    const runContext = new AgentRunContext({
      runId: "run-professor",
      config: new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "haiku",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        memberTeamContext,
      }),
      runtimeContext: null,
    });

    expect(strategy.appliesTo(runContext)).toBe(true);
    expect(strategy.prepare({ runContext })).toEqual({ memberTeamContext });
  });

  it("does not apply when no member team context exists", () => {
    const strategy = new TeamMemberClaudeSessionBootstrapStrategy();
    const runContext = new AgentRunContext({
      runId: "run-professor",
      config: new AgentRunConfig({
        agentDefinitionId: "agent-1",
        llmModelIdentifier: "haiku",
        autoExecuteTools: false,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        memberTeamContext: null,
      }),
      runtimeContext: null,
    });

    expect(strategy.appliesTo(runContext)).toBe(false);
  });
});
