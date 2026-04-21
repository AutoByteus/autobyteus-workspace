import { describe, expect, it, vi } from "vitest";
import type {
  ApplicationRunBindingSummary,
  ApplicationRunLookupRecord,
} from "@autobyteus/application-sdk-contracts";
import { ApplicationExecutionEventIngressService } from "../../../src/application-orchestration/services/application-execution-event-ingress-service.js";
import { ApplicationOrchestrationHostService } from "../../../src/application-orchestration/services/application-orchestration-host-service.js";
import { ApplicationRunObserverService } from "../../../src/application-orchestration/services/application-run-observer-service.js";

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

const cloneBinding = (binding: ApplicationRunBindingSummary): ApplicationRunBindingSummary => structuredClone(binding);

const buildBinding = (): ApplicationRunBindingSummary => ({
  bindingId,
  applicationId,
  bindingIntentId: "binding-intent-1",
  status: "ATTACHED",
  resourceRef: {
    owner: "bundle",
    kind: "AGENT",
    localId: "sample-agent",
  },
  runtime: {
    subject: "AGENT_RUN",
    runId,
    definitionId: "agent-def-1",
    members: [
      {
        memberName: "Sample Agent",
        memberRouteKey: "sample-agent",
        displayName: "Sample Agent",
        teamPath: [],
        runId,
        runtimeKind: "AGENT",
      },
    ],
  },
  createdAt: new Date("2026-04-19T09:10:00.000Z").toISOString(),
  updatedAt: new Date("2026-04-19T09:10:00.000Z").toISOString(),
  terminatedAt: null,
  lastErrorMessage: null,
});

describe("ApplicationOrchestrationHostService startRun", () => {
  it("waits for RUN_STARTED journaling before initialInput can publish an artifact", async () => {
    const bindings = new Map<string, ApplicationRunBindingSummary>();
    const lookups = new Map<string, ApplicationRunLookupRecord>();
    const committedFamilies: string[] = [];
    const runStartedCommit = createDeferred();
    let runStartedAppendSeen = false;

    const bindingStore = {
      persistBinding: vi.fn(async (binding: ApplicationRunBindingSummary) => {
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
      postUserMessage: vi.fn(async () => {
        await ingressService.appendRuntimeArtifactEvent({
          runId,
          customData: null,
          publication: {
            contractVersion: "1",
            artifactKey: "draft",
            artifactType: "brief_draft",
            title: "Draft",
            artifactRef: {
              kind: "INLINE_JSON",
              mimeType: "application/json",
              value: { ok: true },
            },
          },
        });
        return { accepted: true };
      }),
    };

    const agentRunService = {
      resolveAgentRun: vi.fn(async () => fakeRun),
    };

    const binding = buildBinding();
    const runBindingLaunchService = {
      startRunBinding: vi.fn(async () => {
        await bindingStore.persistBinding(binding);
        lookupStore.replaceBindingLookups(applicationId, binding.bindingId, [binding.runtime.runId]);
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

    const startRunPromise = hostService.startRun(applicationId, {
      bindingIntentId: "binding-intent-1",
      resourceRef: {
        owner: "bundle",
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

    await startRunPromise;

    expect(fakeRun.postUserMessage).toHaveBeenCalledTimes(1);
    expect(committedFamilies).toEqual(["RUN_STARTED", "ARTIFACT"]);
  });

  it("resolves bindings by bindingIntentId through the host boundary", async () => {
    const binding = buildBinding();
    const bindingStore = {
      getBindingByIntentId: vi.fn(async (nextApplicationId: string, nextBindingIntentId: string) => {
        if (nextApplicationId === applicationId && nextBindingIntentId === binding.bindingIntentId) {
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
      hostService.getRunBindingByIntentId(applicationId, binding.bindingIntentId),
    ).resolves.toEqual(binding);
    expect(bindingStore.getBindingByIntentId).toHaveBeenCalledWith(applicationId, binding.bindingIntentId);
  });
});
