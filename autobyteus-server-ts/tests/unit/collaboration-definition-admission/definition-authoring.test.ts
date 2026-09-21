import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import { AgentOrgDefinition, AgentOrgMember } from "../../../src/agent-org-definition/domain/agent-org-definition.js";
import { FileAgentTeamDefinitionProvider } from "../../../src/agent-team-definition/providers/file-agent-team-definition-provider.js";
import { FileAgentOrgDefinitionProvider } from "../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js";
import { parseAgentTeamDefinitionConfig } from "../../../src/agent-team-definition/providers/agent-team-definition-config.js";
import { parseAgentOrgDefinitionConfig } from "../../../src/agent-org-definition/providers/agent-org-definition-config.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true }))); });
const teamConfig = () => ({ coordinatorMemberName: "lead", members: [{ memberName: "lead", ref: "agent", refScope: "shared" }],
  handoffs: [], avatarUrl: null, defaultLaunchConfig: null });
const orgConfig = () => ({ members: [{ memberName: "team", ref: "agent-org-owned-team-opaque", refType: "agent_team", refScope: "org_local" }],
  handoffs: [], avatarUrl: null, defaultLaunchConfig: null });
const familyCases = [
  { name: "Team", config: teamConfig, parse: parseAgentTeamDefinitionConfig },
  { name: "Org", config: orgConfig, parse: parseAgentOrgDefinitionConfig },
];
for (const family of familyCases) describe(`${family.name} current authoring codec`, () => {
  it.each([1, 2, 0, "1", null, false, {}])("rejects authored schemaVersion=%j without stripping", (schemaVersion) => {
    const value = { ...family.config(), schemaVersion };
    expect(() => family.parse(value)).toThrow(/Unsupported keys: schemaVersion/);
    expect(value).toHaveProperty("schemaVersion", schemaVersion);
  });
  it("retains exact required keys and rejects extra or missing fields", () => {
    const config = family.config(); expect(family.parse(config)).toEqual(config);
    for (const key of Object.keys(config)) {
      const incomplete = { ...config } as Record<string, unknown>; delete incomplete[key];
      expect(() => family.parse(incomplete)).toThrow();
    }
    expect(() => family.parse({ ...config, unexpected: true })).toThrow();
  });
  it("preserves member/default/null value rules, not only top-level keys", () => {
    const config = family.config();
    const member = config.members[0]!;
    for (const key of Object.keys(member)) {
      const incomplete = { ...member } as Record<string, unknown>; delete incomplete[key];
      expect(() => family.parse({ ...config, members: [incomplete] })).toThrow();
    }
    expect(() => family.parse({ ...config, members: [{ ...member, extra: true }] })).toThrow();
    expect(() => family.parse({ ...config, members: [{ ...member, refScope: "unknown" }] })).toThrow();
    expect(() => family.parse({ ...config, members: [{ ...member, memberName: " not-trimmed" }] })).toThrow();
    expect(() => family.parse({ ...config, members: "not-an-array" })).toThrow();
    expect(() => family.parse({ ...config, defaultLaunchConfig: {} })).toThrow();
    expect(() => family.parse({ ...config, defaultLaunchConfig: { llmModelIdentifier: null, runtimeKind: null, llmConfig: [] } })).toThrow();
    expect(() => family.parse({ ...config, avatarUrl: 42 })).toThrow();
  });

});

it("creates, edits, reloads and package-roundtrips both families with unchanged member/handoff order", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "field-free-authoring-")); roots.push(root);
  const configAt = (base: string) => ({ getAgentTeamsDir: () => path.join(base, "agent-teams"),
    getAgentOrgsDir: () => path.join(base, "agent-orgs"), getAdditionalAgentPackageRoots: () => [] }) as unknown as AppConfig;
  const app = { getApplicationOwnedTeamSourceById: async () => null } as unknown as ApplicationBundleService;
  const providersAt = (base: string) => ({
    teams: new FileAgentTeamDefinitionProvider({ appConfig: configAt(base), applicationBundleService: app }),
    orgs: new FileAgentOrgDefinitionProvider(configAt(base)),
  });
  const { teams, orgs } = providersAt(root);
  const handoffs = [{ from: "/lead", to: "/worker", rules: ["When ready", "Preserve exact prose"] }];
  const team = await teams.create(new AgentTeamDefinition({ id: "team", name: "Team", description: "Before", instructions: "Do work.",
    coordinatorMemberName: "lead", nodes: ["lead", "worker"].map((memberName) => new TeamMember({ memberName, ref: memberName, refScope: "shared" })), handoffs }));
  const org = await orgs.create(new AgentOrgDefinition({ id: "org", name: "Org", description: "Before", instructions: "Coordinate.",
    members: [new AgentOrgMember({ memberName: "direct", ref: "agent-org-owned-agent-opaque", refType: "agent", refScope: "org_local" }),
      new AgentOrgMember({ memberName: "team", ref: "agent-org-owned-team-opaque", refType: "agent_team", refScope: "org_local" })],
    handoffs: [{ from: "/direct", to: "/team", rules: ["Original exact text"] }] }));
  team.description = "After"; org.description = "After";
  await teams.update(team); await orgs.update(org);
  const copy = path.join(root, "copied-package");
  await fs.mkdir(copy);
  for (const family of ["team", "org"] as const) {
    const dir = path.join(root, `agent-${family}s`, family);
    const raw = JSON.parse(await fs.readFile(path.join(dir, `${family}-config.json`), "utf8"));
    expect(raw).not.toHaveProperty("schemaVersion");
    expect(Object.keys(raw)).toHaveLength(family === "team" ? 5 : 4);
    await fs.cp(path.dirname(dir), path.join(copy, `agent-${family}s`), { recursive: true });
  }
  const copied = providersAt(copy);
  const rereadTeam = await copied.teams.getById("team"), rereadOrg = await copied.orgs.getById("org");
  expect(rereadTeam).toMatchObject({ description: "After", instructions: "Do work.", handoffs });
  expect(rereadTeam?.nodes.map((n) => n.memberName)).toEqual(["lead", "worker"]);
  expect(rereadOrg).toMatchObject({ description: "After", instructions: "Coordinate.", handoffs: org.handoffs });
  expect(rereadOrg?.members.map((n) => [n.memberName, n.refType])).toEqual([["direct", "agent"], ["team", "agent_team"]]);
});

it.each(["brief-studio/agent-teams/brief-studio-team", "socratic-math-teacher/agent-teams/socratic-math-team"])("keeps repository application %s on the current strict authoring shape", async (relative) => {
  const raw = JSON.parse(await fs.readFile(path.resolve("../applications", relative, "team-config.json"), "utf8"));
  expect(raw).not.toHaveProperty("schemaVersion"); expect(() => parseAgentTeamDefinitionConfig(raw)).not.toThrow();
});

it.each(["agent_org_owned", "team_local", "unknown"])("rejects retired/unknown Org authored scope %s at the normal codec", (refScope) => {
  expect(() => parseAgentOrgDefinitionConfig({ ...orgConfig(), members: [{ ...orgConfig().members[0], refScope }] })).toThrow(/refScope/);
});
