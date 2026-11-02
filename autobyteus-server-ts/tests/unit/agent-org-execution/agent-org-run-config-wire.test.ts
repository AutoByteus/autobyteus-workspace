import { describe, expect, it, vi } from "vitest";
import { agentOrgExecutionTreeDtoSchema } from "@autobyteus/collaboration-stream-contracts";
import { AgentOrgRunService } from "../../../src/agent-org-execution/services/agent-org-run-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentOrgExecutionTree, testOrgAgentCopySource, testOrgAgentNode, testOrgLaunchConfiguration, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

/**
 * autobyteus-348 (contract §6): the pending runtime switch is server state and is not on the wire. The Org tree the settings read
 * and the Save result return as JSON is parsed by the web with the strict Org tree schema, so a pending configured Agent (direct,
 * and in a mounted Team) and a pending delegated copy must come out of the service in exactly that shape.
 */
const pending = { switchId: "switch-1",
  from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "haiku", llmConfig: null, platformAgentRunId: "claude-session" } };

const pendingTree = () => {
  const base = testAgentOrgExecutionTree({ orgRunId: "org", members: [
    { ...testOrgAgentNode("/direct", "direct"), pendingRuntimeSwitch: pending } as never,
    testOrgTeamNode({ address: "/team", teamRunId: "team", coordinatorAddress: "/team/lead", members: [
      { ...testOrgAgentNode("/team/lead", "lead"), pendingRuntimeSwitch: pending } as never,
      testOrgAgentNode("/team/worker", "worker"),
    ] }),
  ] });
  const copy = { address: "/helper", agentRunId: "copy", platformAgentRunId: null, startedAt: "2026-11-01T00:00:00.000Z", delegatorAgentRunId: "direct",
    source: testOrgAgentCopySource("helper", testOrgLaunchConfiguration()),
    userLaunchSelection: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, selectedAt: "2026-11-01T00:00:00.000Z" },
    pendingRuntimeSwitch: pending };
  return { ...base, rootOrg: { ...base.rootOrg, taskExecutions: [copy] } } as never;
};

const serviceFor = (tree: unknown) => new AgentOrgRunService({ manager: {
  getRunConfig: vi.fn().mockResolvedValue({ orgRunId: "org", executionTree: tree, isActive: false, editability: { editable: true, reason: null } }),
  updateStoppedRunConfig: vi.fn().mockResolvedValue({ success: true, outcome: "UPDATED", message: "ok", canonical: tree, isActive: false,
    editability: { editable: true, reason: null }, fieldErrors: [] }),
} } as never);

describe("the Org tree on the wire while members and copies have a pending runtime switch", () => {
  it("the stored tree really holds the pending fields (the case is not vacuous)", () => {
    const tree = pendingTree() as any;
    expect(tree.rootOrg.members[0].pendingRuntimeSwitch).toEqual(pending);
    expect(tree.rootOrg.members[1].members[0].pendingRuntimeSwitch).toEqual(pending);
    expect(agentOrgExecutionTreeDtoSchema.safeParse(tree).success, "the raw stored tree is not a wire shape").toBe(false);
  });

  it("the settings read returns a tree the web's strict schema accepts, without any pending field", async () => {
    const { executionTree } = await serviceFor(pendingTree()).getRunConfig("org");
    const parsed = agentOrgExecutionTreeDtoSchema.safeParse(executionTree);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
    expect(JSON.stringify(executionTree)).not.toContain("pendingRuntimeSwitch");
    const members = (executionTree as any).rootOrg.members;
    expect(members[0]).toMatchObject({ address: "/direct", platformAgentRunId: null });
    expect(members[1].members.map((member: any) => member.address)).toEqual(["/team/lead", "/team/worker"]);
    // The copy keeps the user's choice (with its runtime), which is wire data.
    expect((executionTree as any).rootOrg.taskExecutions[0].userLaunchSelection).toMatchObject({ runtimeKind: RuntimeKind.CODEX_APP_SERVER });
  });

  it("the Save result's canonical tree is the same wire shape", async () => {
    const result = await serviceFor(pendingTree()).updateStoppedRunConfig({ orgRunId: "org", selectionPatches: [], teamWorkspacePatches: [] } as never);
    const parsed = agentOrgExecutionTreeDtoSchema.safeParse(result.canonical);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
    expect(JSON.stringify(result.canonical)).not.toContain("pendingRuntimeSwitch");
    expect(result).toMatchObject({ success: true, outcome: "UPDATED" });
  });

  it("a result without a tree stays without one", async () => {
    const service = new AgentOrgRunService({ manager: { updateStoppedRunConfig: vi.fn().mockResolvedValue({ success: false, outcome: "NOT_FOUND",
      message: "x", canonical: null, isActive: false, editability: { editable: false, reason: "UNAVAILABLE" }, fieldErrors: [] }) } } as never);
    await expect(service.updateStoppedRunConfig({ orgRunId: "org" } as never)).resolves.toMatchObject({ canonical: null });
  });
});
