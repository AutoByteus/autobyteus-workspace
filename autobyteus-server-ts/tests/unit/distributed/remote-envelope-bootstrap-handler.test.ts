import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { TeamEnvelope } from "../../../src/distributed/envelope/envelope-builder.js";
import { createDispatchRunBootstrapHandler } from "../../../src/distributed/bootstrap/remote-envelope-bootstrap-handler.js";
import { WorkerRunLifecycleCoordinator } from "../../../src/distributed/bootstrap/worker-run-lifecycle-coordinator.js";

const buildRunBootstrapEnvelope = (): TeamEnvelope => ({
  envelopeId: "env-1",
  teamRunId: "run-1",
  runVersion: "v1",
  kind: "RUN_BOOTSTRAP",
  payload: {
    teamId: "team-host-1",
    teamDefinitionId: "team-def-host",
    hostNodeId: "host-1",
    memberBindings: [
      {
        memberName: "student",
        agentDefinitionId: "agent-def-1",
        llmModelIdentifier: "model-1",
        autoExecuteTools: false,
      },
    ],
  },
});

const buildRunBootstrapEnvelopeWithPlacements = (): TeamEnvelope => ({
  envelopeId: "env-2",
  teamRunId: "run-2",
  runVersion: "v2",
  kind: "RUN_BOOTSTRAP",
  payload: {
    teamId: "team-host-1",
    teamDefinitionId: "team-def-host",
    hostNodeId: "host-1",
    memberBindings: [
      {
        memberName: "professor",
        memberRouteKey: "professor",
        memberAgentId: "professor_member",
        hostNodeId: "host-1",
        agentDefinitionId: "agent-def-professor",
        llmModelIdentifier: "model-1",
        autoExecuteTools: false,
      },
      {
        memberName: "student",
        memberRouteKey: "student",
        memberAgentId: "student_member",
        hostNodeId: "worker-1",
        agentDefinitionId: "agent-def-student",
        llmModelIdentifier: "model-1",
        autoExecuteTools: false,
      },
    ],
  },
});

const createLifecycleCoordinator = (): WorkerRunLifecycleCoordinator =>
  new WorkerRunLifecycleCoordinator({
    sourceNodeId: "worker-1",
    projectRemoteExecutionEventsFromTeamEvent: () => [],
    publishRemoteExecutionEventToHost: async () => undefined,
  });

describe("remote envelope bootstrap handler", () => {
  it("marks existing bound run as worker-managed when runtime team still exists", async () => {
    const workerRunLifecycleCoordinator = createLifecycleCoordinator();
    const markSpy = vi.spyOn(workerRunLifecycleCoordinator, "markWorkerManagedRun");
    const teardownSpy = vi.spyOn(workerRunLifecycleCoordinator, "teardownRun");
    const bindRun = vi.fn();
    const unbindRun = vi.fn();
    const finalizeRun = vi.fn();

    const dispatchRunBootstrap = createDispatchRunBootstrapHandler({
      hostNodeId: "worker-1",
      teamRunManager: {
        getTeamRun: vi.fn(() => ({ teamId: "runtime-existing" })),
        getTeamIdByDefinitionId: vi.fn(() => "runtime-existing"),
        createTeamRun: vi.fn(async () => "runtime-new"),
        terminateTeamRun: vi.fn(async () => undefined),
        getTeamMemberConfigsByDefinitionId: vi.fn(() => []),
        getTeamEventStream: vi.fn(() => null),
      } as any,
      runScopedTeamBindingRegistry: {
        tryResolveRun: vi.fn(() => ({
          teamRunId: "run-1",
          runtimeTeamId: "runtime-existing",
        })),
        bindRun,
        unbindRun,
      } as any,
      teamEventAggregator: {
        finalizeRun,
      } as any,
      hostNodeBridgeClient: {
        sendCommand: vi.fn(async () => undefined),
      } as any,
      workerRunLifecycleCoordinator,
      resolveWorkerTeamDefinitionId: vi.fn(async () => "team-def-worker"),
      ensureHostNodeDirectoryEntryForWorkerRun: vi.fn(),
    });

    await dispatchRunBootstrap(buildRunBootstrapEnvelope());

    expect(markSpy).toHaveBeenCalledWith("run-1", "host-1");
    expect(teardownSpy).not.toHaveBeenCalled();
    expect(bindRun).not.toHaveBeenCalled();
    expect(unbindRun).not.toHaveBeenCalled();
    expect(finalizeRun).not.toHaveBeenCalled();
  });

  it("rebuilds stale bound run when bound runtime team exists but is stopped", async () => {
    const workerRunLifecycleCoordinator = createLifecycleCoordinator();
    const markSpy = vi.spyOn(workerRunLifecycleCoordinator, "markWorkerManagedRun");
    const teardownSpy = vi.spyOn(workerRunLifecycleCoordinator, "teardownRun");
    const bindRun = vi.fn();
    const unbindRun = vi.fn();
    const finalizeRun = vi.fn();
    const terminateTeamRun = vi.fn(async () => true);
    const createWorkerProjectionTeamRunWithId = vi.fn(async () => "runtime-existing");
    const teamManager = { setTeamRoutingPort: vi.fn() };
    let getTeamRunCallCount = 0;
    const getTeamRun = vi.fn(() => {
      getTeamRunCallCount += 1;
      if (getTeamRunCallCount === 1) {
        return { isRunning: false, runtime: { context: { teamManager } } };
      }
      return { isRunning: true, runtime: { context: { teamManager } } };
    });

    const dispatchRunBootstrap = createDispatchRunBootstrapHandler({
      hostNodeId: "worker-1",
      teamRunManager: {
        getTeamRun,
        createWorkerProjectionTeamRunWithId,
        terminateTeamRun,
        getTeamMemberConfigs: vi.fn(() => []),
        getTeamEventStream: vi.fn(() => ({
          allEvents: async function* () {},
          close: async () => undefined,
        })),
      } as any,
      runScopedTeamBindingRegistry: {
        tryResolveRun: vi.fn(() => ({
          teamRunId: "run-1",
          runtimeTeamId: "runtime-existing",
        })),
        bindRun,
        unbindRun,
      } as any,
      teamEventAggregator: {
        finalizeRun,
      } as any,
      hostNodeBridgeClient: {
        sendCommand: vi.fn(async () => undefined),
      } as any,
      workerRunLifecycleCoordinator,
      resolveWorkerTeamDefinitionId: vi.fn(async () => "team-def-worker"),
      ensureHostNodeDirectoryEntryForWorkerRun: vi.fn(),
    });

    await dispatchRunBootstrap(buildRunBootstrapEnvelope());

    expect(markSpy).toHaveBeenCalledWith("run-1", "host-1");
    expect(teardownSpy).toHaveBeenCalledWith("run-1");
    expect(unbindRun).toHaveBeenCalledWith("run-1");
    expect(finalizeRun).toHaveBeenCalledWith("run-1");
    expect(terminateTeamRun).toHaveBeenCalledWith("runtime-existing");
    expect(createWorkerProjectionTeamRunWithId).toHaveBeenCalledWith(
      "team-host-1",
      "team-def-worker",
      expect.any(Array),
    );
    expect(bindRun).toHaveBeenCalledTimes(1);
    expect(teamManager.setTeamRoutingPort).toHaveBeenCalledTimes(1);
  });

  it("binds run and installs worker uplink routing port for new runtime team", async () => {
    const workerRunLifecycleCoordinator = createLifecycleCoordinator();
    const replaceForwarderSpy = vi
      .spyOn(workerRunLifecycleCoordinator, "replaceEventForwarder")
      .mockResolvedValue(undefined);
    const teamManager = { setTeamRoutingPort: vi.fn() };
    const bindRun = vi.fn();
    const getTeamEventStream = vi.fn(() => ({ allEvents: async function* () {}, close: async () => undefined }));
    const createWorkerProjectionTeamRunWithId = vi.fn(async () => {
      created = true;
      return "runtime-1";
    });
    let created = false;

    const dispatchRunBootstrap = createDispatchRunBootstrapHandler({
      hostNodeId: "worker-1",
      teamRunManager: {
        getTeamRun: vi.fn(() =>
          created ? ({ runtime: { context: { teamManager } } } as any) : null,
        ),
        getTeamIdByDefinitionId: vi.fn(() => null),
        createWorkerProjectionTeamRunWithId,
        terminateTeamRun: vi.fn(async () => undefined),
        getTeamMemberConfigs: vi.fn(() => []),
        getTeamMemberConfigsByDefinitionId: vi.fn(() => []),
        getTeamEventStream,
      } as any,
      runScopedTeamBindingRegistry: {
        tryResolveRun: vi.fn(() => null),
        bindRun,
        unbindRun: vi.fn(),
      } as any,
      teamEventAggregator: {
        finalizeRun: vi.fn(),
      } as any,
      hostNodeBridgeClient: {
        sendCommand: vi.fn(async () => undefined),
      } as any,
      workerRunLifecycleCoordinator,
      resolveWorkerTeamDefinitionId: vi.fn(async () => "team-def-worker"),
      ensureHostNodeDirectoryEntryForWorkerRun: vi.fn(),
    });

    await dispatchRunBootstrap(buildRunBootstrapEnvelope());

    expect(bindRun).toHaveBeenCalledTimes(1);
    expect(bindRun).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "run-1",
        teamId: "team-host-1",
        teamDefinitionId: "team-def-host",
        runtimeTeamId: "team-host-1",
      }),
    );
    expect(teamManager.setTeamRoutingPort).toHaveBeenCalledTimes(1);
    expect(replaceForwarderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "run-1",
        runtimeTeamId: "team-host-1",
      }),
    );
    expect(getTeamEventStream).toHaveBeenCalledWith("team-host-1");
    expect(createWorkerProjectionTeamRunWithId).toHaveBeenCalledWith(
      "team-host-1",
      "team-def-worker",
      expect.any(Array),
    );
  });

  it("recreates stopped runtime team on rerun bootstrap before binding run", async () => {
    const workerRunLifecycleCoordinator = createLifecycleCoordinator();
    const replaceForwarderSpy = vi
      .spyOn(workerRunLifecycleCoordinator, "replaceEventForwarder")
      .mockResolvedValue(undefined);
    const teamManager = { setTeamRoutingPort: vi.fn() };
    const bindRun = vi.fn();
    const terminateTeamRun = vi.fn(async () => true);
    let teamState: "stopped" | "running" = "stopped";
    const createWorkerProjectionTeamRunWithId = vi.fn(async () => {
      teamState = "running";
      return "team-host-1";
    });
    const getTeamRun = vi.fn(() =>
      teamState === "stopped"
        ? ({ isRunning: false, runtime: { context: { teamManager } } } as any)
        : ({ isRunning: true, runtime: { context: { teamManager } } } as any),
    );

    const dispatchRunBootstrap = createDispatchRunBootstrapHandler({
      hostNodeId: "worker-1",
      teamRunManager: {
        getTeamRun,
        createWorkerProjectionTeamRunWithId,
        terminateTeamRun,
        getTeamMemberConfigs: vi.fn(() => [
          {
            memberName: "student",
            agentDefinitionId: "agent-def-1",
            llmModelIdentifier: "model-1",
            autoExecuteTools: false,
          },
        ]),
        getTeamEventStream: vi.fn(() => ({
          allEvents: async function* () {},
          close: async () => undefined,
        })),
      } as any,
      runScopedTeamBindingRegistry: {
        tryResolveRun: vi.fn(() => null),
        bindRun,
        unbindRun: vi.fn(),
      } as any,
      teamEventAggregator: {
        finalizeRun: vi.fn(),
      } as any,
      hostNodeBridgeClient: {
        sendCommand: vi.fn(async () => undefined),
      } as any,
      workerRunLifecycleCoordinator,
      resolveWorkerTeamDefinitionId: vi.fn(async () => "team-def-worker"),
      ensureHostNodeDirectoryEntryForWorkerRun: vi.fn(),
    });

    await dispatchRunBootstrap(buildRunBootstrapEnvelope());

    expect(terminateTeamRun).toHaveBeenCalledWith("team-host-1");
    expect(createWorkerProjectionTeamRunWithId).toHaveBeenCalledWith(
      "team-host-1",
      "team-def-worker",
      expect.any(Array),
    );
    expect(bindRun).toHaveBeenCalledTimes(1);
    expect(teamManager.setTeamRoutingPort).toHaveBeenCalledTimes(1);
    expect(replaceForwarderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: "run-1",
        runtimeTeamId: "team-host-1",
      }),
    );
  });

  it("writes member run manifest only for worker-local member bindings", async () => {
    const tempMemoryDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "autobyteus-remote-bootstrap-manifest-"),
    );
    const originalMemoryDir = process.env.AUTOBYTEUS_MEMORY_DIR;
    process.env.AUTOBYTEUS_MEMORY_DIR = tempMemoryDir;
    try {
      const workerRunLifecycleCoordinator = createLifecycleCoordinator();
      const teamManager = { setTeamRoutingPort: vi.fn() };
      const bindRun = vi.fn();
      let created = false;
      const dispatchRunBootstrap = createDispatchRunBootstrapHandler({
        hostNodeId: "worker-1",
        teamRunManager: {
          getTeamRun: vi.fn(() =>
            created ? ({ runtime: { context: { teamManager } } } as any) : null,
          ),
          createWorkerProjectionTeamRunWithId: vi.fn(async () => {
            created = true;
            return "runtime-2";
          }),
          terminateTeamRun: vi.fn(async () => undefined),
          getTeamMemberConfigs: vi.fn(() => []),
          getTeamEventStream: vi.fn(() => ({
            allEvents: async function* () {},
            close: async () => undefined,
          })),
        } as any,
        runScopedTeamBindingRegistry: {
          tryResolveRun: vi.fn(() => null),
          bindRun,
          unbindRun: vi.fn(),
        } as any,
        teamEventAggregator: {
          finalizeRun: vi.fn(),
        } as any,
        hostNodeBridgeClient: {
          sendCommand: vi.fn(async () => undefined),
        } as any,
        workerRunLifecycleCoordinator,
        resolveWorkerTeamDefinitionId: vi.fn(async () => "team-def-worker"),
        ensureHostNodeDirectoryEntryForWorkerRun: vi.fn(),
      });

      await dispatchRunBootstrap(buildRunBootstrapEnvelopeWithPlacements());

      const localManifestPath = path.join(
        tempMemoryDir,
        "agent_teams",
        "team-host-1",
        "student_member",
        "run_manifest.json",
      );
      const remoteManifestPath = path.join(
        tempMemoryDir,
        "agent_teams",
        "team-host-1",
        "professor_member",
        "run_manifest.json",
      );
      await expect(fs.stat(localManifestPath)).resolves.toBeDefined();
      await expect(fs.stat(remoteManifestPath)).rejects.toThrow();
      expect(bindRun).toHaveBeenCalledTimes(1);
      expect(bindRun).toHaveBeenCalledWith(
        expect.objectContaining({
          memberBindings: expect.arrayContaining([
            expect.objectContaining({
              memberName: "professor",
              memberAgentId: "professor_member",
              memoryDir: null,
            }),
            expect.objectContaining({
              memberName: "student",
              memberAgentId: "student_member",
              memoryDir: path.join(
                tempMemoryDir,
                "agent_teams",
                "team-host-1",
                "student_member",
              ),
            }),
          ]),
        }),
      );
    } finally {
      if (typeof originalMemoryDir === "string") {
        process.env.AUTOBYTEUS_MEMORY_DIR = originalMemoryDir;
      } else {
        delete process.env.AUTOBYTEUS_MEMORY_DIR;
      }
      await fs.rm(tempMemoryDir, { recursive: true, force: true });
    }
  });
});
