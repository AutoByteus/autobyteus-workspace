import { describe, expect, it, vi } from "vitest";
import { DelegatedRunStartError, DelegatedRunStarter } from "../../../../src/agent-collaboration/execution/delegation/delegated-run-starter.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/** autobyteus-461 design DS-1, contract §2.2 (D2): a local delegation creates an ordinary run carrying its own origin. */
const source = { kind: "agent" as const, agentDefinitionId: "image-maker",
  launchConfiguration: { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "gpt-image", llmConfig: { size: "1k" }, autoExecuteTools: true, workspaceRootPath: "/Users/me/projects/x" },
  launchSource: { origin: "agent_default" as const, fallbacks: [] } };
const delegatedFrom = { delegatingRun: { kind: "agent_team" as const, runId: "marketing_team_5a00" }, delegatorAgentRunId: "copywriter_77c1" };

describe("DelegatedRunStarter (local delegation)", () => {
  it("prepares an ordinary agent run with the resolved launch, its address, its launch source and its origin (no nodeId)", async () => {
    const prepareAgentRun = vi.fn(async () => ({ runId: "image_maker_33f0", activationState: "PREPARED" as const, preparedExpiresAt: "t" }));
    const starter = new DelegatedRunStarter({ agentRuns: { prepareAgentRun }, teamRuns: {} as never });
    await expect(starter.startAgent({ source, address: "/image_maker" as never, delegatedFrom })).resolves.toEqual({ agentRunId: "image_maker_33f0" });
    expect(prepareAgentRun).toHaveBeenCalledExactlyOnceWith({ agentDefinitionId: "image-maker", runtimeKind: RuntimeKind.AUTOBYTEUS,
      llmModelIdentifier: "gpt-image", llmConfig: { size: "1k" }, autoExecuteTools: true, workspaceRootPath: "/Users/me/projects/x",
      address: "/image_maker", launchSource: { origin: "agent_default", fallbacks: [] }, delegatedFrom });
  });

  it("a launch without a workspace, or a failed preparation, is a DelegatedRunStartError with the reason", async () => {
    const starter = new DelegatedRunStarter({ agentRuns: { prepareAgentRun: vi.fn(async () => { throw new Error("No model is set."); }) }, teamRuns: {} as never });
    await expect(starter.startAgent({ source, address: "/image_maker" as never, delegatedFrom }))
      .rejects.toMatchObject({ name: "DelegatedRunStartError", message: "No model is set.", changedWhileStarting: false });
    await expect(starter.startAgent({ source: { ...source, launchConfiguration: { ...source.launchConfiguration, workspaceRootPath: null } },
      address: "/image_maker" as never, delegatedFrom })).rejects.toBeInstanceOf(DelegatedRunStartError);
  });

  it("a team run rooted at `/`: the team's launch source on the team, a member's own on the member (SR-038, DS-10 step 4)", async () => {
    const launch = source.launchConfiguration;
    const routed = { origin: "model_router" as const, fallbacks: [], choiceReason: "Careful review.", taskKind: "review" };
    const team = { kind: "agent_team" as const, teamDefinitionId: "product-team", coordinatorAddress: "/product_team/lead" as never, handoffs: [],
      defaultLaunchConfiguration: launch, defaultLaunchSource: { origin: "team_default" as const, fallbacks: [] },
      members: [{ address: "/product_team/lead" as never, agentDefinitionId: "lead", launchConfiguration: launch, launchSource: routed },
        { address: "/product_team/writer" as never, agentDefinitionId: "writer", launchConfiguration: launch }] };
    const tree = testExecutionTree({ rootTeamRunId: "product_team_e03d", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead_1" }), testAgentNode("/writer", { agentRunId: "writer_1" })] });
    const createTeamRun = vi.fn(async () => ({ teamRunId: "product_team_e03d", getExecutionTreeSnapshot: () => tree }));
    const starter = new DelegatedRunStarter({ agentRuns: {} as never, teamRuns: { createTeamRun, terminateTeamRun: vi.fn() } as never });
    await expect(starter.startTeam({ source: team as never, address: "/product_team" as never, delegatedFrom, copiedFrom: "team_definition" }))
      .resolves.toMatchObject({ teamRunId: "product_team_e03d", coordinatorAgentRunId: "lead_1" });
    const request = (createTeamRun.mock.calls[0] as unknown[])[0] as { teamConfigs: unknown[]; memberConfigs: Record<string, unknown>[] };
    expect(request).toMatchObject({ teamConfigs: [{ teamAddress: "/", launchSource: { origin: "team_default", fallbacks: [] } }],
      memberConfigs: [{ memberAddress: "/lead", agentDefinitionId: "lead", launchSource: routed }, { memberAddress: "/writer", agentDefinitionId: "writer" }] });
    expect(request.memberConfigs[1]).not.toHaveProperty("launchSource");
  });

  it("passes the source's handoff rules in the team's own space; a `to` outside the team is kept as written (CR-461-009)", async () => {
    const launch = source.launchConfiguration;
    const team = { kind: "agent_team" as const, teamDefinitionId: "dev-team", coordinatorAddress: "/dev_team/lead" as never,
      defaultLaunchConfiguration: launch,
      members: [{ address: "/dev_team/lead" as never, agentDefinitionId: "lead", launchConfiguration: launch },
        { address: "/dev_team/dev" as never, agentDefinitionId: "dev", launchConfiguration: launch }],
      handoffs: [{ from: "/dev_team/lead", to: "/dev_team/dev", rules: ["When the design is ready."] },
        { from: "/dev_team/lead", to: "/ceo_agent", rules: ["When the release is ready for sign-off."] }] };
    const tree = testExecutionTree({ rootTeamRunId: "dev_team_1", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead_1" }), testAgentNode("/dev", { agentRunId: "dev_1" })] });
    const createTeamRun = vi.fn(async () => ({ teamRunId: "dev_team_1", getExecutionTreeSnapshot: () => tree }));
    const starter = new DelegatedRunStarter({ agentRuns: {} as never, teamRuns: { createTeamRun, terminateTeamRun: vi.fn() } as never });
    await starter.startTeam({ source: team as never, address: "/dev_team" as never, delegatedFrom, copiedFrom: "team_definition" });
    expect((createTeamRun.mock.calls[0] as unknown[])[0]).toMatchObject({ delegatedFrom, handoffs: [
      { from: "/lead", to: "/dev", rules: ["When the design is ready."] },
      { from: "/lead", to: "/ceo_agent", rules: ["When the release is ready for sign-off."] },
    ] });
  });
});
