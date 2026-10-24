import { describe, expect, it } from "vitest";
import {
  isLoopbackClientAddress,
  normalizeClientAddress,
} from "../../../src/api/security/remote-access-local-trust.js";

describe("remote access local trust", () => {
  it.each(["127.0.0.1", "127.2.3.4", "::1", "::ffff:127.0.0.1", "::ffff:127.9.8.7"])(
    "accepts loopback client address %s",
    (address) => {
      expect(isLoopbackClientAddress(address)).toBe(true);
    },
  );

  it.each(["192.168.1.10", "100.64.1.2", "10.0.0.2", "8.8.8.8", undefined, "not an ip"])(
    "rejects non-loopback client address %s",
    (address) => {
      expect(isLoopbackClientAddress(address)).toBe(false);
    },
  );

  it("normalizes ipv4-mapped loopback as ipv4", () => {
    expect(normalizeClientAddress("::ffff:127.0.0.1")).toMatchObject({
      family: "ipv4",
      normalized: "127.0.0.1",
    });
  });
});
