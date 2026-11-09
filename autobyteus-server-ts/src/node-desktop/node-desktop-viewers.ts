import type { ClientIdentity } from "../node-access/domain/client-identity.js";
import type { NodeDesktopClose } from "./node-desktop-stream.js";
import type { NodeDesktopMode } from "./rfb-viewer-input-filter.js";

/** At most this many node desktop streams at once on this node, of every kind (REQ-019). */
export const NODE_DESKTOP_MAX_STREAMS = 4;
/** At most this many streams per paired phone (REQ-019). */
export const NODE_DESKTOP_MAX_STREAMS_PER_PHONE = 2;

export const NODE_DESKTOP_TOO_MANY_VIEWERS: NodeDesktopClose = Object.freeze({
  code: 4429,
  reason: "NODE_DESKTOP_TOO_MANY_VIEWERS",
});

/** Who opened a stream: the client identity the node's request gate established for its upgrade. */
export type NodeDesktopViewer = ClientIdentity;

/** What the registry needs from a stream: closing it, and hearing that it ended. */
export type AdmittedNodeDesktopStream = {
  close(close: NodeDesktopClose): void;
  onEnd(listener: () => void): void;
};

/** A refusal names the limit that refused the stream and how many streams that limit already counted. */
export type NodeDesktopAdmission =
  | "admitted"
  | Readonly<{ refused: NodeDesktopClose; limit: "node" | "phone"; openStreams: number }>;

type Entry = Readonly<{ viewer: NodeDesktopViewer; stream: AdmittedNodeDesktopStream }>;

/**
 * The node's open desktop streams. It admits a stream within the limits (before the stream connects to the desktop)
 * and forgets it when it ends. A revoked phone's or disabled Phone Access's open streams are closed by the node's
 * request gate, which keeps every open socket by client identity (NA-11).
 */
export class NodeDesktopViewers {
  private readonly entries = new Set<Entry>();

  admit(viewer: NodeDesktopViewer, stream: AdmittedNodeDesktopStream, mode: NodeDesktopMode): NodeDesktopAdmission {
    if (this.entries.size >= NODE_DESKTOP_MAX_STREAMS) return refuse(viewer, mode, "node", this.entries.size);
    if (viewer.kind === "phone") {
      const sameDevice = [...this.entries].filter((entry) =>
        entry.viewer.kind === "phone" && entry.viewer.deviceId === viewer.deviceId).length;
      if (sameDevice >= NODE_DESKTOP_MAX_STREAMS_PER_PHONE) return refuse(viewer, mode, "phone", sameDevice);
    }
    const entry: Entry = { viewer, stream };
    this.entries.add(entry);
    stream.onEnd(() => this.entries.delete(entry));
    return "admitted";
  }
}

const LIMIT_MAX: Readonly<Record<"node" | "phone", number>> = {
  node: NODE_DESKTOP_MAX_STREAMS,
  phone: NODE_DESKTOP_MAX_STREAMS_PER_PHONE,
};

/** One metadata-only line per refusal: no device ID, credential or address (REQ-006). */
const refuse = (
  viewer: NodeDesktopViewer,
  mode: NodeDesktopMode,
  limit: "node" | "phone",
  openStreams: number,
): NodeDesktopAdmission => {
  console.info(
    `[node-desktop] stream refused reason=${NODE_DESKTOP_TOO_MANY_VIEWERS.reason} limit=${limit} mode=${mode}`
    + ` viewer=${viewer.kind} open=${openStreams} max=${LIMIT_MAX[limit]}`,
  );
  return { refused: NODE_DESKTOP_TOO_MANY_VIEWERS, limit, openStreams };
};
