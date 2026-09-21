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

const roots: string[] = [];
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });

const memoryDir = (): string => {
  const value = mkdtempSync(join(tmpdir(), "agent-org-run-manager-"));
  roots.push(value);
  return value;
};

const fakeRun = (orgRunId: string, onTerminated?: () => void): AgentOrgRun => {
  let active = true;
  const run = {
    orgRunId,
    rootIdentity: createAgentOrgRootExecutionIdentity(orgRunId),
    isActive: () => active,
    terminate: vi.fn(async () => {
      if (!active) return { accepted: false, code: "ALREADY_TERMINATED", message: "already stopped" };
      active = false;
      onTerminated?.();
      return { accepted: true, code: "TERMINATED", message: "stopped" };
    }),
    deliverExactAgentMessage: vi.fn(),
  };
  return run as unknown as AgentOrgRun;
};

const fixture = (orgRunId = "org-run-1") => testAgentOrgExecutionTree({
  orgRunId,
  members: [testOrgAgentNode("/requirements", `${orgRunId}-requirements`)],
});

describe("AgentOrgRunManager lifecycle", () => {
  it("publishes one complete Org root under the compound identity and unregisters it on termination", async () => {
    const directory = new ActiveCollaborationRootDirectory();
    const build = vi.fn(async (input: { onTerminated?: () => void }) => fakeRun("org-run-1", input.onTerminated));
    const manager = new AgentOrgRunManager({
      memoryDir: memoryDir(),
      scopeBuilder: { build } as unknown as AgentOrgExecutionScopeBuilder,
      activeRootDirectory: directory,
    });

    const run = await manager.create(fixture());

    expect(build).toHaveBeenCalledWith(expect.objectContaining({
      activationMode: "fresh",
      persistInitialPackage: true,
    }));
    expect(manager.getActive("org-run-1")).toBe(run);
    expect(directory.resolve(createAgentOrgRootExecutionIdentity("org-run-1"))).toBe(run);
    await expect(manager.terminate("org-run-1")).resolves.toBe(true);
    expect(manager.getActive("org-run-1")).toBeNull();
    expect(directory.resolve(createAgentOrgRootExecutionIdentity("org-run-1"))).toBeNull();
  });

  it("rejects duplicate publication before building another candidate", async () => {
    const directory = new ActiveCollaborationRootDirectory();
    const candidates: AgentOrgRun[] = [];
    const build = vi.fn(async (input: { onTerminated?: () => void }) => {
      const run = fakeRun("org-run-duplicate", input.onTerminated);
      candidates.push(run);
      return run;
    });
    const manager = new AgentOrgRunManager({
      memoryDir: memoryDir(),
      scopeBuilder: { build } as unknown as AgentOrgExecutionScopeBuilder,
      activeRootDirectory: directory,
    });

    await manager.create(fixture("org-run-duplicate"));
    await expect(manager.create(fixture("org-run-duplicate"))).rejects.toThrow("already active");

    expect(build).toHaveBeenCalledTimes(1);
    expect(manager.listActiveOrgRunIds()).toEqual(["org-run-duplicate"]);
    expect((candidates[0]!.terminate as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it("admits only unmanaged roots and does not invoke inactive-history work for a managed root", async () => {
    const manager = new AgentOrgRunManager({
      memoryDir: memoryDir(),
      scopeBuilder: { build: vi.fn(async (input: { onTerminated?: () => void }) =>
        fakeRun("org-managed", input.onTerminated)) } as unknown as AgentOrgExecutionScopeBuilder,
      activeRootDirectory: new ActiveCollaborationRootDirectory(),
    });
    await manager.create(fixture("org-managed"));
    const blocked = vi.fn(async () => "should-not-run");

    await expect(manager.withInactiveHistoryMutation("org-managed", blocked)).resolves.toEqual({ kind: "managed" });
    expect(blocked).not.toHaveBeenCalled();

    const admitted = vi.fn(async () => "archived");
    await expect(manager.withInactiveHistoryMutation("org-inactive", admitted)).resolves.toEqual({
      kind: "completed", value: "archived",
    });
    expect(admitted).toHaveBeenCalledOnce();
  });

  it("serializes inactive-history work with same-root lifecycle transitions", async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const events: string[] = [];
    const manager = new AgentOrgRunManager({
      memoryDir: memoryDir(),
      scopeBuilder: { build: vi.fn() } as unknown as AgentOrgExecutionScopeBuilder,
      activeRootDirectory: new ActiveCollaborationRootDirectory(),
    });

    const first = manager.withInactiveHistoryMutation("org-serialized", async () => {
      events.push("first-start");
      await firstGate;
      events.push("first-end");
      return 1;
    });
    await vi.waitFor(() => expect(events).toEqual(["first-start"]));
    const second = manager.withInactiveHistoryMutation("org-serialized", async () => {
      events.push("second-start");
      return 2;
    });
    await Promise.resolve();
    expect(events).toEqual(["first-start"]);

    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual([
      { kind: "completed", value: 1 },
      { kind: "completed", value: 2 },
    ]);
    expect(events).toEqual(["first-start", "first-end", "second-start"]);
  });

  it("rejects stale inactive-history work after a queued same-root create becomes managed", async () => {
    let releaseBuild!: () => void;
    const buildGate = new Promise<void>((resolve) => { releaseBuild = resolve; });
    const buildStarted = vi.fn();
    const manager = new AgentOrgRunManager({
      memoryDir: memoryDir(),
      scopeBuilder: {
        build: vi.fn(async (input: { onTerminated?: () => void }) => {
          buildStarted();
          await buildGate;
          return fakeRun("org-racing", input.onTerminated);
        }),
      } as unknown as AgentOrgExecutionScopeBuilder,
      activeRootDirectory: new ActiveCollaborationRootDirectory(),
    });

    const create = manager.create(fixture("org-racing"));
    await vi.waitFor(() => expect(buildStarted).toHaveBeenCalledOnce());
    const mutationBody = vi.fn(async () => "must-not-run");
    const mutation = manager.withInactiveHistoryMutation("org-racing", mutationBody);

    releaseBuild();
    await expect(create).resolves.toBeTruthy();
    await expect(mutation).resolves.toEqual({ kind: "managed" });
    expect(mutationBody).not.toHaveBeenCalled();
  });

  it("closes new root admission without disturbing the active Org", async () => {
    const build = vi.fn(async (input: { onTerminated?: () => void }) => fakeRun("org-active", input.onTerminated));
    const manager = new AgentOrgRunManager({
      memoryDir: memoryDir(),
      scopeBuilder: { build } as unknown as AgentOrgExecutionScopeBuilder,
      activeRootDirectory: new ActiveCollaborationRootDirectory(),
    });
    await manager.create(fixture("org-active"));

    manager.closeRootAdmission();

    expect(() => manager.create(fixture("org-late"))).toThrow("admission is closed");
    expect(manager.getActive("org-active")).not.toBeNull();
    expect(build).toHaveBeenCalledTimes(1);
  });
});
