import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import type { AppConfig } from "../../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { FileAgentDefinitionProvider } from "../../../src/agent-definition/providers/file-agent-definition-provider.js";
import { FileAgentTeamDefinitionProvider } from "../../../src/agent-team-definition/providers/file-agent-team-definition-provider.js";
import { FileAgentOrgDefinitionProvider } from "../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js";
import { listAgentOrgOwnedDefinitionSources } from "../../../src/agent-org-definition/providers/agent-org-owned-definition-source-index.js";
import { buildAgentOrgOwnedDefinitionId } from "../../../src/agent-org-definition/utils/agent-org-owned-definition-id.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import { DefinitionSourceRegistry } from "../../../src/collaboration-definition-admission/providers/definition-source-registry.js";
import { DefinitionAdmissionService } from "../../../src/collaboration-definition-admission/services/definition-admission-service.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true }))); });
const avatar = (mode: string) => mode === "omitted" ? {} : { avatarUrl: mode === "null" ? null : "https://example.test/avatar.svg" };
const write = async (root: string, family: "agent" | "team" | "org", id: string, config: unknown) => {
  const dir = path.join(root, family === "agent" ? "agents" : family === "team" ? "agent-teams" : "agent-orgs", id);
  await fs.mkdir(dir, { recursive: true });
  const files = [path.join(dir, `${family}.md`), path.join(dir, `${family}-config.json`)];
  await fs.writeFile(files[0]!, `---\nname: ${id}\ndescription: Test\n---\n\nExact instructions.\n`);
  await fs.writeFile(files[1]!, JSON.stringify(config));
  return files;
};
const hashes = async (files: string[]) => Promise.all(files.map(async file => createHash("sha256").update(await fs.readFile(file)).digest("hex")));

it.each(["omitted", "null", "supplied"])("reads %s avatars across shared, Org-owned and Team-local placements without changing IDs or source bytes", async mode => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "optional-avatar-placement-")); roots.push(root);
  const external = path.join(root, "external"), data = path.join(root, "data");
  const config = {
    getAgentsDir: () => path.join(data, "agents"), getAgentTeamsDir: () => path.join(data, "agent-teams"),
    getAgentOrgsDir: () => path.join(data, "agent-orgs"), getAdditionalAgentPackageRoots: () => [external],
  } as AppConfig;
  const apps = { getApplicationOwnedAgentSourceById: async () => null, getApplicationOwnedTeamSourceById: async () => null } as unknown as ApplicationBundleService;
  const agents = new FileAgentDefinitionProvider({ appConfig: config, applicationBundleService: apps });
  const teams = new FileAgentTeamDefinitionProvider({ appConfig: config, applicationBundleService: apps });
  const orgs = new FileAgentOrgDefinitionProvider(config);
  const directId = buildAgentOrgOwnedDefinitionId("agent", "org", "direct");
  const teamId = buildAgentOrgOwnedDefinitionId("agent_team", "org", "owned-team");
  const localId = buildTeamLocalAgentDefinitionId("local-team", "worker");
  const team = (ref: string, refScope = "shared") => ({
    coordinatorMemberName: "lead", members: [{ memberName: "lead", ref, refScope }], handoffs: [], ...avatar(mode),
  });
  const files = [
    ...await write(data, "agent", "independent", avatar(mode)),
    ...await write(external, "agent", "shared", avatar(mode)),
    ...await write(external, "team", "local-team", team("worker", "team_local")),
    ...await write(path.join(external, "agent-teams", "local-team"), "agent", "worker", avatar(mode)),
    ...await write(path.join(external, "agent-orgs", "org"), "agent", "direct", avatar(mode)),
    ...await write(path.join(external, "agent-orgs", "org"), "team", "owned-team", team("shared")),
    ...await write(external, "org", "org", { members: [
      { memberName: "direct", ref: directId, refType: "agent", refScope: "org_local" },
      { memberName: "owned", ref: teamId, refType: "agent_team", refScope: "org_local" },
      { memberName: "mounted", ref: "local-team", refType: "agent_team", refScope: "shared" },
      { memberName: "shared", ref: "shared", refType: "agent", refScope: "shared" },
    ], handoffs: [], defaultLaunchConfig: null, ...avatar(mode) }),
  ];
  const before = await hashes(files);
  const expectedAvatar = mode === "supplied" ? avatar(mode).avatarUrl : null;
  const registry = new DefinitionSourceRegistry({ appConfig: config, implementationPackageRoots: [] });
  const admission = new DefinitionAdmissionService({ registry,
    agents: { getFreshAgentDefinitionById: id => agents.getById(id) },
    teams: { getFreshDefinitionById: id => teams.getById(id) },
    orgs: { getDefinitionById: id => orgs.getById(id) },
  });
  const revision = (await orgs.getById("org"))!.revision;
  for (let reload = 0; reload < 2; reload++) {
    for (const [id, ownershipScope] of [["independent", "shared"], ["shared", "shared"], [directId, "agent_org_owned"], [localId, "team_local"]]) {
      expect(await agents.getById(id!)).toMatchObject({ id, ownershipScope, avatarUrl: expectedAvatar });
    }
    expect(await teams.getById(teamId)).toMatchObject({ id: teamId, ownershipScope: "agent_org_owned", avatarUrl: expectedAvatar });
    expect(await teams.getById("local-team")).toMatchObject({ avatarUrl: expectedAvatar });
    expect(await orgs.getById("org")).toMatchObject({ id: "org", avatarUrl: expectedAvatar, revision });
    for (const subject of ["agent", "agent_team"] as const) {
      const sources = await listAgentOrgOwnedDefinitionSources({ subject, orgRoots: [path.join(external, "agent-orgs")] });
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({ definitionId: subject === "agent" ? directId : teamId, orgDefinitionId: "org", subject });
    }
    const rows = await admission.scan();
    expect(rows.map(row => [row.definitionId, row.status]).sort()).toEqual([[teamId, "available"], ["local-team", "available"], ["org", "available"]].sort());
    expect((await admission.requireAvailable("agent_org", "org")).definition.avatarUrl).toBe(expectedAvatar);
  }
  expect(await agents.getById(buildAgentOrgOwnedDefinitionId("agent", "other-org", "direct"))).toBeNull();
  expect(await hashes(files)).toEqual(before);

  // A malformed present parent value must still be rejected at all three Org reads.
  const orgFile = path.join(external, "agent-orgs", "org", "org-config.json");
  const raw = JSON.parse(await fs.readFile(orgFile, "utf8"));
  await fs.writeFile(orgFile, JSON.stringify({ ...raw, avatarUrl: 42 }));
  await expect(orgs.getById("org")).rejects.toThrow(/avatarUrl/);
  await expect(admission.requireAvailable("agent_org", "org")).rejects.toThrow(/avatarUrl/);
  for (const subject of ["agent", "agent_team"] as const) {
    expect(await listAgentOrgOwnedDefinitionSources({ subject, orgRoots: [path.join(external, "agent-orgs")] })).toEqual([]);
  }
  // A rejected parent must not poison unrelated valid siblings.
  expect((await admission.requireAvailable("agent_team", "local-team")).status).toBe("available");

});
