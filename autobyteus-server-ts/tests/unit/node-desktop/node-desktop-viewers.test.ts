import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NODE_DESKTOP_TOO_MANY_VIEWERS,
  NodeDesktopViewers,
  type NodeDesktopViewer,
} from "../../../src/node-desktop/node-desktop-viewers.js";

class FakeStream {
  closes: Array<{ code: number; reason: string }> = [];
  private listeners: Array<() => void> = [];
  close(close: { code: number; reason: string }) {
    this.closes.push(close);
    this.end();
  }
  onEnd(listener: () => void) {
    this.listeners.push(listener);
  }
  end() {
    for (const listener of this.listeners.splice(0)) listener();
  }
}

/** Viewers are the client identities the node access gate established for their upgrades. */
const phone = (deviceId: string): NodeDesktopViewer => ({ kind: "phone", deviceId });
const owner: NodeDesktopViewer = { kind: "owner", credentialId: "launch" };
const otherOwner: NodeDesktopViewer = { kind: "owner", credentialId: "owncred_2" };

describe("NodeDesktopViewers", () => {
  let viewers: NodeDesktopViewers;

  beforeEach(() => {
    viewers = new NodeDesktopViewers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("admits 4 streams node-wide and refuses the 5th with 4429", () => {
    for (const viewer of [owner, otherOwner, phone("a"), phone("b")]) {
      expect(viewers.admit(viewer, new FakeStream(), "view")).toBe("admitted");
    }
    expect(viewers.admit(owner, new FakeStream(), "view")).toEqual({ refused: NODE_DESKTOP_TOO_MANY_VIEWERS, limit: "node", openStreams: 4 });
    expect(viewers.admit(phone("c"), new FakeStream(), "view")).toEqual({ refused: NODE_DESKTOP_TOO_MANY_VIEWERS, limit: "node", openStreams: 4 });
    expect(NODE_DESKTOP_TOO_MANY_VIEWERS).toEqual({ code: 4429, reason: "NODE_DESKTOP_TOO_MANY_VIEWERS" });
  });

  it("admits 2 streams per phone and refuses its 3rd while other viewers still fit", () => {
    expect(viewers.admit(phone("a"), new FakeStream(), "view")).toBe("admitted");
    expect(viewers.admit(phone("a"), new FakeStream(), "view")).toBe("admitted");
    expect(viewers.admit(phone("a"), new FakeStream(), "view")).toEqual({ refused: NODE_DESKTOP_TOO_MANY_VIEWERS, limit: "phone", openStreams: 2 });
    expect(viewers.admit(phone("b"), new FakeStream(), "view")).toBe("admitted");
    expect(viewers.admit(owner, new FakeStream(), "view")).toBe("admitted");
  });

  it("counts owner viewers node-wide only", () => {
    expect(viewers.admit(owner, new FakeStream(), "view")).toBe("admitted");
    expect(viewers.admit(owner, new FakeStream(), "view")).toBe("admitted");
    expect(viewers.admit(owner, new FakeStream(), "view")).toBe("admitted");
    expect(viewers.admit(phone("a"), new FakeStream(), "view")).toBe("admitted");
    expect(viewers.admit(phone("a"), new FakeStream(), "view")).toEqual({ refused: NODE_DESKTOP_TOO_MANY_VIEWERS, limit: "node", openStreams: 4 });
  });

  it("logs each refusal with only its reason, limit, mode, viewer kind and counts (REQ-006)", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    viewers.admit(phone("a"), new FakeStream(), "control");
    viewers.admit(phone("a"), new FakeStream(), "control");
    viewers.admit(phone("a"), new FakeStream(), "control");
    viewers.admit(owner, new FakeStream(), "view");
    viewers.admit(owner, new FakeStream(), "view");
    viewers.admit(owner, new FakeStream(), "view");

    expect(info.mock.calls.map((call) => call[0])).toEqual([
      "[node-desktop] stream refused reason=NODE_DESKTOP_TOO_MANY_VIEWERS limit=phone mode=control viewer=phone open=2 max=2",
      "[node-desktop] stream refused reason=NODE_DESKTOP_TOO_MANY_VIEWERS limit=node mode=view viewer=owner open=4 max=4",
    ]);
    expect(info.mock.calls.flat().join(" ")).not.toMatch(/mra_|own_|deviceId|\ba\b/);
  });

  it("releases a place when a stream ends", () => {
    const streams = Array.from({ length: 4 }, () => new FakeStream());
    for (const stream of streams) viewers.admit(owner, stream, "view");
    expect(viewers.admit(owner, new FakeStream(), "view")).toHaveProperty("refused");
    streams[0]!.end();
    expect(viewers.admit(owner, new FakeStream(), "view")).toBe("admitted");

    const first = new FakeStream();
    const second = new FakeStream();
    const fresh = new NodeDesktopViewers();
    fresh.admit(phone("a"), first, "view");
    fresh.admit(phone("a"), second, "view");
    first.end();
    expect(fresh.admit(phone("a"), new FakeStream(), "view")).toBe("admitted");
  });
});
