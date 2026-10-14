import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { FileAgentTeamDefinitionProvider } from "../../../src/agent-team-definition/providers/file-agent-team-definition-provider.js";
import { FileAgentOrgDefinitionProvider } from "../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js";
import { buildAgentOrgOwnedDefinitionId } from "../../../src/agent-org-definition/utils/agent-org-owned-definition-id.js";
import { DefinitionPackageTransaction } from "../../../src/collaboration-definition-admission/providers/definition-package-transaction.js";
import {
  assertDefinitionSourceWritableByRuntime,
  createDefinitionSourceDescriptor,
} from "../../../src/collaboration-definition-admission/domain/definition-source-descriptor.js";

/**
 * imported-team-defaults-edit (SR-003): Teams and Orgs from a registered agent package are saved
 * and deleted in the package folder, like Agents; the existing atomic save, revision check and
 * filesystem check still apply, and Org-owned Teams change only through their Org.
 */
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await fs.chmod(root, 0o755).catch(() => undefined);
    await fs.rm(root, { recursive: true, force: true });
  }
});

const launch = { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "claude-sonnet-5-5", llmConfig: { thinking: "xhigh" } };
const write = async (base: string, family: "agent" | "team" | "org", id: string, config: unknown) => {
  const dir = path.join(base, family === "agent" ? "agents" : `agent-${family}s`, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${family}.md`),
    `---\nname: ${id}\ndescription: Package definition\ncategory: testing\n${family === "agent" ? "role: Worker\n" : ""}---\n\n${id} instructions\n`);
  await fs.writeFile(path.join(dir, `${family}-config.json`), JSON.stringify(config));
  return dir;
};
const teamConfig = (lead = "worker") => ({ coordinatorMemberName: "lead", members: [{ memberName: "lead", ref: lead, refScope: "team_local" }],
  handoffs: [], avatarUrl: null, defaultLaunchConfig: null });
const agentConfig = { toolNames: [], skillNames: [], defaultLaunchConfig: null };

const fixture = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "registered-package-writes-")); roots.push(root);
  const data = path.join(root, "data"), pkg = path.join(root, "autobyteus-agents");
  const appConfig = { getAgentsDir: () => path.join(data, "agents"), getAgentTeamsDir: () => path.join(data, "agent-teams"),
    getAgentOrgsDir: () => path.join(data, "agent-orgs"), getAdditionalAgentPackageRoots: () => [pkg] } as unknown as AppConfig;
  const apps = { getApplicationOwnedTeamSourceById: async () => null } as unknown as ApplicationBundleService;
  const teamDir = await write(pkg, "team", "software-engineering-team", teamConfig());
  await write(teamDir, "agent", "worker", agentConfig);
  const ownedTeamId = buildAgentOrgOwnedDefinitionId("agent_team", "studio", "squad");
  const orgDir = await write(pkg, "org", "studio", { members: [{ memberName: "group", ref: ownedTeamId, refType: "agent_team", refScope: "org_local" }],
    handoffs: [], avatarUrl: null, defaultLaunchConfig: null });
  const ownedTeamDir = await write(orgDir, "team", "squad", teamConfig());
  await write(ownedTeamDir, "agent", "worker", agentConfig);
  return { pkg, teamDir, orgDir, ownedTeamId,
    teams: new FileAgentTeamDefinitionProvider({ appConfig, applicationBundleService: apps }), orgs: new FileAgentOrgDefinitionProvider(appConfig) };
};
const readConfig = async (dir: string, family: "team" | "org") => JSON.parse(await fs.readFile(path.join(dir, `${family}-config.json`), "utf8"));

describe("registered package definitions are writable (SR-003)", () => {
  it("the app writes app data and registered packages, never its implementation repository", () => {
    const descriptor = (sourceClass: "server_data" | "registered_package" | "implementation_repository") =>
      createDefinitionSourceDescriptor({ sourceClass, packageRoot: "/root", definitionPath: "/root/agent-teams/t" });
    expect(descriptor("registered_package").mutationOwner).toBe("package_author");
    expect(() => assertDefinitionSourceWritableByRuntime(descriptor("server_data"))).not.toThrow();
    expect(() => assertDefinitionSourceWritableByRuntime(descriptor("registered_package"))).not.toThrow();
    expect(() => assertDefinitionSourceWritableByRuntime(descriptor("implementation_repository"))).toThrow(/cannot be changed from the app/);
  });

  it("saves a registered Team's default runtime/model into its package folder; a stale revision conflicts (AC-001, AC-003)", async () => {
    const f = await fixture();
    const team = (await f.teams.getById("software-engineering-team"))!;
    const staleRevision = team.revision;
    team.defaultLaunchConfig = launch as never;
    team.description = "Edited in the app";
    const saved = await f.teams.update(team);
    expect(saved.defaultLaunchConfig).toEqual(launch);
    expect(saved.revision).not.toBe(staleRevision);
    expect((await readConfig(f.teamDir, "team")).defaultLaunchConfig).toEqual(launch);
    expect(await fs.readFile(path.join(f.teamDir, "team.md"), "utf8")).toContain("Edited in the app");
    // Its team-local Agent stays in the package.
    await expect(fs.stat(path.join(f.teamDir, "agents", "worker", "agent-config.json"))).resolves.toBeTruthy();
    team.revision = staleRevision;
    team.description = "Concurrent edit";
    await expect(f.teams.update(team)).rejects.toMatchObject({ code: "DEFINITION_REVISION_CONFLICT" });
    expect((await f.teams.getById("software-engineering-team"))?.description).toBe("Edited in the app");
  });

  it("saves and deletes a registered Org in its package folder (AC-002, UC-003)", async () => {
    const f = await fixture();
    const org = (await f.orgs.getById("studio"))!;
    org.defaultLaunchConfig = launch as never;
    await expect(f.orgs.update(org)).resolves.toMatchObject({ defaultLaunchConfig: launch });
    expect((await readConfig(f.orgDir, "org")).defaultLaunchConfig).toEqual(launch);
    await expect(f.orgs.delete("studio")).resolves.toBe(true);
    await expect(fs.stat(f.orgDir)).rejects.toThrow();
  });

  it("deletes a registered Team from its package folder (UC-003)", async () => {
    const f = await fixture();
    await expect(f.teams.delete("software-engineering-team")).resolves.toBe(true);
    await expect(fs.stat(f.teamDir)).rejects.toThrow();
  });

  it("still changes an Org-owned Team only through its Org (AC-004)", async () => {
    const f = await fixture();
    const owned = (await f.teams.getById(f.ownedTeamId))!;
    expect(owned).toBeTruthy();
    await expect(f.teams.update(owned)).rejects.toThrow(/atomic parent AgentOrg save/);
    await expect(f.teams.delete(f.ownedTeamId)).rejects.toThrow(/atomic parent AgentOrg save/);
  });

  it("the package writer keeps relative links inside a saved folder exactly as authored (IMPL-F-001)", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "package-writer-links-")); roots.push(root);
    const packagePath = path.join(root, "checkout", "agent-teams", "team");
    await fs.mkdir(path.join(root, "checkout", "shared"), { recursive: true });
    await fs.writeFile(path.join(root, "checkout", "shared", "design-examples.md"), "shared guide");
    await fs.mkdir(path.join(packagePath, "docs"), { recursive: true });
    await fs.writeFile(path.join(packagePath, "team-config.json"), "{}");
    await fs.symlink("../../../shared/design-examples.md", path.join(packagePath, "docs", "design-examples.md"));
    await fs.symlink("../../shared", path.join(packagePath, "shared"));
    const transaction = new DefinitionPackageTransaction();
    await transaction.commit({ packagePath, files: { "team-config.json": "{\"saved\":true}" }, validatePackage: async () => undefined });
    expect(await fs.readFile(path.join(packagePath, "team-config.json"), "utf8")).toBe("{\"saved\":true}");
    expect(await fs.readlink(path.join(packagePath, "docs", "design-examples.md"))).toBe("../../../shared/design-examples.md");
    expect(await fs.readlink(path.join(packagePath, "shared"))).toBe("../../shared");
    expect(await fs.readFile(path.join(packagePath, "docs", "design-examples.md"), "utf8")).toBe("shared guide");
  });

  it("a registered Team save leaves the package's relative links unchanged (IMPL-F-001)", async () => {
    const f = await fixture();
    await fs.mkdir(path.join(f.pkg, "shared"), { recursive: true });
    await fs.writeFile(path.join(f.pkg, "shared", "guide.md"), "guide");
    await fs.symlink("../../shared/guide.md", path.join(f.teamDir, "guide.md"));
    const team = (await f.teams.getById("software-engineering-team"))!;
    team.defaultLaunchConfig = launch as never;
    await f.teams.update(team);
    expect(await fs.readlink(path.join(f.teamDir, "guide.md"))).toBe("../../shared/guide.md");
  });

  it.skipIf(process.getuid?.() === 0)("a package folder the disk refuses gives the existing read-only error (AC-006)", async () => {
    const f = await fixture();
    const team = (await f.teams.getById("software-engineering-team"))!;
    await fs.chmod(f.teamDir, 0o555);
    try {
      await expect(f.teams.update(team)).rejects.toThrow(/read-only at source path/);
    } finally {
      await fs.chmod(f.teamDir, 0o755);
    }
  });
});
