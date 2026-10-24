import type {
  RemoteRunObservationStream,
  RemoteRunObserver,
  RemoteTargetRoot,
} from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { PeerNode } from "../domain/peer-node.js";
import { remoteObservationFrameOf } from "./peer-run-view-answers.js";

/** The part of a WebSocket the observation client uses (the runtime's `WebSocket`, or a test double). */
export type PeerWebSocket = {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(code?: number): void;
};
export type OpenWebSocket = (url: string) => PeerWebSocket;

const openRuntimeWebSocket: OpenWebSocket = (url) => new WebSocket(url) as unknown as PeerWebSocket;

const frameText = (data: unknown): string | null =>
  typeof data === "string" ? data : data instanceof ArrayBuffer ? Buffer.from(data).toString("utf8") : Buffer.isBuffer(data) ? data.toString("utf8") : null;

/**
 * The outbound end of one observation stream (autobyteus-278). It opens the peer's observation route, sends the
 * envelope with the run, and accepts frames only after the peer's first frame names the pinned node (N-401). A
 * refusal, a different node, a malformed first frame, no first frame within the bound, a failure or a close by the
 * peer ends it with `onEnd` once; `close()` ends it silently. A malformed later frame is dropped.
 */
export const openPeerRunObservation = (input: Readonly<{
  resolvePeer(): Promise<PeerNode | null>;
  ownNodeId(): Promise<string>;
  path: string;
  targetRoot: RemoteTargetRoot;
  observer: RemoteRunObserver;
  openWebSocket?: OpenWebSocket;
  openingTimeoutMs: number;
}>): RemoteRunObservationStream => {
  let socket: PeerWebSocket | null = null;
  let closedByUs = false;
  let ended = false;
  let accepted = false;
  let openingTimer: ReturnType<typeof setTimeout> | null = null;
  const end = (): void => {
    if (openingTimer) clearTimeout(openingTimer);
    openingTimer = null;
    if (ended) return;
    ended = true;
    try { socket?.close(1000); } catch { /* already closed */ }
    if (!closedByUs) input.observer.onEnd();
  };
  void (async () => {
    const peer = await input.resolvePeer().catch(() => null);
    if (!peer || closedByUs) return end();
    // This node's identity held back (autobyteus-290): nothing is opened, and the stream ends as any refusal does.
    const fromNodeId = await input.ownNodeId().catch(() => null);
    if (!fromNodeId || closedByUs) return end();
    const url = `${peer.baseUrl.replace(/^http/, "ws")}${input.path}`;
    try { socket = (input.openWebSocket ?? openRuntimeWebSocket)(url); } catch { return end(); }
    openingTimer = setTimeout(() => { if (!accepted) end(); }, input.openingTimeoutMs);
    socket.onopen = () => socket?.send(JSON.stringify({
      fromNodeId, toNodeId: peer.nodeId, targetRoot: { kind: input.targetRoot.kind, runId: input.targetRoot.runId },
    }));
    socket.onmessage = (event) => {
      if (ended) return;
      let value: unknown;
      try { value = JSON.parse(frameText(event.data) ?? ""); } catch { value = null; }
      if (!accepted) {
        const opening = value as { nodeId?: unknown; accepted?: unknown } | null;
        // The first frame names the node that answers; a refusal or another node ends the stream.
        if (!opening || opening.accepted === false || opening.nodeId !== peer.nodeId) return end();
        accepted = true;
        if (openingTimer) clearTimeout(openingTimer);
        openingTimer = null;
        return;
      }
      const frame = remoteObservationFrameOf(value);
      if (frame) input.observer.onFrame(frame.agentRunId, frame.message);
      else console.debug(`An observation frame from node '${peer.name}' was not readable; it was dropped.`);
    };
    socket.onerror = () => end();
    socket.onclose = () => end();
  })().catch(() => end());
  return Object.freeze({
    close: () => {
      closedByUs = true;
      end();
    },
  });
};
