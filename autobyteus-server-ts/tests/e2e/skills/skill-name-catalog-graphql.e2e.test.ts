import "reflect-metadata";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExecutionResult, graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { GitHubAgentPackageInstaller } from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { configureE2eStudioApplicationApiServices } from "../helpers/studio-application-api-services.js";
import { writeAgentOrg } from "../../fixtures/agent-org-skill-package.js";

/**
 * D-19 one skill per name through the public GraphQL contract (REQ-022–024, AC-019–021, AR-013).
 * The Codex runtime default folder (tier 4) is an owned `CODEX_HOME`; it is reached through a
 * symlinked alias so the real realpath matcher is exercised. Nothing outside the temp root is used.
 */

type Conflict = { name: string; existingPath: string; incomingPath: string };
type Issue = { name: string; usedPath: string; ignoredPaths: string[]; kind: string };

const ENV_KEYS = ["CODEX_HOME", "AUTOBYTEUS_SKILLS_PATHS", "AUTOBYTEUS_AGENT_PACKAGE_ROOTS"] as const;

const writeSkill = (skillDir: string, name: string, marker: string, extraFiles: Record<string, string> = {}): string => {
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), `---\nname: ${name}\ndescription: ${name} (${marker})\n---\n\n${marker}\n`, "utf-8");
  for (const [relative, content] of Object.entries(extraFiles)) {
    fs.mkdirSync(path.dirname(path.join(skillDir, relative)), { recursive: true });
    fs.writeFileSync(path.join(skillDir, relative), content, "utf-8");
  }
  return skillDir;
};

const writeAgent = (root: string, agentId: string, skills: Record<string, string> = {}): string => {
  const agentDir = path.join(root, "agents", agentId);
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, "agent.md"), `---\nname: ${agentId}\ndescription: ${agentId}\n---\n\nInstructions.\n`, "utf-8");
  fs.writeFileSync(path.join(agentDir, "agent-config.json"), JSON.stringify({ skillNames: Object.keys(skills) }), "utf-8");
  for (const [name, marker] of Object.entries(skills)) writeSkill(path.join(agentDir, "skills", name), name, marker);
  return agentDir;
};

/** A stable hash of a folder's relative paths and bytes. */
const treeHash = (root: string): string => {
  const hash = crypto.createHash("sha256");
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      hash.update(path.relative(root, full));
      if (entry.isDirectory()) walk(full);
      else hash.update(fs.readFileSync(full));
    }
  };
  walk(root);
  return hash.digest("hex");
};

const parseRoots = (): string[] =>
  (process.env["AUTOBYTEUS_AGENT_PACKAGE_ROOTS"] ?? "").split(",").map((entry) => entry.trim()).filter(Boolean)
    .map((entry) => path.resolve(entry));

describe("Skill name catalog GraphQL e2e (D-19)", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  let closeStudioServices: (() => void) | null = null;
  let base: string;
  let dataDir: string;
  let skillsDir: string;
  let codexSkills: string;
  let codexAlias: string;
  const inheritedEnv = new Map<string, string | undefined>();

  beforeAll(async () => {
    closeStudioServices = configureE2eStudioApplicationApiServices().close;
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlModule = await import(require.resolve("graphql", { paths: [typeGraphqlRoot] }));
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterAll(() => closeStudioServices?.());

  beforeEach(() => {
    for (const key of ENV_KEYS) inheritedEnv.set(key, process.env[key]);
    base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "skill-name-catalog-e2e-")));
    dataDir = path.join(base, "data");
    fs.mkdirSync(path.join(dataDir, "skills"), { recursive: true });
    skillsDir = path.join(dataDir, "skills");
    const codexHome = path.join(base, "codex-home");
    codexSkills = path.join(codexHome, "skills");
    fs.mkdirSync(codexSkills, { recursive: true });
    codexAlias = path.join(base, "codex-skills-alias");
    fs.symlinkSync(codexSkills, codexAlias, "dir");

    process.env["CODEX_HOME"] = codexHome;
    delete process.env["AUTOBYTEUS_SKILLS_PATHS"];
    delete process.env["AUTOBYTEUS_AGENT_PACKAGE_ROOTS"];
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    SkillService.resetInstance();
    AgentPackageService.resetInstance();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    SkillService.resetInstance();
    AgentPackageService.resetInstance();
    for (const [key, value] of inheritedEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(base, { recursive: true, force: true });
    await AgentDefinitionService.getInstance().refreshCache();
    await AgentTeamDefinitionService.getInstance().refreshCache();
  });

  const run = (source: string, variableValues?: Record<string, unknown>): Promise<ExecutionResult> =>
    Promise.resolve(graphql({ schema, source, variableValues }));

  const exec = async <T>(source: string, variableValues?: Record<string, unknown>): Promise<T> => {
    const result = await run(source, variableValues);
    if (result.errors?.length) throw result.errors[0];
    return result.data as T;
  };

  const expectConflict = async (source: string, variableValues: Record<string, unknown>): Promise<Conflict[]> => {
    const result = await run(source, variableValues);
    expect(result.errors?.length).toBe(1);
    const error = result.errors?.[0];
    expect(error?.extensions?.["code"]).toBe("SKILL_NAME_CONFLICT");
    expect(error?.message).toMatch(/^Duplicate skill names: /);
    return (error?.extensions?.["conflicts"] ?? []) as Conflict[];
  };

  const listSkills = () => exec<{ skills: Array<{ name: string; rootPath: string }> }>(`{ skills { name rootPath } }`)
    .then((data) => data.skills);
  const listIssues = () => exec<{ skillNameIssues: Issue[] }>(`{ skillNameIssues { name usedPath ignoredPaths kind } }`)
    .then((data) => data.skillNameIssues);
  const listSources = () => exec<{ skillSources: Array<{ path: string }> }>(`{ skillSources { path } }`)
    .then((data) => data.skillSources.map((source) => source.path));
  const listPackages = () => exec<{ agentPackages: Array<{ packageId: string; path: string; sourceKind: string }> }>(
    `{ agentPackages { packageId path sourceKind } }`).then((data) => data.agentPackages);

  const ADD_SOURCE = `mutation Add($path: String!) { addSkillSource(path: $path) { path } }`;
  const CREATE_SKILL = `mutation Create($input: CreateSkillInput!) { createSkill(input: $input) { name rootPath } }`;
  const IMPORT_PACKAGE = `mutation Import($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId path sourceKind } }`;
  const RELOAD_PACKAGE = `mutation Reload($id: String!) { reloadAgentPackage(packageId: $id) { packageId } }`;
  const CHECK_UPDATES = `mutation Check($ids: [String!]) { checkAgentPackageUpdates(packageIds: $ids) { packageId updateInfo { status installedRevision latestRevision } } }`;
  const UPDATE_PACKAGE = `mutation Update($id: String!) { updateAgentPackage(packageId: $id) { packageId } }`;

  const useTestPackageService = (installer?: GitHubAgentPackageInstaller): void => {
    AgentPackageService.getInstance({
      rootSettingsStore: new AgentPackageRootSettingsStore(
        { getAppDataDir: () => dataDir, getAdditionalAgentPackageRoots: parseRoots,
          get: (key: string, defaultValue?: string) => process.env[key] ?? defaultValue },
        { updateSetting: (key: string, value: string) => {
          if (value) process.env[key] = value; else delete process.env[key];
          return [true, "updated"];
        } },
      ),
      registryStore: new AgentPackageRegistryStore({ getAppDataDir: () => path.join(base, "registry") }),
      installer,
    });
  };

  const fixtureGitHubInstaller = (repo: string, getRevision: () => string, fixtures: Record<string, string>) =>
    new GitHubAgentPackageInstaller({
      config: { getAppDataDir: () => path.join(base, "github-data"), getDownloadDir: () => path.join(base, "github-data", "downloads") },
      fetchImpl: async (resource) => {
        const url = typeof resource === "string" ? resource : resource instanceof URL ? resource.toString() : resource.url;
        const body = url.includes("/branches/")
          ? { commit: { sha: getRevision() } }
          : { default_branch: "main", html_url: `https://github.com/AutoByteus/${repo}`, private: false, name: repo, owner: { login: "AutoByteus" } };
        return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      },
      downloadFileFromUrlImpl: async (archiveUrl, downloadDir) => {
        fs.mkdirSync(downloadDir, { recursive: true });
        const revision = decodeURIComponent(archiveUrl.split("/").filter(Boolean).at(-1) ?? getRevision());
        const archivePath = path.join(downloadDir, `${revision}.tar.gz`);
        fs.writeFileSync(archivePath, revision, "utf-8");
        return archivePath;
      },
      extractArchiveImpl: async (archivePath, outputDir) => {
        const revision = fs.readFileSync(archivePath, "utf-8").trim();
        fs.mkdirSync(outputDir, { recursive: true });
        fs.cpSync(fixtures[revision]!, path.join(outputDir, `${repo}-${revision}`), { recursive: true });
      },
    });

  it("AC-019: a tier 1–2 copy wins over the Codex runtime default copy; a Codex-only name is used from there", async () => {
    const codexDup = writeSkill(path.join(codexSkills, "shared-skill"), "shared-skill", "CODEX-COPY");
    const codexOnly = writeSkill(path.join(codexSkills, "codex-only"), "codex-only", "CODEX-ONLY");
    const pkgCopy = path.join(writeAgent(dataDir, "pkg-agent", { "shared-skill": "PACKAGE-COPY" }), "skills", "shared-skill");

    // Adding the runtime default folder (by a symlinked alias) is accepted: tier 4 never conflicts.
    await exec(ADD_SOURCE, { path: codexAlias });
    expect(await listSources()).toContain(codexAlias);

    const skills = await listSkills();
    expect(skills.filter((skill) => skill.name === "shared-skill")).toEqual([{ name: "shared-skill", rootPath: pkgCopy }]);
    expect(skills.find((skill) => skill.name === "codex-only")?.rootPath).toBe(path.join(codexAlias, "codex-only"));
    const issues = await listIssues();
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ name: "shared-skill", usedPath: pkgCopy, kind: "shadowed_runtime_default" });
    expect(issues[0]!.ignoredPaths.map((ignored) => fs.realpathSync(ignored))).toEqual([codexDup]);
    expect(fs.realpathSync(path.join(codexAlias, "codex-only"))).toBe(codexOnly);
  });

  it("AR-013: skill(name), file tree, read, update, file upload/delete and delete act on the used copy; the ignored copy is untouched", async () => {
    const codexDup = writeSkill(path.join(codexSkills, "shared-skill"), "shared-skill", "CODEX-COPY", { "codex-only.txt": "codex" });
    const tier1 = writeSkill(path.join(skillsDir, "shared-skill"), "shared-skill", "TIER1-COPY", { "tier1-only.txt": "tier1" });
    await exec(ADD_SOURCE, { path: codexSkills });
    const codexHashBefore = treeHash(codexDup);

    const detail = await exec<{ skill: { rootPath: string; content: string } }>(
      `query S($n: String!) { skill(name: $n) { rootPath content } }`, { n: "shared-skill" });
    expect(detail.skill.rootPath).toBe(tier1);
    expect(detail.skill.content).toContain("TIER1-COPY");

    const tree = await exec<{ skillFileTree: string }>(`query T($n: String!) { skillFileTree(name: $n) }`, { n: "shared-skill" });
    expect(tree.skillFileTree).toContain("tier1-only.txt");
    expect(tree.skillFileTree).not.toContain("codex-only.txt");

    const read = await exec<{ skillFileContent: string }>(
      `query R($n: String!, $p: String!) { skillFileContent(skillName: $n, path: $p) }`, { n: "shared-skill", p: "SKILL.md" });
    expect(read.skillFileContent).toContain("TIER1-COPY");

    await exec(`mutation U($input: UpdateSkillInput!) { updateSkill(input: $input) { name } }`,
      { input: { name: "shared-skill", content: "UPDATED-USED-COPY" } });
    expect(fs.readFileSync(path.join(tier1, "SKILL.md"), "utf-8")).toContain("UPDATED-USED-COPY");

    const uploaded = await exec<{ uploadSkillFile: boolean }>(
      `mutation Up($n: String!, $p: String!, $c: String!) { uploadSkillFile(skillName: $n, path: $p, content: $c) }`,
      { n: "shared-skill", p: "notes/added.txt", c: "added" });
    expect(uploaded.uploadSkillFile).toBe(true);
    expect(fs.existsSync(path.join(tier1, "notes", "added.txt"))).toBe(true);
    const removedFile = await exec<{ deleteSkillFile: boolean }>(
      `mutation Df($n: String!, $p: String!) { deleteSkillFile(skillName: $n, path: $p) }`, { n: "shared-skill", p: "tier1-only.txt" });
    expect(removedFile.deleteSkillFile).toBe(true);
    expect(fs.existsSync(path.join(tier1, "tier1-only.txt"))).toBe(false);
    expect(treeHash(codexDup)).toBe(codexHashBefore);

    const deleted = await exec<{ deleteSkill: { success: boolean } }>(
      `mutation D($n: String!) { deleteSkill(name: $n) { success } }`, { n: "shared-skill" });
    expect(deleted.deleteSkill.success).toBe(true);
    expect(fs.existsSync(tier1)).toBe(false);
    expect(treeHash(codexDup)).toBe(codexHashBefore);
    // With the used copy gone, the runtime default copy becomes the catalog's copy.
    expect((await listSkills()).find((skill) => skill.name === "shared-skill")?.rootPath).toBe(codexDup);
    expect(await listIssues()).toEqual([]);
  });

  it("AC-020: adding a skill folder with a tier 1–3 duplicate is rejected with both paths; nothing is persisted", async () => {
    const existing = path.join(writeAgent(dataDir, "pkg-agent", { "pkg-dup": "PACKAGE" }), "skills", "pkg-dup");
    const incomingFolder = path.join(base, "incoming-folder");
    const incoming = writeSkill(path.join(incomingFolder, "pkg-dup"), "pkg-dup", "INCOMING");
    writeSkill(path.join(incomingFolder, "fresh-name"), "fresh-name", "FRESH");

    const conflicts = await expectConflict(ADD_SOURCE, { path: incomingFolder });
    expect(conflicts).toEqual([{ name: "pkg-dup", existingPath: existing, incomingPath: incoming }]);
    expect(await listSources()).not.toContain(incomingFolder);
    expect(process.env["AUTOBYTEUS_SKILLS_PATHS"] ?? "").not.toContain(incomingFolder);
    expect((await listSkills()).some((skill) => skill.name === "fresh-name")).toBe(false);
  });

  it("AC-020: creating a skill whose name exists in a package is rejected; a name only in the runtime default folder is accepted and used", async () => {
    const existing = path.join(writeAgent(dataDir, "pkg-agent", { "pkg-dup": "PACKAGE" }), "skills", "pkg-dup");
    const conflicts = await expectConflict(CREATE_SKILL, { input: { name: "pkg-dup", description: "d", content: "c" } });
    expect(conflicts).toEqual([{ name: "pkg-dup", existingPath: existing, incomingPath: path.join(skillsDir, "pkg-dup") }]);
    expect(fs.existsSync(path.join(skillsDir, "pkg-dup"))).toBe(false);

    const codexCopy = writeSkill(path.join(codexSkills, "t4-only"), "t4-only", "CODEX");
    await exec(ADD_SOURCE, { path: codexSkills });
    const created = await exec<{ createSkill: { rootPath: string } }>(CREATE_SKILL, { input: { name: "t4-only", description: "d", content: "NEW" } });
    expect(created.createSkill.rootPath).toBe(path.join(skillsDir, "t4-only"));
    expect(await listIssues()).toEqual([
      { name: "t4-only", usedPath: path.join(skillsDir, "t4-only"), ignoredPaths: [codexCopy], kind: "shadowed_runtime_default" },
    ]);
  });

  it("AC-020: a local package import with a duplicate is rejected; a package duplicating only a runtime default copy imports and wins", async () => {
    useTestPackageService();
    const existing = writeSkill(path.join(skillsDir, "desk-alpha"), "desk-alpha", "TIER1");
    const dupPackage = path.join(base, "dup-package");
    const incoming = path.join(writeAgent(dupPackage, "desk-helper", { "desk-alpha": "PACKAGE" }), "skills", "desk-alpha");

    const conflicts = await expectConflict(IMPORT_PACKAGE, { input: { sourceKind: "LOCAL_PATH", source: dupPackage } });
    expect(conflicts).toEqual([{ name: "desk-alpha", existingPath: existing, incomingPath: incoming }]);
    expect((await listPackages()).some((pkg) => pkg.path === dupPackage)).toBe(false);
    expect(parseRoots()).toEqual([]);

    const codexCopy = writeSkill(path.join(codexSkills, "desk-beta"), "desk-beta", "CODEX");
    await exec(ADD_SOURCE, { path: codexSkills });
    const okPackage = path.join(base, "ok-package");
    const pkgCopy = path.join(writeAgent(okPackage, "beta-helper", { "desk-beta": "PACKAGE" }), "skills", "desk-beta");
    await exec(IMPORT_PACKAGE, { input: { sourceKind: "LOCAL_PATH", source: okPackage } });
    expect(parseRoots()).toEqual([okPackage]);
    expect((await listSkills()).find((skill) => skill.name === "desk-beta")?.rootPath).toBe(pkgCopy);
    expect(await listIssues()).toEqual([
      { name: "desk-beta", usedPath: pkgCopy, ignoredPaths: [codexCopy], kind: "shadowed_runtime_default" },
    ]);
  });

  it("AC-020 / R-3 / AC-021: a reload that pulled a duplicate is rejected, the package stays registered, and the banner data lists the ignored copy", async () => {
    useTestPackageService();
    const localPackage = path.join(base, "local-package");
    writeAgent(localPackage, "desk-helper");
    const imported = await exec<{ importAgentPackage: Array<{ packageId: string; path: string }> }>(
      IMPORT_PACKAGE, { input: { sourceKind: "LOCAL_PATH", source: localPackage } });
    const packageId = imported.importAgentPackage.find((pkg) => pkg.path === localPackage)!.packageId;

    const existing = writeSkill(path.join(skillsDir, "desk-alpha"), "desk-alpha", "TIER1");
    const pulled = writeSkill(path.join(localPackage, "agents", "desk-helper", "skills", "desk-alpha"), "desk-alpha", "PULLED");

    const conflicts = await expectConflict(RELOAD_PACKAGE, { id: packageId });
    expect(conflicts).toEqual([{ name: "desk-alpha", existingPath: existing, incomingPath: pulled }]);
    expect((await listPackages()).some((pkg) => pkg.packageId === packageId)).toBe(true);
    expect(parseRoots()).toEqual([localPackage]);
    expect((await listSkills()).filter((skill) => skill.name === "desk-alpha")).toEqual([{ name: "desk-alpha", rootPath: existing }]);
    expect(await listIssues()).toEqual([{ name: "desk-alpha", usedPath: existing, ignoredPaths: [pulled], kind: "conflict" }]);
  });

  it("AC-020: a GitHub import with a duplicate is rejected and its download removed; a GitHub update adding a duplicate is rolled back", async () => {
    const existing = writeSkill(path.join(skillsDir, "desk-alpha"), "desk-alpha", "TIER1");
    const cleanRev = path.join(base, "fixtures", "clean");
    const dupRev = path.join(base, "fixtures", "dup");
    writeAgent(cleanRev, "gh-helper");
    writeAgent(dupRev, "gh-helper", { "desk-alpha": "GITHUB" });

    // Import of a repository whose current revision carries the duplicate.
    let revision = "dup-sha";
    useTestPackageService(fixtureGitHubInstaller("dup-repo", () => revision, { "dup-sha": dupRev }));
    const importConflicts = await expectConflict(IMPORT_PACKAGE,
      { input: { sourceKind: "GITHUB_REPOSITORY", source: "https://github.com/AutoByteus/dup-repo" } });
    expect(importConflicts).toHaveLength(1);
    expect(importConflicts[0]).toMatchObject({ name: "desk-alpha", existingPath: existing });
    expect(importConflicts[0]!.incomingPath).toMatch(/agents\/gh-helper\/skills\/desk-alpha$/);
    expect(fs.existsSync(importConflicts[0]!.incomingPath)).toBe(false);
    expect((await listPackages()).some((pkg) => pkg.sourceKind === "GITHUB_REPOSITORY")).toBe(false);
    expect(parseRoots()).toEqual([]);

    // Update: import a clean revision, then the remote gains the duplicate.
    AgentPackageService.resetInstance();
    revision = "clean-sha";
    useTestPackageService(fixtureGitHubInstaller("upd-repo", () => revision,
      { "clean-sha": cleanRev, "dup-sha": dupRev }));
    const imported = await exec<{ importAgentPackage: Array<{ packageId: string; path: string; sourceKind: string }> }>(
      IMPORT_PACKAGE, { input: { sourceKind: "GITHUB_REPOSITORY", source: "https://github.com/AutoByteus/upd-repo" } });
    const pkg = imported.importAgentPackage.find((entry) => entry.sourceKind === "GITHUB_REPOSITORY")!;
    revision = "dup-sha";
    const checked = await exec<{ checkAgentPackageUpdates: Array<{ packageId: string; updateInfo: { status: string } }> }>(
      CHECK_UPDATES, { ids: [pkg.packageId] });
    expect(checked.checkAgentPackageUpdates.find((entry) => entry.packageId === pkg.packageId)?.updateInfo.status).toBe("UPDATE_AVAILABLE");

    const updateConflicts = await expectConflict(UPDATE_PACKAGE, { id: pkg.packageId });
    expect(updateConflicts[0]).toMatchObject({ name: "desk-alpha", existingPath: existing });
    const after = await exec<{ checkAgentPackageUpdates: Array<{ packageId: string; updateInfo: { installedRevision: string } }> }>(
      CHECK_UPDATES, { ids: [pkg.packageId] });
    expect(after.checkAgentPackageUpdates.find((entry) => entry.packageId === pkg.packageId)?.updateInfo.installedRevision).toBe("clean-sha");
    expect(fs.existsSync(path.join(pkg.path, "agents", "gh-helper", "skills", "desk-alpha"))).toBe(false);
    expect((await listSkills()).filter((skill) => skill.name === "desk-alpha")).toEqual([{ name: "desk-alpha", rootPath: existing }]);
    expect(await listIssues()).toEqual([]);
  });

  it("DEC-017a: Agent Org agents' own skills (org agent, org team shared, org team-local agent) are in the one catalog; a non-member folder is not", async () => {
    const orgDir = writeAgentOrg(path.join(dataDir, "agent-orgs"), "org-desk", { agents: ["org-writer"], teams: ["org-crew"] });
    const writer = writeSkill(path.join(orgDir, "agents", "org-writer", "skills", "org-writer-skill"), "org-writer-skill", "ORG-WRITER");
    const shared = writeSkill(path.join(orgDir, "agent-teams", "org-crew", "skills", "org-crew-shared"), "org-crew-shared", "ORG-SHARED");
    const member = writeSkill(path.join(orgDir, "agent-teams", "org-crew", "agents", "member", "skills", "org-member-skill"), "org-member-skill", "ORG-MEMBER");
    writeSkill(path.join(orgDir, "agents", "not-a-member", "skills", "stray-skill"), "stray-skill", "STRAY");

    const skills = await listSkills();
    expect(skills.find((skill) => skill.name === "org-writer-skill")?.rootPath).toBe(writer);
    expect(skills.find((skill) => skill.name === "org-crew-shared")?.rootPath).toBe(shared);
    expect(skills.find((skill) => skill.name === "org-member-skill")?.rootPath).toBe(member);
    expect(skills.some((skill) => skill.name === "stray-skill")).toBe(false);
    const read = await exec<{ skillFileContent: string }>(
      `query R($n: String!, $p: String!) { skillFileContent(skillName: $n, path: $p) }`, { n: "org-member-skill", p: "SKILL.md" });
    expect(read.skillFileContent).toContain("ORG-MEMBER");

    // An on-disk tier-1 copy of an org skill name wins; the org copy is reported as ignored.
    const tier1 = writeSkill(path.join(skillsDir, "org-writer-skill"), "org-writer-skill", "TIER1");
    expect((await listSkills()).find((skill) => skill.name === "org-writer-skill")?.rootPath).toBe(tier1);
    expect(await listIssues()).toEqual([{ name: "org-writer-skill", usedPath: tier1, ignoredPaths: [writer], kind: "conflict" }]);
  });

  it("DEC-017a / AC-020: importing a package whose Agent Org team-local agent duplicates an installed name is rejected; a clean org package imports and its skills load", async () => {
    useTestPackageService();
    const existing = writeSkill(path.join(skillsDir, "desk-alpha"), "desk-alpha", "TIER1");
    const dupPackage = path.join(base, "org-dup-package");
    // Real org packages also carry shared agents (an org-only package fails the pre-existing package shape rule).
    writeAgent(dupPackage, "dup-shared");
    const dupOrg = writeAgentOrg(path.join(dupPackage, "agent-orgs"), "dup-org", { teams: ["dup-crew"] });
    const incoming = writeSkill(path.join(dupOrg, "agent-teams", "dup-crew", "agents", "member", "skills", "desk-alpha"), "desk-alpha", "ORG-DUP");

    const conflicts = await expectConflict(IMPORT_PACKAGE, { input: { sourceKind: "LOCAL_PATH", source: dupPackage } });
    expect(conflicts).toEqual([{ name: "desk-alpha", existingPath: existing, incomingPath: incoming }]);
    expect((await listPackages()).some((pkg) => pkg.path === dupPackage)).toBe(false);
    expect(parseRoots()).toEqual([]);

    const okPackage = path.join(base, "org-ok-package");
    writeAgent(okPackage, "ok-shared");
    const okOrg = writeAgentOrg(path.join(okPackage, "agent-orgs"), "ok-org", { agents: ["ok-writer"] });
    const okSkill = writeSkill(path.join(okOrg, "agents", "ok-writer", "skills", "ok-org-skill"), "ok-org-skill", "OK-ORG");
    await exec(IMPORT_PACKAGE, { input: { sourceKind: "LOCAL_PATH", source: okPackage } });
    expect(parseRoots()).toEqual([okPackage]);
    expect((await listSkills()).find((skill) => skill.name === "ok-org-skill")?.rootPath).toBe(okSkill);
  });
});
