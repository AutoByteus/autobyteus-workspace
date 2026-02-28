import type { RuntimeKind } from "../runtime-management/runtime-kind.js";
import {
  getClaudeAgentSdkRuntimeService,
  type ClaudeAgentSdkRuntimeService,
} from "./claude-agent-sdk/claude-agent-sdk-runtime-service.js";
import {
  getCodexAppServerRuntimeService,
  type CodexAppServerRuntimeService,
} from "./codex-app-server/codex-app-server-runtime-service.js";
import type {
  ExternalRuntimeEventSource,
  ExternalRuntimeKind,
} from "./external-runtime-event-source-port.js";

class CodexRuntimeEventSource implements ExternalRuntimeEventSource {
  readonly runtimeKind = "codex_app_server" as const;
  private readonly runtimeService: CodexAppServerRuntimeService;

  constructor(runtimeService: CodexAppServerRuntimeService = getCodexAppServerRuntimeService()) {
    this.runtimeService = runtimeService;
  }

  subscribeToRunEvents(runId: string, listener: (event: unknown) => void): () => void {
    return this.runtimeService.subscribeToRunEvents(runId, listener);
  }

  hasRunSession(runId: string): boolean {
    return this.runtimeService.hasRunSession(runId);
  }
}

class ClaudeAgentSdkRuntimeEventSource implements ExternalRuntimeEventSource {
  readonly runtimeKind = "claude_agent_sdk" as const;
  private readonly runtimeService: ClaudeAgentSdkRuntimeService;

  constructor(runtimeService: ClaudeAgentSdkRuntimeService = getClaudeAgentSdkRuntimeService()) {
    this.runtimeService = runtimeService;
  }

  subscribeToRunEvents(runId: string, listener: (event: unknown) => void): () => void {
    return this.runtimeService.subscribeToRunEvents(runId, listener);
  }

  hasRunSession(runId: string): boolean {
    return this.runtimeService.hasRunSession(runId);
  }
}

export class ExternalRuntimeEventSourceRegistry {
  private readonly sources = new Map<ExternalRuntimeKind, ExternalRuntimeEventSource>();

  constructor(sources?: ExternalRuntimeEventSource[]) {
    const defaults =
      sources && sources.length > 0
        ? sources
        : [new CodexRuntimeEventSource(), new ClaudeAgentSdkRuntimeEventSource()];

    for (const source of defaults) {
      this.registerSource(source);
    }
  }

  registerSource(source: ExternalRuntimeEventSource): void {
    this.sources.set(source.runtimeKind, source);
  }

  resolveSource(runtimeKind: RuntimeKind): ExternalRuntimeEventSource {
    if (runtimeKind === "autobyteus") {
      throw new Error("Runtime 'autobyteus' does not provide external runtime events.");
    }
    const source = this.sources.get(runtimeKind);
    if (!source) {
      throw new Error(`External runtime event source not found for runtime kind '${runtimeKind}'.`);
    }
    return source;
  }

  tryResolveSource(runtimeKind: RuntimeKind): ExternalRuntimeEventSource | null {
    if (runtimeKind === "autobyteus") {
      return null;
    }
    return this.sources.get(runtimeKind) ?? null;
  }

  hasActiveRunSession(runtimeKind: RuntimeKind, runId: string): boolean {
    const source = this.tryResolveSource(runtimeKind);
    if (!source || typeof source.hasRunSession !== "function") {
      return runtimeKind === "autobyteus";
    }
    return source.hasRunSession(runId);
  }
}

let cachedExternalRuntimeEventSourceRegistry: ExternalRuntimeEventSourceRegistry | null = null;

export const getExternalRuntimeEventSourceRegistry = (): ExternalRuntimeEventSourceRegistry => {
  if (!cachedExternalRuntimeEventSourceRegistry) {
    cachedExternalRuntimeEventSourceRegistry = new ExternalRuntimeEventSourceRegistry();
  }
  return cachedExternalRuntimeEventSourceRegistry;
};
