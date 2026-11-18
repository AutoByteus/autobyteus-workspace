import { describe, expect, it } from "vitest";
import { isIpv6LinkLocal, isIpv6UniqueLocal } from "../../../src/remote-access/services/ip-address-ranges.js";

describe("IPv6 address ranges", () => {
  it("recognises fc00::/7 as unique local", () => {
    expect(["fc00::1", "fd7a:115c:a1e0::1", "FDFF::"].map(isIpv6UniqueLocal)).toEqual([true, true, true]);
    expect(["fe80::1", "2001:db8::1", "::1", "10.0.0.1", "fcg0::1"].map(isIpv6UniqueLocal)).toEqual([false, false, false, false, false]);
  });

  it("recognises fe80::/10 as link-local", () => {
    expect(["fe80::1", "febf::1", "FE90::2"].map(isIpv6LinkLocal)).toEqual([true, true, true]);
    expect(["fec0::1", "fd00::1", "::", "169.254.1.1"].map(isIpv6LinkLocal)).toEqual([false, false, false, false]);
  });
});
