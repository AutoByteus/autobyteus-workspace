// autobyteus-508 reproduction probe (Solution Designer). Scratch reproduction; copy into autobyteus-server-ts/tests/app-data-migrations/delegated-runs-own-runs-v1/ to run. Do not commit it under tests/.
import { describe, expect, it } from "vitest";
import { convertAgentRunFile, convertTeamRunFile } from "../../../src/app-data-migrations/migrations/delegated-runs-own-runs-v1/run-file-conversion.js";

const scan = { delegatorOf: () => "ptm_1", delegatingRunOf: () => ({ kind: "agent", runId: "ptm_1" }), unfinishedRuns: new Set<string>() } as any;
const started = (runtimeKind: string, llmModelIdentifier: string) =>
  ({ runtimeKind, llmModelIdentifier, llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" });
const selection = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-6.1-terra", llmConfig: { reasoning_effort: "high" }, selectedAt: "2026-11-10T00:00:00.000Z" };

describe("autobyteus-508 probe: a released userLaunchSelection's runtimeKind", () => {
  it("team member own edit keeps the selected runtime", () => {
    const raw = { createdAt: "t", handoffs: [], taskAgent: { address: "/job_application_team", coordinatingRun: { kind: "agent", runId: "ptm_1" } },
      rootTeam: { address: "/job_application_team", teamDefinitionId: "job-application-team", teamRunId: "jat_1", coordinatorAddress: "/job_application_team/job_application_agent",
        defaultLaunchConfiguration: started("claude_agent_sdk", "sonnet"),
        members: [
          { address: "/job_application_team/job_application_agent", agentDefinitionId: "a", agentRunId: "a1", platformAgentRunId: null, role: null, description: null, launchConfiguration: started("claude_agent_sdk", "sonnet"), followsTeam: true },
          { address: "/job_application_team/computer_use_operator", agentDefinitionId: "c", agentRunId: "c1", platformAgentRunId: null, role: null, description: null, launchConfiguration: started("claude_agent_sdk", "sonnet"), followsTeam: true, userLaunchSelection: selection },
        ] } };
    const out = convertTeamRunFile("jat_1", raw, scan, "Job Application Team") as any;
    const operator = out.payload.rootTeam.members[1].launchConfiguration;
    expect([operator.runtimeKind, operator.llmModelIdentifier]).toEqual(["codex_app_server", "gpt-6.1-terra"]);
  });
  it("team-level edit reaches followers with its runtime", () => {
    const raw = { createdAt: "t", handoffs: [], taskAgent: { address: "/t", coordinatingRun: { kind: "agent", runId: "ptm_1" }, userLaunchSelection: selection },
      rootTeam: { address: "/t", teamDefinitionId: "t", teamRunId: "t_1", coordinatorAddress: "/t/lead", defaultLaunchConfiguration: started("claude_agent_sdk", "sonnet"),
        members: [{ address: "/t/lead", agentDefinitionId: "a", agentRunId: "a1", platformAgentRunId: null, role: null, description: null, launchConfiguration: started("claude_agent_sdk", "sonnet"), followsTeam: true }] } };
    const lead = (convertTeamRunFile("t_1", raw, scan, "T") as any).payload.rootTeam.members[0].launchConfiguration;
    expect([lead.runtimeKind, lead.llmModelIdentifier]).toEqual(["codex_app_server", "gpt-6.1-terra"]);
  });
  it("delegated agent run edit keeps the selected runtime", () => {
    const raw = { runId: "op_1", runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", llmConfig: null, workspaceRootPath: "/w",
      taskAgent: { address: "/op", coordinatingRun: { kind: "agent", runId: "ptm_1" }, userLaunchSelection: selection } };
    const out = (convertAgentRunFile("op_1", raw, scan) as any).payload;
    expect([out.runtimeKind, out.llmModelIdentifier]).toEqual(["codex_app_server", "gpt-6.1-terra"]);
  });
});
