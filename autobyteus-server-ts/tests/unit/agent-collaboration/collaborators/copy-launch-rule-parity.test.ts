import { describe, expect, it } from "vitest";
import { collaborationCopyAgentLaunch } from "@autobyteus/collaboration-stream-contracts";
import { teamCopyAgentLaunch } from "@autobyteus/team-stream-contracts";
import { effectiveCopyAgentLaunch } from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * The copy launch rule exists three times because the two contract packages cannot import the server
 * (autobyteus-348, FU-C1 follow-up). This is the one place that keeps them equal: the same inputs give
 * the same runtime, model, settings and `selected`.
 */
const started = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "started-model", llmConfig: { effort: "low" }, autoExecuteTools: true, workspaceRootPath: "/w" };
const at = "2026-11-01T10:00:00.000Z";
const choices = {
  none: undefined,
  modelOnly: { llmModelIdentifier: "m-only", llmConfig: null, selectedAt: at },
  otherRuntime: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "m-codex", llmConfig: { reasoning: "high" }, selectedAt: at },
  nativeRuntime: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m-native", llmConfig: null, selectedAt: at },
};
const toCollaboration = (choice: (typeof choices)[keyof typeof choices]) => choice ?? null;
const toTeam = (choice: (typeof choices)[keyof typeof choices]) => choice
  ? { runtime_kind: (choice as { runtimeKind?: RuntimeKind }).runtimeKind, llm_model_identifier: choice.llmModelIdentifier, llm_config: choice.llmConfig, selected_at: choice.selectedAt }
  : null;
const teamStarted = {
  runtime_kind: started.runtimeKind, llm_model_identifier: started.llmModelIdentifier, llm_config: started.llmConfig,
  auto_execute_tools: started.autoExecuteTools, workspace_root_path: started.workspaceRootPath,
};

describe("the copy launch rule's three mirrors agree (server, collaboration contract, team contract)", () => {
  for (const [agentName, agent] of Object.entries(choices)) {
    for (const [teamName, team] of Object.entries(choices)) {
      for (const followsTeam of [true, false]) {
        it(`agent choice ${agentName}, team choice ${teamName}, followsTeam ${followsTeam}`, () => {
          const server = effectiveCopyAgentLaunch({ started: started as never, followsTeam, teamSelection: team as never, agentSelection: agent as never });
          const collaboration = collaborationCopyAgentLaunch({
            started: started as never, followsTeam, teamSelection: toCollaboration(team) as never, agentSelection: toCollaboration(agent) as never,
          });
          const teamView = teamCopyAgentLaunch({
            started: teamStarted as never, followsTeam, teamSelection: toTeam(team) as never, agentSelection: toTeam(agent) as never,
          });
          expect(collaboration.selected).toBe(server.selected);
          expect(teamView.selected).toBe(server.selected);
          expect(collaboration.launch).toMatchObject({
            runtimeKind: server.launch.runtimeKind, llmModelIdentifier: server.launch.llmModelIdentifier, llmConfig: server.launch.llmConfig,
          });
          expect(teamView.launch).toMatchObject({
            runtime_kind: server.launch.runtimeKind, llm_model_identifier: server.launch.llmModelIdentifier, llm_config: server.launch.llmConfig,
          });
        });
      }
    }
  }
});
