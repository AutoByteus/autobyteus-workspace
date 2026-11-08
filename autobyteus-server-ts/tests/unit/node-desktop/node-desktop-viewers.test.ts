import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RemoteAccessAuthorizationResult } from "../../../src/remote-access/domain/models.js";
import {
  NODE_DESKTOP_RECHECK_INTERVAL_MS,
  NODE_DESKTOP_RECHECK_TIMEOUT_MS,
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

const phone = (deviceId: string): NodeDesktopViewer => ({ kind: "mobile", deviceId, credential: `mra_${deviceId}_secret` });
const trusted: NodeDesktopViewer = { kind: "trusted_network" };
const ok = (deviceId: string): RemoteAccessAuthorizationResult => ({
  ok: true,
  context: { mode: "mobile", isAuthenticated: true, deviceId },
});
const revoked: RemoteAccessAuthorizationResult = {
  ok: false, statusCode: 403, code: "REMOTE_ACCESS_DEVICE_REVOKED", message: "revoked",
};
const disabled: RemoteAccessAuthorizationResult = {
  ok: false, statusCode: 403, code: "PHONE_ACCESS_DISABLED", message: "disabled",
};

describe("NodeDesktopViewers", () => {
  let authorize: ReturnType<typeof vi.fn<(credential: string | null | undefined) => Promise<RemoteAccessAuthorizationResult>>>;
  let viewers: NodeDesktopViewers;

  beforeEach(() => {
    vi.useFakeTimers();
    authorize = vi.fn(async (credential: string | null | undefined) => ok(String(credential).split("_")[1]!));
    viewers = new NodeDesktopViewers({ authorizeMobileCredential: authorize });
  });

  afterEach(() => {
    viewers.dispose();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("admission", () => {
    it("admits 4 streams node-wide and refuses the 5th with 4429", () => {
      for (const viewer of [trusted, trusted, phone("a"), phone("b")]) {
        expect(viewers.admit(viewer, new FakeStream(), "view")).toBe("admitted");
      }
      expect(viewers.admit(trusted, new FakeStream(), "view")).toEqual({ refused: NODE_DESKTOP_TOO_MANY_VIEWERS, limit: "node", openStreams: 4 });
      expect(viewers.admit(phone("c"), new FakeStream(), "view")).toEqual({ refused: NODE_DESKTOP_TOO_MANY_VIEWERS, limit: "node", openStreams: 4 });
      expect(NODE_DESKTOP_TOO_MANY_VIEWERS).toEqual({ code: 4429, reason: "NODE_DESKTOP_TOO_MANY_VIEWERS" });
    });

    it("admits 2 streams per phone and refuses its 3rd while other viewers still fit", () => {
      expect(viewers.admit(phone("a"), new FakeStream(), "view")).toBe("admitted");
      expect(viewers.admit(phone("a"), new FakeStream(), "view")).toBe("admitted");
      expect(viewers.admit(phone("a"), new FakeStream(), "view")).toEqual({ refused: NODE_DESKTOP_TOO_MANY_VIEWERS, limit: "phone", openStreams: 2 });
      expect(viewers.admit(phone("b"), new FakeStream(), "view")).toBe("admitted");
      expect(viewers.admit(trusted, new FakeStream(), "view")).toBe("admitted");
    });

    it("counts trusted-network and loopback viewers node-wide only", () => {
      expect(viewers.admit(trusted, new FakeStream(), "view")).toBe("admitted");
      expect(viewers.admit({ kind: "loopback" }, new FakeStream(), "view")).toBe("admitted");
      expect(viewers.admit(trusted, new FakeStream(), "view")).toBe("admitted");
      expect(viewers.admit(phone("a"), new FakeStream(), "view")).toBe("admitted");
      expect(viewers.admit(phone("a"), new FakeStream(), "view")).toEqual({ refused: NODE_DESKTOP_TOO_MANY_VIEWERS, limit: "node", openStreams: 4 });
    });

    it("logs each refusal with only its reason, limit, mode, viewer kind and counts (REQ-006)", () => {
      const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
      viewers.admit(phone("a"), new FakeStream(), "control");
      viewers.admit(phone("a"), new FakeStream(), "control");
      viewers.admit(phone("a"), new FakeStream(), "control");
      viewers.admit(trusted, new FakeStream(), "view");
      viewers.admit(trusted, new FakeStream(), "view");
      viewers.admit(trusted, new FakeStream(), "view");

      expect(info.mock.calls.map((call) => call[0])).toEqual([
        "[node-desktop] stream refused reason=NODE_DESKTOP_TOO_MANY_VIEWERS limit=phone mode=control viewer=mobile open=2 max=2",
        "[node-desktop] stream refused reason=NODE_DESKTOP_TOO_MANY_VIEWERS limit=node mode=view viewer=trusted_network open=4 max=4",
      ]);
      expect(info.mock.calls.flat().join(" ")).not.toMatch(/mra_|secret|deviceId|\ba\b/);
    });

    it("releases a place when a stream ends", () => {
      const streams = Array.from({ length: 4 }, () => new FakeStream());
      for (const stream of streams) viewers.admit(trusted, stream, "view");
      expect(viewers.admit(trusted, new FakeStream(), "view")).toHaveProperty("refused");
      streams[0]!.end();
      expect(viewers.admit(trusted, new FakeStream(), "view")).toBe("admitted");

      const first = new FakeStream();
      const second = new FakeStream();
      const fresh = new NodeDesktopViewers({ authorizeMobileCredential: authorize });
      fresh.admit(phone("a"), first, "view");
      fresh.admit(phone("a"), second, "view");
      first.end();
      expect(fresh.admit(phone("a"), new FakeStream(), "view")).toBe("admitted");
      fresh.dispose();
    });
  });

  describe("re-check of open phone streams", () => {
    it("runs no timer while no phone stream is open", async () => {
      viewers.admit(trusted, new FakeStream(), "view");
      await vi.advanceTimersByTimeAsync(3 * NODE_DESKTOP_RECHECK_INTERVAL_MS);
      expect(authorize).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });

    it("closes only the rejected phone streams, with the shared policy's code, within one interval", async () => {
      const keep = new FakeStream();
      const revokedStream = new FakeStream();
      const local = new FakeStream();
      viewers.admit(phone("a"), keep, "view");
      viewers.admit(phone("b"), revokedStream, "view");
      viewers.admit(trusted, local, "view");
      authorize.mockImplementation(async (credential) => (String(credential).includes("_b_") ? revoked : ok("a")));

      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS);

      expect(revokedStream.closes).toEqual([{ code: 4403, reason: "REMOTE_ACCESS_DEVICE_REVOKED" }]);
      expect(keep.closes).toEqual([]);
      expect(local.closes).toEqual([]);
      expect(authorize).toHaveBeenCalledTimes(2);
      expect(authorize).not.toHaveBeenCalledWith(expect.not.stringMatching(/^mra_/));
    });

    it("closes every phone stream when Phone Access is disabled", async () => {
      const streams = [new FakeStream(), new FakeStream()];
      viewers.admit(phone("a"), streams[0]!, "view");
      viewers.admit(phone("b"), streams[1]!, "view");
      authorize.mockResolvedValue(disabled);
      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS);
      expect(streams.map((stream) => stream.closes)).toEqual([
        [{ code: 4403, reason: "PHONE_ACCESS_DISABLED" }],
        [{ code: 4403, reason: "PHONE_ACCESS_DISABLED" }],
      ]);
    });

    it("checks the phones of one cycle concurrently and never overlaps two cycles", async () => {
      const pending: Array<() => void> = [];
      authorize.mockImplementation((credential) => new Promise((resolve) => {
        pending.push(() => resolve(ok(String(credential).split("_")[1]!)));
      }));
      viewers.admit(phone("a"), new FakeStream(), "view");
      viewers.admit(phone("b"), new FakeStream(), "view");

      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS);
      expect(authorize).toHaveBeenCalledTimes(2);
      // The checks are still open: another interval passes without a second cycle.
      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_TIMEOUT_MS - 1);
      expect(authorize).toHaveBeenCalledTimes(2);
      for (const resolve of pending.splice(0)) resolve();
      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS);
      expect(authorize).toHaveBeenCalledTimes(4);
    });

    it("leaves a stream whose check times out or fails and retries it next cycle", async () => {
      const stream = new FakeStream();
      viewers.admit(phone("a"), stream, "view");
      authorize.mockImplementationOnce(() => new Promise(() => undefined));
      vi.spyOn(console, "warn").mockImplementation(() => undefined);

      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS + NODE_DESKTOP_RECHECK_TIMEOUT_MS);
      expect(stream.closes).toEqual([]);

      authorize.mockRejectedValueOnce(new Error("store unavailable"));
      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS);
      expect(stream.closes).toEqual([]);

      authorize.mockResolvedValueOnce(revoked);
      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS);
      expect(stream.closes).toEqual([{ code: 4403, reason: "REMOTE_ACCESS_DEVICE_REVOKED" }]);
      expect(authorize).toHaveBeenCalledTimes(3);
    });

    it("detects a revocation at most one interval plus one timeout after it happens", async () => {
      const stream = new FakeStream();
      viewers.admit(phone("a"), stream, "view");
      // A slow (but answering) store: each check takes just under the timeout.
      authorize.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, NODE_DESKTOP_RECHECK_TIMEOUT_MS - 1));
        return ok("a");
      });
      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS + 1);
      // Revoked just after a cycle has started its check: that check still answers ok.
      authorize.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, NODE_DESKTOP_RECHECK_TIMEOUT_MS - 1));
        return revoked;
      });
      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_TIMEOUT_MS + NODE_DESKTOP_RECHECK_INTERVAL_MS + NODE_DESKTOP_RECHECK_TIMEOUT_MS);
      expect(stream.closes).toEqual([{ code: 4403, reason: "REMOTE_ACCESS_DEVICE_REVOKED" }]);
      expect(NODE_DESKTOP_RECHECK_INTERVAL_MS + NODE_DESKTOP_RECHECK_TIMEOUT_MS).toBeLessThanOrEqual(25_000);
    });

    it("stops the timer when the last phone stream ends, and for good on dispose", async () => {
      const stream = new FakeStream();
      viewers.admit(phone("a"), stream, "view");
      expect(vi.getTimerCount()).toBe(1);
      stream.end();
      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS);
      expect(vi.getTimerCount()).toBe(0);

      viewers.admit(phone("b"), new FakeStream(), "view");
      viewers.dispose();
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(2 * NODE_DESKTOP_RECHECK_INTERVAL_MS);
      expect(authorize).toHaveBeenCalledTimes(0);
    });

    it("never logs the credential", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
      viewers.admit(phone("a"), new FakeStream(), "view");
      authorize.mockRejectedValueOnce(new Error("mra_a_secret leaked?"));
      await vi.advanceTimersByTimeAsync(NODE_DESKTOP_RECHECK_INTERVAL_MS);
      const logged = [...warn.mock.calls, ...info.mock.calls].flat().map(String).join("\n");
      expect(logged).not.toContain("mra_");
    });
  });
});
