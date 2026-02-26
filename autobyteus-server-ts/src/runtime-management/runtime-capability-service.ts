import { spawnSync } from "node:child_process";
import { RUNTIME_KIND_VALUES, type RuntimeKind } from "./runtime-kind.js";

export interface RuntimeCapability {
  runtimeKind: RuntimeKind;
  enabled: boolean;
  reason: string | null;
}

type CodexAvailabilityProbe = () => {
  enabled: boolean;
  reason: string | null;
};

const CODEX_DISABLED_VALUES = new Set(["0", "false", "off", "disabled", "no"]);
const CODEX_ENABLED_VALUES = new Set(["1", "true", "on", "enabled", "yes"]);
const DEFAULT_CACHE_TTL_MS = 15_000;

const normalizeEnvToggle = (value: string | undefined): string | null => {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const resolveCodexEnvOverride = (): RuntimeCapability | null => {
  const toggle = normalizeEnvToggle(process.env.CODEX_APP_SERVER_ENABLED);
  if (!toggle) {
    return null;
  }
  if (CODEX_DISABLED_VALUES.has(toggle)) {
    return {
      runtimeKind: "codex_app_server",
      enabled: false,
      reason: "Disabled by CODEX_APP_SERVER_ENABLED.",
    };
  }
  if (CODEX_ENABLED_VALUES.has(toggle)) {
    return {
      runtimeKind: "codex_app_server",
      enabled: true,
      reason: null,
    };
  }
  return {
    runtimeKind: "codex_app_server",
    enabled: false,
    reason: `Invalid CODEX_APP_SERVER_ENABLED value '${toggle}'.`,
  };
};

const probeCodexBinary: CodexAvailabilityProbe = () => {
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

export class RuntimeCapabilityService {
  private readonly codexProbe: CodexAvailabilityProbe;
  private readonly cacheTtlMs: number;
  private cachedCodexCapability: RuntimeCapability | null = null;
  private cachedCodexCapabilityAt = 0;

  constructor(codexProbe: CodexAvailabilityProbe = probeCodexBinary, cacheTtlMs = DEFAULT_CACHE_TTL_MS) {
    this.codexProbe = codexProbe;
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

    const envOverride = resolveCodexEnvOverride();
    if (envOverride) {
      return envOverride;
    }

    const now = Date.now();
    if (
      this.cachedCodexCapability &&
      now - this.cachedCodexCapabilityAt < this.cacheTtlMs
    ) {
      return this.cachedCodexCapability;
    }

    const probe = this.codexProbe();
    const capability: RuntimeCapability = {
      runtimeKind: "codex_app_server",
      enabled: probe.enabled,
      reason: probe.reason,
    };
    this.cachedCodexCapability = capability;
    this.cachedCodexCapabilityAt = now;
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
