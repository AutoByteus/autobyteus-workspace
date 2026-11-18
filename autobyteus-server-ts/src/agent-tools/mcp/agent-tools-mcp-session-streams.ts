import type { ServerResponse } from "node:http";
import type { FastifyReply } from "fastify";

export const AGENT_TOOLS_MCP_STREAM_KEEPALIVE_INTERVAL_MS = 15_000;

const TOOLS_LIST_CHANGED_FRAME =
  'event: message\ndata: {"jsonrpc":"2.0","method":"notifications/tools/list_changed"}\n\n';
const OPEN_FRAME = ": open\n\n";
const KEEPALIVE_FRAME = ": keepalive\n\n";

type HeldStream = {
  readonly response: ServerResponse;
  readonly keepalive: NodeJS.Timeout;
};

/**
 * Owns the held GET (server-to-client) streams of Agent Tools MCP run sessions.
 * Only this owner writes to them: it opens them, keeps them alive, sends
 * `notifications/tools/list_changed` and ends them when a session goes away.
 */
export class AgentToolsMcpSessionStreams {
  private readonly streamsBySession = new Map<string, Set<HeldStream>>();
  private readonly keepaliveIntervalMs: number;
  private closed = false;

  constructor(options: Readonly<{ keepaliveIntervalMs?: number }> = {}) {
    this.keepaliveIntervalMs =
      options.keepaliveIntervalMs ?? AGENT_TOOLS_MCP_STREAM_KEEPALIVE_INTERVAL_MS;
  }

  open(sessionId: string, reply: FastifyReply): void {
    reply.hijack();
    const response = reply.raw;
    if (this.closed) {
      // The host is closing: no new stream.
      response.writeHead(503);
      response.end();
      return;
    }
    response.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    response.flushHeaders();
    const stream: HeldStream = {
      response,
      keepalive: setInterval(() => write(stream, KEEPALIVE_FRAME), this.keepaliveIntervalMs),
    };
    stream.keepalive.unref?.();
    let streams = this.streamsBySession.get(sessionId);
    if (!streams) {
      streams = new Set();
      this.streamsBySession.set(sessionId, streams);
    }
    streams.add(stream);
    const forget = () => this.forget(sessionId, stream);
    response.once("close", forget);
    response.once("error", () => {
      forget();
      response.destroy();
    });
    write(stream, OPEN_FRAME);
  }

  notifyToolsChanged(sessionId: string): void {
    for (const stream of this.streamsBySession.get(sessionId) ?? []) {
      write(stream, TOOLS_LIST_CHANGED_FRAME);
    }
  }

  countOpenStreams(sessionId: string): number {
    return this.streamsBySession.get(sessionId)?.size ?? 0;
  }

  closeSession(sessionId: string): void {
    const streams = this.streamsBySession.get(sessionId);
    if (!streams) return;
    this.streamsBySession.delete(sessionId);
    for (const stream of streams) end(stream);
  }

  closeAll(): void {
    this.closed = true;
    for (const sessionId of [...this.streamsBySession.keys()]) {
      this.closeSession(sessionId);
    }
  }

  private forget(sessionId: string, stream: HeldStream): void {
    clearInterval(stream.keepalive);
    const streams = this.streamsBySession.get(sessionId);
    if (!streams) return;
    streams.delete(stream);
    if (streams.size === 0) this.streamsBySession.delete(sessionId);
  }
}

const write = (stream: HeldStream, frame: string): void => {
  const { response } = stream;
  if (response.destroyed || response.writableEnded) return;
  try {
    response.write(frame);
  } catch {
    clearInterval(stream.keepalive);
    response.destroy();
  }
};

const end = (stream: HeldStream): void => {
  clearInterval(stream.keepalive);
  const { response } = stream;
  if (response.destroyed || response.writableEnded) return;
  try {
    response.end();
  } catch {
    response.destroy();
  }
};
