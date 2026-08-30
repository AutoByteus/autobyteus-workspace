import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApplicationExecutionEventJournalRecord } from "../../../src/application-orchestration/domain/models.js";
import { ApplicationExecutionEventDispatchService } from "../../../src/application-orchestration/services/application-execution-event-dispatch-service.js";
import { ApplicationExecutionEventDispatchQueue } from "../../../src/application-orchestration/services/application-execution-event-dispatch-queue.js";

const applicationId = "app-1";

const flushMicrotasks = async (iterations = 10): Promise<void> => {
  for (let index = 0; index < iterations; index += 1) {
    await Promise.resolve();
  }
};

const buildRecord = (journalSequence: number): ApplicationExecutionEventJournalRecord => ({
  event: {
    eventId: `event-${journalSequence}`,
    journalSequence,
    applicationId,
    family: "RUN_STARTED",
    publishedAt: new Date("2026-04-19T09:00:00.000Z").toISOString(),
    binding: {
      bindingId: `binding-${journalSequence}`,
      applicationId,
      launchRequestId: `launch-request-${journalSequence}`,
      status: "ATTACHED",
      executionResourceRef: {
        source: "bundle",
        kind: "AGENT",
        localId: "sample-agent",
      },
      runtime: {
        subject: "AGENT_RUN",
        agentRunId: `run-${journalSequence}`,
        definitionId: "agent-def-1",
        members: [],
      },
      createdAt: new Date("2026-04-19T09:00:00.000Z").toISOString(),
      updatedAt: new Date("2026-04-19T09:00:00.000Z").toISOString(),
      terminatedAt: null,
      lastErrorMessage: null,
    },
    producer: null,
    payload: {},
  },
  ackedAt: null,
  lastDispatchAttemptNumber: 0,
  lastDispatchedAt: null,
  lastErrorKind: null,
  lastErrorMessage: null,
  nextAttemptAfter: null,
});

describe("ApplicationExecutionEventDispatchService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reschedules when a new event is appended during the drain tail window", async () => {
    const pendingRecords = [buildRecord(1)];
    let tailAppendInjected = false;
    let service: ApplicationExecutionEventDispatchService;

    const journalStore = {
      getNextPendingRecord: vi.fn(async () => {
        if (pendingRecords.length > 0) {
          return pendingRecords.shift() ?? null;
        }
        if (!tailAppendInjected) {
          tailAppendInjected = true;
          pendingRecords.push(buildRecord(2));
          service.schedule(applicationId);
          return null;
        }
        return pendingRecords.shift() ?? null;
      }),
      getNextPendingRecordIfPresent: vi.fn(async () => pendingRecords[0] ?? null),
      recordDispatchAttempt: vi.fn(async () => undefined),
      acknowledgeRecord: vi.fn(async () => undefined),
      recordDispatchFailure: vi.fn(async () => undefined),
      buildDispatchEnvelope: vi.fn((record, attemptNumber, dispatchedAt) => ({
        event: record.event,
        delivery: {
          semantics: "AT_LEAST_ONCE",
          attemptNumber,
          dispatchedAt,
        },
      })),
    };

    const engineController = {
      invokeApplicationEventHandler: vi.fn(async () => ({ status: "acknowledged" })),
    };
    const eventQueue = new ApplicationExecutionEventDispatchQueue();

    service = new ApplicationExecutionEventDispatchService({
      applicationBundleService: {
        listApplications: vi.fn().mockResolvedValue([]),
      } as never,
      availabilityReader: {
        isApplicationActive: vi.fn(async () => true),
      } as never,
      platformStateStore: {
        listKnownApplicationIds: vi.fn(async () => []),
      } as never,
      journalStore: journalStore as never,
      eventQueue,
      engineLauncher: { ensureReady: vi.fn(async () => undefined) } as never,
      engineController: engineController as never,
    });

    service.schedule(applicationId);

    await vi.waitFor(() => {
      expect(engineController.invokeApplicationEventHandler).toHaveBeenCalledTimes(2);
    });

    expect(
      engineController.invokeApplicationEventHandler.mock.calls.map(
        ([, payload]) => payload.envelope.event.journalSequence,
      ),
    ).toEqual([1, 2]);
    expect(journalStore.acknowledgeRecord).toHaveBeenCalledTimes(2);
    service.stop();
  });

  it("preserves a future-scheduled retry backoff after a dispatch failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00.000Z"));

    let currentRecord: ApplicationExecutionEventJournalRecord | null = buildRecord(1);
    let shouldFailDispatch = true;

    const journalStore = {
      getNextPendingRecord: vi.fn(async () => currentRecord),
      getNextPendingRecordIfPresent: vi.fn(async () => currentRecord),
      recordDispatchAttempt: vi.fn(async (_applicationId, _journalSequence, attemptNumber, dispatchedAt) => {
        if (!currentRecord) {
          throw new Error("No pending record available for dispatch attempt.");
        }
        currentRecord = {
          ...currentRecord,
          lastDispatchAttemptNumber: attemptNumber,
          lastDispatchedAt: dispatchedAt,
        };
      }),
      acknowledgeRecord: vi.fn(async () => {
        currentRecord = null;
      }),
      recordDispatchFailure: vi.fn(async (_applicationId, _journalSequence, input) => {
        if (!currentRecord) {
          throw new Error("No pending record available for dispatch failure.");
        }
        currentRecord = {
          ...currentRecord,
          lastErrorKind: input.errorKind,
          lastErrorMessage: input.errorMessage,
          nextAttemptAfter: input.nextAttemptAfter,
        };
      }),
      buildDispatchEnvelope: vi.fn((record, attemptNumber, dispatchedAt) => ({
        event: record.event,
        delivery: {
          semantics: "AT_LEAST_ONCE",
          attemptNumber,
          dispatchedAt,
        },
      })),
    };

    const engineController = {
      invokeApplicationEventHandler: vi.fn(async () => {
        if (shouldFailDispatch) {
          shouldFailDispatch = false;
          throw new Error("dispatch boom");
        }
        return { status: "acknowledged" };
      }),
    };
    const eventQueue = new ApplicationExecutionEventDispatchQueue();

    const service = new ApplicationExecutionEventDispatchService({
      applicationBundleService: {
        listApplications: vi.fn().mockResolvedValue([]),
      } as never,
      availabilityReader: {
        isApplicationActive: vi.fn(async () => true),
      } as never,
      platformStateStore: {
        listKnownApplicationIds: vi.fn(async () => []),
      } as never,
      journalStore: journalStore as never,
      eventQueue,
      engineLauncher: { ensureReady: vi.fn(async () => undefined) } as never,
      engineController: engineController as never,
    });

    service.schedule(applicationId);

    await flushMicrotasks();

    expect(engineController.invokeApplicationEventHandler).toHaveBeenCalledTimes(1);
    expect(journalStore.recordDispatchFailure).toHaveBeenCalledTimes(1);
    expect(journalStore.getNextPendingRecord).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(999);
    expect(engineController.invokeApplicationEventHandler).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    await vi.waitFor(() => {
      expect(engineController.invokeApplicationEventHandler).toHaveBeenCalledTimes(2);
      expect(journalStore.acknowledgeRecord).toHaveBeenCalledTimes(1);
    });
    service.stop();
  });
});
