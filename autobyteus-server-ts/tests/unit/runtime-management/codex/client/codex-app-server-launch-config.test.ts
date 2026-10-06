import { afterEach, describe, expect, it, vi } from "vitest";
import { parseArgs, resolveLaunchCommand } from "../../../../../src/runtime-management/codex/client/codex-app-server-launch-config.js";

const OVERRIDES = ["-c", "agents.enabled=false"];

describe("Codex app-server launch config (REQ-006–008 / AC-007)", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("appends only the native-agent disable policy to the default app-server args", () => {
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
    const first = parseArgs();
    first[0] = "mutated";
    first[first.length - 1] = "agents.enabled=true";
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

  it.each(["string", "JSON"])("keeps the disable policy last when %s args try to enable native agents", (format) => {
    const baseArgs = ["app-server", "-c", "agents.enabled=true"];
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", format === "JSON" ? JSON.stringify(baseArgs) : "");
    vi.stubEnv("CODEX_APP_SERVER_ARGS", baseArgs.join(" "));
    const args = parseArgs();
    expect(args).toEqual([...baseArgs, ...OVERRIDES]);
    expect(args.slice(-2)).toEqual(OVERRIDES);
    expect(args.lastIndexOf("agents.enabled=false")).toBeGreaterThan(args.indexOf("agents.enabled=true"));
  });

  it("preserves old feature keys when supplied as custom base args, not as AutoByteus policy", () => {
    const baseArgs = ["app-server", "-c", "features.multi_agent=true", "-c", "features.multi_agent_v2=false"];
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", JSON.stringify(baseArgs));
    vi.stubEnv("CODEX_APP_SERVER_ARGS", "ignored");
    expect(parseArgs()).toEqual([...baseArgs, ...OVERRIDES]);
  });

  it.each([null, {}, "app-server"])("falls back to string args for a non-array JSON value: %j", (value) => {
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", JSON.stringify(value));
    vi.stubEnv("CODEX_APP_SERVER_ARGS", "app-server --verbose");
    expect(parseArgs()).toEqual(["app-server", "--verbose", ...OVERRIDES]);
  });

  it("preserves an explicitly empty JSON args array instead of using the string or default base", () => {
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", "[]");
    vi.stubEnv("CODEX_APP_SERVER_ARGS", "ignored");
    expect(parseArgs()).toEqual(OVERRIDES);
  });

  it("preserves custom command selection independently from args and leaves environment inputs unchanged", () => {
    vi.stubEnv("CODEX_APP_SERVER_COMMAND", "  /test-owned/bin/custom-codex  ");
    vi.stubEnv("CODEX_APP_SERVER_ARGS_JSON", "");
    vi.stubEnv("CODEX_APP_SERVER_ARGS", "  app-server -c agents.enabled=true  ");
    expect(resolveLaunchCommand()).toBe("/test-owned/bin/custom-codex");
    expect(parseArgs()).toEqual(["app-server", "-c", "agents.enabled=true", ...OVERRIDES]);
    expect(process.env.CODEX_APP_SERVER_COMMAND).toBe("  /test-owned/bin/custom-codex  ");
    expect(process.env.CODEX_APP_SERVER_ARGS_JSON).toBe("");
    expect(process.env.CODEX_APP_SERVER_ARGS).toBe("  app-server -c agents.enabled=true  ");
  });

  it("preserves the default command when the command override is blank", () => {
    vi.stubEnv("CODEX_APP_SERVER_COMMAND", "  ");
    expect(resolveLaunchCommand()).toBe("codex");
  });
});
