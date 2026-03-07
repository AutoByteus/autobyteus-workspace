import { spawnSync } from "node:child_process";
import { getCodexThreadRunProjectionProvider } from "../../run-history/projection/providers/codex-thread-run-projection-provider.js";
import { CodexAppServerRuntimeAdapter } from "../../runtime-execution/adapters/codex-app-server-runtime-adapter.js";
import type { RuntimeAdapterRegistry } from "../../runtime-execution/runtime-adapter-registry.js";
import { CodexRuntimeModelProvider } from "../model-catalog/providers/codex-runtime-model-provider.js";
import type { RuntimeModelCatalogService } from "../model-catalog/runtime-model-catalog-service.js";
import type {
  RuntimeCapability,
  RuntimeCapabilityProvider,
} from "../runtime-capability-service.js";
import type { RuntimeCapabilityService } from "../runtime-capability-service.js";
import { ServerMessage, ServerMessageType } from "../../services/agent-streaming/models.js";
import { MethodRuntimeEventAdapter } from "../../services/agent-streaming/method-runtime-event-adapter.js";
import type {
  RuntimeEventMapper,
  RuntimeEventMapperRegistrationTarget,
} from "../../services/agent-streaming/runtime-event-message-mapper.js";
import type {
  RuntimeClientModule,
  RuntimeClientModuleDescriptor,
  RuntimeClientRunProjectionRegistration,
} from "./runtime-client-module.js";

type CodexAvailabilityProbe = () => {
  enabled: boolean;
  reason: string | null;
};

const CODEX_DISABLED_VALUES = new Set(["0", "false", "off", "disabled", "no"]);
const CODEX_ENABLED_VALUES = new Set(["1", "true", "on", "enabled", "yes"]);
const DEFAULT_CACHE_TTL_MS = 15_000;
const CODEX_SUPPRESSED_METHODS = new Set<string>([
  "codex/event/web_search_begin",
  "codex/event/web_search_end",
]);

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

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

export const isCodexRuntimeClientModuleAvailable = (): boolean => {
  const envOverride = resolveCodexEnvOverride();
  if (envOverride) {
    return envOverride.enabled;
  }
  return probeCodexBinary().enabled;
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

class CodexRuntimeCapabilityProvider implements RuntimeCapabilityProvider {
  readonly runtimeKind = "codex_app_server" as const;
  private cachedCapability: RuntimeCapability | null = null;
  private cachedCapabilityAt = 0;

  constructor(
    private readonly probe: CodexAvailabilityProbe = probeCodexBinary,
    private readonly cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  ) {}

  getRuntimeCapability(): RuntimeCapability {
    const envOverride = resolveCodexEnvOverride();
    if (envOverride) {
      return envOverride;
    }

    const now = Date.now();
    if (this.cachedCapability && now - this.cachedCapabilityAt < this.cacheTtlMs) {
      return this.cachedCapability;
    }

    const probe = this.probe();
    const capability: RuntimeCapability = {
      runtimeKind: this.runtimeKind,
      enabled: probe.enabled,
      reason: probe.reason,
    };
    this.cachedCapability = capability;
    this.cachedCapabilityAt = now;
    return capability;
  }
}

const createCodexRuntimeMapper = (): RuntimeEventMapper => {
  const methodRuntimeAdapter = new MethodRuntimeEventAdapter({
    suppressedMethods: CODEX_SUPPRESSED_METHODS,
    suppressSendMessageToToolLifecycle: true,
  });
  return {
    map: (event: unknown) => {
      const payload = asObject(event);
      if (typeof payload.method !== "string" || payload.method.trim().length === 0) {
        return new ServerMessage(ServerMessageType.ERROR, {
          code: "UNMAPPED_RUNTIME_EVENT_SHAPE",
          message: "Codex runtime event does not match expected method-based shape.",
        });
      }
      return methodRuntimeAdapter.map(event);
    },
    normalizeMethodAlias: (method: string) => methodRuntimeAdapter.normalizeMethodAlias(method),
  };
};

class CodexRuntimeClientModule implements RuntimeClientModule {
  readonly runtimeKind = "codex_app_server" as const;

  registerRuntimeAdapters(target: RuntimeAdapterRegistry): void {
    if (!target.hasAdapter(this.runtimeKind)) {
      target.registerAdapter(new CodexAppServerRuntimeAdapter());
    }
  }

  registerRuntimeModelProviders(target: RuntimeModelCatalogService): void {
    if (!target.hasRuntimeModelProvider(this.runtimeKind)) {
      target.registerRuntimeModelProvider(new CodexRuntimeModelProvider());
    }
  }

  registerRuntimeCapabilityProviders(target: RuntimeCapabilityService): void {
    if (!target.hasProvider(this.runtimeKind)) {
      target.registerProvider(new CodexRuntimeCapabilityProvider());
    }
  }

  resolveRunProjectionRegistration(): RuntimeClientRunProjectionRegistration {
    return {
      runtimeProvider: getCodexThreadRunProjectionProvider(),
    };
  }

  registerRuntimeEventMappers(target: RuntimeEventMapperRegistrationTarget): void {
    if (!target.hasRuntimeMapper(this.runtimeKind)) {
      target.registerRuntimeMapper(this.runtimeKind, createCodexRuntimeMapper());
    }
  }
}

let cachedCodexRuntimeClientModule: CodexRuntimeClientModule | null = null;

export const getCodexRuntimeClientModule = (): CodexRuntimeClientModule => {
  if (!cachedCodexRuntimeClientModule) {
    cachedCodexRuntimeClientModule = new CodexRuntimeClientModule();
  }
  return cachedCodexRuntimeClientModule;
};

export const runtimeClientModuleDescriptor: RuntimeClientModuleDescriptor = {
  runtimeKind: "codex_app_server",
  getModule: getCodexRuntimeClientModule,
  isAvailable: isCodexRuntimeClientModuleAvailable,
};
