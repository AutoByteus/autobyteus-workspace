import type { SpawnOptions, SpawnedProcess } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeSdkQueryLike } from "./claude-sdk-client.js";
import { ClaudeSdkInputChannel, createClaudeSdkStreamingSession, type ClaudeSdkStreamingSession } from "./claude-sdk-streaming-session.js";
import { ClaudeSdkProcessOwner } from "./claude-sdk-process-owner.js";

export type ClaudeSdkOpeningReleaseResult =
  | Readonly<{ kind: "released" }>
  | Readonly<{ kind: "pending" | "failed"; code: string; message: string }>;
export interface ClaudeSdkSessionOpening {
  open(): Promise<ClaudeSdkStreamingSession>;
  release(): Promise<ClaudeSdkOpeningReleaseResult>;
}

/** One acquisition generation, retained before options/MCP/module/auth/queue awaits. */
export function beginClaudeSdkSessionOpening(input: {
  createQuery(context: {
    channel: ClaudeSdkInputChannel;
    assertAccepting(): void;
    registerQuery(raw: unknown): void;
    spawn(options: SpawnOptions): SpawnedProcess;
    stderr(text: string): void;
  }): Promise<void>;
  stderr?: (text: string) => void;
}): ClaudeSdkSessionOpening {
  let cancelled = false;
  let settled = false;
  let initializationSettled = true; // no Query yet; outstanding createQuery is accounted independently
  let malformedQuery = false;
  let rawQuery: unknown = null;
  let query: ClaudeSdkQueryLike | null = null;
  let session: ClaudeSdkStreamingSession | null = null;
  let acquisition: Promise<ClaudeSdkStreamingSession> | null = null;
  let releasing: Promise<ClaudeSdkOpeningReleaseResult> | null = null;
  let released = false;
  const channel = new ClaudeSdkInputChannel();
  const owner = new ClaudeSdkProcessOwner(text => { input.stderr?.(text); });
  const assertAccepting = () => { if (cancelled) throw new Error("CLAUDE_OPENING_CLOSED: Opening cancelled."); };
  const requestClose = () => {
    channel.end(); owner.cancel();
    const candidate = rawQuery as Partial<ClaudeSdkQueryLike> | null;
    if (typeof candidate?.close === "function") candidate.close();
  };
  const operation: ClaudeSdkSessionOpening = Object.freeze({
    open: () => {
      if (acquisition) return acquisition;
      try { assertAccepting(); } catch (error) { return Promise.reject(error); }
      acquisition = (async () => {
        await input.createQuery({ channel, assertAccepting, spawn: options => { assertAccepting(); return owner.spawn(options); },
          stderr: text => input.stderr?.(text), registerQuery: raw => {
            rawQuery = raw;
            const candidate = raw as Partial<ClaudeSdkQueryLike> | null;
            if (typeof candidate?.initializationResult !== "function") {
              malformedQuery = true;
              throw new Error("CLAUDE_QUERY_INVALID: Public initialization observation missing.");
            }
            initializationSettled = false;
            // Observe public initialization, not a new initialization call or second iterator.
            void Promise.resolve(candidate.initializationResult()).then(() => undefined, () => undefined).finally(() => {
              initializationSettled = true;
              if (cancelled) void operation.release();
            });
            if (!candidate || typeof candidate.close !== "function" || typeof candidate.interrupt !== "function" ||
              typeof candidate[Symbol.asyncIterator] !== "function") {
              malformedQuery = true;
              throw new Error("CLAUDE_QUERY_INVALID: Streaming control missing.");
            }
            query = candidate as ClaudeSdkQueryLike;
          } });
        assertAccepting();
        if (!query) throw new Error("CLAUDE_QUERY_INVALID: No acquired query.");
        session = createClaudeSdkStreamingSession(query, channel, assertAccepting);
        return session;
      })().finally(() => {
        settled = true;
        if (cancelled) void operation.release();
      });
      return acquisition;
    },
    release: () => {
      cancelled = true; // fence synchronously before any drain/await
      let closeFault: unknown = null;
      try { requestClose(); } catch (error) { closeFault = error; }
      if (released) return Promise.resolve({ kind: "released" as const });
      if (releasing) return releasing;
      const attempt = (async (): Promise<ClaudeSdkOpeningReleaseResult> => {
        try { await owner.release(); }
        catch (error) { return { kind: "failed", code: "CLAUDE_CHILD_RELEASE_FAILED", message: String(error) }; }
        if (closeFault) return { kind: "failed", code: "CLAUDE_QUERY_CLOSE_FAILED", message: String(closeFault) };
        if (malformedQuery) return { kind: "failed", code: "CLAUDE_QUERY_INVALID", message: "Malformed Query has no supported acquisition settlement proof." };
        if ((acquisition && !settled) || !initializationSettled) return { kind: "pending", code: "CLAUDE_OPENING_PENDING", message: "Opening/SDK initialization still settling; hook is closed." };
        released = true;
        rawQuery = null; query = null; session = null; acquisition = null; input = null as never;
        return { kind: "released" };
      })();
      releasing = attempt;
      void attempt.finally(() => { if (releasing === attempt) releasing = null; });
      return attempt;
    },
  });
  return operation;
}
