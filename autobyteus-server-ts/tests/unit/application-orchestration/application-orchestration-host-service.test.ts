import type { ApplicationAgentBindingRecord } from "../../../src/application-orchestration/domain/models.js";
import { describe, expect, it, vi } from "vitest";
import type {
  ApplicationRunLookupRecord,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationExecutionEventIngressService } from "../../../src/application-orchestration/services/application-execution-event-ingress-service.js";
import { ApplicationOrchestrationHostService } from "../../../src/application-orchestration/services/application-orchestration-host-service.js";
import { ApplicationRunObserverService } from "../../../src/application-orchestration/services/application-run-observer-service.js";
import { testAgentNode, testAgentTeamNode } from "../../fixtures/current-team-run-fixtures.js";

const applicationId = "app-1";
const runId = "run-1";
const bindingId = "binding-1";

const createDeferred = () => {
  let resolve!: () => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const cloneBinding = (binding: ApplicationAgentBindingRecord): ApplicationAgentBindingRecord => structuredClone(binding);

const buildBinding = (): ApplicationAgentBindingRecord => ({
  bindingId,
  applicationId,
  launchRequestId: "launch-request-1",
  status: "ATTACHED",
  executionResourceRef: {
    source: "bundle",
    kind: "AGENT",
    localId: "sample-agent",
  },
  runtime: {
    subject: "AGENT_RUN",
    agentRunId: runId,
    definitionId: "agent-def-1",
    members: [],
  },
  createdAt: new Date("2026-04-19T09:10:00.000Z").toISOString(),
  updatedAt: new Date("2026-04-19T09:10:00.000Z").toISOString(),
  terminatedAt: null,
  lastErrorMessage: null,
});

const buildTeamBinding = (): ApplicationAgentBindingRecord => ({
  bindingId,
  applicationId,
  launchRequestId: "launch-request-1",
  status: "ATTACHED",
  executionResourceRef: {
    source: "bundle",
    kind: "AGENT_TEAM",
    localId: "brief-studio-team",
  },
  runtime: {
    subject: "TEAM_RUN",
    teamRunId: "team-run-1",
    definitionId: "team-def-1",
    members: [
      {
        memberAddress: "/Researcher",
        displayName: "Researcher",
        agentRunId: "researcher-member-run-1",
        runtimeKind: "AGENT_TEAM_MEMBER",
      },
    ],
  },
  createdAt: new Date("2026-04-19T09:10:00.000Z").toISOString(),
  updatedAt: new Date("2026-04-19T09:10:00.000Z").toISOString(),
  terminatedAt: null,
  lastErrorMessage: null,
});

describe("ApplicationOrchestrationHostService startAgent", () => {
  it("waits for RUN_STARTED journaling before initialInput is forwarded to the runtime", async () => {
    const bindings = new Map<string, ApplicationAgentBindingRecord>();
    const lookups = new Map<string, ApplicationRunLookupRecord>();
    const committedFamilies: string[] = [];
    const runStartedCommit = createDeferred();
    let runStartedAppendSeen = false;

    const bindingStore = {
      persistBinding: vi.fn(async (binding: ApplicationAgentBindingRecord) => {
        bindings.set(`${binding.applicationId}:${binding.bindingId}`, cloneBinding(binding));
        return cloneBinding(binding);
      }),
      getBinding: vi.fn(async (nextApplicationId: string, nextBindingId: string) => {
        const binding = bindings.get(`${nextApplicationId}:${nextBindingId}`);
        return binding ? cloneBinding(binding) : null;
      }),
      listBindings: vi.fn(async () => []),
    };

    const lookupStore = {
      replaceBindingLookups: vi.fn((nextApplicationId: string, nextBindingId: string, runIds: string[]) => {
        for (const nextRunId of runIds) {
          lookups.set(nextRunId, {
            runId: nextRunId,
            applicationId: nextApplicationId,
            bindingId: nextBindingId,
          });
        }
      }),
      getLookupByRunId: vi.fn((nextRunId: string) => lookups.get(nextRunId) ?? null),
      removeBindingLookups: vi.fn(),
    };

    const journalStore = {
      appendEventAwaitable: vi.fn(async (_nextApplicationId: string, event) => {
        if (event.family === "RUN_STARTED") {
          runStartedAppendSeen = true;
          await runStartedCommit.promise;
          committedFamilies.push("RUN_STARTED");
        } else {
          committedFamilies.push(String(event.family));
        }
        return {
          event: { ...event, journalSequence: committedFamilies.length },
          ackedAt: null,
          lastDispatchAttemptNumber: 0,
          lastDispatchedAt: null,
          lastErrorKind: null,
          lastErrorMessage: null,
          nextAttemptAfter: null,
        };
      }),
    };

    const dispatchService = {
      schedule: vi.fn(),
    };

    const ingressService = new ApplicationExecutionEventIngressService({
      bindingStore: bindingStore as never,
      lookupStore: lookupStore as never,
      journalStore: journalStore as never,
      dispatchService: dispatchService as never,
    });

    const lifecycleGateway = {
      observeBoundRun: vi.fn(async (_descriptor, listener: (event: { runtimeSubject: "AGENT_RUN"; runId: string; phase: "ATTACHED"; occurredAt: string }) => void) => {
        listener({
          runtimeSubject: "AGENT_RUN",
          runId,
          phase: "ATTACHED",
          occurredAt: new Date("2026-04-19T09:10:01.000Z").toISOString(),
        });
        return () => undefined;
      }),
    };

    const runObserverService = new ApplicationRunObserverService({
      lifecycleGateway: lifecycleGateway as never,
      bindingStore: bindingStore as never,
      lookupStore: lookupStore as never,
      ingressService,
    });

    const fakeRun = {
      postUserMessage: vi.fn(async () => ({ accepted: true })),
    };

    const agentRunService = {
      resolveAgentRun: vi.fn(async () => fakeRun),
    };

    const binding = buildBinding();
    const runBindingLaunchService = {
      startAgentRunBinding: vi.fn(async () => {
        await bindingStore.persistBinding(binding);
        lookupStore.replaceBindingLookups(applicationId, binding.bindingId, [runId]);
        return cloneBinding(binding);
      }),
    };

    const hostService = new ApplicationOrchestrationHostService({
      startupGate: {
        awaitReady: vi.fn(async () => undefined),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      runBindingLaunchService: runBindingLaunchService as never,
      bindingStore: bindingStore as never,
      lookupStore: lookupStore as never,
      runObserverService,
      agentRunService: agentRunService as never,
    });

    const startAgentPromise = hostService.startAgent(applicationId, {
      launchRequestId: "launch-request-1",
      executionResourceRef: {
        source: "bundle",
        kind: "AGENT",
        localId: "sample-agent",
      },
      launch: {
        kind: "AGENT",
        workspaceRootPath: "/tmp/brief-studio",
        llmModelIdentifier: "gpt-test",
      },
      initialInput: {
        text: "Create the first draft",
      },
    });

    await vi.waitFor(() => {
      expect(runStartedAppendSeen).toBe(true);
    });

    expect(fakeRun.postUserMessage).not.toHaveBeenCalled();
    expect(committedFamilies).toEqual([]);

    runStartedCommit.resolve();

    await startAgentPromise;

    expect(fakeRun.postUserMessage).toHaveBeenCalledTimes(1);
    expect(committedFamilies).toEqual(["RUN_STARTED"]);
  });

  it("resolves bindings by launchRequestId through the host boundary", async () => {
    const binding = buildBinding();
    const bindingStore = {
      findBindingByLaunchRequestId: vi.fn(async (nextApplicationId: string, nextLaunchRequestId: string) => {
        if (nextApplicationId === applicationId && nextLaunchRequestId === binding.launchRequestId) {
          return cloneBinding(binding);
        }
        return null;
      }),
    };

    const hostService = new ApplicationOrchestrationHostService({
      startupGate: {
        awaitReady: vi.fn(async () => undefined),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      bindingStore: bindingStore as never,
    });

    await expect(
      hostService.findRunBindingByLaunchRequestId(applicationId, binding.launchRequestId),
    ).resolves.toEqual({
      ...binding,
      runtime: { ...binding.runtime, members: [] },
    });
    expect(bindingStore.findBindingByLaunchRequestId).toHaveBeenCalledWith(applicationId, binding.launchRequestId);
  });

  it("reads published artifacts for bound team-member runs through the binding-owned member runtime path", async () => {
    const binding = buildTeamBinding();
    const bindingStore = {
      listBindings: vi.fn(async () => [cloneBinding(binding)]),
    };
    const teamRunMetadataService = {
      readMetadata: vi.fn(async () => ({
        schemaVersion: 3 as const,
        teamDefinitionName: "Brief Team",
        createdAt: "2026-04-19T09:10:00.000Z",
        archivedAt: null,
        rootTeam: testAgentTeamNode({
          address: "/",
          teamRunId: "team-run-1",
          teamDefinitionId: "team-def-1",
          coordinatorAddress: "/Researcher",
          children: [testAgentNode("/Researcher", {
            agentRunId: "researcher-member-run-1",
            agentDefinitionId: "agent-def-1",
            llmModelIdentifier: "gpt-test",
            workspaceRootPath: "/tmp/workspace",
          })],
        }),
        handoffs: [],
      })),
    };
    const publishedArtifactProjectionService = {
      getPublishedArtifactsFromMemoryDir: vi.fn(async () => [
        {
          id: "researcher-member-run-1:brief-studio/research.md",
          runId: "researcher-member-run-1",
          path: "brief-studio/research.md",
          type: "file",
          status: "available",
          description: null,
          revisionId: "revision-1",
          createdAt: "2026-04-19T09:15:00.000Z",
          updatedAt: "2026-04-19T09:15:00.000Z",
        },
      ]),
      getPublishedArtifactRevisionTextFromMemoryDir: vi.fn(async () => "# research"),
      getRunPublishedArtifacts: vi.fn(),
      getPublishedArtifactRevisionText: vi.fn(),
    };

    const hostService = new ApplicationOrchestrationHostService({
      startupGate: {
        awaitReady: vi.fn(async () => undefined),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      bindingStore: bindingStore as never,
      teamRunMetadataService: teamRunMetadataService as never,
      publishedArtifactProjectionService: publishedArtifactProjectionService as never,
    });

    await expect(
      hostService.listRunPublishedArtifacts(applicationId, "researcher-member-run-1"),
    ).resolves.toEqual([
      expect.objectContaining({
        runId: "researcher-member-run-1",
        path: "brief-studio/research.md",
      }),
    ]);

    await expect(
      hostService.readPublishedArtifactRevision(applicationId, {
        runId: "researcher-member-run-1",
        revisionId: "revision-1",
      }),
    ).resolves.toBe("# research");

    expect(publishedArtifactProjectionService.getPublishedArtifactsFromMemoryDir).toHaveBeenCalledWith(
      expect.stringContaining("agent_teams/team-run-1/researcher-member-run-1"),
    );
    expect(
      publishedArtifactProjectionService.getPublishedArtifactRevisionTextFromMemoryDir,
    ).toHaveBeenCalledWith({
      memoryDir: expect.stringContaining("agent_teams/team-run-1/researcher-member-run-1"),
      revisionId: "revision-1",
    });
    expect(publishedArtifactProjectionService.getRunPublishedArtifacts).not.toHaveBeenCalled();
    expect(publishedArtifactProjectionService.getPublishedArtifactRevisionText).not.toHaveBeenCalled();
  });

  it("reads published artifacts for nested bound members from the hierarchical root team memory path", async () => {
    const binding = {
      ...buildTeamBinding(),
      runtime: {
        ...buildTeamBinding().runtime,
        members: [{
          memberAddress: "/ReviewSquad/Reviewer",
          displayName: "Reviewer",
          agentRunId: "reviewer-member-run-1",
          runtimeKind: "AGENT_TEAM_MEMBER",
        }],
      },
    };
    const publishedArtifactProjectionService = {
      getPublishedArtifactsFromMemoryDir: vi.fn(async () => []),
      getPublishedArtifactRevisionTextFromMemoryDir: vi.fn(),
      getRunPublishedArtifacts: vi.fn(),
      getPublishedArtifactRevisionText: vi.fn(),
    };
    const hostService = new ApplicationOrchestrationHostService({
      startupGate: {
        awaitReady: vi.fn(async () => undefined),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      bindingStore: {
        listBindings: vi.fn(async () => [cloneBinding(binding)]),
      } as never,
      teamRunMetadataService: {
        readMetadata: vi.fn(async () => ({
          schemaVersion: 3 as const,
          teamDefinitionName: "Brief Team",
          createdAt: "2026-04-19T09:10:00.000Z",
          archivedAt: null,
          rootTeam: testAgentTeamNode({
            address: "/",
            teamRunId: "team-run-1",
            teamDefinitionId: "team-def-1",
            coordinatorAddress: "/RootLead",
            children: [
              testAgentNode("/RootLead", { agentRunId: "root-lead-run-1" }),
              testAgentTeamNode({
                address: "/ReviewSquad",
                teamDefinitionId: "review-team",
                teamRunId: "child-review-team-run",
                coordinatorAddress: "/ReviewSquad/Reviewer",
                children: [testAgentNode("/ReviewSquad/Reviewer", {
                  agentRunId: "reviewer-member-run-1",
                  agentDefinitionId: "agent-def-reviewer",
                  llmModelIdentifier: "gpt-test",
                  workspaceRootPath: "/tmp/workspace",
                })],
              }),
            ],
          }),
          handoffs: [],
        })),
      } as never,
      publishedArtifactProjectionService: publishedArtifactProjectionService as never,
    });

    await hostService.listRunPublishedArtifacts(applicationId, "reviewer-member-run-1");

    expect(publishedArtifactProjectionService.getPublishedArtifactsFromMemoryDir).toHaveBeenCalledWith(
      expect.stringContaining("agent_teams/team-run-1/child-review-team-run/reviewer-member-run-1"),
    );
  });

  it("posts application team input with exact member-address target identity", async () => {
    const binding = buildTeamBinding();
    const postMessage = vi.fn(async () => ({ accepted: true }));
    const hostService = new ApplicationOrchestrationHostService({
      startupGate: {
        awaitReady: vi.fn(async () => undefined),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      bindingStore: {
        getBinding: vi.fn(async () => cloneBinding(binding)),
      } as never,
      teamRunService: {
        resolveTeamRun: vi.fn(async () => ({ postMessage })),
      } as never,
    });

    await hostService.sendRunInput(applicationId, {
      address: {
        bindingId,
        target: { kind: "AGENT_TEAM_MEMBER", memberAddress: "/Researcher" },
      },
      input: { text: "please research" },
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: "please research" }),
      "/Researcher",
    );
  });

  it("rejects legacy targetMemberName application runtime input before dispatch", async () => {
    const binding = buildTeamBinding();
    const postMessage = vi.fn(async () => ({ accepted: true }));
    const hostService = new ApplicationOrchestrationHostService({
      startupGate: {
        awaitReady: vi.fn(async () => undefined),
      } as never,
      availabilityService: {
        requireApplicationActive: vi.fn(async () => undefined),
      } as never,
      bindingStore: {
        getBinding: vi.fn(async () => cloneBinding(binding)),
      } as never,
      teamRunService: {
        resolveTeamRun: vi.fn(async () => ({ postMessage })),
      } as never,
    });

    await expect(
      hostService.sendRunInput(applicationId, {
        address: {
          bindingId,
          target: { kind: "AGENT_TEAM_MEMBER", memberAddress: "/Researcher" },
        },
        input: {
          text: "please research",
          targetMemberName: "researcher",
        },
      } as never),
    ).rejects.toThrow("targetMemberName is not supported");
    expect(postMessage).not.toHaveBeenCalled();
  });
});
