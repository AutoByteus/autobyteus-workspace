import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../../src/agent-definition/domain/models.js";
import { SkillService } from "../../../../src/skills/services/skill-service.js";
import { writeAgentOrg, writeSkillFolder } from "../../../fixtures/agent-org-skill-package.js";

// D-19 tier 2 with Agent Org layouts (SR-018/SR-019, CRR-012 CR-009).
describe("SkillService catalog: Agent Org layouts (D-19)", () => {
  let base: string;
  let appData: string;
  let appDataOrgs: string;
  let packageRoots: string[];
  let service: SkillService;

  beforeEach(() => {
    base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "skill-catalog-orgs-")));
    appData = path.join(base, "app-data");
    // The app data Orgs folder comes from config, not `<appData>/agent-orgs`.
    appDataOrgs = path.join(base, "configured-orgs");
    fs.mkdirSync(path.join(appData, "skills"), { recursive: true });
    packageRoots = [];
    service = new SkillService({
      config: {
        getSkillsDir: () => path.join(appData, "skills"),
        getAdditionalSkillsDirs: () => [],
        getAdditionalAgentPackageRoots: () => packageRoots,
        getAppDataDir: () => appData,
        getAgentOrgsDir: () => appDataOrgs,
        get: (_key: string, defaultValue = "") => defaultValue,
      },
      isRuntimeDefaultSkillFolder: () => false,
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(base, { recursive: true, force: true });
  });

  /** A package root with an org-owned agent and an org-owned team with a team-local agent. */
  const writeOrgPackage = (root: string, prefix: string) => {
    const orgDir = writeAgentOrg(path.join(root, "agent-orgs"), `${prefix}-org`, { agents: [`${prefix}-agent`], teams: [`${prefix}-team`] });
    const agentDir = path.join(orgDir, "agents", `${prefix}-agent`);
    const teamDir = path.join(orgDir, "agent-teams", `${prefix}-team`);
    return {
      orgDir, agentDir, teamDir,
      agentSkill: writeSkillFolder(path.join(agentDir, "skills", `${prefix}-agent-skill`), `${prefix}-agent-skill`),
      teamShared: writeSkillFolder(path.join(teamDir, "skills", `${prefix}-team-shared`), `${prefix}-team-shared`),
      teamLocal: writeSkillFolder(path.join(teamDir, "agents", "member", "skills", `${prefix}-team-local`), `${prefix}-team-local`),
    };
  };

  it("lists org-owned agent, team-shared and team-local agent skills with their org paths and layout roots", () => {
    const pkg = path.join(base, "pkg");
    packageRoots = [pkg];
    const org = writeOrgPackage(pkg, "p");

    const byName = Object.fromEntries(service.listInstalledSkillRecords().map((record) => [record.skill.name, record]));
    expect(byName["p-agent-skill"]).toMatchObject({ skill: { rootPath: org.agentSkill }, origin: "agent_private", trustedRoot: org.agentDir, tier: 2, sourcePath: pkg });
    expect(byName["p-team-shared"]).toMatchObject({ skill: { rootPath: org.teamShared }, origin: "team_shared", trustedRoot: org.teamDir });
    expect(byName["p-team-local"]).toMatchObject({ skill: { rootPath: org.teamLocal }, origin: "agent_private", trustedRoot: org.teamDir });
  });

  it("uses the configured app-data Orgs folder, and `<packageRoot>/agent-orgs` for packages", () => {
    const appOrg = writeAgentOrg(appDataOrgs, "home-org", { agents: ["home-agent"] });
    const appSkill = writeSkillFolder(path.join(appOrg, "agents", "home-agent", "skills", "home-skill"), "home-skill");
    // Not the configured folder: not scanned for the app data root.
    const ignoredOrg = writeAgentOrg(path.join(appData, "agent-orgs"), "stray-org", { agents: ["stray"] });
    writeSkillFolder(path.join(ignoredOrg, "agents", "stray", "skills", "stray-skill"), "stray-skill");

    expect(service.getSkill("home-skill")?.rootPath).toBe(appSkill);
    expect(service.getSkill("stray-skill")).toBeNull();
  });

  it("orders a root: agents/* → agent-teams/* → agent-orgs/* (org agents, then org teams: shared, then local agents)", () => {
    const pkg = path.join(base, "pkg");
    packageRoots = [pkg];
    const org = writeOrgPackage(pkg, "p");
    const teamCopy = writeSkillFolder(path.join(pkg, "agent-teams", "plain-team", "skills", "p-agent-skill"), "p-agent-skill");
    writeSkillFolder(path.join(org.teamDir, "skills", "shared-vs-local"), "shared-vs-local");
    writeSkillFolder(path.join(org.teamDir, "agents", "member", "skills", "shared-vs-local"), "shared-vs-local");
    writeSkillFolder(path.join(org.agentDir, "skills", "agent-vs-team"), "agent-vs-team");
    writeSkillFolder(path.join(org.teamDir, "skills", "agent-vs-team"), "agent-vs-team");

    expect(service.getSkill("p-agent-skill")?.rootPath).toBe(teamCopy);
    expect(service.getSkill("shared-vs-local")?.rootPath).toBe(path.join(org.teamDir, "skills", "shared-vs-local"));
    expect(service.getSkill("agent-vs-team")?.rootPath).toBe(path.join(org.agentDir, "skills", "agent-vs-team"));
    expect(service.listSkillNameIssues().map((issue) => [issue.name, issue.kind])).toEqual([
      ["agent-vs-team", "conflict"], ["p-agent-skill", "conflict"], ["shared-vs-local", "conflict"],
    ]);
  });

  it("orders Orgs by name and each Org's agents and teams by name", () => {
    const pkg = path.join(base, "pkg");
    packageRoots = [pkg];
    const zOrg = writeAgentOrg(path.join(pkg, "agent-orgs"), "z-org", { agents: ["a"] });
    const aOrg = writeAgentOrg(path.join(pkg, "agent-orgs"), "a-org", { agents: ["y", "b"] });
    writeSkillFolder(path.join(zOrg, "agents", "a", "skills", "same"), "same");
    writeSkillFolder(path.join(aOrg, "agents", "y", "skills", "same"), "same");
    const winner = writeSkillFolder(path.join(aOrg, "agents", "b", "skills", "same"), "same");

    expect(service.getSkill("same")?.rootPath).toBe(winner);
  });

  it("scans only correlated org-owned folders (an unreferenced folder under agent-orgs is not a skill source)", () => {
    const pkg = path.join(base, "pkg");
    packageRoots = [pkg];
    const org = writeAgentOrg(path.join(pkg, "agent-orgs"), "org", { agents: ["member"] });
    writeSkillFolder(path.join(org, "agents", "not-a-member", "skills", "orphan"), "orphan");
    writeSkillFolder(path.join(org, "skills", "org-level"), "org-level");

    expect(service.getSkill("orphan")).toBeNull();
    expect(service.getSkill("org-level")).toBeNull();
  });

  it("org-owned agents run with their own skills: CONFIGURED bindings and AGY detailed provenance pass for every org layout", () => {
    const pkg = path.join(base, "pkg");
    packageRoots = [pkg];
    const org = writeOrgPackage(pkg, "p");
    const orgAgent = new AgentDefinition({ id: "agent-org-owned-agent:p-org:p-agent", name: "Org Agent", description: "", instructions: "",
      skillNames: ["p-agent-skill"], ownershipScope: "agent_org_owned", sourceInfo: { agentDirPath: org.agentDir } });
    const orgTeamMember = new AgentDefinition({ id: "member", name: "Member", description: "", instructions: "",
      skillNames: ["p-team-shared", "p-team-local"], ownershipScope: "team_local",
      sourceInfo: { agentDirPath: path.join(org.teamDir, "agents", "member"), teamDirPath: org.teamDir } });

    expect(service.resolveConfiguredSkillsForAgent(orgAgent).map((skill) => skill.rootPath)).toEqual([org.agentSkill]);
    expect(service.resolveConfiguredSkillsForAgent(orgTeamMember).map((skill) => skill.rootPath)).toEqual([org.teamShared, org.teamLocal]);
    const detailed = [...service.resolveConfiguredSkillBindingsForAgentDetailed(orgAgent),
      ...service.resolveConfiguredSkillBindingsForAgentDetailed(orgTeamMember)];
    expect(detailed.map((binding) => binding.kind === "resolved" ? [binding.source.origin, binding.source.trustedRoot] : binding)).toEqual([
      ["agent_private", org.agentDir],
      ["team_shared", org.teamDir],
      ["agent_private", org.teamDir],
    ]);
    const allInstalled = new AgentDefinition({ name: "Daily Assistant", description: "", instructions: "", skillNames: [], skillScope: "ALL_INSTALLED" });
    expect(service.resolveConfiguredSkillBindingsForAgentDetailed(allInstalled).filter((binding) => binding.kind !== "resolved")).toEqual([]);
  });

  it("rejects a package whose Agent Org skills duplicate an installed name, and accepts unique ones", () => {
    const existing = writeSkillFolder(path.join(appData, "skills", "dup"), "dup");
    const incoming = path.join(base, "incoming");
    const org = writeAgentOrg(path.join(incoming, "agent-orgs"), "org", { agents: ["a"], teams: ["t"] });
    const incomingCopy = writeSkillFolder(path.join(org, "agent-teams", "t", "agents", "member", "skills", "dup"), "dup");
    writeSkillFolder(path.join(org, "agents", "a", "skills", "unique"), "unique");

    expect(service.validateIncomingSkillNames({ path: incoming, layout: "definition_root", tier: 2 }).conflicts)
      .toEqual([{ name: "dup", existingPath: existing, incomingPath: incomingCopy }]);
    expect(() => service.assertNoIncomingSkillNameConflicts({ path: incoming, layout: "definition_root", tier: 2 }))
      .toThrow("Duplicate skill names: dup");
  });
});
