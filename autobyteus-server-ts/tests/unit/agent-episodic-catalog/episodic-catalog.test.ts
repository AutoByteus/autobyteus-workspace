import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { RootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { DiscoveredRun } from "../../../src/agent-memory/domain/discovered-run.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import type { WorkJournalChange, WorkJournalChangeListener, WorkJournalFileSpan } from "../../../src/agent-work-journal/domain/work-journal-models.js";
import { EpisodicCatalog } from "../../../src/agent-episodic-catalog/services/episodic-catalog.js";
import { EpisodicCatalogStore } from "../../../src/agent-episodic-catalog/store/episodic-catalog-store.js";

const keyOf = (root: RootExecutionIdentity) => `${root.rootSubjectKind}:${root.rootRunId}`;

/**
 * A node's runs and journals in memory: what discovery and the journal service report. Each call is counted, so the
 * tests see what each pass reads.
 */
class FakeNode {
  runs: DiscoveredRun[] = [];
  spans = new Map<string, WorkJournalFileSpan[]>();
  /** Run folders whose journal manifest cannot be read, with the reason. */
  unreadable = new Map<string, string>();
  listeners = new Set<WorkJournalChangeListener>();
  calls = { findRuns: 0, findRunsOfRoot: [] as string[], readJournalSpans: [] as string[] };

  constructor(private readonly memoryDir: string) {}

  run(rel: string, root: RootExecutionIdentity, fields: Partial<DiscoveredRun> = {}): DiscoveredRun {
    const memoryDir = path.join(this.memoryDir, rel);
    const run: DiscoveredRun = {
      runKey: rel, runId: path.basename(rel), memoryDir, agentName: "agent", teamName: null, memberName: null, orgName: null,
      workspace: "/w", runtimeKind: null, subject: { kind: "RUN_FOLDER", runKey: rel }, root, attribution: { kind: "attributed", agentDefinitionId: "agent-def" },
      recordedStartAt: null, ...fields,
    };
    this.runs.push(run);
    return run;
  }

  journal(run: DiscoveredRun, from: string, to: string): void {
    this.spans.set(run.memoryDir, [{ journalFile: "work_journal_active.md", path: path.join(run.memoryDir, "work_journal", "work_journal_active.md"), sizeBytes: 100, from, to }]);
  }

  changed(run: DiscoveredRun): void {
    const change: WorkJournalChange = { runId: run.runId, memoryDir: run.memoryDir, package: {} as never };
    for (const listener of this.listeners) listener(change);
  }

  readonly discovery = {
    findRuns: async () => { this.calls.findRuns += 1; return [...this.runs]; },
    findRunsOfRoot: async (root: RootExecutionIdentity) => {
      this.calls.findRunsOfRoot.push(keyOf(root));
      return this.runs.filter((run) => keyOf(run.root) === keyOf(root));
    },
    rootOf: (memoryDir: string) => this.runs.find((run) => run.memoryDir === memoryDir)?.root ?? null,
  };

  readonly journals = {
    readJournalSpans: async (memoryDir: string) => {
      this.calls.readJournalSpans.push(path.relative(this.memoryDir, memoryDir));
      const reason = this.unreadable.get(memoryDir);
      if (reason) return { kind: "unreadable", reason } as const;
      const spans = this.spans.get(memoryDir);
      return spans ? { kind: "spans", spans } as const : { kind: "none" } as const;
    },
    onJournalChanged: (listener: WorkJournalChangeListener) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; },
  };
}

describe("EpisodicCatalog", () => {
  let memoryDir: string;
  let node: FakeNode;
  const catalogs: EpisodicCatalog[] = [];
  const episodic = (...parts: string[]) => path.join(memoryDir, "episodic", ...parts);
  const read = (...parts: string[]) => fs.readFileSync(episodic(...parts), "utf-8");
  const headings = (...parts: string[]) => read(...parts).split("\n").filter((line) => line.startsWith("## "));
  const mtimes = () => Object.fromEntries(fs.readdirSync(episodic(), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile()).map((entry) => { const file = path.join(entry.parentPath, entry.name); return [file, fs.statSync(file).mtimeMs]; }));

  const teamRoot = { rootSubjectKind: "agent_team", rootRunId: "team_1" } as const;
  const agentRoot = { rootSubjectKind: "agent", rootRunId: "helper_1" } as const;
  const orgRoot = { rootSubjectKind: "agent_org", rootRunId: "org_1" } as const;
  const tasks = { currentTaskOf: vi.fn((run: { agentRunId: string } | { teamRunId: string }) =>
    ("teamRunId" in run && run.teamRunId === "team_1") ? { taskId: "task_1" } as never : null) };
  const taskTitles = { taskTitleOf: vi.fn(async (taskId: string) => (taskId === "task_1" ? "Ship the catalog" : null)) };

  const create = (options: { quietMs?: number; maxWaitMs?: number } = {}) => {
    const catalog = new EpisodicCatalog({ layout: new AgentMemoryLayout(memoryDir), discovery: node.discovery, journals: node.journals, tasks,
      quietMs: options.quietMs ?? 20, maxWaitMs: options.maxWaitMs ?? 200 });
    catalogs.push(catalog);
    return catalog;
  };
  /** Every pass ends with the overview's write (written or not); this waits until `count` passes have ended. */
  let indexWrites: MockInstance<EpisodicCatalogStore["writeIndex"]>;
  const passesEnded = async (count: number) => {
    await vi.waitFor(() => expect(indexWrites.mock.calls.length).toBeGreaterThanOrEqual(count));
    await Promise.allSettled(indexWrites.mock.results.map((result) => result.value));
  };
  const startedPass = async (catalog: EpisodicCatalog) => {
    const ended = indexWrites.mock.calls.length + 1;
    catalog.start({ taskTitles });
    await passesEnded(ended);
  };

  beforeEach(() => {
    memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "episodic-catalog-"));
    node = new FakeNode(memoryDir);
    tasks.currentTaskOf.mockClear();
    taskTitles.taskTitleOf.mockClear();
    indexWrites = vi.spyOn(EpisodicCatalogStore.prototype, "writeIndex");
  });
  afterEach(async () => {
    for (const catalog of catalogs.splice(0)) await catalog.stop();
    fs.rmSync(memoryDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("builds every attributed run's catalog at start from one full discovery, with titles once per Task (AC-001, AC-002, AC-007)", async () => {
    const lead = node.run("agent_teams/team_1/designer_1", teamRoot, { agentName: "designer", attribution: { kind: "attributed", agentDefinitionId: "designer-def" }, recordedStartAt: "2026-11-01T09:00:00Z" });
    node.journal(lead, "2026-11-01 09:01", "2026-11-02 10:00");
    node.run("agent_teams/team_1/designer_2", teamRoot, { agentName: "designer", attribution: { kind: "attributed", agentDefinitionId: "designer-def" }, recordedStartAt: "2026-11-03T09:00:00Z" });
    const delegated = node.run("agents/helper_1", agentRoot, { agentName: "Designer", attribution: { kind: "attributed", agentDefinitionId: "designer-def" } });
    node.journal(delegated, "2026-10-01 08:00", "2026-10-01 08:30");
    node.run("agent_orgs/org_1/reviewer_1", orgRoot, { agentName: "reviewer", attribution: { kind: "attributed", agentDefinitionId: "reviewer-def" }, recordedStartAt: "2026-09-01T00:00:00Z" });
    node.run("agents/old_1", { rootSubjectKind: "agent", rootRunId: "old_1" }, { attribution: { kind: "unattributed" } });
    fs.mkdirSync(episodic("gone-def"), { recursive: true });

    await startedPass(create());

    expect(node.calls.findRuns).toBe(1);
    expect(node.calls.findRunsOfRoot).toEqual([]);
    // Each attributed run's journal headers are read once; an unattributed run is not read.
    expect([...node.calls.readJournalSpans].sort()).toEqual(["agent_orgs/org_1/reviewer_1", "agent_teams/team_1/designer_1", "agent_teams/team_1/designer_2", "agents/helper_1"]);
    expect(taskTitles.taskTitleOf).toHaveBeenCalledTimes(1);
    expect(fs.readdirSync(episodic()).sort()).toEqual(["designer-def", "gone-def", "index.md", "reviewer-def"]);
    expect(headings("designer-def", "catalog.md")).toEqual([
      "## 2026-10-01 08:00 → 2026-10-01 08:30 UTC · helper_1",
      "## 2026-11-01 09:01 → 2026-11-02 10:00 UTC · designer_1",
      "## 2026-11-03 09:00 UTC · designer_2",
    ]);
    expect(read("designer-def", "catalog.md")).toContain("# Episodic catalog: designer\n");
    expect(read("designer-def", "catalog.md").match(/- About: Ship the catalog/g)).toHaveLength(2);
    expect(read("reviewer-def", "catalog.md")).not.toContain("- About:");
    expect(read("gone-def", "catalog.md")).toBe("# Episodic catalog: gone-def\n\n0 runs.\nMaintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.\n");
    expect(read("index.md").split("\n").filter((line) => line.startsWith("- "))).toEqual([
      "- designer · `designer-def/catalog.md` · 3 runs · last activity 2026-11-02 10:00 UTC",
      "- gone-def · `gone-def/catalog.md` · 0 runs · no activity",
      "- reviewer · `reviewer-def/catalog.md` · 1 run · no activity",
    ]);
  });

  it("writes nothing at a start with no changes; after changes made while stopped, rewrites only what changed (AC-007)", async () => {
    const kept = node.run("agents/kept_1", { rootSubjectKind: "agent", rootRunId: "kept_1" }, { attribution: { kind: "attributed", agentDefinitionId: "kept-def" } });
    node.journal(kept, "2026-11-01 09:00", "2026-11-01 10:00");
    const changing = node.run("agent_teams/team_1/a_1", teamRoot, { attribution: { kind: "attributed", agentDefinitionId: "changing-def" } });
    node.journal(changing, "2026-11-01 09:00", "2026-11-01 10:00");
    node.run("agent_teams/team_1/a_2", teamRoot, { attribution: { kind: "attributed", agentDefinitionId: "changing-def" } });
    node.run("agents/lonely_1", { rootSubjectKind: "agent", rootRunId: "lonely_1" }, { attribution: { kind: "attributed", agentDefinitionId: "lonely-def" }, recordedStartAt: "2026-11-01T00:00:00Z" });
    const first = create();
    await startedPass(first);
    await first.stop();
    const before = mtimes();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const unchanged = create();
    await startedPass(unchanged);
    await unchanged.stop();
    expect(mtimes()).toEqual(before);

    node.journal(changing, "2026-11-01 09:00", "2026-11-05 12:00");
    node.runs = node.runs.filter((run) => run.runKey !== "agent_teams/team_1/a_2" && run.runKey !== "agents/lonely_1");
    const restarted = create();
    await startedPass(restarted);
    await restarted.stop();
    const after = mtimes();
    const rewritten = Object.keys(after).filter((file) => after[file] !== before[file]).map((file) => path.relative(episodic(), file)).sort();
    expect(rewritten).toEqual(["changing-def/catalog.md", "index.md", "lonely-def/catalog.md"]);
    expect(headings("changing-def", "catalog.md")).toEqual(["## 2026-11-01 09:00 → 2026-11-05 12:00 UTC · a_1"]);
    expect(read("lonely-def", "catalog.md")).toContain("\n0 runs.\n");
  });

  it("follows journal changes: a burst of one root's changes is one refresh of that root, within the quiet time (AC-004)", async () => {
    const member = node.run("agent_teams/team_1/a_1", teamRoot);
    const catalog = create({ quietMs: 40, maxWaitMs: 1_000 });
    await startedPass(catalog);
    node.journal(member, "2026-11-01 09:00", "2026-11-01 09:30");
    const added = node.run("agent_teams/team_1/a_2", teamRoot);
    node.journal(added, "2026-11-01 09:10", "2026-11-01 09:20");
    for (let turn = 0; turn < 5; turn += 1) { node.changed(member); node.changed(added); }
    await vi.waitFor(() => expect(headings("agent-def", "catalog.md")).toEqual([
      "## 2026-11-01 09:00 → 2026-11-01 09:30 UTC · a_1", "## 2026-11-01 09:10 → 2026-11-01 09:20 UTC · a_2",
    ]));
    expect(node.calls.findRunsOfRoot).toEqual(["agent_team:team_1"]);
    expect(node.calls.findRuns).toBe(1);
  });

  it("starts a pass at most the longest wait after the oldest request, while requests keep coming", async () => {
    const member = node.run("agent_teams/team_1/a_1", teamRoot);
    const catalog = create({ quietMs: 80, maxWaitMs: 150 });
    await startedPass(catalog);
    const startedAt = Date.now();
    const ticking = setInterval(() => node.changed(member), 20);
    try {
      await vi.waitFor(() => expect(node.calls.findRunsOfRoot.length).toBeGreaterThan(0), { timeout: 2_000 });
    } finally {
      clearInterval(ticking);
    }
    expect(Date.now() - startedAt).toBeLessThan(600);
  });

  it("drops a deleted root's runs; other runs and catalogs stay as they are (AC-005)", async () => {
    node.run("agent_teams/team_1/a_1", teamRoot);
    const other = node.run("agents/helper_1", agentRoot);
    node.journal(other, "2026-11-01 09:00", "2026-11-01 10:00");
    node.run("agent_orgs/org_1/r_1", orgRoot, { attribution: { kind: "attributed", agentDefinitionId: "reviewer-def" } });
    const catalog = create();
    await startedPass(catalog);
    const reviewerBefore = fs.statSync(episodic("reviewer-def", "catalog.md")).mtimeMs;

    catalog.runDeleted(teamRoot);
    await vi.waitFor(() => expect(headings("agent-def", "catalog.md")).toEqual(["## 2026-11-01 09:00 → 2026-11-01 10:00 UTC · helper_1"]));
    expect(node.calls.findRunsOfRoot).toEqual([]);
    expect(fs.statSync(episodic("reviewer-def", "catalog.md")).mtimeMs).toBe(reviewerBefore);

    catalog.runDeleted(agentRoot);
    await vi.waitFor(() => expect(read("agent-def", "catalog.md")).toContain("\n0 runs.\n"));
  });

  it("applies a delete that came before start after the start pass", async () => {
    node.run("agent_teams/team_1/a_1", teamRoot);
    const catalog = create();
    catalog.runDeleted(teamRoot);
    catalog.start({ taskTitles });
    await passesEnded(2);
    expect(read("agent-def", "catalog.md")).toContain("\n0 runs.\n");
  });

  it("leaves out a run whose journal manifest cannot be read, warning once per run and reason; the others are catalogued (AC-009, API-15)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const broken = node.run("agent_teams/team_1/broken_1", teamRoot);
    node.run("agent_teams/team_1/fine_1", teamRoot);
    node.unreadable.set(broken.memoryDir, "work_journal_manifest.json is not JSON: Unexpected token");
    const catalog = create();
    await startedPass(catalog);
    expect(headings("agent-def", "catalog.md")).toEqual(["## start unknown · fine_1"]);
    const leftOut = ["EPISODIC_CATALOG_RUN_LEFT_OUT",
      { root: "agent_team:team_1", run: "agent_teams/team_1/broken_1", reason: "work_journal_manifest.json is not JSON: Unexpected token" }];
    expect(warn.mock.calls).toEqual([leftOut]);
    // A refresh of the root does not repeat it; a new reason does.
    node.changed(broken);
    await passesEnded(2);
    expect(warn.mock.calls).toEqual([leftOut]);
    node.unreadable.set(broken.memoryDir, "EACCES: permission denied");
    node.changed(broken);
    await passesEnded(3);
    expect(warn.mock.calls.at(-1)).toEqual(["EPISODIC_CATALOG_RUN_LEFT_OUT",
      { root: "agent_team:team_1", run: "agent_teams/team_1/broken_1", reason: "EACCES: permission denied" }]);
    expect(headings("agent-def", "catalog.md")).toEqual(["## start unknown · fine_1"]);
  });

  it("gives entries only to attributed runs; an unreadable run (discovery warns) and an unattributed one are not read", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    node.run("agent_teams/team_1/fine_1", teamRoot);
    node.run("agent_teams/team_2/m_1", { rootSubjectKind: "agent_team", rootRunId: "team_2" },
      { attribution: { kind: "unreadable", record: "team_run_execution_tree.json", reason: "tree unreadable" } });
    node.run("agents/old_1", { rootSubjectKind: "agent", rootRunId: "old_1" }, { attribution: { kind: "unattributed" } });
    await startedPass(create());
    expect(node.calls.readJournalSpans).toEqual(["agent_teams/team_1/fine_1"]);
    expect(headings("agent-def", "catalog.md")).toEqual(["## start unknown · fine_1"]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("logs a folder it cannot write and keeps following changes (AC-009)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const member = node.run("agent_teams/team_1/a_1", teamRoot);
    fs.writeFileSync(path.join(memoryDir, "episodic"), "not a folder");
    const catalog = create();
    catalog.start({ taskTitles });
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith("EPISODIC_CATALOG_WRITE_FAILED", expect.objectContaining({ file: "index" })));
    fs.rmSync(path.join(memoryDir, "episodic"));
    node.changed(member);
    await vi.waitFor(() => expect(fs.existsSync(episodic("agent-def", "catalog.md"))).toBe(true));
  });

  it("starts once; after stop it follows no change", async () => {
    const member = node.run("agent_teams/team_1/a_1", teamRoot);
    const catalog = create();
    await startedPass(catalog);
    expect(() => catalog.start({ taskTitles })).toThrow("EpisodicCatalog is already started.");
    await catalog.stop();
    expect(node.listeners.size).toBe(0);
    catalog.runDeleted(teamRoot);
    node.changed(member);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(node.calls.findRunsOfRoot).toEqual([]);
    expect(headings("agent-def", "catalog.md")).toEqual(["## start unknown · a_1"]);
  });

  describe("read API for the Memory page (autobyteus-554)", () => {
    it("settles whenStartPassDone after the start pass, and then reads each definition's entries from memory", async () => {
      const lead = node.run("agent_teams/team_1/designer_1", teamRoot, { agentName: "designer", attribution: { kind: "attributed", agentDefinitionId: "designer-def" } });
      node.journal(lead, "2026-11-01 09:01", "2026-11-02 10:00");
      node.run("agents/helper_1", agentRoot, { attribution: { kind: "attributed", agentDefinitionId: "helper-def" } });
      fs.mkdirSync(episodic("gone-def"), { recursive: true });
      const catalog = create();
      let settled = false;
      void catalog.whenStartPassDone().then(() => { settled = true; });
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(settled).toBe(false);

      catalog.start({ taskTitles });
      await catalog.whenStartPassDone();
      expect([...catalog.agentDefinitionIds()].sort()).toEqual(["designer-def", "gone-def", "helper-def"]);
      expect(catalog.runsOf("designer-def").map((entry) => [entry.runId, entry.root, entry.lastActivityAt, entry.taskTitle])).toEqual([
        ["designer_1", teamRoot, "2026-11-02 10:00", "Ship the catalog"],
      ]);
      expect(catalog.runsOf("gone-def")).toEqual([]);
      expect(catalog.runsOf("unknown-def")).toEqual([]);
      expect(node.calls.findRuns).toBe(1);
    });

    it("settles whenStartPassDone when the start pass fails or the catalog stops first", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      node.discovery.findRuns = async () => { throw new Error("discovery failed"); };
      const failed = create();
      failed.start({ taskTitles });
      await expect(failed.whenStartPassDone()).resolves.toBeUndefined();
      expect(failed.agentDefinitionIds()).toEqual([]);

      const neverStarted = create();
      await neverStarted.stop();
      await expect(neverStarted.whenStartPassDone()).resolves.toBeUndefined();
    });
  });
});

describe("the process episodic catalog binding (autobyteus-554)", () => {
  it("throws EPISODIC_CATALOG_NOT_COMPOSED until a composition root sets it, and clears only its own catalog on release", async () => {
    const { getProcessEpisodicCatalog, releaseProcessEpisodicCatalog, setProcessEpisodicCatalog } =
      await import("../../../src/agent-episodic-catalog/services/episodic-catalog.js");
    const memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "episodic-binding-"));
    try {
      const make = () => new EpisodicCatalog({ layout: new AgentMemoryLayout(memoryDir), discovery: {} as never, journals: {} as never, tasks: {} as never });
      expect(() => getProcessEpisodicCatalog()).toThrow("EPISODIC_CATALOG_NOT_COMPOSED");
      const first = make();
      const second = make();
      setProcessEpisodicCatalog(first);
      expect(getProcessEpisodicCatalog()).toBe(first);
      releaseProcessEpisodicCatalog(second);
      expect(getProcessEpisodicCatalog()).toBe(first);
      releaseProcessEpisodicCatalog(first);
      expect(() => getProcessEpisodicCatalog()).toThrow("EPISODIC_CATALOG_NOT_COMPOSED");
    } finally {
      fs.rmSync(memoryDir, { recursive: true, force: true });
    }
  });
});
