import { describe, expect, it, vi } from "vitest";
import { TeamRun } from "../../../autobyteus-server-ts/src/agent-team-execution/domain/team-run.js";
import { TeamRunContext } from "../../../autobyteus-server-ts/src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../autobyteus-server-ts/src/agent-team-execution/domain/team-backend-kind.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../../autobyteus-server-ts/src/agent-team-execution/domain/team-run-event.js";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("TeamRun accepted-startup status timing probe", () => {
  it("currently withholds team initializing until backend.postMessage resolves", async () => {
    let resolveBackendSend: ((value: { accepted: true }) => void) | null = null;
    const observedEvents: TeamRunEvent[] = [];
    const backend = {
      runId: "team-run-delayed",
      teamBackendKind: TeamBackendKind.MIXED,
      isActive: () => true,
      getRuntimeContext: () => ({ memberContexts: [] }),
      getStatusSnapshot: () => ({ status: "offline" as const }),
      getMemberStatusSnapshots: () => [],
      subscribeToEvents: vi.fn().mockImplementation(() => () => undefined),
      postMessage: vi.fn().mockImplementation(() => new Promise((resolve) => {
        resolveBackendSend = resolve as (value: { accepted: true }) => void;
      })),
      deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interruptMember: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    };
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-run-delayed",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: null,
        config: null,
        runtimeContext: { memberContexts: [] },
      }),
      backend: backend as never,
    });

    run.subscribeToEvents((event) => observedEvents.push(event));
    const sendPromise = run.postMessage({ content: "start" } as never);
    await flushMicrotasks();

    expect(backend.postMessage).toHaveBeenCalledOnce();
    expect(observedEvents.filter((event) => event.eventSourceType === TeamRunEventSourceType.TEAM)).toHaveLength(0);
    expect(run.getStatusSnapshot()).toEqual({ status: "offline" });

    resolveBackendSend?.({ accepted: true });
    await sendPromise;

    expect(observedEvents).toContainEqual(expect.objectContaining({
      eventSourceType: TeamRunEventSourceType.TEAM,
      data: { status: "initializing" },
    }));
  });
});
