import { describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { createCollaboratorAdmission } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorDefinitionCatalog } from "../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { NodeCatalogPort } from "../../../src/agent-collaboration/collaborators/node-catalog-port.js";
import { BUILT_IN_AGENT_DEFINITIONS } from "../../../src/built-in-agents/built-in-agent-registry.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { RemoteCatalogLister } from "../../../src/remote-collaboration/inbound/remote-catalog-lister.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * autobyteus-261 DS-002 on the node that answers: what it offers a peer is exactly what a delegation from a peer
 * accepts (REQ-402): the same eligibility policy and the same node catalog port, so every listed address resolves
 * through `catalogDefinitionAt`. Only name, kind, address and description (when it has one) are revealed (REQ-403).
 */

const opus = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: { thinking: "on" } };
const agent = (id: string, name: string, ownershipScope: AgentDefinition["ownershipScope"] = "shared", description = "") =>
  new AgentDefinition({ id, name, description, instructions: "secret instructions", ownershipScope, defaultLaunchConfig: opus });

const setup = () => {
  const builtIn = BUILT_IN_AGENT_DEFINITIONS[0]!;
  const agents = [
    agent("publisher", "Publisher"),
    agent("writer", "Writer", "shared", "Writes the articles"),
    agent("member-only", "Member Only", "team_local"),
    agent("app-agent", "App Agent", "application_owned"),
    agent(builtIn.id, "Built In"),
  ];
  const teams = [
    new AgentTeamDefinition({ id: "studio", name: "Studio Team", description: "Writes and checks articles", instructions: "x", coordinatorMemberName: "writer",
      nodes: [new TeamMember({ memberName: "writer", ref: "writer", refScope: "shared" })] }),
    new AgentTeamDefinition({ id: "app-team", name: "App Team", description: "x", instructions: "x", coordinatorMemberName: "writer", ownershipScope: "application_owned",
      nodes: [new TeamMember({ memberName: "writer", ref: "writer", refScope: "shared" })] } as never),
  ];
  const catalog: CollaboratorDefinitionCatalog = {
    listAgentDefinitions: async () => agents,
    listTeamDefinitions: async () => teams,
    getAgentDefinition: async (id) => agents.find((item) => item.id === id) ?? null,
    getTeamDefinition: async (id) => teams.find((item) => item.id === id) ?? null,
  };
  const admission = createCollaboratorAdmission(catalog, { validate: vi.fn(), validateMany: vi.fn() } as unknown as RunModelSelectionValidator,
    { getRuntimeAvailability: vi.fn(async (runtimeKind: RuntimeKind) => ({ runtimeKind, enabled: true, reason: null })) });
  const port = new NodeCatalogPort("/data/temp_workspace");
  return { agents, teams, admission, port, lister: new RemoteCatalogLister({ policy: () => admission.policy, catalogPort: port }) };
};

describe("RemoteCatalogLister (autobyteus-261)", () => {
  it("AC-402: shared Agents then shared Teams, with only name, kind, address and a description when there is one", async () => {
    const { lister } = setup();
    await expect(lister.list()).resolves.toEqual({ accepted: true, agents: [
      { name: "Publisher", kind: "agent", address: "/publisher" },
      { name: "Writer", kind: "agent", address: "/writer", description: "Writes the articles" },
      { name: "Studio Team", kind: "agent_team", address: "/studio_team", description: "Writes and checks articles" },
    ] });
  });

  it("REQ-402: every listed address is one a delegation from a peer accepts, at the same definition", async () => {
    const { lister, admission, port } = setup();
    const { agents } = await lister.list();
    for (const entry of agents) {
      await expect(admission.catalogDefinitionAt(port, entry.address), entry.address).resolves.toMatchObject({ kind: entry.kind });
    }
    // Built-ins, team-local and application-owned definitions are neither listed nor delegable.
    for (const address of ["/built_in", "/member_only", "/app_agent", "/app_team"]) {
      await expect(admission.catalogDefinitionAt(port, address), address).resolves.toBeNull();
    }
  });

  it("reads the catalog on every call: a Team added between two calls is in the second (AC-405, REQ-407)", async () => {
    const f = setup();
    expect((await f.lister.list()).agents).toHaveLength(3);
    f.teams.push(new AgentTeamDefinition({ id: "review", name: "Review Squad", description: "", instructions: "x", coordinatorMemberName: "publisher",
      nodes: [new TeamMember({ memberName: "publisher", ref: "publisher", refScope: "shared" })] }));
    expect((await f.lister.list()).agents.at(-1)).toEqual({ name: "Review Squad", kind: "agent_team", address: "/review_squad" });
  });
});
