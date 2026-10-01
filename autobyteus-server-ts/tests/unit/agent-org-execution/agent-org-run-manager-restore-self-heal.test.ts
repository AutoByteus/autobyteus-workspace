import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentOrgRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgExecutionScopeBuilder } from "../../../src/agent-org-execution/services/agent-org-execution-scope-builder.js";
import { AgentOrgRunManager } from "../../../src/agent-org-execution/services/agent-org-run-manager.js";
import { testAgentOrgExecutionTree, testOrgAgentNode } from "../../fixtures/current-agent-org-run-fixtures.js";

vi.mock("../../../src/run-history/services/agent-org-run-package-catalog.js", () => ({
  AgentOrgRunPackageCatalog: class {
    admit = async () => undefined;
    awaitReady = async () => undefined;
    isAdmitted = () => true;
  },
}));
vi.mock("../../../src/agent-org-execution/services/agent-org-state-package-loader.js", () => ({
  AgentOrgStatePackageLoader: class {
    async load(input: { orgRunId: string }) {
      return { loaded: true, state: {
        executionTree: { rootOrg: { orgRunId: input.orgRunId } },
        index: { listAgents: () => [] },
      } };
    }
  },
}));

const roots: string[] = [];
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });

type Result = { accepted: boolean; code?: string; message?: string };

/** An Org whose member died: registered, but no longer active (stuck terminating) until terminate succeeds. */
const stuckCapableRun = (orgRunId: string, onTerminated?: () => void, terminateResults: Result[] = []) => {
  let active = true;
  const run = {
    orgRunId,
    rootIdentity: createAgentOrgRootExecutionIdentity(orgRunId),
    isActive: () => active,
    stick: () => { active = false; },
    hasAgentExecution: vi.fn(() => false), deliverExactAgentMessage: vi.fn(),
    terminate: vi.fn(async () => {
      active = false;
      const result = terminateResults.shift() ?? { accepted: true };
      if (result.accepted) onTerminated?.();
      return result;
    }),
  };
  return run;
};

const setup = (orgRunId: string, firstTerminateResults: Result[] = []) => {
  const memoryDir = mkdtempSync(join(tmpdir(), "agent-org-self-heal-"));
  roots.push(memoryDir);
  const built: ReturnType<typeof stuckCapableRun>[] = [];
  const build = vi.fn(async (input: { onTerminated?: () => void }) => {
    const run = stuckCapableRun(orgRunId, input.onTerminated, built.length === 0 ? firstTerminateResults : []);
    built.push(run);
    return run as unknown as AgentOrgRun;
  });
  const directory = new ActiveCollaborationRootDirectory();
  const manager = new AgentOrgRunManager({
    memoryDir,
    scopeBuilder: { build } as unknown as AgentOrgExecutionScopeBuilder,
    activeRootDirectory: directory,
    tokenUsageRunStore: { assertAgentOrgRecordsReady: vi.fn(async () => undefined) },
  });
  const tree = testAgentOrgExecutionTree({ orgRunId, members: [testOrgAgentNode("/teacher", `${orgRunId}-teacher`)] });
  return { manager, build, built, directory, tree };
};

describe("AgentOrgRunManager restore self-heal", () => {
  it("finishes a registered-but-stopping Org's termination and restores it instead of 'already active'", async () => {
    const f = setup("org-stuck");
    await f.manager.create(f.tree);
    f.built[0]!.stick();
    expect(f.manager.getActive("org-stuck")).toBeNull();

    const restored = await f.manager.restore("org-stuck");

    expect(f.built[0]!.terminate).toHaveBeenCalledOnce();
    expect(f.build).toHaveBeenLastCalledWith(expect.objectContaining({ activationMode: "restore" }));
    expect(restored).toBe(f.built[1]);
    expect(f.manager.getActive("org-stuck")).toBe(restored);
    expect(f.directory.resolve(createAgentOrgRootExecutionIdentity("org-stuck"))).toBe(restored);
  });

  it("unregisters the stopped Org itself when its termination did not", async () => {
    const f = setup("org-quiet");
    const created = await f.manager.create(f.tree);
    f.built[0]!.stick();
    f.built[0]!.terminate.mockImplementationOnce(async () => ({ accepted: true }));

    const restored = await f.manager.restore("org-quiet");

    expect(restored).not.toBe(created);
    expect(f.manager.getActive("org-quiet")).toBe(restored);
  });

  it("reports AGENT_ORG_STOP_INCOMPLETE and keeps the Org registered when termination still fails", async () => {
    const f = setup("org-incomplete", [{ accepted: false, code: "AGENT_ORG_TERMINATION_FAILED", message: "member busy" }]);
    await f.manager.create(f.tree);
    f.built[0]!.stick();

    await expect(f.manager.restore("org-incomplete")).rejects.toThrow("AGENT_ORG_STOP_INCOMPLETE: member busy");
    expect(f.build).toHaveBeenCalledOnce();

    expect(f.manager.getActive("org-incomplete")).toBeNull();

    const restored = await f.manager.restore("org-incomplete");
    expect(restored).toBe(f.built[1]);
    expect(f.built[0]!.terminate).toHaveBeenCalledTimes(2);
  });

  it("wraps a rejected termination as AGENT_ORG_STOP_INCOMPLETE", async () => {
    const f = setup("org-rejecting");
    await f.manager.create(f.tree);
    f.built[0]!.stick();
    f.built[0]!.terminate.mockRejectedValueOnce(new Error("not the current published run"));

    await expect(f.manager.restore("org-rejecting")).rejects.toThrow("AGENT_ORG_STOP_INCOMPLETE: not the current published run");
  });

  it("keeps rejecting restore of a still-active Org without terminating it", async () => {
    const f = setup("org-active");
    await f.manager.create(f.tree);

    await expect(f.manager.restore("org-active")).rejects.toThrow("already active");
    expect(f.built[0]!.terminate).not.toHaveBeenCalled();
  });
});
