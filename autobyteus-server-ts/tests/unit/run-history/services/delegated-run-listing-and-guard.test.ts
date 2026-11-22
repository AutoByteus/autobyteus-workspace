import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTopLevelRunRule } from "../../../../src/run-history/services/top-level-run-rule.js";
import { DelegatedWorkGuard } from "../../../../src/run-history/services/delegated-work-guard.js";
import type { DelegatedChild } from "../../../../src/agent-collaboration/delegation/delegation-index.js";

/** autobyteus-461 DS-11 (where a run shows in the run list) and REQ-007 / AR-007 (archive and delete while a child works). */
const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
const MANAGER = { rootSubjectKind: "agent" as const, rootRunId: "manager" };

describe("the run list's top-level rule (DS-11)", () => {
  it("a run delegated from a stored run is not a top-level row; a run no Task names, or whose delegating run was deleted, is", () => {
    const memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), "top-level-run-")); roots.push(memoryDir);
    fs.mkdirSync(path.join(memoryDir, "agents", "manager"), { recursive: true });
    const parents: Record<string, { delegatingRun: typeof MANAGER } | null> = {
      writer: { delegatingRun: MANAGER },
      orphan: { delegatingRun: { rootSubjectKind: "agent", rootRunId: "deleted-manager" } },
    };
    const topLevel = createTopLevelRunRule(() => memoryDir, {
      parentOf: (run) => ("agentRunId" in run ? parents[run.agentRunId] ?? null : null) as never });
    expect(topLevel({ agentRunId: "writer" })).toBe(false);
    expect(topLevel({ agentRunId: "orphan" })).toBe(true);
    expect(topLevel({ agentRunId: "user-started" })).toBe(true);
  });
});

describe("archive and delete while a delegated run works (REQ-007; DS-13, SR-067)", () => {
  const child = (run: DelegatedChild["run"], recipientAddress: string, nodeId?: string) =>
    ({ run, recipientAddress, ...(nodeId ? { nodeId } : {}) }) as DelegatedChild;
  const setup = (peerAnswer: "running" | "idle" | "offline" | "unreachable") => {
    const children = [child({ agentRunId: "writer" }, "/writer"), child({ teamRunId: "eng" }, "/eng"), child({ agentRunId: "far" }, "/far", "node-b")];
    const statuses: Record<string, string | null> = { writer: "running", eng: "idle" };
    const runDeleted = vi.fn();
    const peerStatus = vi.fn(async () => peerAnswer === "unreachable"
      ? { nodeId: "node-b", runId: "far", reachable: false, title: null, statuses: [], launches: [] }
      : { nodeId: "node-b", runId: "far", reachable: true, title: null, statuses: [{ agentRunId: "far", status: peerAnswer }], launches: [] });
    const sweep = vi.fn(async () => undefined);
    const guard = new DelegatedWorkGuard({ tree: { openChildrenOf: () => children, runDeleted },
      statusOf: (run) => statuses["agentRunId" in run ? run.agentRunId : run.teamRunId] ?? null,
      peerRunOf: (id) => id === "far" ? { status: peerStatus } as never : null, receivedFiles: { sweep } });
    const perform = vi.fn(async () => ({ success: true, message: "Deleted." }));
    return { guard, statuses, runDeleted, perform, peerStatus, sweep };
  };

  it("is refused, naming the working runs (running, initializing or idle: not stopped, SR-072 F-30), local and peer; nothing is performed and the tree is not told", async () => {
    const f = setup("idle");
    await expect(f.guard.guard(MANAGER, "deleted", f.perform)).resolves.toEqual({ success: false,
      message: "This run can't be deleted while a run it delegated to is working (/writer, /eng, /far). Try again when it has finished, or stop it first." });
    expect(f.perform).not.toHaveBeenCalled();
    expect(f.runDeleted).not.toHaveBeenCalled();
    expect(f.sweep).not.toHaveBeenCalled();
  });

  it("a stopped child does not block; a delete tells the tree before the files go; an archive keeps the tree", async () => {
    const f = setup("offline");
    f.statuses.writer = null; f.statuses.eng = "offline";
    f.perform.mockImplementation(async () => { expect(f.runDeleted).toHaveBeenCalledWith(MANAGER); return { success: true, message: "Deleted." }; });
    await expect(f.guard.guard(MANAGER, "deleted", f.perform)).resolves.toEqual({ success: true, message: "Deleted." });
    // autobyteus-587 RF-10: after the committed delete, the node's received files are swept; an archive sweeps nothing.
    expect(f.sweep).toHaveBeenCalledOnce();
    f.runDeleted.mockClear();
    await f.guard.guard(MANAGER, "archived", async () => ({ success: true, message: "Archived." }));
    expect(f.runDeleted).not.toHaveBeenCalled();
    expect(f.sweep).toHaveBeenCalledOnce();
  });

  it("a peer run whose node does not answer does not block; the result names it as not asked", async () => {
    const f = setup("unreachable");
    f.statuses.writer = null; f.statuses.eng = null;
    await expect(f.guard.guard(MANAGER, "deleted", f.perform)).resolves.toEqual({ success: true,
      message: "Deleted. Not asked, because their nodes didn't answer: /far." });
    expect(f.peerStatus).toHaveBeenCalledOnce();
  });
});
