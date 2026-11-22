import { NOT_DELEGATED } from "../../helpers/run-collaboration.js";
import { teamMembershipTestCollaborators } from "../../helpers/team-membership-test-collaborators.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import { describe, expect, it, vi } from "vitest";
import type { RootTeamRun } from "../../../src/agent-team-execution/domain/root-team-run.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { MemberExecutionContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { NO_FILES_RECEIVED, NO_PEER_CHANNEL, OFFERED_MODEL_EXECUTION_FACTORY } from "../../helpers/explicit-host-collaborators.js";

const modelSelectionValidator = Object.freeze({
  validateMany: async () => [],
  validate: async ({ selection }: { selection: { llmModelIdentifier: string; llmConfig: Record<string, unknown> | null } }) => ({
    kind: "valid" as const,
    selection,
  }),
});

const flatTeamExecutionFactory = new FlatTeamExecutionFactory({ executionFactory: OFFERED_MODEL_EXECUTION_FACTORY });
const memberExecutionContextBuilder = new MemberExecutionContextBuilder({
  getDefinitionById: async () => null,
} as never, NOT_DELEGATED);

const createManager = () => new AgentTeamRunManager({ ...teamMembershipTestCollaborators(), remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_FILES_RECEIVED, delegationIndex: noDelegations(), taskRecords: openTaskRecords(),
  memoryDir: "/tmp/api-e2e-agent-team-run-manager",
  flatTeamExecutionFactory,
  memberExecutionContextBuilder,
  modelSelectionValidator,
  activeRootDirectory: new ActiveCollaborationRootDirectory(),
});

const createRoot = (input: {
  teamRunId?: string;
  active?: () => boolean;
  terminate?: () => Promise<{ accepted: boolean; code?: string; message?: string }>;
} = {}) => ({
  teamRunId: input.teamRunId ?? "team-run-1",
  isActive: input.active ?? (() => true),
  hasAgentExecution: vi.fn(() => false), remoteNodeOf: () => null, ownsAgentRun: vi.fn(() => false), getExecutionTreeSnapshot: () => ({ rootTeam: {} }),
  deliverExactAgentMessage: vi.fn(async () => ({ accepted: true })),
  terminate: vi.fn(input.terminate ?? (async () => ({ accepted: true }))),
}) as unknown as RootTeamRun;

const register = (manager: AgentTeamRunManager, root: RootTeamRun): void => {
  (manager as unknown as { register(root: RootTeamRun): void }).register(root);
};
const unregister = (manager: AgentTeamRunManager, id: string, root: RootTeamRun): boolean =>
  (manager as unknown as { unregister(id: string, root: RootTeamRun, ending: string): boolean }).unregister(id, root, "stopped");

describe("AgentTeamRunManager root lifecycle", () => {
  it("requires the rootless flat-Team factory and keeps process lookup non-constructing", () => {
    expect(() => AgentTeamRunManager.getInstance()).toThrow(
      "The process AgentTeamRunManager is not initialized.",
    );
    for (const value of ["omitted", null, undefined] as const) {
      const options: Record<string, unknown> = {
        memoryDir: "/tmp/api-e2e-agent-team-run-manager",
        flatTeamExecutionFactory,
        memberExecutionContextBuilder,
        modelSelectionValidator,
      };
      if (value === "omitted") delete options.flatTeamExecutionFactory;
      else options.flatTeamExecutionFactory = value;
      expect(
        () => Reflect.construct(AgentTeamRunManager, [options]),
        String(value),
      ).toThrow("flatTeamExecutionFactory is required.");
    }
    for (const value of ["omitted", null, undefined] as const) {
      const options: Record<string, unknown> = {
        memoryDir: "/tmp/api-e2e-agent-team-run-manager",
        flatTeamExecutionFactory,
        memberExecutionContextBuilder,
        modelSelectionValidator,
      };
      if (value === "omitted") delete options.modelSelectionValidator;
      else options.modelSelectionValidator = value;
      expect(
        () => Reflect.construct(AgentTeamRunManager, [options]),
        String(value),
      ).toThrow("modelSelectionValidator is required.");
    }
  });

  it("publishes active after root registration and inactive only after accepted termination", async () => {
    const manager = createManager();
    const lifecycle: Array<{ teamRunId: string; isActive: boolean; ending: string | null }> = [];
    manager.subscribeToLifecycle("team-run-1", (snapshot) => lifecycle.push(snapshot));
    const root = createRoot();

    register(manager, root);
    expect(manager.getActiveTeamRun("team-run-1")).toBe(root);
    await expect(manager.terminateTeamRun("team-run-1")).resolves.toBe(true);
    expect(root.terminate).toHaveBeenCalledTimes(1);
    expect(lifecycle).toEqual([
      { teamRunId: "team-run-1", isActive: true, ending: null },
      { teamRunId: "team-run-1", isActive: false, ending: "stopped" },
    ]);
  });

  it("keeps the exact root managed and lifecycle-active when termination is rejected", async () => {
    const manager = createManager();
    const root = createRoot({ terminate: async () => ({ accepted: false, code: "ACTIVE_WORK" }) });
    register(manager, root);

    await expect(manager.terminateTeamRun("team-run-1")).resolves.toBe(false);
    expect(manager.getManagedTeamRun("team-run-1")).toBe(root);
    expect(manager.getLifecycleSnapshot("team-run-1")).toEqual({ teamRunId: "team-run-1", isActive: true, ending: null });
  });

  it("CR-461-001: a closure stop asks whether the Task entry is still closed right before the root's terminate; open again keeps it", async () => {
    const manager = createManager();
    const root = createRoot();
    register(manager, root);
    await expect(manager.terminateTeamRunForTaskClosure("team-run-1", () => false)).resolves.toBe("kept_open");
    expect(root.terminate).not.toHaveBeenCalled();
    expect(manager.getManagedTeamRun("team-run-1")).toBe(root);
    await expect(manager.terminateTeamRunForTaskClosure("team-run-1", () => true)).resolves.toBe("stopped");
    expect(root.terminate).toHaveBeenCalledTimes(1);
    await expect(manager.terminateTeamRunForTaskClosure("team-run-1", () => true)).resolves.toBe("stopped");
  });

  it("rejects duplicate root registration and makes exact unregister idempotent", () => {
    const manager = createManager();
    const root = createRoot();
    register(manager, root);

    expect(() => register(manager, createRoot())).toThrow("Cannot register RootTeamRun 'team-run-1'.");
    expect(unregister(manager, "team-run-1", createRoot())).toBe(false);
    expect(unregister(manager, "team-run-1", root)).toBe(true);
    expect(unregister(manager, "team-run-1", root)).toBe(false);
  });

  it("never unregisters from an inactive read and isolates lifecycle listener failures", () => {
    const manager = createManager();
    const healthy = vi.fn();
    let active = true;
    const root = createRoot({ active: () => active });
    manager.subscribeToLifecycle("team-run-1", () => { throw new Error("listener failure"); });
    manager.subscribeToLifecycle("team-run-1", healthy);

    expect(() => register(manager, root)).not.toThrow();
    healthy.mockClear();
    active = false;
    expect(manager.getActiveTeamRun("team-run-1")).toBeNull();
    expect(manager.getManagedTeamRun("team-run-1")).toBe(root);
    expect(manager.getLifecycleSnapshot("team-run-1")).toEqual({ teamRunId: "team-run-1", isActive: true, ending: null });
    expect(healthy).not.toHaveBeenCalled();
  });
});
