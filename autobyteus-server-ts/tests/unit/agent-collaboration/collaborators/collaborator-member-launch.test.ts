import { describe, expect, it } from "vitest";
import {
  configuredPlacementSource,
} from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import {
  type ConfiguredAgentExecutionNode,
  type ConfiguredTeamExecutionNode,
} from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * D-5 / REQ-012 / AC-011: a delegation of a configured placement starts from its snapshot: every member's complete
 * launch and whether it follows the Team. A delegated run then keeps its launch in its own file (autobyteus-461).
 */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" };
const codex = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" }, autoExecuteTools: true, workspaceRootPath: "/work" };
describe("configured placement snapshot (D-1, D-4, D-5, D-6)", () => {
  const slotAgent = (address: string, launchConfiguration: typeof claude): ConfiguredAgentExecutionNode => ({
    address: address as never, agentDefinitionId: address.split("/").at(-1)!, role: "r", description: null,
    agentRunId: `run-${address}`, platformAgentRunId: "slot-session", launchConfiguration,
  });

  it("an agent placement becomes its definition and launch with the configured origin", () => {
    expect(configuredPlacementSource(slotAgent("/writer", codex), [])).toEqual({
      kind: "agent", agentDefinitionId: "writer", launchConfiguration: codex, launchSource: { origin: "configured", fallbacks: [] },
    });
  });

  it("a Team placement records every member's complete launch, followers by the configured rule, and its members' handoffs", () => {
    const team: ConfiguredTeamExecutionNode = {
      address: "/group" as never, teamDefinitionId: "group", role: null, description: null, teamRunId: "group-run",
      coordinatorAddress: "/group/one" as never, defaultLaunchConfiguration: claude,
      members: [
        slotAgent("/group/one", claude),
        // Its own auto-approve and workspace, the Team's model: still a follower (AC-011 a).
        slotAgent("/group/two", { ...claude, autoExecuteTools: false, workspaceRootPath: "/elsewhere" }),
        slotAgent("/group/three", codex),
      ],
    };
    const handoffs = [
      { from: "/group/one", to: "/teacher", rules: ["report"] },
      { from: "/group/one", to: "/group/two", rules: ["pass"] },
      { from: "/teacher", to: "/group/one", rules: ["assign"] },
      { from: "/other", to: "/teacher", rules: ["x"] },
    ] as never;
    const source = configuredPlacementSource(team, handoffs);
    expect(source).toMatchObject({
      kind: "agent_team", teamDefinitionId: "group", coordinatorAddress: "/group/one", defaultLaunchConfiguration: claude,
      defaultLaunchSource: { origin: "configured", fallbacks: [] },
      handoffs: [{ from: "/group/one", to: "/teacher", rules: ["report"] }, { from: "/group/one", to: "/group/two", rules: ["pass"] }],
    });
    if (source.kind !== "agent_team") throw new Error("team expected");
    expect(source.members.map((member) => [member.address, member.followsTeam, member.launchConfiguration.autoExecuteTools])).toEqual([
      ["/group/one", true, true], ["/group/two", true, false], ["/group/three", false, true],
    ]);
    expect(source.members.every((member) => member.launchSource === undefined)).toBe(true);
  });
});
