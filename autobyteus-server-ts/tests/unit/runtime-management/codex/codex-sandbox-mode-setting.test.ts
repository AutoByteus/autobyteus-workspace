import { describe, expect, it } from "vitest";
import {
  CODEX_APP_SERVER_SANDBOX_SETTING_KEY,
  CODEX_SANDBOX_MODES,
  DEFAULT_CODEX_SANDBOX_MODE,
  isCodexSandboxMode,
  normalizeCodexSandboxMode,
} from "../../../../src/runtime-management/codex/codex-sandbox-mode-setting.js";

describe("codex sandbox mode setting", () => {
  it("exports the canonical key, default, and supported mode list", () => {
    expect(CODEX_APP_SERVER_SANDBOX_SETTING_KEY).toBe("CODEX_APP_SERVER_SANDBOX");
    expect(DEFAULT_CODEX_SANDBOX_MODE).toBe("workspace-write");
    expect(CODEX_SANDBOX_MODES).toEqual([
      "read-only",
      "workspace-write",
      "danger-full-access",
    ]);
  });

  it("normalizes blank or invalid values to the safe default", () => {
    expect(normalizeCodexSandboxMode(undefined)).toBe("workspace-write");
    expect(normalizeCodexSandboxMode(" ")).toBe("workspace-write");
    expect(normalizeCodexSandboxMode("full-access")).toBe("workspace-write");
  });

  it("trims and accepts only canonical Codex sandbox modes", () => {
    expect(normalizeCodexSandboxMode(" read-only ")).toBe("read-only");
    expect(normalizeCodexSandboxMode("workspace-write")).toBe("workspace-write");
    expect(normalizeCodexSandboxMode("danger-full-access")).toBe("danger-full-access");
    expect(isCodexSandboxMode("danger-full-access")).toBe(true);
    expect(isCodexSandboxMode("danger_full_access")).toBe(false);
  });
});
