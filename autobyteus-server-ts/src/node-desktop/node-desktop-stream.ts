import net from "node:net";
import type { NodeDesktopTarget } from "./node-desktop-availability.js";
import { RfbViewerInputFilter, type NodeDesktopMode } from "./rfb-viewer-input-filter.js";

/** The viewer's WebSocket as the stream uses it (a `ws` WebSocket satisfies it). */
export type NodeDesktopViewerSocket = {
  readonly bufferedAmount: number;
  send(data: Buffer, callback: (error?: Error) => void): void;
  close(code?: number, reason?: string): void;
  pause(): void;
  resume(): void;
  on(event: "message", listener: (data: Buffer) => void): unknown;
  on(event: "close", listener: () => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
};

/**
 * Pause reading the node desktop once this many bytes wait for the viewer. One TCP read is at most
 * 64 KiB and a server WebSocket frame header at most 10 bytes, so the buffered amount stays below
 * 8 MiB per stream (REQ-010).
 */
export const VIEWER_HIGH_WATERMARK_BYTES = 8 * 1024 * 1024 - 64 * 1024 - 16;
/** Resume reading once the viewer has taken the buffered bytes down to this. */
export const VIEWER_LOW_WATERMARK_BYTES = 1024 * 1024;

export const NODE_DESKTOP_CLOSE = Object.freeze({
  viewerProtocol: { code: 4400, reason: "NODE_DESKTOP_VIEWER_PROTOCOL" },
  disconnected: { code: 4502, reason: "NODE_DESKTOP_DISCONNECTED" },
});

type EndCause = "viewer-closed" | "viewer-error" | "viewer-protocol" | "desktop-closed" | "desktop-error";

export type NodeDesktopStreamOptions = Readonly<{
  socket: NodeDesktopViewerSocket;
  target: NodeDesktopTarget;
  mode: NodeDesktopMode;
  /** How the viewer was admitted (`RemoteAccessAuthContext.mode`), for the log line only. */
  viewerKind: string;
}>;

/**
 * One viewer of the node desktop: a WebSocket bridged to Xvnc's TCP port. Viewer bytes pass the
 * RFB input filter for the stream's mode; Xvnc bytes go to the viewer unchanged. Whichever side
 * ends first, the other is closed and one metadata-only line is logged (REQ-011).
 */
export class NodeDesktopStream {
  private readonly filter: RfbViewerInputFilter;
  private tcp: net.Socket | null = null;
  private desktopPaused = false;
  private ended = false;
  private startedAt = 0;
  private bytesToViewer = 0;
  private bytesFromViewer = 0;

  constructor(private readonly options: NodeDesktopStreamOptions) {
    this.filter = new RfbViewerInputFilter(options.mode);
  }

  start(): void {
    const { socket, target } = this.options;
    this.startedAt = Date.now();
    const tcp = net.connect({ host: target.host, port: target.port });
    this.tcp = tcp;
    tcp.setNoDelay(true);
    tcp.on("data", (chunk: Buffer) => this.toViewer(chunk));
    tcp.on("drain", () => socket.resume());
    tcp.on("end", () => this.end("desktop-closed"));
    tcp.on("close", () => this.end("desktop-closed"));
    tcp.on("error", () => this.end("desktop-error"));
    socket.on("message", (data: Buffer) => this.fromViewer(data));
    socket.on("close", () => this.end("viewer-closed"));
    socket.on("error", () => this.end("viewer-error"));
  }

  private toViewer(chunk: Buffer): void {
    if (this.ended) return;
    const { socket } = this.options;
    this.bytesToViewer += chunk.length;
    socket.send(chunk, () => {
      if (this.desktopPaused && !this.ended && socket.bufferedAmount < VIEWER_LOW_WATERMARK_BYTES) {
        this.desktopPaused = false;
        this.tcp?.resume();
      }
    });
    if (!this.desktopPaused && socket.bufferedAmount >= VIEWER_HIGH_WATERMARK_BYTES) {
      this.desktopPaused = true;
      this.tcp?.pause();
    }
  }

  private fromViewer(data: Buffer): void {
    if (this.ended || !this.tcp) return;
    const result = this.filter.accept(data);
    if ("reject" in result) {
      this.end("viewer-protocol");
      return;
    }
    if (result.forward.length === 0) return;
    this.bytesFromViewer += result.forward.length;
    if (!this.tcp.write(result.forward)) this.options.socket.pause();
  }

  private end(cause: EndCause): void {
    if (this.ended) return;
    this.ended = true;
    this.tcp?.destroy();
    const close = cause === "viewer-protocol"
      ? NODE_DESKTOP_CLOSE.viewerProtocol
      : cause === "desktop-closed" || cause === "desktop-error"
        ? NODE_DESKTOP_CLOSE.disconnected
        : null;
    if (close) {
      try {
        this.options.socket.close(close.code, close.reason);
      } catch {
        // The viewer socket is already gone.
      }
    }
    console.info(
      `[node-desktop] stream ended mode=${this.options.mode} viewer=${this.options.viewerKind}`
      + ` durationMs=${Date.now() - this.startedAt} toViewer=${this.bytesToViewer}`
      + ` fromViewer=${this.bytesFromViewer} reason=${cause}`,
    );
  }
}
