import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createTopLevelRunRule } from "../../../../src/run-history/services/top-level-run-rule.js";
import { workingDelegatedRunsRefusal } from "../../../../src/run-history/services/delegated-work-guard.js";
import type { DelegatedChild } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";

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
    const topLevel = createTopLevelRunRule(() => memoryDir, () => ({
      parentOf: (run) => ("agentRunId" in run ? parents[run.agentRunId] ?? null : null) as never }));
    expect(topLevel({ agentRunId: "writer" })).toBe(false);
    expect(topLevel({ agentRunId: "orphan" })).toBe(true);
    expect(topLevel({ agentRunId: "user-started" })).toBe(true);
    expect(createTopLevelRunRule(() => memoryDir, () => null)({ agentRunId: "writer" })).toBe(true);
  });
});

describe("archive and delete while a delegated run works (REQ-007)", () => {
  const child = (run: DelegatedChild["run"], recipientAddress: string, nodeId?: string) =>
    ({ run, recipientAddress, ...(nodeId ? { nodeId } : {}) }) as DelegatedChild;
  it("is refused, naming the working runs; an idle child or a peer's run does not block", () => {
    const children = [child({ agentRunId: "writer" }, "/writer"), child({ teamRunId: "eng" }, "/eng"), child({ agentRunId: "far" }, "/far", "node-b")];
    const statuses: Record<string, string | null> = { writer: "running", eng: "idle", far: "running" };
    const refusal = workingDelegatedRunsRefusal(MANAGER, "deleted", () => ({ openChildrenOf: () => children }),
      (run) => statuses["agentRunId" in run ? run.agentRunId : run.teamRunId] ?? null);
    expect(refusal).toBe("This run can't be deleted while a run it delegated to is working (/writer). Try again when it has finished, or stop it first.");
    statuses.writer = "idle";
    expect(workingDelegatedRunsRefusal(MANAGER, "archived", () => ({ openChildrenOf: () => children }),
      (run) => statuses["agentRunId" in run ? run.agentRunId : run.teamRunId] ?? null)).toBeNull();
  });
});
