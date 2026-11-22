import { describe, expect, it, vi } from "vitest";
import { ClaudeAgentRunBackendFactory } from "../../../../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.js";
import { AgentRunContext } from "../../../../../../src/agent-execution/domain/agent-run-context.js";
import { SavedRuntimeSessionMissingError } from "../../../../../../src/agent-execution/errors.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * The Claude factory checks a restored session before it returns a backend (autobyteus-599, DS-003): a lost session fails the
 * preparation with the typed error, so the activation owner can renew it; the session it opened is released. A new session is
 * not checked (it still opens at its first input).
 */
const SESSION = "6f0c2a3e-5b1d-4c8e-9a7f-1234567890ab";
const build = (verify: () => Promise<void>) => {
  const session = { verifyResumable: vi.fn(verify) };
  const sessionManager = {
    restoreRunSession: vi.fn(async (_context: unknown, _id: string, own: (value: unknown) => void) => { own(session); return session; }),
    createRunSession: vi.fn(async (_context: unknown, own: (value: unknown) => void) => { own(session); return session; }),
    releaseExactSession: vi.fn(async () => undefined),
  };
  const runContext = { runId: "run-1", config: {}, runtimeContext: { sessionId: SESSION } };
  const bootstrapper = {
    createRunWorkspaceSkills: vi.fn(() => ({ release: vi.fn(async () => undefined) })),
    bootstrapForCreate: vi.fn(async () => runContext),
    bootstrapForRestore: vi.fn(async () => runContext),
  };
  return { session, sessionManager, factory: new ClaudeAgentRunBackendFactory(sessionManager as never, bootstrapper as never) };
};
const restoreRequest = () => ({ kind: "restore" as const,
  context: new AgentRunContext({ runId: "run-1", config: {} as never, runtimeContext: { sessionId: SESSION } as never }) });

describe("the Claude factory's restore check", () => {
  it("a lost session fails the preparation with the typed error, and the opened session is released", async () => {
    const lost = new SavedRuntimeSessionMissingError(RuntimeKind.CLAUDE_AGENT_SDK, SESSION);
    const { session, sessionManager, factory } = build(async () => { throw lost; });
    const preparation = factory.beginPreparation(restoreRequest() as never);
    await expect(preparation.prepare()).rejects.toBe(lost);
    expect(session.verifyResumable).toHaveBeenCalledTimes(1);
    expect(await preparation.release()).toEqual({ kind: "released" });
    expect(sessionManager.releaseExactSession).toHaveBeenCalledWith(session);
  });

  it("a present session is verified before the backend is returned", async () => {
    const { session, factory } = build(async () => undefined);
    await expect(factory.beginPreparation(restoreRequest() as never).prepare()).resolves.toBeDefined();
    expect(session.verifyResumable).toHaveBeenCalledTimes(1);
  });

  it("a new session is not checked", async () => {
    const { session, sessionManager, factory } = build(async () => { throw new Error("must not be called"); });
    await expect(factory.beginPreparation({ kind: "new", runId: "run-1", config: {} } as never).prepare()).resolves.toBeDefined();
    expect(sessionManager.createRunSession).toHaveBeenCalledTimes(1);
    expect(session.verifyResumable).not.toHaveBeenCalled();
  });
});
