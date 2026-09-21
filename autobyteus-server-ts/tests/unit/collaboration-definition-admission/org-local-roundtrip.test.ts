import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { buildSchema } from "type-graphql";
import { createRequire } from "node:module";
const { graphql } = createRequire(import.meta.url)("graphql") as typeof import("graphql");
import type { AppConfig } from "../../../src/config/app-config.js";
import { FileAgentOrgDefinitionProvider } from "../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js";
import { FileAgentTeamDefinitionProvider } from "../../../src/agent-team-definition/providers/file-agent-team-definition-provider.js";
import { FileAgentDefinitionProvider } from "../../../src/agent-definition/providers/file-agent-definition-provider.js";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { listAgentOrgOwnedDefinitionSources } from "../../../src/agent-org-definition/providers/agent-org-owned-definition-source-index.js";
import { buildAgentOrgOwnedDefinitionId } from "../../../src/agent-org-definition/utils/agent-org-owned-definition-id.js";
import { AgentOrgDefinitionResolver } from "../../../src/api/graphql/types/agent-org-definition.js";
const mocks = vi.hoisted(() => ({ service: { createDefinition: vi.fn(), updateDefinition: vi.fn() }, admission: { requireAvailable: vi.fn(), scan: vi.fn() } }));
vi.mock("../../../src/api/graphql/studio-application-api-services.js", () => ({ getStudioAgentOrgDefinitionService: () => mocks.service, getStudioDefinitionAdmissionService: () => mocks.admission }));
const roots: string[] = [];
afterEach(async () => { vi.clearAllMocks(); await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
it("maps unchanged GraphQL enums to strict org_local packages and resolves bundled Agent/Team through the real owned index/providers", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "org-local-roundtrip-")); roots.push(root);
  const configAt = (base: string) => ({ getAgentsDir: () => path.join(base, "agents"), getAgentMdPath: (id: string) => path.join(base, "agents", id, "agent.md"), getAgentConfigPath: (id: string) => path.join(base, "agents", id, "agent-config.json"), getAgentTeamsDir: () => path.join(base, "agent-teams"), getAgentOrgsDir: () => path.join(base, "agent-orgs"), getAdditionalAgentPackageRoots: () => [] }) as AppConfig;
  const config = configAt(root), orgs = new FileAgentOrgDefinitionProvider(config);
  const app = { getApplicationOwnedAgentSourceById: async () => null, getApplicationOwnedTeamSourceById: async () => null } as any;
  mocks.service.createDefinition.mockImplementation(async (org) => { org.id = "org"; return orgs.create(org); });
  mocks.admission.requireAvailable.mockImplementation(async (_kind, id) => ({ definition: await orgs.getById(id) }));
  const schema = await buildSchema({ resolvers: [AgentOrgDefinitionResolver], validate: false });
  const agentId = buildAgentOrgOwnedDefinitionId("agent", "org", "direct"), teamId = buildAgentOrgOwnedDefinitionId("agent_team", "org", "team");
  const members = [{ memberName: "direct", ref: agentId, refType: "AGENT", refScope: "AGENT_ORG_OWNED" },
    { memberName: "team", ref: teamId, refType: "AGENT_TEAM", refScope: "AGENT_ORG_OWNED" },
    { memberName: "shared", ref: "shared-agent", refType: "AGENT", refScope: "SHARED" },
    { memberName: "application", ref: "application-agent", refType: "AGENT", refScope: "APPLICATION_OWNED" }];
  const mutation = `mutation($input: CreateAgentOrgDefinitionInput!) { createAgentOrgDefinition(input:$input) { id members { memberName ref refType refScope } } }`;
  const input = { name: "Org", description: "Exact", instructions: "Original", members, handoffs: [] };
  const result = await graphql({ schema, source: mutation, variableValues: { input } });
  expect(result.errors).toBeUndefined(); expect(result.data?.createAgentOrgDefinition).toEqual({ id: "org", members });
  const file = path.join(config.getAgentOrgsDir(), "org", "org-config.json"), raw = JSON.parse(await fs.readFile(file, "utf8"));
  expect(raw).not.toHaveProperty("schemaVersion"); expect(raw.members.map((m: any) => m.refScope)).toEqual(["org_local", "org_local", "shared", "application_owned"]);
  const local = configAt(path.dirname(file));
  await new FileAgentDefinitionProvider({ appConfig: local, applicationBundleService: app }).create(new AgentDefinition({ id: "direct", name: "Direct", description: "Exact Agent", instructions: "Do work" }));
  await new FileAgentTeamDefinitionProvider({ appConfig: local, applicationBundleService: app }).create(new AgentTeamDefinition({ id: "team", name: "Team", description: "Exact Team", instructions: "Work", coordinatorMemberName: "lead", nodes: [new TeamMember({ memberName: "lead", ref: "shared-agent", refScope: "shared" })] }));
  const copy = path.join(root, "roundtrip"); await fs.cp(config.getAgentOrgsDir(), path.join(copy, "agent-orgs"), { recursive: true });
  const copied = configAt(copy);
  for (const subject of ["agent", "agent_team"] as const) {
    const entries = await listAgentOrgOwnedDefinitionSources({ subject, orgRoots: [copied.getAgentOrgsDir()] });
    expect(entries).toHaveLength(1); expect(entries[0]).toMatchObject({ kind: "agent_org_owned", definitionId: subject === "agent" ? agentId : teamId, orgDefinitionId: "org" });
    const value = subject === "agent" ? await new FileAgentDefinitionProvider({ appConfig: copied, applicationBundleService: app }).getById(agentId)
      : await new FileAgentTeamDefinitionProvider({ appConfig: copied, applicationBundleService: app }).getById(teamId);
    expect(value).toMatchObject({ id: subject === "agent" ? agentId : teamId, ownershipScope: "agent_org_owned" });
  }
  const query = await graphql({ schema, source: `{ agentOrgDefinition(id:"org") { members { memberName ref refType refScope } } }` });
  expect(query.errors).toBeUndefined(); expect(query.data?.agentOrgDefinition).toEqual({ members });
  const before = await fs.readFile(file);
  for (const scope of ["org_local", "agent_org_owned", "UNKNOWN"]) {
    const invalid = await graphql({ schema, source: mutation, variableValues: { input: { ...input, members: [{ ...members[0], refScope: scope }] } } });
    expect(invalid.errors?.length).toBeGreaterThan(0); expect(await fs.readFile(file)).toEqual(before);
  }
  const invalidDomain = await orgs.getById("org"); (invalidDomain!.members[0] as any).refScope = "unknown";
  mocks.admission.requireAvailable.mockResolvedValue({ definition: invalidDomain });
  const invalidProjection = await graphql({ schema, source: `{ agentOrgDefinition(id:"org") { members { refScope } } }` });
  expect(invalidProjection.errors?.[0]?.message).toContain("Unsupported authored AgentOrg member scope");
});
