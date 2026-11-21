import { describe, expect, it, vi } from "vitest";
import { followAgentRun } from "../../../../src/services/agent-streaming/agent-run-follower.js";
import { ActiveCollaborationRootDirectory } from "../../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createAgentRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-461 SR-064: an open agent stream session follows its run by run ID, whoever readies it (a delegator's
 * Task message restoring a stopped child, a peer, a restart resume, another session).
 */
const RUN = "child-run";
const boundary = { hasAgentExecution: () => true, ownsAgentRun: () => true, deliverExactAgentMessage: async () => ({ accepted: true as const }), deliverToPeerRun: async () => ({ accepted: true as const }) };

const fakeRoot = () => {
  const listeners = new Set<(run: never) => void>();
  let live: unknown = null;
  return {
    activeAgentRun: () => live as never,
    onAgentReady: (listener: (run: never) => void) => { listeners.add(listener); return () => listeners.delete(listener); },
    ready(run: unknown) { live = run; listeners.forEach((listener) => listener(run as never)); },
    listenerCount: () => listeners.size,
  };
};

const setup = () => {
  const registrations = new ActiveCollaborationRootDirectory();
  const roots = new Map<string, ReturnType<typeof fakeRoot>>();
  const sources = { registrations, roots: { getActive: (id: string) => roots.get(id) ?? null } };
  const register = () => {
    const root = fakeRoot();
    roots.set(RUN, root);
    const reservation = registrations.reserve(createAgentRootExecutionIdentity(RUN), boundary);
    reservation.commit();
    return { root, end: () => { roots.delete(RUN); reservation.release(); } };
  };
  return { sources, register };
};

describe("followAgentRun", () => {
  it("a stopped run restored by someone else: its host's ready is told, before any post (no reconnect, no send)", () => {
    const { sources, register } = setup();
    const ready = vi.fn();
    const ended = vi.fn();
    followAgentRun(sources, RUN, { ready, ended });
    expect(ready).not.toHaveBeenCalled();
    const { root } = register();
    root.ready("run-1");
    expect(ready).toHaveBeenCalledWith("run-1");
    // An idle shutdown and a later restore give the new AgentRun.
    root.ready("run-2");
    expect(ready).toHaveBeenLastCalledWith("run-2");
  });

  it("a run already live when followed is told at once; a root registered with a ready host is told on registration", () => {
    const { sources, register } = setup();
    const { root } = register();
    root.ready("live");
    const ready = vi.fn();
    followAgentRun(sources, RUN, { ready, ended: vi.fn() });
    expect(ready).toHaveBeenCalledWith("live");
  });

  it("the run's end is told and the host hook is released; the unsubscribe releases everything", () => {
    const { sources, register } = setup();
    const ended = vi.fn();
    const ready = vi.fn();
    const stop = followAgentRun(sources, RUN, { ready, ended });
    const first = register();
    first.end();
    expect(ended).toHaveBeenCalledOnce();
    expect(first.root.listenerCount()).toBe(0);
    const second = register();
    expect(second.root.listenerCount()).toBe(1);
    stop();
    expect(second.root.listenerCount()).toBe(0);
    second.root.ready("after");
    expect(ready).not.toHaveBeenCalled();
  });

  it("a run without a standalone root is never told", () => {
    const { sources } = setup();
    const ready = vi.fn();
    followAgentRun(sources, "application-run", { ready, ended: vi.fn() });
    expect(ready).not.toHaveBeenCalled();
  });
});
