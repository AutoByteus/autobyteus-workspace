import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionConfigOption } from "@agentclientprotocol/sdk";
import { DeepSeekHarnessHome } from "../../../../src/runtime-management/deepseek-harness/deepseek-harness-home.js";
import { buildDshHomePatch } from "../../../../src/runtime-management/deepseek-harness/deepseek-harness-home-files.js";
import { createDeepSeekHarnessLaunchProfile } from "../../../../src/runtime-management/deepseek-harness/deepseek-harness-launch-profile.js";
import {
  discoverDeepSeekHarnessModels,
  normalizeDeepSeekHarnessModels,
  toDeepSeekHarnessDiagnostic,
} from "../../../../src/runtime-management/deepseek-harness/deepseek-harness-capability.js";
import { createDeepSeekHarnessAgentRuntimeStrategy } from "../../../../src/runtime-management/agent-runtimes/strategies/deepseek-harness-agent-runtime-strategy.js";
import { RuntimeAvailabilityService, getRuntimeAvailabilityService } from "../../../../src/runtime-management/runtime-availability-service.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { setProcessProviderRelayAccess } from "../../../../src/credential-proxy/provider-relays/provider-relay-process-access.js";
import { DSH_CONFIG_OPTIONS } from "../../agent-execution/backends/deepseek-harness/dsh-fake-fixtures.js";

const roots: string[] = [];
const tempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-home-"));
  roots.push(root);
  return root;
};

afterEach(() => {
  vi.unstubAllEnvs();
  setProcessProviderRelayAccess(null);
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

const RELAY_ACCESS = { baseUrl: "http://127.0.0.1:41000/relay/deepseek", apiKey: "rp_run-pass" };

describe("the AutoByteus-owned dsh home (DEC-007)", () => {
  it("writes the home patch and the literal instructions plugin, rewriting a file only when it differs, through a temporary file", async () => {
    const home = new DeepSeekHarnessHome(tempRoot());
    await home.ensure();
    const patchFile = path.join(home.homeDir, "cordis.patch.yml");
    const pluginFile = path.join(home.homeDir, "plugins", "autobyteus-agent-instructions.mjs");
    const patch = fs.readFileSync(patchFile, "utf8");
    expect(patch).toBe(buildDshHomePatch(pluginFile));
    expect(patch).toContain("personaPrefix: ''");
    expect(patch).toContain(`name: ${JSON.stringify(pluginFile)}`);
    expect(patch).toContain("instructionsFile: !!js process.env.AUTOBYTEUS_DSH_INSTRUCTIONS_FILE");
    expect(patch).toContain("includeDefaultRoots: false");
    // An empty list when the launch gives no skills folder (discovery), never `[undefined]`.
    expect(patch).toContain('customSkillDirs: !!js "process.env.AUTOBYTEUS_DSH_SKILLS_DIR ? [process.env.AUTOBYTEUS_DSH_SKILLS_DIR] : []"');
    expect(patch).toMatch(/- id: session-log-deepseek\n {2}config:\n {4}enabled: false/);
    for (const tool of ["tool-subagent", "tool-subagent-fork", "tool-subagent-control", "tool-workflow", "tool-goal", "tool-plugin-manager"]) {
      expect(patch).toContain(`- id: ${tool}\n  disabled: true`);
    }
    const plugin = fs.readFileSync(pluginFile, "utf8");
    expect(plugin).toContain("interpolate: false");
    expect(plugin).toContain("if (!config.instructionsFile) return;");

    const before = fs.statSync(patchFile).mtimeMs;
    await new Promise((resolve) => setTimeout(resolve, 20));
    await home.ensure();
    expect(fs.statSync(patchFile).mtimeMs).toBe(before);
    fs.writeFileSync(patchFile, "edited");
    await home.ensure();
    expect(fs.readFileSync(patchFile, "utf8")).toBe(patch);
    expect(fs.readdirSync(home.homeDir).filter((name) => name.endsWith(".tmp"))).toEqual([]);
    expect(fs.existsSync(path.join(home.homeDir, ".credentials.yaml"))).toBe(false);
  });

  it("keeps a run's instructions in its own folder, removed by its release", async () => {
    const home = new DeepSeekHarnessHome(tempRoot());
    const files = await home.prepareRun("run/../1", "Rule: answer with {{literal}} braces.");
    expect(path.dirname(path.dirname(files.instructionsFile))).toBe(path.join(home.homeDir, "..", "runs"));
    expect(fs.readFileSync(files.instructionsFile, "utf8")).toBe("Rule: answer with {{literal}} braces.");
    await files.release();
    expect(fs.existsSync(path.dirname(files.instructionsFile))).toBe(false);
  });
});

describe("the dsh launch profile", () => {
  it("launches `dsh --profile acp` with the owned home, the relay and the run's pass — never a key (QR-001, DEC-012)", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-inherited-from-dotenv");
    vi.stubEnv("DEEPSEEK_BASE_URL", "https://example.invalid");
    vi.stubEnv("DSH_PERMISSION_MODE", "danger-full-access");
    const home = new DeepSeekHarnessHome(tempRoot());
    const profile = createDeepSeekHarnessLaunchProfile(() => home);
    expect(profile.providerRelayId).toBe("deepseek");
    const launch = await profile.runLaunch({
      runId: "run-1", workingDirectory: "/work/repo/sub", instructions: "Be terse.", model: "deepseek-v4-flash",
      reasoningEffort: "max", relayAccess: RELAY_ACCESS,
    });
    expect(launch.args).toEqual(["--profile", "acp"]);
    expect(launch.env).toMatchObject({
      DSH_HOME: home.homeDir,
      DEEPSEEK_API_KEY: "rp_run-pass",
      DEEPSEEK_BASE_URL: "http://127.0.0.1:41000/relay/deepseek",
      AUTOBYTEUS_DSH_SKILLS_DIR: path.join("/work/repo/sub", ".dsh", "skills"),
    });
    expect(launch.env.DSH_PERMISSION_MODE).toBeUndefined();
    expect(Object.values(launch.env)).not.toContain("sk-inherited-from-dotenv");
    expect(fs.readFileSync(launch.env.AUTOBYTEUS_DSH_INSTRUCTIONS_FILE!, "utf8")).toBe("Be terse.");
    expect(fs.existsSync(path.join(home.homeDir, "cordis.patch.yml"))).toBe(true);
    await launch.release();
    expect(fs.existsSync(launch.env.AUTOBYTEUS_DSH_INSTRUCTIONS_FILE!)).toBe(false);
  });

  it("refuses a run launch without relay access", async () => {
    const profile = createDeepSeekHarnessLaunchProfile(() => new DeepSeekHarnessHome(tempRoot()));
    await expect(profile.runLaunch({ runId: "run-1", workingDirectory: "/w", instructions: "", model: null, reasoningEffort: null, relayAccess: null }))
      .rejects.toThrow("ACP_LAUNCH_INVALID");
  });

  it("gives discovery the relay's address and a placeholder (dsh lists its models only with a key) — no pass, no key, no run files", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-inherited-from-dotenv");
    const home = new DeepSeekHarnessHome(tempRoot());
    const launch = await createDeepSeekHarnessLaunchProfile(() => home).discoveryLaunch({ relayBaseUrl: RELAY_ACCESS.baseUrl });
    expect(launch.env).toMatchObject({ DSH_HOME: home.homeDir, DEEPSEEK_BASE_URL: RELAY_ACCESS.baseUrl });
    expect(launch.env.DEEPSEEK_API_KEY).toBe("autobyteus-model-discovery");
    expect(launch.env.AUTOBYTEUS_DSH_INSTRUCTIONS_FILE).toBeUndefined();
    expect(launch.env.AUTOBYTEUS_DSH_SKILLS_DIR).toBeUndefined();
  });
});

describe("dsh model discovery (DS-005)", () => {
  it("offers dsh's official-route models with its reasoning efforts (AC-005, DEC-013)", () => {
    const models = normalizeDeepSeekHarnessModels(DSH_CONFIG_OPTIONS as SessionConfigOption[]);
    expect(models.map((model) => [model.model_identifier, model.display_name])).toEqual([
      ["deepseek-v4-flash", "deepseek-v4-flash"], ["deepseek-flash", "DeepSeek-V4.1-Flash"], ["deepseek-v4-pro", "DeepSeek-V4-Pro"],
    ]);
    expect(models[0]).toMatchObject({ provider_type: "DEEPSEEK", provider_name: "DeepSeek Harness", runtime: "api" });
    expect(models[0]!.config_schema).toMatchObject({ properties: { reasoning_effort: expect.objectContaining({
      enum: ["off", "low", "high", "max"], default: "high" }) } });
  });

  it("ignores other routes and malformed values", () => {
    const options = [{
      id: "model", name: "Model", type: "select", currentValue: "x",
      options: [{ value: "[\"other-route\",\"m\"]", name: "m" }, { value: "not json", name: "bad" }],
    }] as SessionConfigOption[];
    expect(normalizeDeepSeekHarnessModels(options)).toEqual([]);
  });

  it("reports dsh unavailable without this process's relay, and a transient diagnostic while the proxy is not listening (DEC-020)", async () => {
    const unavailable = await discoverDeepSeekHarnessModels({ relayAccess: null }).catch((error) => error);
    expect(toDeepSeekHarnessDiagnostic(unavailable)).toEqual({
      code: "DEEPSEEK_HARNESS_RELAY_UNAVAILABLE",
      message: "DeepSeek Harness needs the AutoByteus credential proxy, which this host does not run.",
    });
    const starting = await discoverDeepSeekHarnessModels({ relayAccess: {
      prepareForRun: vi.fn(), observe: vi.fn(), relayBaseUrl: () => { throw new Error("Credential proxy is not ready."); },
    } }).catch((error) => error);
    expect(toDeepSeekHarnessDiagnostic(starting)).toEqual({
      code: "DEEPSEEK_HARNESS_RELAY_NOT_READY", message: "The credential proxy is starting; try again.",
    });
  });

  it("reports dsh not installed when its command does not run", async () => {
    vi.stubEnv("DEEPSEEK_HARNESS_COMMAND", path.join(os.tmpdir(), "no-such-dsh-command"));
    const failure = await discoverDeepSeekHarnessModels({ relayAccess: {
      prepareForRun: vi.fn(), observe: vi.fn(), relayBaseUrl: () => "http://127.0.0.1:1/relay/deepseek",
    } }).catch((error) => error);
    expect(toDeepSeekHarnessDiagnostic(failure).code).toBe("DEEPSEEK_HARNESS_CLI_UNAVAILABLE");
  });
});

describe("dsh on the Agent Runtimes page and in availability (DS-006)", () => {
  it("reads 'signed in' from the vault's value-free status of the DeepSeek key and says where to set it (DEC-018)", async () => {
    const getStatusForConsumer = vi.fn(async () => "MISSING" as const);
    const strategy = createDeepSeekHarnessAgentRuntimeStrategy({ management: () => ({ getStatusForConsumer }) });
    expect(strategy).toMatchObject({
      runtimeKind: RuntimeKind.DEEPSEEK_HARNESS, signInRoute: "apiKeySetting",
      installInstructionsUrl: "https://github.com/deepseek-ai/deepseek-harness",
    });
    expect(strategy.signInArgv).toBeUndefined();
    expect(strategy.updateArgv("dsh")).toEqual(["npm", "install", "-g", "@deepseek-ai/dsh@latest"]);
    expect(await strategy.readSignIn("dsh", "/tmp")).toEqual({
      state: "signedOut", detail: "The DeepSeek API key is not set in AutoByteus. Save it in Settings → API Keys.",
    });
    getStatusForConsumer.mockResolvedValueOnce("CONFIGURED" as never);
    expect(await strategy.readSignIn("dsh", "/tmp")).toEqual({ state: "signedIn" });
    expect(getStatusForConsumer).toHaveBeenCalledWith({ kind: "agentRuntime", runtimeKind: "deepseek_harness", credentialSlot: "apiKey" });
    expect(await strategy.readUsageLimits("dsh", "/tmp", { deadline: { endsAt: Date.now() + 1000 } })).toEqual({ state: "not_reported" });
  });

  it("is unavailable with the reason in a process without the credential proxy", async () => {
    const availability = await getRuntimeAvailabilityService().getRuntimeAvailability(RuntimeKind.DEEPSEEK_HARNESS);
    expect(availability).toMatchObject({
      enabled: false, reason: "DeepSeek Harness needs the AutoByteus credential proxy, which this host does not run.",
    });
    expect(new RuntimeAvailabilityService().listRuntimeKinds()).not.toContain(RuntimeKind.DEEPSEEK_HARNESS);
  });
});
