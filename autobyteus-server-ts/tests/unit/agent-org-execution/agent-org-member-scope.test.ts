import { describe, expect, it, vi } from "vitest";
import { AgentOrgExecutionScopeBuilder } from "../../../src/agent-org-execution/services/agent-org-execution-scope-builder.js";
import { validateAgentOrgStatePackage } from "../../../src/agent-org-execution/services/agent-org-state-package-validator.js";
import { validateAgentOrgCommunicationMessagesV1 } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-schema.js";
import type { FlatTeamExecutionCallbacks } from "../../../src/agent-team-execution/local/flat-team-execution-callbacks.js";
import type { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const ORG = "org-member-scope";
const orgHandoffs = [
  { from: "/director", to: "/target", rules: ["Hand the build to the team."] },
  { from: "/target/lead", to: "/director", rules: ["Report back to the director."] },
];
const copyHandoffs = [{ from: "/product_team/designer", to: "/product_team/designer2", rules: ["Copy rule."] }];

/** The Org scope builder's member contexts, captured through its real callbacks (CR-001). */
const buildCallbacks = async () => {
  const tree = testAgentOrgExecutionTree({ orgRunId: ORG, members: [
    { ...testOrgAgentNode("/director", "director"), agentDefinitionId: "definition-director" },
    testOrgTeamNode({ address: "/target", teamRunId: "configured-team", coordinatorAddress: "/target/lead",
      members: [testOrgAgentNode("/target/lead", "configured-lead")] }),
  ] });
  const state = validateAgentOrgStatePackage({
    executionTree: { ...tree, handoffs: orgHandoffs },
    communicationMessages: validateAgentOrgCommunicationMessagesV1({ schemaVersion: 1, subjectKind: "agent_org", orgRunId: ORG, messages: [] }, ORG),
  });
  let callbacks: FlatTeamExecutionCallbacks | undefined;
  const materialize = vi.fn(async (input: Parameters<FlatTeamExecutionFactory["materialize"]>[0]) => {
    callbacks = input.callbacks;
    return { teamRun: { teamRunId: input.teamNode.teamRunId }, commitAfterDurability() { }, abort: async () => { } };
  });
  const instructions: Record<string, string> = {
    [tree.rootOrg.orgDefinitionId]: "Org rules.",
    "definition-configured-team": "Mounted team rules.",
    "product-team": "Ship the product UI.",
  };
  const lookup = { getDefinitionById: async (id: string) => ({ instructions: instructions[id] ?? null }) };
  await new AgentOrgExecutionScopeBuilder({
    flatTeamExecutionFactory: { materialize } as never,
    taskExecutionIdentity: {} as never,
    agentRunManager: { prepareNewAgentRun: vi.fn() } as never,
    orgDefinitions: lookup as never,
    teamDefinitions: lookup as never,
  }).build({ state, persistence: {} as never, activationMode: "fresh", persistInitialPackage: false });
  const contextOf = (memberAddress: string, agentRunId: string, hostTeam?: Parameters<FlatTeamExecutionCallbacks["buildMemberExecutionContext"]>[0]["hostTeam"]) =>
    callbacks!.buildMemberExecutionContext({
      identity: createCollaborationMemberExecutionIdentity({ root: createAgentOrgRootExecutionIdentity(ORG), memberAddress, agentRunId }),
      hostTeam,
    } as Parameters<FlatTeamExecutionCallbacks["buildMemberExecutionContext"]>[0]);
  return { contextOf };
};

describe("AgentOrg member collaboration scope (CR-001)", () => {
  it("a mounted Team member keeps its cross-placement Org handoffs and its Team instruction (AC-012)", async () => {
    const { contextOf } = await buildCallbacks();
    const lead = await contextOf("/target/lead", "configured-lead", { address: "/target", teamDefinitionId: "definition-configured-team", handoffs: orgHandoffs });
    expect(lead.collaboration.outgoingHandoffs).toEqual([orgHandoffs[1]]);
    expect(lead.authoredEnclosingScopeInstruction).toBe("Mounted team rules.");
  });

  it("a configured direct Agent keeps the Org handoffs and instruction", async () => {
    const { contextOf } = await buildCallbacks();
    const director = await contextOf("/director", "director");
    expect(director.collaboration.outgoingHandoffs).toEqual([orgHandoffs[0]]);
    expect(director.authoredEnclosingScopeInstruction).toBe("Org rules.");
  });

  it("a catalog Team copy's member gets the copy's own handoffs and Team instruction; a catalog Agent copy gets none", async () => {
    const { contextOf } = await buildCallbacks();
    const designer = await contextOf("/product_team/designer", "copy-designer", { address: "/product_team", teamDefinitionId: "product-team", handoffs: copyHandoffs });
    expect(designer.collaboration.outgoingHandoffs).toEqual(copyHandoffs);
    expect(designer.authoredEnclosingScopeInstruction).toBe("Ship the product UI.");
    const reviewer = await contextOf("/code_reviewer", "reviewer-copy");
    expect(reviewer.collaboration.outgoingHandoffs).toEqual([]);
    expect(reviewer.authoredEnclosingScopeInstruction).toBeNull();
  });
});
