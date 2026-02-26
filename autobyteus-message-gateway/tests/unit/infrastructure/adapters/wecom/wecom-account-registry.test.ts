import { describe, expect, it } from "vitest";
import { WeComAccountRegistry } from "../../../../../src/infrastructure/adapters/wecom/wecom-account-registry.js";

describe("WeComAccountRegistry", () => {
  it("lists and resolves configured accounts", () => {
    const registry = new WeComAccountRegistry([
      { accountId: "corp-main", label: "Corp Main", mode: "APP" },
      { accountId: "legacy-ops", label: "Legacy Ops", mode: "LEGACY" },
    ]);

    expect(registry.listAccounts()).toEqual([
      { accountId: "corp-main", label: "Corp Main", mode: "APP" },
      { accountId: "legacy-ops", label: "Legacy Ops", mode: "LEGACY" },
    ]);
    expect(registry.resolveAccount("corp-main")).toEqual({
      accountId: "corp-main",
      label: "Corp Main",
      mode: "APP",
    });
    expect(registry.resolveAccount("missing")).toBeNull();
    expect(registry.isConfiguredAccount("legacy-ops")).toBe(true);
    expect(registry.isConfiguredAccount("missing")).toBe(false);
  });
});
