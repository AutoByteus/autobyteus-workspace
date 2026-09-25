import { spawnSync } from "node:child_process";
import path from "node:path";
import { RuntimeKind } from "./runtime-kind-enum.js";
import { listAntigravityModels, toAgyDiscoveryDiagnostic } from "./antigravity-cli-capability.js";
import { resolveClaudeCodeExecutablePath } from "./claude/client/claude-sdk-executable-path.js";
import { resolveLaunchCommand } from "./codex/client/codex-app-server-launch-config.js";

export interface RuntimeAvailability {
  runtimeKind: RuntimeKind;
  enabled: boolean;
  reason: string | null;
}

export interface RuntimeAvailabilityProvider {
  readonly runtimeKind: RuntimeKind;
  getRuntimeAvailability(): RuntimeAvailability | Promise<RuntimeAvailability>;
}

const COMMAND_DISCOVERY_TOOL = process.platform === "win32" ? "where" : "which";

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const commandLooksLikePath = (command: string): boolean =>
  path.isAbsolute(command) || command.includes(path.sep) || command.includes("/");

const discoverCommand = (command: string): boolean => {
  const result = spawnSync(COMMAND_DISCOVERY_TOOL, [command], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0;
};

const probeCommand = (command: string): boolean => {
  try {
    const result = spawnSync(command, ["--version"], {
      stdio: "ignore",
      timeout: 3_000,
    });
    return result.status === 0;
  } catch {
    return false;
  }
};

const isCommandAvailable = (command: string | null): boolean => {
  const normalized = asNonEmptyString(command);
  if (!normalized) {
    return false;
  }
  if (commandLooksLikePath(normalized)) {
    return probeCommand(normalized);
  }
  return discoverCommand(normalized) || probeCommand(normalized);
};

const createCapability = (
  runtimeKind: RuntimeKind,
  enabled: boolean,
  reason: string | null = null,
): RuntimeAvailability => ({
  runtimeKind,
  enabled,
  reason: enabled ? null : reason,
});

const createAutobyteusAvailabilityProvider = (): RuntimeAvailabilityProvider => ({
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  getRuntimeAvailability: () => createCapability(RuntimeKind.AUTOBYTEUS, true),
});

const createCodexAvailabilityProvider = (): RuntimeAvailabilityProvider => ({
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  getRuntimeAvailability: () => {
    const command = resolveLaunchCommand();
    const enabled = isCommandAvailable(command);
    return createCapability(
      RuntimeKind.CODEX_APP_SERVER,
      enabled,
      `Codex App Server command '${command}' is not available.`,
    );
  },
});

const createClaudeAvailabilityProvider = (): RuntimeAvailabilityProvider => ({
  runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
  getRuntimeAvailability: () => {
    const executablePath = resolveClaudeCodeExecutablePath();
    const enabled = isCommandAvailable(executablePath);
    return createCapability(
      RuntimeKind.CLAUDE_AGENT_SDK,
      enabled,
      `Claude Agent SDK executable '${executablePath}' is not available.`,
    );
  },
});

const createAntigravityAvailabilityProvider = (): RuntimeAvailabilityProvider => ({
  runtimeKind: RuntimeKind.ANTIGRAVITY_CLI,
  getRuntimeAvailability: async () => {
    try { await listAntigravityModels(); return createCapability(RuntimeKind.ANTIGRAVITY_CLI, true); }
    catch (error) { return createCapability(RuntimeKind.ANTIGRAVITY_CLI, false, toAgyDiscoveryDiagnostic(error).message); }
  },
});

export class RuntimeAvailabilityService {
  private readonly providers = new Map<RuntimeKind, RuntimeAvailabilityProvider>();

  constructor(providers: RuntimeAvailabilityProvider[] = []) {
    for (const provider of providers) {
      this.registerProvider(provider);
    }
    if (!this.providers.has(RuntimeKind.AUTOBYTEUS)) {
      this.registerProvider(createAutobyteusAvailabilityProvider());
    }
  }

  registerProvider(provider: RuntimeAvailabilityProvider): void {
    this.providers.set(provider.runtimeKind, provider);
  }

  async listRuntimeAvailabilities(): Promise<RuntimeAvailability[]> {
    return Promise.all(Array.from(this.providers.values()).map((provider) =>
      provider.getRuntimeAvailability(),
    ));
  }

  async getRuntimeAvailability(runtimeKind: RuntimeKind): Promise<RuntimeAvailability> {
    return await (
      this.providers.get(runtimeKind)?.getRuntimeAvailability() ??
      createCapability(runtimeKind, false, `Runtime '${runtimeKind}' is not configured.`)
    );
  }
}

let cachedRuntimeAvailabilityService: RuntimeAvailabilityService | null = null;

export const getRuntimeAvailabilityService = (): RuntimeAvailabilityService => {
  if (!cachedRuntimeAvailabilityService) {
    cachedRuntimeAvailabilityService = new RuntimeAvailabilityService([
      createAutobyteusAvailabilityProvider(),
      createCodexAvailabilityProvider(),
      createClaudeAvailabilityProvider(),
      createAntigravityAvailabilityProvider(),
    ]);
  }
  return cachedRuntimeAvailabilityService;
};
