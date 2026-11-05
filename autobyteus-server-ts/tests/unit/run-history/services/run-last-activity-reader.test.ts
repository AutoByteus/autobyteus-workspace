import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunLastActivityReader } from "../../../../src/run-history/services/run-last-activity-reader.js";
import { StandaloneRootLocationService } from "../../../../src/standalone-agent-run-root/services/standalone-root-location-service.js";
import { AgentMemoryLayout } from "../../../../src/agent-memory/store/agent-memory-layout.js";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { getStandaloneRootTreePath } from "../../../../src/standalone-agent-run-root/persistence/standalone-root-tree-path.js";

const CREATED = "2026-01-01T00:00:00.000Z";
const at = (iso: string) => new Date(iso).getTime() / 1000;

let memoryDir: string;
/** Writes a run folder's raw traces with the given modification time; returns the folder. */
const traces = (folder: string, iso: string): string => {
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
  fs.writeFileSync(file, "{}\n");
  fs.utimesSync(file, at(iso), at(iso));
  return folder;
};
const agentFolder = (runId: string) => path.join(memoryDir, "agents", runId);
const located = (folder: string) => ({ memoryDir: folder });
const reader = (overrides: Partial<ConstructorParameters<typeof RunLastActivityReader>[0]> = {}) => {
  const warn = vi.fn();
  return {
    warn,
    reader: new RunLastActivityReader({
      memoryDir,
      agentLocations: { listAgents: vi.fn(async () => []) },
      teamLocations: { listAgents: vi.fn(async () => []) },
      orgLocations: { listAgents: vi.fn(async () => []) },
      warn,
      ...overrides,
    }),
  };
};

beforeEach(() => { memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "run-last-activity-")); });
afterEach(() => { fs.rmSync(memoryDir, { recursive: true, force: true }); });

describe("RunLastActivityReader (workspace-tree-vs-chooser DS-005, from autobyteus-378)", () => {
  it("answers createdAt for a run with no memory file anywhere", async () => {
    const { reader: r } = reader();
    await expect(r.forAgentRun({ runId: "run-new", createdAt: CREATED })).resolves.toBe(CREATED);
    await expect(r.forTeamRun({ teamRunId: "team-new", createdAt: CREATED })).resolves.toBe(CREATED);
    await expect(r.forOrgRun({ orgRunId: "org-new", createdAt: CREATED })).resolves.toBe(CREATED);
  });

  it("answers an Agent run's own newest memory file", async () => {
    traces(agentFolder("run-a"), "2026-11-04T10:00:00.000Z");
    await expect(reader().reader.forAgentRun({ runId: "run-a", createdAt: CREATED })).resolves.toBe("2026-11-04T10:00:00.000Z");
  });

  it("moves an Agent run whose only new activity is a delegated copy's", async () => {
    traces(agentFolder("host"), "2026-02-01T00:00:00.000Z");
    const copy = traces(path.join(agentFolder("host"), "collaboration", "agents", "copy-1"), "2026-11-05T08:00:00.000Z");
    const listAgents = vi.fn(async () => [located(copy)] as never);
    const { reader: r } = reader({ agentLocations: { listAgents } });
    await expect(r.forAgentRun({ runId: "host", createdAt: CREATED, hasCollaboration: true })).resolves.toBe("2026-11-05T08:00:00.000Z");
    expect(listAgents).toHaveBeenCalledWith({ rootRunId: "host" });
    // Without a collaboration package its copies are not read.
    listAgents.mockClear();
    await expect(r.forAgentRun({ runId: "host", createdAt: CREATED })).resolves.toBe("2026-02-01T00:00:00.000Z");
    expect(listAgents).not.toHaveBeenCalled();
  });

  it("answers a Team run's newest member activity, whatever the member", async () => {
    const lead = traces(path.join(memoryDir, "agent_teams", "team-1", "lead"), "2026-03-01T00:00:00.000Z");
    const member = traces(path.join(memoryDir, "agent_teams", "team-1", "writer"), "2026-11-03T12:00:00.000Z");
    const listAgents = vi.fn(async () => [located(lead), located(member)] as never);
    await expect(reader({ teamLocations: { listAgents } }).reader.forTeamRun({ teamRunId: "team-1", createdAt: CREATED }))
      .resolves.toBe("2026-11-03T12:00:00.000Z");
    expect(listAgents).toHaveBeenCalledWith({ rootTeamRunId: "team-1" });
  });

  it("answers an Org run's newest member activity", async () => {
    const member = traces(path.join(memoryDir, "agent_orgs", "org-1", "director"), "2026-10-30T09:00:00.000Z");
    const listAgents = vi.fn(async () => [located(member)] as never);
    await expect(reader({ orgLocations: { listAgents } }).reader.forOrgRun({ orgRunId: "org-1", createdAt: CREATED }))
      .resolves.toBe("2026-10-30T09:00:00.000Z");
    expect(listAgents).toHaveBeenCalledWith({ rootRunId: "org-1" });
  });

  it.each(["agent", "team", "org"] as const)("contains a %s root whose tree cannot be read: logs it and keeps its own time", async (kind) => {
    const fail = vi.fn(async () => { throw new Error("tree unreadable"); });
    traces(agentFolder("host"), "2026-02-01T00:00:00.000Z");
    const { reader: r, warn } = reader({ agentLocations: { listAgents: fail }, teamLocations: { listAgents: fail }, orgLocations: { listAgents: fail } });
    const result = kind === "agent" ? r.forAgentRun({ runId: "host", createdAt: CREATED, hasCollaboration: true })
      : kind === "team" ? r.forTeamRun({ teamRunId: "host", createdAt: CREATED }) : r.forOrgRun({ orgRunId: "host", createdAt: CREATED });
    await expect(result).resolves.toBe(kind === "agent" ? "2026-02-01T00:00:00.000Z" : CREATED);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("'host': tree unreadable"));
  });

  it("does not fail on a damaged Agent root tree read through the real location service (explicit root throws)", async () => {
    traces(agentFolder("host"), "2026-02-01T00:00:00.000Z");
    const collaborationDir = new AgentMemoryLayout(memoryDir).getAgentRunCollaborationDirPath("host");
    fs.mkdirSync(collaborationDir, { recursive: true });
    fs.writeFileSync(getStandaloneRootTreePath(collaborationDir), "{ not json");
    const agentLocations = new StandaloneRootLocationService({ memoryDir, warn: () => undefined });
    await expect(agentLocations.listAgents({ rootRunId: "host" })).rejects.toThrow();
    const { reader: r, warn } = reader({ agentLocations });
    await expect(r.forAgentRun({ runId: "host", createdAt: CREATED, hasCollaboration: true })).resolves.toBe("2026-02-01T00:00:00.000Z");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("RUN_LAST_ACTIVITY_TREE_UNREADABLE agent 'host'"));
  });

  it("skips a located folder whose memory cannot be read, with a warning, and keeps the others", async () => {
    const good = traces(path.join(memoryDir, "team", "good"), "2026-03-01T00:00:00.000Z");
    // A file where a folder is expected: reading its memory fails inside the builder.
    const broken = path.join(memoryDir, "team", "broken");
    fs.writeFileSync(broken, "not a folder");
    const { reader: r, warn } = reader({ teamLocations: { listAgents: vi.fn(async () => [located(broken), located(good)]) as never } });
    await expect(r.forTeamRun({ teamRunId: "team-1", createdAt: CREATED })).resolves.toBe("2026-03-01T00:00:00.000Z");
    expect(warn.mock.calls.every(([message]) => !String(message).includes("good"))).toBe(true);
  });
});
