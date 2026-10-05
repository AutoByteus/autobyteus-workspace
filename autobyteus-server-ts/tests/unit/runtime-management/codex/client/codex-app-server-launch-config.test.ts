import { afterEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../../../../src/runtime-management/codex/client/codex-app-server-launch-config.js";

const OVERRIDES = ["-c", "features.multi_agent=false", "-c", "features.multi_agent_v2=false"];

describe("Codex app-server launch args (REQ-014 / AC-017)", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("launches the default app-server with Codex multi-agent features disabled", () => {
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", "");
    vi.stubEnv("CODEX_APP_SERVER_ARGS", "");
    expect(parseArgs()).toEqual(["app-server", ...OVERRIDES]);
    // Each call builds a fresh array; callers can't mutate a shared default.
    const first = parseArgs(); first.push("mutated");
    expect(parseArgs()).toEqual(["app-server", ...OVERRIDES]);
  });

  it("appends the overrides after a CODEX_APP_SERVER_ARGS customization", () => {
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", "");
    vi.stubEnv("CODEX_APP_SERVER_ARGS", "  app-server   --listen stdio:// ");
    expect(parseArgs()).toEqual(["app-server", "--listen", "stdio://", ...OVERRIDES]);
  });

  it("appends the overrides after a valid CODEX_APP_SERVER_ARGS_JSON customization, which wins over CODEX_APP_SERVER_ARGS", () => {
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", JSON.stringify(["app-server", "-c", "model=\"o3\""]));
    vi.stubEnv("CODEX_APP_SERVER_ARGS", "ignored");
    expect(parseArgs()).toEqual(["app-server", "-c", "model=\"o3\"", ...OVERRIDES]);
  });

  it("falls back as before for invalid CODEX_APP_SERVER_ARGS_JSON and still appends the overrides", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("CODEX_APP_SERVER_ARGS", "");
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", "{ not json");
    expect(parseArgs()).toEqual(["app-server", ...OVERRIDES]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to parse CODEX_APP_SERVER_ARGS_JSON"));
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", JSON.stringify(["app-server", 7]));
    vi.stubEnv("CODEX_APP_SERVER_ARGS", "app-server --verbose");
    expect(parseArgs()).toEqual(["app-server", "--verbose", ...OVERRIDES]);
  });

  it("keeps the overrides last even when a customization tries to enable the features", () => {
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", JSON.stringify(["app-server", "-c", "features.multi_agent=true"]));
    const args = parseArgs();
    expect(args.slice(-4)).toEqual(OVERRIDES);
    expect(args.lastIndexOf("features.multi_agent=false")).toBeGreaterThan(args.indexOf("features.multi_agent=true"));
  });
});
