import type { RemoteAccessAuthorizationResult } from "../remote-access/domain/models.js";
import { remoteAccessCloseForFailure } from "../remote-access/domain/remote-access-close-codes.js";
import {
  getRemoteAccessAuthService,
  type RemoteAccessAuthService,
} from "../remote-access/services/remote-access-auth-service.js";
import type { NodeDesktopClose } from "./node-desktop-stream.js";

/** At most this many node desktop streams at once on this node, of every kind (REQ-019). */
export const NODE_DESKTOP_MAX_STREAMS = 4;
/** At most this many streams per paired phone (REQ-019). */
export const NODE_DESKTOP_MAX_STREAMS_PER_PHONE = 2;
/** An open phone stream's credential is checked again this long after the previous cycle ended. */
export const NODE_DESKTOP_RECHECK_INTERVAL_MS = 20_000;
/** A check slower than this is left for the next cycle; the stream stays open meanwhile. */
export const NODE_DESKTOP_RECHECK_TIMEOUT_MS = 5_000;

export const NODE_DESKTOP_TOO_MANY_VIEWERS: NodeDesktopClose = Object.freeze({
  code: 4429,
  reason: "NODE_DESKTOP_TOO_MANY_VIEWERS",
});

/**
 * Who opened a stream. Only a paired phone has an identity and a credential the node checks again;
 * trusted-network and loopback viewers count toward the node-wide limit only.
 */
export type NodeDesktopViewer =
  | Readonly<{ kind: "mobile"; deviceId: string; credential: string }>
  | Readonly<{ kind: "trusted_network" | "loopback" }>;

/** What the registry needs from a stream: closing it, and hearing that it ended. */
export type AdmittedNodeDesktopStream = {
  close(close: NodeDesktopClose): void;
  onEnd(listener: () => void): void;
};

export type NodeDesktopAdmission = "admitted" | Readonly<{ refused: NodeDesktopClose }>;

type Entry = Readonly<{ viewer: NodeDesktopViewer; stream: AdmittedNodeDesktopStream }>;

type MobileEntry = Readonly<{ viewer: Extract<NodeDesktopViewer, { kind: "mobile" }>; stream: AdmittedNodeDesktopStream }>;

const isMobileEntry = (entry: Entry): entry is MobileEntry => entry.viewer.kind === "mobile";

/**
 * The node's open desktop streams. It admits a stream within the limits (before the stream connects
 * to the desktop), forgets it when it ends, and, while any phone stream is open, re-checks each phone
 * stream's credential with the shared auth service in cycles that never overlap: a revoked phone or
 * disabled Phone Access ends the stream with the shared policy's close code (REQ-009, ≤ 25 s).
 * The credential lives only in memory here and is never logged.
 */
export class NodeDesktopViewers {
  private readonly entries = new Set<Entry>();
  private timer: NodeJS.Timeout | null = null;
  private disposed = false;

  constructor(private readonly authService: Pick<RemoteAccessAuthService, "authorizeMobileCredential"> = getRemoteAccessAuthService()) {}

  admit(viewer: NodeDesktopViewer, stream: AdmittedNodeDesktopStream): NodeDesktopAdmission {
    if (this.entries.size >= NODE_DESKTOP_MAX_STREAMS) return { refused: NODE_DESKTOP_TOO_MANY_VIEWERS };
    if (viewer.kind === "mobile") {
      const sameDevice = [...this.entries].filter((entry) =>
        entry.viewer.kind === "mobile" && entry.viewer.deviceId === viewer.deviceId).length;
      if (sameDevice >= NODE_DESKTOP_MAX_STREAMS_PER_PHONE) return { refused: NODE_DESKTOP_TOO_MANY_VIEWERS };
    }
    const entry: Entry = { viewer, stream };
    this.entries.add(entry);
    stream.onEnd(() => this.entries.delete(entry));
    this.scheduleRecheck();
    return "admitted";
  }

  /** Stops the re-check timer for good (the server is closing). */
  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private mobileEntries(): MobileEntry[] {
    return [...this.entries].filter(isMobileEntry);
  }

  private scheduleRecheck(): void {
    if (this.disposed || this.timer || this.mobileEntries().length === 0) return;
    this.timer = setTimeout(() => void this.recheck(), NODE_DESKTOP_RECHECK_INTERVAL_MS);
    this.timer.unref();
  }

  private async recheck(): Promise<void> {
    await Promise.all(this.mobileEntries().map((entry) => this.recheckEntry(entry)));
    // The next cycle is scheduled only now, so two cycles never run at the same time.
    this.timer = null;
    this.scheduleRecheck();
  }

  private async recheckEntry(entry: MobileEntry): Promise<void> {
    let result: RemoteAccessAuthorizationResult | "timeout";
    try {
      result = await withTimeout(
        this.authService.authorizeMobileCredential(entry.viewer.credential),
        NODE_DESKTOP_RECHECK_TIMEOUT_MS,
      );
    } catch {
      console.warn("[node-desktop] phone stream re-check failed; retrying next cycle");
      return;
    }
    if (result === "timeout") {
      console.warn("[node-desktop] phone stream re-check timed out; retrying next cycle");
      return;
    }
    if (!result.ok && this.entries.has(entry)) entry.stream.close(remoteAccessCloseForFailure(result.code));
  }
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T | "timeout"> => {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
    timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};
