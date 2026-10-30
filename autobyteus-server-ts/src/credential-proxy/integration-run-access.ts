import type { IntegrationConnectionStore } from "./integration-connection-store.js";
import type { IntegrationDefinitions } from "./integration-definitions.js";
import type { RunPassRegistry } from "./run-pass-registry.js";

export type IntegrationRunIdentity = Readonly<{ runId: string; agentDefinitionId: string }>;

/**
 * The one entry point run backends use: who gets integration access, with which pass, and which variables
 * (DS-002), and the revocation when the run is released (DS-004). Backends only apply the variables they are given.
 */
export interface IntegrationRunAccess {
  /**
   * The variables for the run's shell: `{}` when its agent may use no integration. `baseEnv` is only read to append
   * git config after any existing `GIT_CONFIG_COUNT` entries. The result never holds a token.
   */
  environmentForRun(run: IntegrationRunIdentity, baseEnv: Readonly<Record<string, string | undefined>>): Readonly<Record<string, string>>;
  /** Ends the run's pass (idempotent): its next call is refused as `RUN_PASS_INVALID`. */
  revokeForRun(runId: string): void;
}

export class DefaultIntegrationRunAccess implements IntegrationRunAccess {
  constructor(private readonly deps: Readonly<{
    store: IntegrationConnectionStore;
    definitions: IntegrationDefinitions;
    passes: RunPassRegistry;
    proxyBaseUrl: () => string;
  }>) {}

  environmentForRun(run: IntegrationRunIdentity, baseEnv: Readonly<Record<string, string | undefined>>): Readonly<Record<string, string>> {
    const definitions = this.deps.store.allowedIntegrations(run.agentDefinitionId)
      .flatMap((integrationId) => {
        const definition = this.deps.definitions.get(integrationId);
        return definition ? [definition] : [];
      });
    if (definitions.length === 0) return Object.freeze({});
    const proxyBaseUrl = this.deps.proxyBaseUrl();
    const pass = this.deps.passes.issue(run);
    const variables: Record<string, string> = {};
    for (const definition of definitions) {
      Object.assign(variables, definition.shellVariables(proxyBaseUrl, pass, { ...baseEnv, ...variables }));
    }
    return Object.freeze(variables);
  }

  revokeForRun(runId: string): void {
    this.deps.passes.revoke(runId);
  }
}
