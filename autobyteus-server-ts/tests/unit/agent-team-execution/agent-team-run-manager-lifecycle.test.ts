import { describe, expect, it, vi } from "vitest";
import type { RootTeamRun } from "../../../src/agent-team-execution/domain/root-team-run.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { MemberExecutionContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";

const taskExecutionIdentity = createTaskExecutionIdentityCapabilities({
  allocateForAgentDefinition: async () => "task-agent-run",
});
const modelSelectionValidator = Object.freeze({
  validateMany: async () => [],
  validate: async ({ selection }: { selection: { llmModelIdentifier: string; llmConfig: Record<string, unknown> | null } }) => ({
    kind: "valid" as const,
    selection,
  }),
});

const flatTeamExecutionFactory = new FlatTeamExecutionFactory();
const memberExecutionContextBuilder = new MemberExecutionContextBuilder({
  getDefinitionById: async () => null,
} as never);

const createManager = () => new AgentTeamRunManager({
  memoryDir: "/tmp/api-e2e-agent-team-run-manager",
  flatTeamExecutionFactory,
  memberExecutionContextBuilder,
  taskExecutionIdentity,
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
  deliverExactAgentMessage: vi.fn(async () => ({ accepted: true })),
  terminate: vi.fn(input.terminate ?? (async () => ({ accepted: true }))),
}) as unknown as RootTeamRun;

const register = (manager: AgentTeamRunManager, root: RootTeamRun): void => {
  (manager as unknown as { register(root: RootTeamRun): void }).register(root);
};
const unregister = (manager: AgentTeamRunManager, id: string, root: RootTeamRun): boolean =>
  (manager as unknown as { unregister(id: string, root: RootTeamRun): boolean }).unregister(id, root);

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
        taskExecutionIdentity,
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
        taskExecutionIdentity,
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
    const lifecycle: Array<{ teamRunId: string; isActive: boolean }> = [];
    manager.subscribeToLifecycle("team-run-1", (snapshot) => lifecycle.push(snapshot));
    const root = createRoot();

    register(manager, root);
    expect(manager.getActiveTeamRun("team-run-1")).toBe(root);
    await expect(manager.terminateTeamRun("team-run-1")).resolves.toBe(true);
    expect(root.terminate).toHaveBeenCalledTimes(1);
    expect(lifecycle).toEqual([
      { teamRunId: "team-run-1", isActive: true },
      { teamRunId: "team-run-1", isActive: false },
    ]);
  });

  it("keeps the exact root managed and lifecycle-active when termination is rejected", async () => {
    const manager = createManager();
    const root = createRoot({ terminate: async () => ({ accepted: false, code: "ACTIVE_WORK" }) });
    register(manager, root);

    await expect(manager.terminateTeamRun("team-run-1")).resolves.toBe(false);
    expect(manager.getManagedTeamRun("team-run-1")).toBe(root);
    expect(manager.getLifecycleSnapshot("team-run-1")).toEqual({ teamRunId: "team-run-1", isActive: true });
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
    expect(manager.getLifecycleSnapshot("team-run-1")).toEqual({ teamRunId: "team-run-1", isActive: true });
    expect(healthy).not.toHaveBeenCalled();
  });
});
