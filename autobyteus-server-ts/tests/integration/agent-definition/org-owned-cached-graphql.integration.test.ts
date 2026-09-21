import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { buildSchema } from "type-graphql";
const { graphql } = createRequire(import.meta.url)("graphql") as typeof import("graphql");
import type { AppConfig } from "../../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { createBundleBackedDefinitionServices } from "../../../src/application-platform/definitions/create-bundle-backed-definition-services.js";
import { configureStudioApplicationApiServices } from "../../../src/api/graphql/studio-application-api-services.js";
import { AgentDefinitionResolver } from "../../../src/api/graphql/types/agent-definition.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { FileAgentDefinitionProvider } from "../../../src/agent-definition/providers/file-agent-definition-provider.js";
import { FileAgentTeamDefinitionProvider } from "../../../src/agent-team-definition/providers/file-agent-team-definition-provider.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { FileAgentOrgDefinitionProvider } from "../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js";
import { AgentOrgDefinition, AgentOrgMember } from "../../../src/agent-org-definition/domain/agent-org-definition.js";
import { buildAgentOrgOwnedDefinitionId } from "../../../src/agent-org-definition/utils/agent-org-owned-definition-id.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";

const configAt = (root: string) => ({
  getAgentsDir: () => path.join(root, "agents"),
  getAgentMdPath: (id: string) => path.join(root, "agents", id, "agent.md"),
  getAgentConfigPath: (id: string) => path.join(root, "agents", id, "agent-config.json"),
  getAgentTeamsDir: () => path.join(root, "agent-teams"),
  getAgentOrgsDir: () => path.join(root, "agent-orgs"),
  getAdditionalAgentPackageRoots: () => [],
}) as AppConfig;
// No external application packages in this disposable installation.
const bundleService = {
  listApplicationOwnedAgentSources: async () => [], listApplicationOwnedTeamSources: async () => [],
  getApplicationOwnedAgentSourceById: async () => null, getApplicationOwnedTeamSourceById: async () => null,
} as unknown as ApplicationBundleService;
const ownedId = buildAgentOrgOwnedDefinitionId("agent", "org", "direct");
const localId = buildTeamLocalAgentDefinitionId("team", "local");
const query = `query($id: String!) { agentDefinition(id: $id) { id name description instructions ownershipScope ownerOrgId ownerOrgName ownerTeamId } }`;
const listQuery = `{ agentDefinitions { id ownershipScope } }`;

// The configured GraphQL service is constructed by the real hosted composition;
// no persistence, cache, service, exact resolver or GraphQL response is mocked.
describe("Org-owned Agent exact lookup through hosted cached service and GraphQL", () => {
  let root: string;
  let definitions: ReturnType<typeof createBundleBackedDefinitionServices>;
  let registration: ReturnType<typeof configureStudioApplicationApiServices> | undefined;
  let schema: Awaited<ReturnType<typeof buildSchema>>;
  let orgs: FileAgentOrgDefinitionProvider;
  let originalFiles: Record<string, string>;
  const snapshot = async (dir: string): Promise<Record<string, string>> => {
    const values: Record<string, string> = {};
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) Object.assign(values, await snapshot(p));
      else values[p] = (await fs.readFile(p)).toString("base64");
    }
    return values;
  };
  const read = (id: string) => graphql({ schema, source: query, variableValues: { id } });
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "org-owned-cache-"));
    const config = configAt(root);
    const agents = new FileAgentDefinitionProvider({ appConfig: config, applicationBundleService: bundleService });
    await agents.create(new AgentDefinition({ id: "shared", name: "Shared", description: "Public", instructions: "Shared instructions" }));
    const teams = new FileAgentTeamDefinitionProvider({ appConfig: config, applicationBundleService: bundleService });
    await teams.create(new AgentTeamDefinition({ id: "team", name: "Team", description: "Flat Team", instructions: "Team instructions", coordinatorMemberName: "worker", nodes: [new TeamMember({ memberName: "worker", ref: "local", refScope: "team_local" })] }));
    await new FileAgentDefinitionProvider({ appConfig: configAt(path.join(root, "agent-teams", "team")), applicationBundleService: bundleService })
      .create(new AgentDefinition({ id: "local", name: "Local", description: "Team member", instructions: "Local instructions" }));
    orgs = new FileAgentOrgDefinitionProvider(config);
    await orgs.create(new AgentOrgDefinition({ id: "org", name: "Org", description: "Owned definitions", instructions: "Org instructions", members: [
      new AgentOrgMember({ memberName: "direct", ref: ownedId, refType: "agent", refScope: "org_local" }),
      new AgentOrgMember({ memberName: "shared", ref: "shared", refType: "agent", refScope: "shared" }),
    ] }));
    const owned = new FileAgentDefinitionProvider({ appConfig: configAt(path.join(root, "agent-orgs", "org")), applicationBundleService: bundleService });
    await owned.create(new AgentDefinition({ id: "direct", name: "Exact Direct", description: "Bundled Agent", instructions: "Exact owned instructions" }));
    await owned.create(new AgentDefinition({ id: "unreferenced", name: "Unreferenced", description: "Not a mounted reference", instructions: "Not exposed" }));
    definitions = createBundleBackedDefinitionServices({ appConfig: config, bundleService });
    const unused = new Proxy({}, { get: (_target, key) => { throw new Error(`Unexpected unrelated service operation ${String(key)}`); } });
    registration = configureStudioApplicationApiServices({ ...definitions, bundleService,
      agentOrgDefinitionService: unused, agentRunService: unused, teamRunService: unused, agentOrgRunService: unused,
      definitionAdmissionService: unused, collaborationRootHistoryService: unused, runModelConfigService: unused,
      capabilityService: unused, packageQueries: unused, packageCommands: unused,
    } as never);
    schema = await buildSchema({ resolvers: [AgentDefinitionResolver], validate: false });
    originalFiles = await snapshot(root);
  });
  afterEach(async () => { registration?.close(); registration = undefined; await fs.rm(root, { recursive: true, force: true }); });

  it.each([false, true])("resolves exact owned content with catalog already loaded=%s and keeps it out of lists", async (catalogFirst) => {
    if (catalogFirst) {
      const catalog = await graphql({ schema, source: listQuery }); expect(catalog.errors).toBeUndefined();
      expect((await definitions.agentDefinitionService.getAllAgentDefinitions()).map(d => d.id)).toEqual(["shared"]);
    }
    const result = await read(ownedId);
    expect(result.errors).toBeUndefined();
    expect(result.data?.agentDefinition).toEqual({ id: ownedId, name: "Exact Direct", description: "Bundled Agent", instructions: "Exact owned instructions", ownershipScope: "AGENT_ORG_OWNED", ownerOrgId: "org", ownerOrgName: "Org", ownerTeamId: null });
    const catalog = await graphql({ schema, source: listQuery }); expect(catalog.errors).toBeUndefined();
    expect(catalog.data?.agentDefinitions).toEqual([{ id: "shared", ownershipScope: "SHARED" }, { id: localId, ownershipScope: "TEAM_LOCAL" }]);
    expect((await definitions.agentDefinitionService.getAllAgentDefinitions()).map(d => d.id)).toEqual(["shared"]);
    expect(await snapshot(root)).toEqual(originalFiles);
  });

  it("retains exact physical membership, genuine missing negatives, and shared/Team-local controls", async () => {
    for (const id of ["absent", buildAgentOrgOwnedDefinitionId("agent", "org", "missing"), buildAgentOrgOwnedDefinitionId("agent", "org", "unreferenced"), buildAgentOrgOwnedDefinitionId("agent", "other-org", "direct")]) {
      const result = await read(id); expect(result.errors).toBeUndefined(); expect(result.data?.agentDefinition).toBeNull();
    }
    expect((await read("shared")).data?.agentDefinition).toMatchObject({ id: "shared", ownershipScope: "SHARED", ownerOrgId: null });
    expect((await read(localId)).data?.agentDefinition).toMatchObject({ id: localId, name: "Local", instructions: "Local instructions", ownershipScope: "TEAM_LOCAL", ownerTeamId: "team", ownerOrgId: null });
    expect(await snapshot(root)).toEqual(originalFiles);
  });

  it("reads parent-owned updates and reference removal without caching the exact child into the catalog", async () => {
    expect((await read(ownedId)).data?.agentDefinition).toMatchObject({ ownerOrgName: "Org" });
    let parent = (await orgs.getById("org"))!; parent.name = "Renamed Org"; parent = await orgs.update(parent);
    expect((await read(ownedId)).data?.agentDefinition).toMatchObject({ ownerOrgName: "Renamed Org" });
    parent.members = parent.members.filter(member => member.ref !== ownedId); await orgs.update(parent);
    expect((await read(ownedId)).data?.agentDefinition).toBeNull();
    expect((await definitions.agentDefinitionService.getAllAgentDefinitions()).map(d => d.id)).toEqual(["shared"]);
  });
});
