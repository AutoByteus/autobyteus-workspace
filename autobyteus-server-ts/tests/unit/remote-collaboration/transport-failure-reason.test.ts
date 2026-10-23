import { describe, expect, it } from "vitest";
import { transportFailureReason } from "../../../src/remote-collaboration/channel/transport-failure-reason.js";

/**
 * one-nodes-tab REQ-707: the shapes Node's `fetch` throws, as measured on Node 22 (design § Architecture Investigation
 * Evidence, `evidence/probes/fetch-causes.mjs`).
 */

const fetchFailed = (cause: unknown) => Object.assign(new TypeError("fetch failed"), { cause });

describe("transportFailureReason", () => {
  it("classifies the measured shapes: refused, refused on localhost (AggregateError), unknown host, timeout", () => {
    expect(transportFailureReason(fetchFailed(Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:59999"), { code: "ECONNREFUSED" })))).toBe("refused");
    const aggregate = Object.assign(new AggregateError([
      Object.assign(new Error("connect ECONNREFUSED ::1:59999"), { code: "ECONNREFUSED" }),
      Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:59999"), { code: "ECONNREFUSED" }),
    ], ""), { code: undefined });
    expect(transportFailureReason(fetchFailed(aggregate))).toBe("refused");
    expect(transportFailureReason(fetchFailed(Object.assign(new Error("getaddrinfo ENOTFOUND no-such-host.invalid"), { code: "ENOTFOUND" })))).toBe("not_found");
    expect(transportFailureReason(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }))).toBe("timeout");
  });

  it("reads a temporary name failure as not found, a connect timeout as timeout, and anything else as unreachable", () => {
    expect(transportFailureReason(fetchFailed(Object.assign(new Error("getaddrinfo EAI_AGAIN nas"), { code: "EAI_AGAIN" })))).toBe("not_found");
    expect(transportFailureReason(fetchFailed(Object.assign(new Error("Connect Timeout Error"), { code: "UND_ERR_CONNECT_TIMEOUT" })))).toBe("timeout");
    expect(transportFailureReason(fetchFailed(Object.assign(new Error("connect EHOSTUNREACH"), { code: "EHOSTUNREACH" })))).toBe("unreachable");
    expect(transportFailureReason(new TypeError("fetch failed"))).toBe("unreachable");
    expect(transportFailureReason("boom")).toBe("unreachable");
  });
});
