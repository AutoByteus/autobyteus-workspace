import { testViewStreams } from "../../helpers/view-streams.js";
import { teamMembershipTestCollaborators } from "../../helpers/team-membership-test-collaborators.js";
import { NOT_DELEGATED } from "../../helpers/run-collaboration.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import { describe, expect, it, vi } from "vitest";
import type { RootTeamRun } from "../../../src/agent-team-execution/domain/root-team-run.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { MemberExecutionContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { NO_PEER_CHANNEL, NO_REMOTE_FILES, OFFERED_MODEL_EXECUTION_FACTORY } from "../../helpers/explicit-host-collaborators.js";

const materialized = vi.hoisted(() => [] as unknown[]);
vi.mock("../../../src/run-history/services/team-run-package-catalog.js", () => ({
  TeamRunPackageCatalog: class {
    admit = async () => undefined;
    awaitReady = async () => undefined;
    isAdmitted = () => true;
  },
}));
vi.mock("../../../src/run-history/services/team-run-state-package-loader.js", () => ({
  TeamRunStatePackageLoader: class {
    async load() {
      return { loaded: true, state: { executionTree: {}, communicationMessages: {} } };
    }
  },
}));
vi.mock("../../../src/agent-team-execution/services/team-run-execution-tree-builder.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  buildTeamRunConfigFromExecutionTree: () => ({}),
}));
vi.mock("../../../src/agent-team-execution/services/team-root-materializer.js", () => ({
  materializeTeamRoot: vi.fn(async () => {
    const root = {
      teamRunId: "team-stuck", isActive: () => true, hasAgentExecution: vi.fn(() => false), ownsAgentRun: vi.fn(() => false), getExecutionTreeSnapshot: () => ({ rootTeam: {} }), deliverExactAgentMessage: vi.fn(),
      terminate: vi.fn(async () => ({ accepted: true })),
    };
    materialized.push(root);
    return root;
  }),
}));

const createManager = () => new AgentTeamRunManager({ ...teamMembershipTestCollaborators(), remoteChannel: NO_PEER_CHANNEL, remoteFiles: NO_REMOTE_FILES, delegationIndex: noDelegations(), viewStreams: testViewStreams(), taskRecords: openTaskRecords(),
  memoryDir: "/tmp/agent-team-run-manager-self-heal",
  flatTeamExecutionFactory: new FlatTeamExecutionFactory({ executionFactory: OFFERED_MODEL_EXECUTION_FACTORY }),
  memberExecutionContextBuilder: new MemberExecutionContextBuilder({ getDefinitionById: async () => null } as never, NOT_DELEGATED),
  modelSelectionValidator: { validateMany: async () => [], validate: async () => ({ kind: "valid" as const }) } as never,
  activeRootDirectory: new ActiveCollaborationRootDirectory(),
});

const register = (manager: AgentTeamRunManager, root: RootTeamRun): void => {
  (manager as unknown as { register(root: RootTeamRun): void }).register(root);
};

const stuckRoot = (terminate: () => Promise<{ accepted: boolean; code?: string; message?: string }>) => {
  let active = true;
  const root = {
    teamRunId: "team-stuck",
    isActive: () => active,
    hasAgentExecution: vi.fn(() => false), ownsAgentRun: vi.fn(() => false), getExecutionTreeSnapshot: () => ({ rootTeam: {} }), deliverExactAgentMessage: vi.fn(),
    terminate: vi.fn(terminate),
  };
  return { root: root as unknown as RootTeamRun, raw: root, stick: () => { active = false; } };
};

describe("AgentTeamRunManager restore self-heal", () => {
  it("completes a managed-but-stopping root's termination and restores it instead of 'already managed'", async () => {
    materialized.length = 0;
    const manager = createManager();
    const lifecycle: boolean[] = [];
    manager.subscribeToLifecycle("team-stuck", (snapshot) => lifecycle.push(snapshot.isActive));
    const stuck = stuckRoot(async () => ({ accepted: true }));
    register(manager, stuck.root);
    stuck.stick();

    const restored = await manager.restoreTeamRun("team-stuck");

    expect(stuck.raw.terminate).toHaveBeenCalledOnce();
    expect(restored).toBe(materialized[0]);
    expect(manager.getActiveTeamRun("team-stuck")).toBe(restored);
    expect(lifecycle).toEqual([true, false, true]);
  });

  it("reports TEAM_RUN_STOP_INCOMPLETE and keeps the root managed when termination still fails", async () => {
    materialized.length = 0;
    const manager = createManager();
    const stuck = stuckRoot(async () => ({ accepted: false, code: "ACTIVE_WORK", message: "member busy" }));
    register(manager, stuck.root);
    stuck.stick();

    await expect(manager.restoreTeamRun("team-stuck")).rejects.toThrow("TEAM_RUN_STOP_INCOMPLETE: member busy");
    expect(manager.getManagedTeamRun("team-stuck")).toBe(stuck.root);
    expect(materialized).toHaveLength(0);
  });

  it("keeps rejecting restore of a still-active root without terminating it", async () => {
    materialized.length = 0;
    const manager = createManager();
    const active = stuckRoot(async () => ({ accepted: true }));
    register(manager, active.root);

    await expect(manager.restoreTeamRun("team-stuck")).rejects.toThrow("already managed");
    expect(active.raw.terminate).not.toHaveBeenCalled();
    expect(materialized).toHaveLength(0);
  });
});
