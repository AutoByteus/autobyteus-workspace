import { RuntimeKind, runtimeKindFromString } from "../../runtime-management/runtime-kind-enum.js";
import type { RunProjectionProvider } from "./run-projection-types.js";
import {
  getLocalMemoryRunViewProjectionProvider,
} from "./providers/local-memory-run-view-projection-provider.js";
import {
  getClaudeRunViewProjectionProvider,
} from "./providers/claude-run-view-projection-provider.js";
import {
  getCodexRunViewProjectionProvider,
} from "./providers/codex-run-view-projection-provider.js";

export class RunProjectionProviderRegistry {
  private readonly providersByRuntime = new Map<RuntimeKind, RunProjectionProvider>();
  private readonly fallbackProvider: RunProjectionProvider;

  constructor(
    fallbackProvider: RunProjectionProvider,
    runtimeProviders: RunProjectionProvider[] = [],
  ) {
    this.fallbackProvider = fallbackProvider;
    this.providersByRuntime.set(RuntimeKind.AUTOBYTEUS, fallbackProvider);

    for (const provider of runtimeProviders) {
      if (!provider.runtimeKind) {
        continue;
      }
      this.providersByRuntime.set(provider.runtimeKind, provider);
    }
  }

  resolveProvider(runtimeKind: RuntimeKind | string | null | undefined): RunProjectionProvider {
    const normalized =
      runtimeKindFromString(runtimeKind, RuntimeKind.AUTOBYTEUS) ?? RuntimeKind.AUTOBYTEUS;
    return this.providersByRuntime.get(normalized) ?? this.fallbackProvider;
  }

  resolveFallbackProvider(): RunProjectionProvider {
    return this.fallbackProvider;
  }
}

let cachedRunProjectionProviderRegistry: RunProjectionProviderRegistry | null = null;

export const getRunProjectionProviderRegistry = (): RunProjectionProviderRegistry => {
  if (!cachedRunProjectionProviderRegistry) {
    const fallbackProvider = getLocalMemoryRunViewProjectionProvider();
    cachedRunProjectionProviderRegistry = new RunProjectionProviderRegistry(
      fallbackProvider,
      [
        getCodexRunViewProjectionProvider(),
        getClaudeRunViewProjectionProvider(),
      ],
    );
  }
  return cachedRunProjectionProviderRegistry;
};
