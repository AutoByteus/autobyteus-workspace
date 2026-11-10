import "reflect-metadata";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, objectsIn, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { MemoryRunDiscovery } from "../../../src/memory-search/runs/memory-run-discovery.js";
import { LocalMemoryExportScanner } from "../../../src/memory-sync/source/local-memory-export-scanner.js";

/**
 * Agent semantic memory at the real server boundary (agent-semantic-memory, Task autobyteus-12): the Studio
 * HTTP/GraphQL/WebSocket server with the renderer's own GraphQL documents, the agent definition files and
 * `personal-settings.json`, and the real run start paths (standalone run under a Project, shared team member, team-local
 * member, delegated copy) with the AGY backend. Only the external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs,
 * `linked_skills`); the AGY run capsule's main agent file is the composed prompt (then the capsule's own Working
 * Environment block), which Codex, Claude and ACP receive through the same composer. No inference. Real runtimes writing the folder: agent-semantic-memory-live.e2e.test.ts.
 *
 * The instruction text below is copied from the ticket's prompt contract (semantic-memory-prompt-contract.md §2), not
 * imported from the source, so the test is an independent check of it.
 *
 * Cases (API/E2E IDs of the ticket):
 *  - SM-01 (AC-007, REQ-001/002): a user's own agent switched on and off through the renderer's documents; its
 *    agent-config.json gains and loses `semanticMemoryEnabled` and keeps every other field; reads do not create the folder.
 *  - SM-02 (AC-007, DEC-012): a package agent switched on is a personal setting (package files byte-identical) and
 *    `resetAgentPersonalSetting(SEMANTIC_MEMORY)` returns it to the package's value; a package that declares it reads on.
 *  - SM-03 (AC-005, REQ-008): a run of an agent without the setting has no section and no `memory/semantic` folder.
 *  - SM-04 (AC-001): a run under Project A: the section with `<memory>/semantic/<id>` follows the Project section; the
 *    folder exists, outside the workspace and the package, and equals the GraphQL `semanticMemoryPath`.
 *  - SM-05 (AC-003, AC-004): a run under Project B, the same agent as a shared team member and as a delegated copy are
 *    told the same folder.
 *  - SM-06 (AC-006): a team-local agent with the same local name, enabled in its package file, has its own folder.
 *  - SM-07 (AC-008, REQ-007/009): off → a new run has no section, the folder and its document are unchanged; on → the
 *    same folder again. SM-08 (REQ-007): deleting the agent leaves the folder.
 *  - SM-10 (AC-001): the Memory page, memory search's run discovery and memory sync's scanner do not list
 *    `memory/semantic`.
 * SM-01/SM-02 run ungated; the run cases need the scripted AGY CLI:
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

/** semantic-memory-prompt-contract.md §2, with the folder. */
const semanticSection = (folder: string) => `## Semantic Memory

Your semantic memory is the folder \`${folder}\`. It belongs to you and is shared by all your runs, in every Project and team. Write the reusable knowledge you learn there as documents; how you organize them is up to you and your skills.`;
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
/** Every file under `root` with its sha256, relative paths sorted. */
const treeHashes = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
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

describe("Agent semantic memory at the real server boundary", () => {
  const unique = randomUUID().slice(0, 6);
  const names = { plain: `sm plain ${unique}`, scout: `sm scout ${unique}`, manager: `sm manager ${unique}` };
  const pkg = { teamId: `sm-pkg-team-${unique}`, localName: segment(names.scout).replace(/_/g, "-"), declared: `sm-declared-${unique}`,
    plain: `sm-pkg-plain-${unique}`, packaged: `sm-packaged-${unique}` };
  let h: CollaborationHarness;
  let docs: Record<string, string>;
  let packageRoot = "";
  let memoryDir = "";
  const ids: Record<string, string> = {};
  const project: Record<"A" | "B", { id: string; name: string }> = { A: { id: "", name: "" }, B: { id: "", name: "" } };
  const folderOf = (definitionId: string) => path.join(memoryDir, "semantic", encodeURIComponent(definitionId));

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
   * The instructions the composer gave a run: the AGY capsule's main agent file is the composed prompt followed by the
   * capsule's own `## Working Environment` block (agy-run-capsule.ts), which is cut here.
   */
  const composedOf = async (agentRunId: string) => {
    const prompt = await h.promptOf(agentRunId);
    const capsuleBlock = prompt.lastIndexOf("\n\n## Working Environment\n- Agent workspace: `");
    expect(capsuleBlock, `capsule block of ${agentRunId}`).toBeGreaterThan(0);
    return prompt.slice(0, capsuleBlock);
  };
  const update = async (input: Rec) => (await h.graphql(docs.UpdateAgentDefinition!, { input })).updateAgentDefinition as Rec;

  beforeAll(async () => {
    docs = await loadDocuments("queries/agentDefinitionQueries.ts", "mutations/agentDefinitionMutations.ts");
    h = await startCollaborationHarness("sm-e2e");
    memoryDir = path.join(h.dataDir, "memory");
    // A local agent package: a plain agent, one declaring semantic memory, one the app will switch on, and a team whose
    // team-local member has the same local name as the shared scout and declares semantic memory in its own file.
    packageRoot = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "sm-e2e-package-")));
    await writeAgent(path.join(packageRoot, "agents", pkg.plain), pkg.plain, { toolNames: [] });
    await writeAgent(path.join(packageRoot, "agents", pkg.declared), pkg.declared, { toolNames: [], semanticMemoryEnabled: true });
    await writeAgent(path.join(packageRoot, "agents", pkg.packaged), pkg.packaged, { toolNames: [], skillNames: [] });
    const team = path.join(packageRoot, "agent-teams", pkg.teamId);
    await fs.mkdir(team, { recursive: true });
    await fs.writeFile(path.join(team, "team.md"), `---\nname: ${pkg.teamId}\ndescription: Semantic memory team-local test\n---\n\nAnswer.\n`);
    await fs.writeFile(path.join(team, "team-config.json"), JSON.stringify({ coordinatorMemberName: "manager", members: [
      { memberName: "manager", ref: pkg.plain, refScope: "shared" },
      { memberName: "mate", ref: pkg.localName, refScope: "team_local" }], handoffs: [], avatarUrl: null }, null, 2));
    await writeAgent(path.join(team, "agents", pkg.localName), pkg.localName, { toolNames: [], semanticMemoryEnabled: true });
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

  it("SM-01 (AC-007): a user's own agent is switched on and off in its agent-config.json, other fields kept, and reads create no folder", async () => {
    const created = (await h.graphql(docs.CreateAgentDefinition!, { input: { name: names.scout, role: "assistant",
      description: "Semantic memory scout", instructions: `Instructions of ${names.scout}.`, toolNames: [], skillNames: [], category: "sm-e2e" } }))
      .createAgentDefinition as Rec;
    ids.scout = created.id;
    expect(created).toMatchObject({ semanticMemoryEnabled: false, semanticMemoryPath: null, ownershipScope: "SHARED" });
    const configFile = path.join(h.dataDir, "agents", ids.scout, "agent-config.json");
    const before = await readJson(configFile);
    expect(before).not.toHaveProperty("semanticMemoryEnabled");

    const on = await update({ id: ids.scout, semanticMemoryEnabled: true });
    const afterOn = await readJson(configFile);
    expect(on).toMatchObject({ semanticMemoryEnabled: true, semanticMemoryPath: folderOf(ids.scout), personalSettings: [] });
    expect(afterOn).toEqual({ ...before, semanticMemoryEnabled: true });
    expect(await definition(ids.scout)).toMatchObject({ semanticMemoryEnabled: true, semanticMemoryPath: folderOf(ids.scout) });

    const off = await update({ id: ids.scout, semanticMemoryEnabled: false });
    expect(off).toMatchObject({ semanticMemoryEnabled: false, semanticMemoryPath: null });
    expect(await readJson(configFile)).toEqual(before);
    // An update that does not name the field leaves it as it is.
    await update({ id: ids.scout, semanticMemoryEnabled: true });
    expect(await update({ id: ids.scout, description: "Semantic memory scout (edited)" })).toMatchObject({ semanticMemoryEnabled: true });
    expect(await readJson(configFile)).toMatchObject({ semanticMemoryEnabled: true });
    // DS-003: reading the path creates nothing.
    expect(existsSync(path.join(memoryDir, "semantic"))).toBe(false);
    await keep("SM-01-agent-config.json", { before, afterOn, afterOff: before, final: await readJson(configFile) });
  });

  it("SM-02 (AC-007, DEC-012): a package agent's switch is a personal setting with a reset; a package that declares it reads on", async () => {
    const packageFilesBefore = await treeHashes(packageRoot);
    expect(await definition(pkg.declared)).toMatchObject({ semanticMemoryEnabled: true, semanticMemoryPath: folderOf(pkg.declared), personalSettings: [] });
    expect(await definition(pkg.packaged)).toMatchObject({ semanticMemoryEnabled: false, semanticMemoryPath: null });

    const on = await update({ id: pkg.packaged, semanticMemoryEnabled: true });
    expect(on).toMatchObject({ semanticMemoryEnabled: true, semanticMemoryPath: folderOf(pkg.packaged), personalSettings: ["SEMANTIC_MEMORY"] });
    const settingsFile = path.join(h.dataDir, "agent-packages", "personal-settings.json");
    const settings = await readJson(settingsFile);
    // The one personal value: the switch, in the package agent's record (no other field is personal).
    const withSwitch = objectsIn(settings).filter((record) => "semanticMemoryEnabled" in record);
    expect(withSwitch, JSON.stringify(settings)).toHaveLength(1);
    expect(withSwitch[0]!.semanticMemoryEnabled).toBe(true);
    expect(JSON.stringify(settings)).toContain(pkg.packaged);
    expect(await treeHashes(packageRoot)).toEqual(packageFilesBefore);

    const reset = (await h.graphql(docs.ResetAgentPersonalSetting!, { definitionId: pkg.packaged, setting: "SEMANTIC_MEMORY" }))
      .resetAgentPersonalSetting as Rec;
    expect(reset).toMatchObject({ semanticMemoryEnabled: false, semanticMemoryPath: null, personalSettings: [] });
    const settingsAfterReset = await readJson(settingsFile);
    expect(JSON.stringify(settingsAfterReset)).not.toContain("semanticMemoryEnabled");
    // A personal "off" for a package that declares it on, then reset to the package's "on".
    const declaredOff = await update({ id: pkg.declared, semanticMemoryEnabled: false });
    expect(declaredOff).toMatchObject({ semanticMemoryEnabled: false, semanticMemoryPath: null, personalSettings: ["SEMANTIC_MEMORY"] });
    const declaredReset = (await h.graphql(docs.ResetAgentPersonalSetting!, { definitionId: pkg.declared, setting: "SEMANTIC_MEMORY" }))
      .resetAgentPersonalSetting as Rec;
    expect(declaredReset).toMatchObject({ semanticMemoryEnabled: true, semanticMemoryPath: folderOf(pkg.declared), personalSettings: [] });
    expect(await treeHashes(packageRoot)).toEqual(packageFilesBefore);
    expect(existsSync(path.join(memoryDir, "semantic"))).toBe(false);
    await keep("SM-02-personal-settings.json", { afterOn: settings, afterReset: settingsAfterReset, packageFilesBefore,
      packageFilesAfter: await treeHashes(packageRoot) });
  });

  describe.skipIf(!AGY)("run start paths (scripted AGY CLI)", () => {
    const wake = async (root: Awaited<ReturnType<CollaborationHarness["startRoot"]>>, agentRunId: string) => {
      root.sendTo(agentRunId, "Reply OK.");
      await until(async () => h.promptOf(agentRunId).then(() => true, () => false), `run ${agentRunId} started`, 60_000);
    };

    beforeAll(async () => {
      ids.plain = await h.agentDefinition(names.plain);
      ids.manager = await h.agentDefinition(names.manager);
    }, 60_000);

    it("SM-03 (AC-005): a run of an agent without the setting has no section and creates no semantic folder", async () => {
      const root = await h.startRoot("agent", { manager: ids.plain }, { projectId: project.A.id });
      const prompt = await composedOf(root.managerRunId);
      await keep("SM-03-prompt-without-setting.md", prompt);
      expect(prompt).not.toContain("Semantic Memory");
      expect(prompt).not.toContain("semantic memory");
      expect(prompt.endsWith(projectSection(project.A.name, project.A.id))).toBe(true);
      expect(existsSync(path.join(memoryDir, "semantic"))).toBe(false);
      root.close();
      await h.terminate("agent", root.rootId);
    }, 120_000);

    it("SM-04 (AC-001): a run under Project A is told its folder after the Project section; the folder exists outside the workspace and the package", async () => {
      const folder = folderOf(ids.scout);
      const root = await h.startRoot("agent", { manager: ids.scout }, { projectId: project.A.id });
      const prompt = await composedOf(root.managerRunId);
      await keep("SM-04-prompt-project-a.md", prompt);
      expect(prompt.endsWith(`${projectSection(project.A.name, project.A.id)}\n\n${semanticSection(folder)}`)).toBe(true);
      expect(prompt.split("## Semantic Memory").length).toBe(2);
      expect((await fs.stat(folder)).isDirectory()).toBe(true);
      expect(path.isAbsolute(folder)).toBe(true);
      expect(isInside(folder, h.workspace)).toBe(false);
      expect(isInside(folder, packageRoot)).toBe(false);
      expect(isInside(folder, path.join(memoryDir, "agents"))).toBe(false);
      expect((await definition(ids.scout)).semanticMemoryPath).toBe(folder);
      // What an agent writes there (SM-07 and SM-10 use it).
      await fs.mkdir(path.join(folder, "sites", "linkedin"), { recursive: true });
      await fs.writeFile(path.join(folder, "sites", "linkedin", "controls.md"), `# LinkedIn controls ${unique}\n\nThe post button is at the top right.\n`);
      root.close();
      await h.terminate("agent", root.rootId);
    }, 120_000);

    it("SM-05 (AC-003, AC-004): a run under Project B, the agent as a shared team member and as a delegated copy are told the same folder", async () => {
      const folder = folderOf(ids.scout);
      const inB = await h.startRoot("agent", { manager: ids.scout }, { projectId: project.B.id });
      const promptB = await composedOf(inB.managerRunId);
      expect(promptB.endsWith(`${projectSection(project.B.name, project.B.id)}\n\n${semanticSection(folder)}`)).toBe(true);
      inB.close();
      await h.terminate("agent", inB.rootId);

      const teamId = await h.teamDefinition(`sm team ${unique}`, [["manager", ids.manager], ["mate", ids.scout]], "manager");
      const team = await h.startRoot("team", { team: teamId, manager: ids.manager, mate: ids.scout });
      await wake(team, team.members["/mate"]!);
      await wake(team, team.members["/manager"]!);
      const member = await composedOf(team.members["/mate"]!);
      const coordinator = await composedOf(team.members["/manager"]!);
      // Contract §5.2: a member not under a Project: the last collaboration section, one empty line, then the section.
      expect(member.endsWith(`\n\n${semanticSection(folder)}`)).toBe(true);
      expect(member).toContain("## Working With Other Agents");
      expect(member.indexOf("## Working With Other Agents")).toBeLessThan(member.indexOf("## Semantic Memory"));
      expect(coordinator).not.toContain("Semantic Memory");
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
      expect(copy.endsWith(`\n\n${semanticSection(folder)}`)).toBe(true);
      expect(await composedOf(host.managerRunId)).not.toContain("Semantic Memory");
      await keep("SM-05-prompts.json", { projectB: promptB, teamMember: member, delegatedCopy: copy });
      host.close();
      await h.terminate("agent", host.rootId);
      expect(await fs.readFile(path.join(folder, "sites", "linkedin", "controls.md"), "utf8")).toContain(unique);
    }, 300_000);

    it("SM-06 (AC-006): a team-local agent with the same local name, enabled in its package file, has its own folder", async () => {
      const teamLocal = (await definitions()).find((entry) => entry.ownershipScope === "TEAM_LOCAL" && entry.ownerTeamId?.includes(pkg.teamId)
        && entry.id !== pkg.localName);
      expect(teamLocal, "team-local definition").toBeTruthy();
      const localFolder = folderOf(teamLocal!.id);
      expect(teamLocal).toMatchObject({ semanticMemoryEnabled: true, semanticMemoryPath: localFolder });
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
      expect(member.endsWith(`\n\n${semanticSection(localFolder)}`)).toBe(true);
      expect(member).not.toContain(sharedFolder + "`");
      expect((await fs.stat(localFolder)).isDirectory()).toBe(true);
      team.close();
      await h.terminate("team", team.rootId);
    }, 180_000);

    it("SM-07 (AC-008): off → a new run has no section and the folder and document stay; on → the same folder again", async () => {
      const folder = folderOf(ids.scout);
      const before = await treeHashes(folder);
      expect(Object.keys(before)).toContain(path.join("sites", "linkedin", "controls.md"));
      await update({ id: ids.scout, semanticMemoryEnabled: false });
      const off = await h.startRoot("agent", { manager: ids.scout }, { projectId: project.A.id });
      const offPrompt = await composedOf(off.managerRunId);
      expect(offPrompt).not.toContain("Semantic Memory");
      expect(offPrompt.endsWith(projectSection(project.A.name, project.A.id))).toBe(true);
      expect(await treeHashes(folder)).toEqual(before);
      off.close();
      await h.terminate("agent", off.rootId);

      await update({ id: ids.scout, semanticMemoryEnabled: true });
      const on = await h.startRoot("agent", { manager: ids.scout }, { projectId: project.A.id });
      const onPrompt = await composedOf(on.managerRunId);
      expect(onPrompt.endsWith(`${projectSection(project.A.name, project.A.id)}\n\n${semanticSection(folder)}`)).toBe(true);
      expect(await treeHashes(folder)).toEqual(before);
      await keep("SM-07-off-on.json", { folder, filesBefore: before, offPrompt, onPrompt, filesAfter: await treeHashes(folder) });
      on.close();
      await h.terminate("agent", on.rootId);
    }, 180_000);

    it("SM-10 (AC-001): the Memory page, memory search and memory sync do not list memory/semantic", async () => {
      const semanticRoot = path.join(memoryDir, "semantic");
      const semanticFolders = await fs.readdir(semanticRoot);
      expect(semanticFolders.length).toBeGreaterThanOrEqual(2);
      const agents = (await h.graphql(`query { listAgentsWithMemory(search: "", page: 1, pageSize: 100) {
        entries { attribution agentDefinitionId displayName runCount } total } }`)).listAgentsWithMemory as Rec;
      await keep("SM-10-memory-page-agents.json", agents);
      const runIds: string[] = [];
      for (const entry of agents.entries as Rec[]) {
        expect(`${entry.agentDefinitionId} ${entry.displayName}`.toLowerCase()).not.toContain("semantic");
        if (entry.agentDefinitionId) {
          const runs = (await h.graphql(`query($s: AgentWithMemorySelectorInput!) { listAgentRunsWithMemory(selector: $s, page: 1, pageSize: 100) {
            entries { runId } } }`, { s: { attribution: entry.attribution, agentDefinitionId: entry.agentDefinitionId } })).listAgentRunsWithMemory.entries as Rec[];
          runIds.push(...runs.map((run) => run.runId as string));
        }
      }
      expect(runIds.length).toBeGreaterThan(0);
      for (const runId of runIds) expect(semanticFolders).not.toContain(runId);
      const discovered = await new MemoryRunDiscovery(memoryDir).findRuns();
      expect(discovered.length).toBeGreaterThan(0);
      for (const run of discovered) expect(isInside(path.resolve(run.memoryDir), semanticRoot), run.memoryDir).toBe(false);
      const scanned = await new LocalMemoryExportScanner({ getMemoryDir: () => memoryDir }).scan();
      expect(scanned.files.length).toBeGreaterThan(0);
      const listed = [...scanned.files.map((file) => `${file.kind}/${file.relativePath}`), ...scanned.deferred.map((file) => `${file.kind}/${file.relativePath}`)];
      expect(listed.filter((entry) => entry.includes("semantic") || entry.includes("controls.md"))).toEqual([]);
      await keep("SM-10-listings.json", { semanticFolders, memoryPageAgents: agents, memoryPageRunIds: runIds,
        memorySearchRuns: discovered.map((run) => run.memoryDir), memorySyncFiles: listed });
    }, 120_000);

    it("SM-08 (REQ-007): deleting the agent leaves its semantic memory folder", async () => {
      const folder = folderOf(ids.scout);
      const before = await treeHashes(folder);
      const deleted = (await h.graphql(docs.DeleteAgentDefinition!, { id: ids.scout })).deleteAgentDefinition as Rec;
      expect(deleted, JSON.stringify(deleted)).toMatchObject({ success: true });
      expect(await treeHashes(folder)).toEqual(before);
    }, 60_000);
  });
});
