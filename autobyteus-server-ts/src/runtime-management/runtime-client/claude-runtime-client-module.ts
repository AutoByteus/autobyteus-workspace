import { createRequire } from "node:module";
import { getClaudeSessionRunProjectionProvider } from "../../run-history/projection/providers/claude-session-run-projection-provider.js";
import { ClaudeAgentSdkRuntimeAdapter } from "../../runtime-execution/adapters/claude-agent-sdk-runtime-adapter.js";
import type { RuntimeAdapterRegistry } from "../../runtime-execution/runtime-adapter-registry.js";
import { CodexRuntimeEventAdapter } from "../../services/agent-streaming/codex-runtime-event-adapter.js";
import { ServerMessage, ServerMessageType } from "../../services/agent-streaming/models.js";
import type {
  RuntimeEventMapper,
  RuntimeEventMapperRegistrationTarget,
} from "../../services/agent-streaming/runtime-event-message-mapper.js";
import { ClaudeRuntimeModelProvider } from "../model-catalog/providers/claude-runtime-model-provider.js";
import type { RuntimeModelCatalogService } from "../model-catalog/runtime-model-catalog-service.js";
import type {
  RuntimeCapability,
  RuntimeCapabilityProvider,
} from "../runtime-capability-service.js";
import type { RuntimeCapabilityService } from "../runtime-capability-service.js";
import type {
  RuntimeClientModule,
  RuntimeClientModuleDescriptor,
  RuntimeClientRunProjectionRegistration,
} from "./runtime-client-module.js";

type ClaudeAvailabilityProbe = () => {
  enabled: boolean;
  reason: string | null;
};

const CLAUDE_SDK_MODULE_NAME = "@anthropic-ai/claude-agent-sdk";
const CLAUDE_DISABLED_VALUES = new Set(["0", "false", "off", "disabled", "no"]);
const CLAUDE_ENABLED_VALUES = new Set(["1", "true", "on", "enabled", "yes"]);
const DEFAULT_CACHE_TTL_MS = 15_000;
const require = createRequire(import.meta.url);

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const normalizeEnvToggle = (value: string | undefined): string | null => {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const resolveClaudeEnvOverride = (): RuntimeCapability | null => {
  const toggle = normalizeEnvToggle(process.env.CLAUDE_AGENT_SDK_ENABLED);
  if (!toggle) {
    return null;
  }
  if (CLAUDE_DISABLED_VALUES.has(toggle)) {
    return {
      runtimeKind: "claude_agent_sdk",
      enabled: false,
      reason: "Disabled by CLAUDE_AGENT_SDK_ENABLED.",
    };
  }
  if (CLAUDE_ENABLED_VALUES.has(toggle)) {
    return {
      runtimeKind: "claude_agent_sdk",
      enabled: true,
      reason: null,
    };
  }
  return {
    runtimeKind: "claude_agent_sdk",
    enabled: false,
    reason: `Invalid CLAUDE_AGENT_SDK_ENABLED value '${toggle}'.`,
  };
};

const probeClaudeAgentSdk: ClaudeAvailabilityProbe = () => {
  try {
    require.resolve(CLAUDE_SDK_MODULE_NAME);
    return {
      enabled: true,
      reason: null,
    };
  } catch {
    return {
      enabled: false,
      reason: `${CLAUDE_SDK_MODULE_NAME} is not installed.`,
    };
  }
};

export const isClaudeRuntimeClientModuleAvailable = (): boolean => {
  const envOverride = resolveClaudeEnvOverride();
  if (envOverride) {
    return envOverride.enabled;
  }
  return probeClaudeAgentSdk().enabled;
};

class ClaudeRuntimeCapabilityProvider implements RuntimeCapabilityProvider {
  readonly runtimeKind = "claude_agent_sdk" as const;
  private cachedCapability: RuntimeCapability | null = null;
  private cachedCapabilityAt = 0;

  constructor(
    private readonly probe: ClaudeAvailabilityProbe = probeClaudeAgentSdk,
    private readonly cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  ) {}

  getRuntimeCapability(): RuntimeCapability {
    const envOverride = resolveClaudeEnvOverride();
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

const createClaudeRuntimeMapper = (): RuntimeEventMapper => {
  const adapter = new CodexRuntimeEventAdapter();
  return {
    map: (event: unknown) => {
      const payload = asObject(event);
      if (typeof payload.method !== "string" || payload.method.trim().length === 0) {
        return new ServerMessage(ServerMessageType.ERROR, {
          code: "UNMAPPED_RUNTIME_EVENT_SHAPE",
          message: "Claude runtime event does not match expected method-based shape.",
        });
      }
      return adapter.map(event);
    },
    normalizeMethodAlias: (method: string) => adapter.normalizeMethodAlias(method),
  };
};

class ClaudeRuntimeClientModule implements RuntimeClientModule {
  readonly runtimeKind = "claude_agent_sdk" as const;

  registerRuntimeAdapters(target: RuntimeAdapterRegistry): void {
    if (!target.hasAdapter(this.runtimeKind)) {
      target.registerAdapter(new ClaudeAgentSdkRuntimeAdapter());
    }
  }

  registerRuntimeModelProviders(target: RuntimeModelCatalogService): void {
    if (!target.hasRuntimeModelProvider(this.runtimeKind)) {
      target.registerRuntimeModelProvider(new ClaudeRuntimeModelProvider());
    }
  }

  registerRuntimeCapabilityProviders(target: RuntimeCapabilityService): void {
    if (!target.hasProvider(this.runtimeKind)) {
      target.registerProvider(new ClaudeRuntimeCapabilityProvider());
    }
  }

  resolveRunProjectionRegistration(): RuntimeClientRunProjectionRegistration {
    return {
      runtimeProvider: getClaudeSessionRunProjectionProvider(),
    };
  }

  registerRuntimeEventMappers(target: RuntimeEventMapperRegistrationTarget): void {
    if (!target.hasRuntimeMapper(this.runtimeKind)) {
      target.registerRuntimeMapper(this.runtimeKind, createClaudeRuntimeMapper());
    }
  }
}

let cachedClaudeRuntimeClientModule: ClaudeRuntimeClientModule | null = null;

export const getClaudeRuntimeClientModule = (): ClaudeRuntimeClientModule => {
  if (!cachedClaudeRuntimeClientModule) {
    cachedClaudeRuntimeClientModule = new ClaudeRuntimeClientModule();
  }
  return cachedClaudeRuntimeClientModule;
};

export const runtimeClientModuleDescriptor: RuntimeClientModuleDescriptor = {
  runtimeKind: "claude_agent_sdk",
  getModule: getClaudeRuntimeClientModule,
  isAvailable: isClaudeRuntimeClientModuleAvailable,
};
