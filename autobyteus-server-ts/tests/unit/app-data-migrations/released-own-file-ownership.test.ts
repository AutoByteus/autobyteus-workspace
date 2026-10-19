import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ReleasedTaskAgentOwnFiles,
  readReleasedOwnFileOwnership,
} from "../../../src/app-data-migrations/legacy/released-run-package-shapes/released-task-agent-own-files-with-origin.js";
import { AtomicRunPackageFileCommitWriter } from "../../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import {
  agentFile, launch, put, releasedAgentOwnFile, releasedTeamOwnTree, teamFile,
} from "../../fixtures/app-data-migrations/released-delegated-copy-own-file-fixtures.js";

/**
 * D-9 (SR-008, DI-002): the narrow ownership reader 20261017's retry uses. It reads an own file's coordinating run
 * and a team's member run IDs in the released shape (with `origin`) and in the shape 20261019 writes; a damaged
 * file is never owned. Synthesized fixtures only.
 */

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const memoryRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "released-own-file-ownership-"));
  roots.push(root);
  return path.join(root, "memory");
};

const hub = { kind: "agent" as const, runId: "hub" };
const org = { kind: "agent_org" as const, runId: "org-o" };
const CONFIGURED = { origin: "configured", fallbacks: [] };

const releasedAgent = (memory: string) => releasedAgentOwnFile(memory, "copy", {
  coordinating: hub, address: "/writer", origin: "configured_place", agentDefinitionId: "writer", launch: null, delegator: "hub" });
/** The same copy as 20261019 completes it: no `origin`, its launch and the configured launch source. */
const currentAgent = (memory: string) => {
  const { origin: _origin, ...taskAgent } = releasedAgent(memory).taskAgent as Record<string, unknown>;
  return { ...releasedAgent(memory), ...launch, taskAgent: { ...taskAgent, launchSource: CONFIGURED } };
};
const releasedTeam = () => releasedTeamOwnTree("team-copy", {
  coordinating: org, address: "/group", origin: "catalog", teamDefinitionId: "group", delegator: "director", members: [{ name: "lead" }, { name: "mate" }] });
const currentTeam = () => {
  const released = releasedTeam() as any;
  const { origin: _origin, ...taskAgent } = released.taskAgent;
  return { ...released, taskAgent, rootTeam: { ...released.rootTeam,
    members: released.rootTeam.members.map((member: any) => ({ ...member, launchConfiguration: launch, followsTeam: true })) } };
};

describe("readReleasedOwnFileOwnership (D-9)", () => {
  it("reads an agent's coordinating run from the released and the current shape", async () => {
    const memory = await memoryRoot();
    for (const file of [releasedAgent(memory), currentAgent(memory)]) {
      expect(readReleasedOwnFileOwnership(file, "agent")).toEqual({ coordinatingRun: hub, memberAgentRunIds: null });
    }
  });

  it("reads a team's coordinating run and member run IDs from the released and the current shape", () => {
    for (const file of [releasedTeam(), currentTeam()]) {
      expect(readReleasedOwnFileOwnership(file, "team")).toEqual({ coordinatingRun: org, memberAgentRunIds: ["team-copy-lead", "team-copy-mate"] });
    }
  });

  it("names the coordinating run as written, so another run's file is told apart", async () => {
    const memory = await memoryRoot();
    const other = { ...currentAgent(memory), taskAgent: { ...currentAgent(memory).taskAgent, coordinatingRun: { kind: "agent_team", runId: "team-r" } } };
    expect(readReleasedOwnFileOwnership(other, "agent").coordinatingRun).toEqual({ kind: "agent_team", runId: "team-r" });
  });

  it.each([
    ["no coordinating run", (file: any) => ({ ...file, taskAgent: { address: "/writer" } })],
    ["an unsupported coordinating kind", (file: any) => ({ ...file, taskAgent: { ...file.taskAgent, coordinatingRun: { kind: "agent_group", runId: "hub" } } })],
    ["an empty run ID", (file: any) => ({ ...file, taskAgent: { ...file.taskAgent, coordinatingRun: { kind: "agent", runId: "" } } })],
    ["a section that is not an object", (file: any) => ({ ...file, taskAgent: "hub" })],
  ])("rejects a file with %s (a damaged file is never owned, R-9 a)", async (_case, damage) => {
    const memory = await memoryRoot();
    expect(() => readReleasedOwnFileOwnership(damage(currentAgent(memory)), "agent")).toThrow();
  });

  it("rejects a team file whose members carry no run IDs", () => {
    const team = currentTeam();
    expect(() => readReleasedOwnFileOwnership({ ...team, rootTeam: { ...team.rootTeam, members: [{ address: "/group/lead" }] } }, "team")).toThrow();
    expect(() => readReleasedOwnFileOwnership({ ...team, rootTeam: { ...team.rootTeam, members: null } }, "team")).toThrow();
  });
});

describe("ReleasedTaskAgentOwnFiles.readOwnership (D-9)", () => {
  const files = (memory: string) => new ReleasedTaskAgentOwnFiles(memory, new AtomicRunPackageFileCommitWriter(), async () => null);

  it("is present for an own file in either shape, missing without a file or a taskAgent section", async () => {
    const memory = await memoryRoot();
    await put(agentFile(memory, "copy"), currentAgent(memory));
    await put(teamFile(memory, "team-copy"), releasedTeam());
    await put(agentFile(memory, "user-run"), { runId: "user-run", agentDefinitionId: "assistant" });
    expect(await files(memory).readOwnership("agent", "copy")).toEqual({ kind: "present", value: { coordinatingRun: hub, memberAgentRunIds: null } });
    expect(await files(memory).readOwnership("team", "team-copy")).toMatchObject({ kind: "present", value: { coordinatingRun: org } });
    expect(await files(memory).readOwnership("agent", "user-run")).toEqual({ kind: "missing" });
    expect(await files(memory).readOwnership("agent", "absent")).toEqual({ kind: "missing" });
  });

  it("is unreadable for broken JSON or a section without its coordinating run (R-9 a)", async () => {
    const memory = await memoryRoot();
    await put(agentFile(memory, "broken"), "{ not json");
    await put(agentFile(memory, "no-run"), { ...currentAgent(memory), taskAgent: { address: "/writer" } });
    expect((await files(memory).readOwnership("agent", "broken")).kind).toBe("unreadable");
    expect((await files(memory).readOwnership("agent", "no-run")).kind).toBe("unreadable");
  });
});
