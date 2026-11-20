import "reflect-metadata";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { RunFolderDiscovery } from "../../../src/agent-memory/services/run-folder-discovery.js";
import { LocalMemoryExportScanner } from "../../../src/memory-sync/source/local-memory-export-scanner.js";

/**
 * Semantic memory for every agent at the real server boundary (autobyteus-554; first built for agent-semantic-memory,
 * Task autobyteus-12): the Studio HTTP/GraphQL/WebSocket server with the renderer's own GraphQL documents, the agent
 * definition files and `personal-settings.json`, the Memory page's folder view through the file explorer API, and the
 * real run start paths (standalone run under a Project, shared team member, team-local member, delegated copy) with the
 * AGY backend. Only the external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs); the AGY run capsule's main
 * agent file is the composed prompt (then the capsule's own Working Environment block), which Codex, Claude and ACP
 * receive through the same composer. No inference.
 *
 * The instruction texts below are copied from the requirements (semantic-memory-prompt-contract.md §2; DEC-013), not
 * imported from the source, so the test is an independent check of them.
 *
 * Cases:
 *  - SM-01 (AC-003, AC-004): every agent has its path; a user's own agent-config.json holding `semanticMemoryEnabled`
 *    (true or false) is read without it and loses the key at the next save, keeping every other field; reads create no
 *    folder; the GraphQL input no longer has the field.
 *  - SM-02 (AC-002, AC-003): a package agent declaring the key reads like any agent; no personal setting holds it.
 *  - SM-11 (AC-005, AC-006, AC-010, AC-011): the folder view's workspace through the API: folder states without
 *    creating a folder; files and link rows; links' content refused; every write refused and the folders byte-identical;
 *    never listed by the workspaces query.
 *  - SM-04 (AC-001, AC-009): a run under Project A: the Semantic Memory and Global Semantic Memory sections follow the
 *    Project section; both folders exist, outside the workspace and the package.
 *  - SM-05: a run under Project B, the agent as a shared team member and as a delegated copy are told the same folders;
 *    every other agent (the coordinator, the host) its own folder and the same global one.
 *  - SM-06: a team-local agent with the same local name has its own folder.
 *  - SM-07 (AC-001): an agent whose package file says false gets both sections; the folders' files are kept across runs.
 *  - SM-10: the Memory page, memory search's run discovery and memory sync's scanner list neither semantic folder.
 *  - SM-08 (REQ-010): deleting the agent leaves its folder and the global folder.
 *  - SM-12 (AC-014, DEC-015): with `semantic/` unwritable, a new agent's run still starts, told only the global folder,
 *    and `SEMANTIC_MEMORY_PREPARE_FAILED` names the agent and the reason.
 * SM-01/SM-02/SM-11 run ungated; the run cases need the scripted AGY CLI:
 *   env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *     ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts --no-watch
 * SEMANTIC_MEMORY_E2E_EVIDENCE_DIR keeps the prompts and file states the cases saw.
 */
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actors' files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "sm-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const AGY = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const evidenceDir = process.env.SEMANTIC_MEMORY_E2E_EVIDENCE_DIR?.trim() || null;

/** semantic-memory-prompt-contract.md §2 and DEC-013, with the folders. */
const semanticSections = (folder: string, globalFolder: string) => `## Semantic Memory

Your semantic memory is the folder \`${folder}\`. It belongs to you and is shared by all your runs, in every Project and team. Write the reusable knowledge you learn there as documents; how you organize them is up to you and your skills.

## Global Semantic Memory

The global semantic memory of this node is the folder \`${globalFolder}\`. It is shared by every agent on this node, in every Project and team: facts that are true for everyone, such as what the product is, the words it uses and the user's standing rules. Read it when you need such facts. Write there only what is true for every agent; keep what only you need in your own semantic memory.`;
const projectSection = (name: string, projectId: string) => `## Project

You work in the Project ${name} (Project ID ${projectId}). Use this Project ID with the Project tools; ask the user before working on another Project.`;

/** The renderer's GraphQL documents (`autobyteus-web/graphql/…`), fragments inlined, as the app sends them. */
const loadDocuments = async (...files: string[]): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const file of files) {
    const source = await fs.readFile(new URL(`../../../../autobyteus-web/graphql/${file}`, import.meta.url), "utf8");
    const templates = Object.fromEntries([...source.matchAll(/(?:export )?const (\w+) = gql`([\s\S]*?)`/g)].map((m) => [m[1]!, m[2]!]));
    for (const [key, body] of Object.entries(templates)) out[key] = body.replace(/\$\{(\w+)\}/g, (_all, name: string) => templates[name] ?? "");
  }
  return out;
};
/** Every file under `root` with its sha256 (a link with its target, never followed), relative paths sorted. */
const treeHashes = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) out[path.relative(root, full)] = `link:${await fs.readlink(full)}`;
      else if (entry.isDirectory()) await walk(full);
      else out[path.relative(root, full)] = createHash("sha256").update(await fs.readFile(full)).digest("hex");
    }
  };
  await walk(root);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
};
const readJson = async (file: string): Promise<Rec> => JSON.parse(await fs.readFile(file, "utf8")) as Rec;
const isInside = (child: string, parent: string) => {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};
const keep = async (name: string, value: unknown) => {
  if (!evidenceDir) return;
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, name), typeof value === "string" ? value : JSON.stringify(value, null, 2));
};

describe("Semantic memory for every agent at the real server boundary", () => {
  const unique = randomUUID().slice(0, 6);
  const names = { plain: `sm plain ${unique}`, scout: `sm scout ${unique}`, manager: `sm manager ${unique}` };
  const pkg = { teamId: `sm-pkg-team-${unique}`, localName: segment(names.scout).replace(/_/g, "-"), declaredOn: `sm-declared-on-${unique}`,
    declaredOff: `sm-declared-off-${unique}`, plain: `sm-pkg-plain-${unique}` };
  let h: CollaborationHarness;
  let docs: Record<string, string>;
  let packageRoot = "";
  let memoryDir = "";
  const ids: Record<string, string> = {};
  const project: Record<"A" | "B", { id: string; name: string }> = { A: { id: "", name: "" }, B: { id: "", name: "" } };
  const folderOf = (definitionId: string) => path.join(memoryDir, "semantic", encodeURIComponent(definitionId));
  const globalFolder = () => path.join(memoryDir, "semantic-global");

  const writeAgent = async (dir: string, name: string, config: Rec) => {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "agent.md"), `---\nname: ${name}\ndescription: Semantic memory E2E agent\nrole: assistant\n---\n\nInstructions of ${name}.\n`);
    await fs.writeFile(path.join(dir, "agent-config.json"), `${JSON.stringify(config, null, 2)}\n`);
  };
  const definitions = async () => (await h.graphql(docs.GetAgentDefinitions!)).agentDefinitions as Rec[];
  const definition = async (id: string) => {
    const found = (await definitions()).find((entry) => entry.id === id);
    expect(found, `definition ${id}`).toBeTruthy();
    return found!;
  };
  /**
   * The composed prompt up to the runtime's Long-Running Commands section, which ends every composed prompt
   * (autobyteus-483); the AGY capsule's own Working Environment block follows it and is cut here.
   */
  const composedOf = async (agentRunId: string) => {
    const prompt = await h.promptOf(agentRunId);
    const capsuleBlock = prompt.lastIndexOf("\n\n## Working Environment\n- Agent workspace: `");
    expect(capsuleBlock, `capsule block of ${agentRunId}`).toBeGreaterThan(0);
    const composed = prompt.slice(0, capsuleBlock);
    const longRunning = composed.lastIndexOf("\n\n## Long-Running Commands\n");
    expect(longRunning, `Long-Running Commands section of ${agentRunId}`).toBeGreaterThan(0);
    expect(composed.indexOf("\n## ", longRunning + 2), `nothing after the Long-Running Commands section of ${agentRunId}`).toBe(-1);
    return composed.slice(0, longRunning);
  };
  const update = async (input: Rec) => (await h.graphql(docs.UpdateAgentDefinition!, { input })).updateAgentDefinition as Rec;
  const formInput = (loaded: Rec, edits: Rec = {}) => ({ id: loaded.id, name: loaded.name, role: loaded.role, description: loaded.description,
    instructions: loaded.instructions, toolNames: loaded.toolNames, skillNames: loaded.skillNames, ...edits });

  beforeAll(async () => {
    docs = await loadDocuments("queries/agentDefinitionQueries.ts", "mutations/agentDefinitionMutations.ts");
    h = await startCollaborationHarness("sm-e2e");
    memoryDir = path.join(h.dataDir, "memory");
    // A local agent package: a plain agent, two whose files still hold the retired key (true and false), and a team whose
    // team-local member has the same local name as the shared scout.
    packageRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "sm-e2e-package-")));
    await writeAgent(path.join(packageRoot, "agents", pkg.plain), pkg.plain, { toolNames: [] });
    await writeAgent(path.join(packageRoot, "agents", pkg.declaredOn), pkg.declaredOn, { toolNames: [], semanticMemoryEnabled: true });
    await writeAgent(path.join(packageRoot, "agents", pkg.declaredOff), pkg.declaredOff, { toolNames: [], semanticMemoryEnabled: false });
    const team = path.join(packageRoot, "agent-teams", pkg.teamId);
    await fs.mkdir(team, { recursive: true });
    await fs.writeFile(path.join(team, "team.md"), `---\nname: ${pkg.teamId}\ndescription: Semantic memory team-local test\n---\n\nAnswer.\n`);
    await fs.writeFile(path.join(team, "team-config.json"), JSON.stringify({ coordinatorMemberName: "manager", members: [
      { memberName: "manager", ref: pkg.plain, refScope: "shared" },
      { memberName: "mate", ref: pkg.localName, refScope: "team_local" }], handoffs: [], avatarUrl: null }, null, 2));
    await writeAgent(path.join(team, "agents", pkg.localName), pkg.localName, { toolNames: [] });
    const imported = (await h.graphql(`mutation($input: ImportAgentPackageInput!) { importAgentPackage(input: $input) { packageId path } }`,
      { input: { sourceKind: "LOCAL_PATH", source: packageRoot } })).importAgentPackage as Rec[];
    expect(imported.some((entry) => entry.path === packageRoot), JSON.stringify(imported)).toBe(true);
    for (const key of ["A", "B"] as const) {
      project[key].name = `SM Project ${key} ${unique}`;
      project[key].id = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
        { input: { name: project[key].name } })).createProject.projectId;
    }
  }, 240_000);

  afterAll(async () => {
    if (h) await h.close();
    if (packageRoot) await fs.rm(packageRoot, { recursive: true, force: true });
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
  }, 180_000);

  it("SM-01 (AC-003, AC-004): every agent has its path; a stored key is read without it and dropped at the next save; reads create no folder", async () => {
    const created = (await h.graphql(docs.CreateAgentDefinition!, { input: { name: names.scout, role: "assistant",
      description: "Semantic memory scout", instructions: `Instructions of ${names.scout}.`, toolNames: [], skillNames: [], category: "sm-e2e" } }))
      .createAgentDefinition as Rec;
    ids.scout = created.id;
    expect(created).toMatchObject({ semanticMemoryPath: folderOf(ids.scout), ownershipScope: "SHARED" });
    expect(created).not.toHaveProperty("semanticMemoryEnabled");
    const configFile = path.join(h.dataDir, "agents", ids.scout, "agent-config.json");
    const before = await readJson(configFile);
    expect(before).not.toHaveProperty("semanticMemoryEnabled");

    for (const stored of [true, false]) {
      await fs.writeFile(configFile, `${JSON.stringify({ ...before, semanticMemoryEnabled: stored }, null, 2)}\n`);
      await h.graphql(`mutation { reloadAgentPackageDefinitions }`).catch(() => undefined);
      const loaded = await definition(ids.scout);
      expect(loaded).toMatchObject({ semanticMemoryPath: folderOf(ids.scout) });
      const saved = await update(formInput(loaded, { description: `Semantic memory scout (${stored})` }));
      expect(saved).toMatchObject({ semanticMemoryPath: folderOf(ids.scout), description: `Semantic memory scout (${stored})` });
      const after = await readJson(configFile);
      expect(after).not.toHaveProperty("semanticMemoryEnabled");
      expect(after).toMatchObject(before);
    }
    // REQ-009: a clean cut: the input has no such field.
    await expect(h.graphql(docs.UpdateAgentDefinition!, { input: { id: ids.scout, semanticMemoryEnabled: true } })).rejects.toThrow(/semanticMemoryEnabled/);
    // Reading the path creates nothing.
    expect(existsSync(path.join(memoryDir, "semantic"))).toBe(false);
    expect(existsSync(globalFolder())).toBe(false);
    await keep("SM-01-agent-config.json", { before, final: await readJson(configFile) });
  }, 120_000);

  it("SM-02 (AC-002, AC-003): a package agent's file holding the key reads like any agent's; no personal setting holds it", async () => {
    const packageFilesBefore = await treeHashes(packageRoot);
    for (const id of [pkg.declaredOn, pkg.declaredOff, pkg.plain]) {
      const loaded = await definition(id);
      expect(loaded).toMatchObject({ semanticMemoryPath: folderOf(id), personalSettings: [] });
      expect(loaded).not.toHaveProperty("semanticMemoryEnabled");
    }
    await update(formInput(await definition(pkg.declaredOff), { toolNames: ["read_file"] }));
    const settingsFile = path.join(h.dataDir, "agent-packages", "personal-settings.json");
    const settings = existsSync(settingsFile) ? await readJson(settingsFile) : {};
    expect(JSON.stringify(settings)).not.toContain("semanticMemoryEnabled");
    expect((await definition(pkg.declaredOff)).personalSettings).toEqual(["TOOLS"]);
    expect(await treeHashes(packageRoot)).toEqual(packageFilesBefore);
    expect(existsSync(path.join(memoryDir, "semantic"))).toBe(false);
    await keep("SM-02-personal-settings.json", { settings, packageFilesBefore, packageFilesAfter: await treeHashes(packageRoot) });
  }, 120_000);

  it("SM-11 (AC-005, AC-006, AC-010, AC-011): the folder view's workspace through the API: read only, links never opened, never listed", async () => {
    const workspaceId = `semantic_ws_${encodeURIComponent(ids.scout)}`;
    const folderState = `query($id: String!) { agentSemanticMemoryFolder(agentDefinitionId: $id) { folderPath exists isEmpty } globalSemanticMemoryFolder { folderPath exists isEmpty } }`;
    expect(await h.graphql(folderState, { id: ids.scout })).toEqual({
      agentSemanticMemoryFolder: { folderPath: folderOf(ids.scout), exists: false, isEmpty: true },
      globalSemanticMemoryFolder: { folderPath: globalFolder(), exists: false, isEmpty: true },
    });
    const missing = JSON.parse((await h.graphql(`query($w: String!) { folderChildren(workspaceId: $w, folderPath: "") }`, { w: workspaceId })).folderChildren);
    expect(missing).toEqual({ error: "Workspace not found" });
    expect(existsSync(folderOf(ids.scout))).toBe(false);

    // What an agent may write: nested files, a link to a file and one to a folder outside.
    const outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "sm-e2e-outside-")));
    try {
      await fs.writeFile(path.join(outside, "secret.md"), "secret\n");
      await fs.mkdir(path.join(folderOf(ids.scout), "sites", "linkedin"), { recursive: true });
      await fs.writeFile(path.join(folderOf(ids.scout), "sites", "linkedin", "controls.md"), `# LinkedIn controls ${unique}\n`);
      await fs.symlink(outside, path.join(folderOf(ids.scout), "shared"));
      await fs.symlink(path.join(outside, "secret.md"), path.join(folderOf(ids.scout), "secret-link.md"));
      await fs.mkdir(globalFolder(), { recursive: true });
      await fs.writeFile(path.join(globalFolder(), "product.md"), `# Product ${unique}\n`);
      expect((await h.graphql(folderState, { id: ids.scout })).agentSemanticMemoryFolder).toMatchObject({ exists: true, isEmpty: false });

      const children = async (w: string, folder: string) =>
        JSON.parse((await h.graphql(`query($w: String!, $f: String!) { folderChildren(workspaceId: $w, folderPath: $f) }`, { w, f: folder })).folderChildren);
      expect((await children(workspaceId, "")).children.map((child: Rec) => [child.name, child.is_file, child.is_symbolic_link])).toEqual([
        ["sites", false, false], ["secret-link.md", false, true], ["shared", false, true],
      ]);
      expect((await children(workspaceId, "shared")).error).toMatch(/^WORKSPACE_LINK_NOT_OPENED/);
      const content = async (w: string, file: string) =>
        (await h.graphql(`query($w: String!, $f: String!) { fileContent(workspaceId: $w, filePath: $f) }`, { w, f: file })).fileContent as string;
      expect(await content(workspaceId, "sites/linkedin/controls.md")).toBe(`# LinkedIn controls ${unique}\n`);
      expect(JSON.parse(await content(workspaceId, "secret-link.md")).error).toMatch(/^WORKSPACE_LINK_NOT_OPENED/);
      expect(JSON.parse(await content(workspaceId, "shared/secret.md")).error).toMatch(/^WORKSPACE_LINK_NOT_OPENED/);
      expect(await content("semantic_global_ws", "product.md")).toBe(`# Product ${unique}\n`);

      const before = { agent: await treeHashes(folderOf(ids.scout)), global: await treeHashes(globalFolder()), outside: await treeHashes(outside) };
      for (const [w, file] of [[workspaceId, "sites/linkedin/controls.md"], ["semantic_global_ws", "product.md"]] as const) {
        for (const write of [
          `mutation { writeFileContent(workspaceId: "${w}", filePath: "${file}", content: "changed") }`,
          `mutation { createFileOrFolder(workspaceId: "${w}", path: "created.md", isFile: true) }`,
          `mutation { renameFileOrFolder(workspaceId: "${w}", targetPath: "${file}", newName: "renamed.md") }`,
          `mutation { moveFileOrFolder(workspaceId: "${w}", sourcePath: "${file}", destinationPath: "moved.md") }`,
          `mutation { deleteFileOrFolder(workspaceId: "${w}", path: "${file}") }`,
        ]) {
          await expect(h.graphql(write)).rejects.toThrow(/WORKSPACE_READ_ONLY/);
        }
      }
      expect({ agent: await treeHashes(folderOf(ids.scout)), global: await treeHashes(globalFolder()), outside: await treeHashes(outside) }).toEqual(before);

      const listed = (await h.graphql(`{ workspaces { workspaceId kind } }`)).workspaces as Rec[];
      expect(listed.map((workspace) => workspace.kind)).not.toContain("semantic_memory");
      expect(listed.map((workspace) => workspace.workspaceId)).not.toContain(workspaceId);
      await keep("SM-11-folder-view.json", { listed, before });
    } finally {
      await fs.rm(path.join(folderOf(ids.scout), "shared"), { force: true });
      await fs.rm(path.join(folderOf(ids.scout), "secret-link.md"), { force: true });
      await fs.rm(outside, { recursive: true, force: true });
    }
  }, 120_000);

  describe.skipIf(!AGY)("run start paths (scripted AGY CLI)", () => {
    const wake = async (root: Awaited<ReturnType<CollaborationHarness["startRoot"]>>, agentRunId: string) => {
      root.sendTo(agentRunId, "Reply OK.");
      await until(async () => h.promptOf(agentRunId).then(() => true, () => false), `run ${agentRunId} started`, 60_000);
    };

    beforeAll(async () => {
      ids.plain = await h.agentDefinition(names.plain);
      ids.manager = await h.agentDefinition(names.manager);
    }, 60_000);

    it("SM-04 (AC-001, AC-009): a run under Project A is told both folders after the Project section; both exist outside the workspace and the package", async () => {
      const folder = folderOf(ids.scout);
      const root = await h.startRoot("agent", { manager: ids.scout }, { projectId: project.A.id });
      const prompt = await composedOf(root.managerRunId);
      await keep("SM-04-prompt-project-a.md", prompt);
      expect(prompt.endsWith(`${projectSection(project.A.name, project.A.id)}\n\n${semanticSections(folder, globalFolder())}`)).toBe(true);
      expect(prompt.split("## Semantic Memory").length).toBe(2);
      expect(prompt.split("## Global Semantic Memory").length).toBe(2);
      for (const dir of [folder, globalFolder()]) {
        expect((await fs.stat(dir)).isDirectory()).toBe(true);
        expect(isInside(dir, h.workspace)).toBe(false);
        expect(isInside(dir, packageRoot)).toBe(false);
        expect(isInside(dir, path.join(memoryDir, "agents"))).toBe(false);
      }
      expect((await definition(ids.scout)).semanticMemoryPath).toBe(folder);
      root.close();
      await h.terminate("agent", root.rootId);
    }, 120_000);

    it("SM-05: a run under Project B, the agent as a shared team member and as a delegated copy are told the same folders; every other agent its own and the same global one", async () => {
      const folder = folderOf(ids.scout);
      const inB = await h.startRoot("agent", { manager: ids.scout }, { projectId: project.B.id });
      const promptB = await composedOf(inB.managerRunId);
      expect(promptB.endsWith(`${projectSection(project.B.name, project.B.id)}\n\n${semanticSections(folder, globalFolder())}`)).toBe(true);
      inB.close();
      await h.terminate("agent", inB.rootId);

      const teamId = await h.teamDefinition(`sm team ${unique}`, [["manager", ids.manager], ["mate", ids.scout]], "manager");
      const team = await h.startRoot("team", { team: teamId, manager: ids.manager, mate: ids.scout });
      await wake(team, team.members["/mate"]!);
      await wake(team, team.members["/manager"]!);
      const member = await composedOf(team.members["/mate"]!);
      const coordinator = await composedOf(team.members["/manager"]!);
      expect(member.endsWith(`\n\n${semanticSections(folder, globalFolder())}`)).toBe(true);
      expect(member.indexOf("## Working With Other Agents")).toBeLessThan(member.indexOf("## Semantic Memory"));
      expect(coordinator.endsWith(`\n\n${semanticSections(folderOf(ids.manager), globalFolder())}`)).toBe(true);
      team.close();
      await h.terminate("team", team.rootId);

      const host = await h.startRoot("agent", { manager: ids.manager });
      const delegated = await host.calls(host.managerRunId, "/", callTool("delegate_task",
        { recipient_address: `/${segment(names.scout)}`, description: "Reply OK." }));
      expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
      const copyRunId = delegated.target_agent_run_id as string;
      await host.waitForTaskAgent(copyRunId);
      await until(async () => h.promptOf(copyRunId).then(() => true, () => false), `delegated copy ${copyRunId} started`, 60_000);
      const copy = await composedOf(copyRunId);
      expect(copy.endsWith(`\n\n${semanticSections(folder, globalFolder())}`)).toBe(true);
      expect((await composedOf(host.managerRunId)).endsWith(`\n\n${semanticSections(folderOf(ids.manager), globalFolder())}`)).toBe(true);
      await keep("SM-05-prompts.json", { projectB: promptB, teamMember: member, coordinator, delegatedCopy: copy });
      host.close();
      await h.terminate("agent", host.rootId);
      expect(await fs.readFile(path.join(folder, "sites", "linkedin", "controls.md"), "utf8")).toContain(unique);
      expect(await fs.readFile(path.join(globalFolder(), "product.md"), "utf8")).toContain(unique);
    }, 300_000);

    it("SM-06: a team-local agent with the same local name has its own folder", async () => {
      const teamLocal = (await definitions()).find((entry) => entry.ownershipScope === "TEAM_LOCAL" && entry.ownerTeamId?.includes(pkg.teamId)
        && entry.id !== pkg.localName);
      expect(teamLocal, "team-local definition").toBeTruthy();
      const localFolder = folderOf(teamLocal!.id);
      expect(teamLocal).toMatchObject({ semanticMemoryPath: localFolder });
      expect(path.basename(localFolder)).toContain("%3A");
      expect(path.basename(localFolder)).toContain(pkg.localName);
      const sharedFolder = folderOf(ids.scout);
      expect(path.basename(sharedFolder)).toBe(pkg.localName);
      expect(localFolder).not.toBe(sharedFolder);
      const packageTeam = (await h.graphql(`{ agentTeamDefinitions { id name } }`)).agentTeamDefinitions.find((entry: Rec) => entry.name === pkg.teamId);
      expect(packageTeam, "package team").toBeTruthy();
      const team = await h.startRoot("team", { team: packageTeam.id, manager: pkg.plain, mate: teamLocal!.id });
      await wake(team, team.members["/mate"]!);
      const member = await composedOf(team.members["/mate"]!);
      await keep("SM-06-team-local-member-prompt.md", member);
      expect(member.endsWith(`\n\n${semanticSections(localFolder, globalFolder())}`)).toBe(true);
      expect(member).not.toContain(sharedFolder + "`");
      expect((await fs.stat(localFolder)).isDirectory()).toBe(true);
      team.close();
      await h.terminate("team", team.rootId);
    }, 180_000);

    it("SM-07 (AC-001): an agent whose package file says false gets both sections; the folders' files are kept across runs", async () => {
      const filesBefore = { agent: await treeHashes(folderOf(ids.scout)), global: await treeHashes(globalFolder()) };
      const off = await h.startRoot("agent", { manager: pkg.declaredOff }, { projectId: project.A.id });
      const prompt = await composedOf(off.managerRunId);
      expect(prompt.endsWith(`${projectSection(project.A.name, project.A.id)}\n\n${semanticSections(folderOf(pkg.declaredOff), globalFolder())}`)).toBe(true);
      expect((await fs.stat(folderOf(pkg.declaredOff))).isDirectory()).toBe(true);
      off.close();
      await h.terminate("agent", off.rootId);
      expect({ agent: await treeHashes(folderOf(ids.scout)), global: await treeHashes(globalFolder()) }).toEqual(filesBefore);
      await keep("SM-07-stored-false.json", { prompt, filesBefore });
    }, 180_000);

    it("SM-10: the Memory page, memory search and memory sync list neither semantic folder", async () => {
      const semanticRoot = path.join(memoryDir, "semantic");
      const semanticFolders = await fs.readdir(semanticRoot);
      expect(semanticFolders.length).toBeGreaterThanOrEqual(2);
      const agents = (await h.graphql(`query { listAgentsWithMemory(search: "", page: 1, pageSize: 100) {
        entries { attribution agentDefinitionId displayName runCount } total } }`)).listAgentsWithMemory as Rec;
      await keep("SM-10-memory-page-agents.json", agents);
      const runIds: string[] = [];
      for (const entry of agents.entries as Rec[]) {
        expect(`${entry.agentDefinitionId} ${entry.displayName}`.toLowerCase()).not.toContain("semantic");
        const episodes = (await h.graphql(`query($s: AgentWithMemorySelectorInput!) { listAgentEpisodes(selector: $s, page: 1, pageSize: 100) {
          entries { runId } } }`, { s: { attribution: entry.attribution, agentDefinitionId: entry.agentDefinitionId } })).listAgentEpisodes.entries as Rec[];
        runIds.push(...episodes.map((run) => run.runId as string));
      }
      for (const runId of runIds) expect([...semanticFolders, "semantic-global"]).not.toContain(runId);
      const discovered = await new RunFolderDiscovery(memoryDir).findRuns();
      expect(discovered.length).toBeGreaterThan(0);
      for (const run of discovered) {
        expect(isInside(path.resolve(run.memoryDir), semanticRoot), run.memoryDir).toBe(false);
        expect(isInside(path.resolve(run.memoryDir), globalFolder()), run.memoryDir).toBe(false);
      }
      const scanned = await new LocalMemoryExportScanner({ getMemoryDir: () => memoryDir }).scan();
      expect(scanned.files.length).toBeGreaterThan(0);
      const listed = scanned.files.map((file) => `${file.kind}/${file.relativePath}`);
      expect(listed.filter((entry) => entry.includes("semantic") || entry.includes("controls.md") || entry.includes("product.md"))).toEqual([]);
      await keep("SM-10-listings.json", { semanticFolders, memoryPageAgents: agents, memoryPageRunIds: runIds,
        memorySearchRuns: discovered.map((run) => run.memoryDir), memorySyncFiles: listed });
    }, 120_000);

    it("SM-08 (REQ-010): deleting the agent leaves its semantic memory folder and the global folder", async () => {
      const before = { agent: await treeHashes(folderOf(ids.scout)), global: await treeHashes(globalFolder()) };
      const deleted = (await h.graphql(docs.DeleteAgentDefinition!, { id: ids.scout })).deleteAgentDefinition as Rec;
      expect(deleted, JSON.stringify(deleted)).toMatchObject({ success: true });
      expect({ agent: await treeHashes(folderOf(ids.scout)), global: await treeHashes(globalFolder()) }).toEqual(before);
    }, 60_000);

    it("SM-12 (AC-014, DEC-015): when an agent's folder cannot be made, its run still starts, told only the global folder, and the log names the agent and the reason", async () => {
      const id = await h.agentDefinition(`sm unprepared ${unique}`);
      const semanticRoot = path.join(memoryDir, "semantic");
      const globalSection = semanticSections(folderOf(id), globalFolder());
      const warn = vi.spyOn(console, "warn");
      await fs.chmod(semanticRoot, 0o555);
      try {
        const root = await h.startRoot("agent", { manager: id });
        const prompt = await composedOf(root.managerRunId);
        await keep("SM-12-prompt-unprepared-folder.md", prompt);
        expect(prompt.endsWith(globalSection.slice(globalSection.indexOf("## Global Semantic Memory")))).toBe(true);
        expect(prompt).not.toContain("## Semantic Memory\n");
        expect(prompt).not.toContain(folderOf(id));
        expect(existsSync(folderOf(id))).toBe(false);
        expect((await fs.stat(globalFolder())).isDirectory()).toBe(true);
        const logged = warn.mock.calls.filter((call) => call[0] === "SEMANTIC_MEMORY_PREPARE_FAILED");
        await keep("SM-12-log.json", logged);
        expect(logged).toEqual([["SEMANTIC_MEMORY_PREPARE_FAILED", { definitionId: id, folder: "agent", reason: expect.stringContaining("EACCES") }]]);
        root.close();
        await h.terminate("agent", root.rootId);
      } finally {
        await fs.chmod(semanticRoot, 0o755);
        warn.mockRestore();
      }
    }, 120_000);
  });
});
