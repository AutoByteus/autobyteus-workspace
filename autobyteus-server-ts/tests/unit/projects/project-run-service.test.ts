/**
 * Runs started under a Project (projects-left-navigation, SR-009; REQ-004, DS-001, DS-002, DS-005): the Projects-owned
 * `projects/<projectId>/project_runs.json`, its tolerant reader and exact writer, `ProjectRunService`'s view (loaded once),
 * `recordStart` (refuses an unknown Project) and `contextOfRun`. Run records gain no key (rollback, E-041).
 * Run: pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects/project-run-service.test.ts --no-watch
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { ProjectRunStore } from "../../../src/projects/stores/project-run-store.js";
import { ProjectRunService } from "../../../src/projects/services/project-run-service.js";

describe("ProjectRunService and project_runs.json", () => {
  let root: string, layout: ProjectsLayout;
  const projects = new Map([["P", "AutoByteus"], ["Q", "Prototype Launch"]]);
  const lookup = { getProject: async (projectId: string) => (projects.has(projectId) ? { projectId, name: projects.get(projectId)! } : null) };
  const service = () => new ProjectRunService(new ProjectRunStore(layout), lookup, () => new Date("2026-10-31T12:00:00.000Z"));

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-runs-"));
    layout = new ProjectsLayout(root);
    await fs.mkdir(layout.projectDir("P"), { recursive: true });
    await fs.mkdir(layout.projectDir("Q"), { recursive: true });
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });

  it("records a start once in the exact file shape, and answers the run's Project after a reload (DS-001, DS-005)", async () => {
    const runs = service();
    await runs.recordStart("P", { kind: "agent", runId: "pm-1" });
    await runs.recordStart("P", { kind: "agent_team", runId: "set-1" });
    await runs.recordStart("P", { kind: "agent", runId: "pm-1" });
    expect(JSON.parse(await fs.readFile(layout.projectRunsFile("P"), "utf8"))).toEqual({
      projectId: "P",
      runs: [
        { root: { kind: "agent", runId: "pm-1" }, linkedAt: "2026-10-31T12:00:00.000Z" },
        { root: { kind: "agent_team", runId: "set-1" }, linkedAt: "2026-10-31T12:00:00.000Z" },
      ],
    });
    const reloaded = service();
    expect(await reloaded.startedRunsOf("P")).toEqual([{ kind: "agent", runId: "pm-1" }, { kind: "agent_team", runId: "set-1" }]);
    expect(await reloaded.contextOfRun({ kind: "agent_team", runId: "set-1" })).toEqual({ projectId: "P", name: "AutoByteus" });
    expect(await reloaded.contextOfRun({ kind: "agent", runId: "set-1" })).toBeNull();
    expect(await reloaded.startedRunsOf("Q")).toEqual([]);
  });

  it("refuses an unknown Project with PROJECT_NOT_FOUND and writes nothing; a run belongs to one Project", async () => {
    const runs = service();
    await expect(runs.recordStart("missing", { kind: "agent", runId: "x" })).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
    await expect(runs.startedRunsOf("missing")).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
    await runs.recordStart("P", { kind: "agent", runId: "pm-1" });
    await expect(runs.recordStart("Q", { kind: "agent", runId: "pm-1" })).rejects.toThrow("already started under Project 'P'");
    await expect(fs.access(layout.projectRunsFile("Q"))).rejects.toThrow();
  });

  it("a deleted Project's runs tell no Project (the section is omitted)", async () => {
    const runs = service();
    await runs.recordStart("Q", { kind: "agent", runId: "r-1" });
    projects.delete("Q");
    expect(await runs.contextOfRun({ kind: "agent", runId: "r-1" })).toBeNull();
    projects.set("Q", "Prototype Launch");
  });

  it("reads tolerantly: an invalid entry is skipped with a warning; an unreadable file lists nothing for its Project (DESIGN rule 7)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await fs.writeFile(layout.projectRunsFile("P"), JSON.stringify({ projectId: "P", runs: [
      { root: { kind: "agent", runId: "ok" }, linkedAt: "2026-10-31T00:00:00.000Z" },
      { root: { kind: "agent_org", runId: "bad-kind" }, linkedAt: "2026-10-31T00:00:00.000Z" },
      { root: { kind: "agent" }, linkedAt: "2026-10-31T00:00:00.000Z" },
    ] }));
    await fs.writeFile(layout.projectRunsFile("Q"), "{ not json");
    const runs = service();
    expect(await runs.startedRunsOf("P")).toEqual([{ kind: "agent", runId: "ok" }]);
    expect(await runs.startedRunsOf("Q")).toEqual([]);
    expect(warn).toHaveBeenCalledWith("PROJECT_RUN_ENTRY_IGNORED", expect.objectContaining({ projectId: "P" }));
    expect(warn).toHaveBeenCalledWith("PROJECT_RUNS_UNAVAILABLE", expect.objectContaining({ projectId: "Q" }));
    expect(await fs.readFile(layout.projectRunsFile("Q"), "utf8")).toBe("{ not json");
  });
});
