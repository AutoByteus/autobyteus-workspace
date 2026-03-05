import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { RUNTIME_KIND_VALUES, type RuntimeKind } from "./runtime-kind.js";

export interface RuntimeCapability {
  runtimeKind: RuntimeKind;
  enabled: boolean;
  reason: string | null;
}

type RuntimeAvailabilityProbe = () => {
  enabled: boolean;
  reason: string | null;
};

interface RuntimeCapabilityProbeDescriptor {
  runtimeKind: Exclude<RuntimeKind, "autobyteus">;
  envToggleName: string;
  probe: RuntimeAvailabilityProbe;
}

const RUNTIME_DISABLED_VALUES = new Set(["0", "false", "off", "disabled", "no"]);
const RUNTIME_ENABLED_VALUES = new Set(["1", "true", "on", "enabled", "yes"]);
const DEFAULT_CACHE_TTL_MS = 15_000;

const require = createRequire(import.meta.url);

const normalizeEnvToggle = (value: string | undefined): string | null => {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const resolveRuntimeEnvOverride = (
  runtimeKind: Exclude<RuntimeKind, "autobyteus">,
  envToggleName: string,
): RuntimeCapability | null => {
  const toggle = normalizeEnvToggle(process.env[envToggleName]);
  if (!toggle) {
    return null;
  }
  if (RUNTIME_DISABLED_VALUES.has(toggle)) {
    return {
      runtimeKind,
      enabled: false,
      reason: `Disabled by ${envToggleName}.`,
    };
  }
  if (RUNTIME_ENABLED_VALUES.has(toggle)) {
    return {
      runtimeKind,
      enabled: true,
      reason: null,
    };
  }
  return {
    runtimeKind,
    enabled: false,
    reason: `Invalid ${envToggleName} value '${toggle}'.`,
  };
};

const probeCodexBinary: RuntimeAvailabilityProbe = () => {
  try {
    const result = spawnSync("codex", ["--version"], {
      stdio: "ignore",
      timeout: 3_000,
    });
    if (result.status === 0) {
      return { enabled: true, reason: null };
    }
    return {
      enabled: false,
      reason: "Codex CLI is not available on PATH.",
    };
  } catch {
    return {
      enabled: false,
      reason: "Codex CLI is not available on PATH.",
    };
  }
};

const probeClaudeAgentSdk: RuntimeAvailabilityProbe = () => {
  try {
    require.resolve("@anthropic-ai/claude-agent-sdk");
    return {
      enabled: true,
      reason: null,
    };
  } catch {
    return {
      enabled: false,
      reason: "@anthropic-ai/claude-agent-sdk is not installed.",
    };
  }
};

const DEFAULT_RUNTIME_CAPABILITY_DESCRIPTORS: RuntimeCapabilityProbeDescriptor[] = [
  {
    runtimeKind: "codex_app_server",
    envToggleName: "CODEX_APP_SERVER_ENABLED",
    probe: probeCodexBinary,
  },
  {
    runtimeKind: "claude_agent_sdk",
    envToggleName: "CLAUDE_AGENT_SDK_ENABLED",
    probe: probeClaudeAgentSdk,
  },
];

export class RuntimeCapabilityService {
  private readonly descriptors = new Map<
    Exclude<RuntimeKind, "autobyteus">,
    RuntimeCapabilityProbeDescriptor
  >();
  private readonly cacheTtlMs: number;
  private readonly cachedCapabilities = new Map<
    Exclude<RuntimeKind, "autobyteus">,
    { capability: RuntimeCapability; cachedAt: number }
  >();

  constructor(
    descriptors: RuntimeCapabilityProbeDescriptor[] = DEFAULT_RUNTIME_CAPABILITY_DESCRIPTORS,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  ) {
    for (const descriptor of descriptors) {
      this.descriptors.set(descriptor.runtimeKind, descriptor);
    }
    this.cacheTtlMs = cacheTtlMs;
  }

  listRuntimeCapabilities(): RuntimeCapability[] {
    return RUNTIME_KIND_VALUES.map((runtimeKind) => this.getRuntimeCapability(runtimeKind));
  }

  getRuntimeCapability(runtimeKind: RuntimeKind): RuntimeCapability {
    if (runtimeKind === "autobyteus") {
      return {
        runtimeKind,
        enabled: true,
        reason: null,
      };
    }

    const descriptor = this.descriptors.get(runtimeKind);
    if (!descriptor) {
      return {
        runtimeKind,
        enabled: false,
        reason: `Runtime capability descriptor for '${runtimeKind}' is not configured.`,
      };
    }

    const envOverride = resolveRuntimeEnvOverride(runtimeKind, descriptor.envToggleName);
    if (envOverride) {
      return envOverride;
    }

    const now = Date.now();
    const cached = this.cachedCapabilities.get(runtimeKind);
    if (cached && now - cached.cachedAt < this.cacheTtlMs) {
      return cached.capability;
    }

    const probe = descriptor.probe();
    const capability: RuntimeCapability = {
      runtimeKind,
      enabled: probe.enabled,
      reason: probe.reason,
    };
    this.cachedCapabilities.set(runtimeKind, {
      capability,
      cachedAt: now,
    });
    return capability;
  }
}

let cachedRuntimeCapabilityService: RuntimeCapabilityService | null = null;

export const getRuntimeCapabilityService = (): RuntimeCapabilityService => {
  if (!cachedRuntimeCapabilityService) {
    cachedRuntimeCapabilityService = new RuntimeCapabilityService();
  }
  return cachedRuntimeCapabilityService;
};
