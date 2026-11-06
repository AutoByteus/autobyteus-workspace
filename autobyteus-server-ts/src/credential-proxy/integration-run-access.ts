import type { DeliveryDefinitions } from "./delivery-definitions.js";
import type { IntegrationAccessRule } from "./integration-access-rule.js";
import type { RunPassRegistry } from "./run-pass-registry.js";

export type IntegrationRunIdentity = Readonly<{ runId: string; agentDefinitionId: string }>;

/**
 * The one entry point run backends use for integrations: which integrations a run may use, with which pass, and which
 * variables (DS-004). Backends only apply the variables they are given. The pass ends through `RunPassRevocation`.
 */
export interface IntegrationRunAccess {
  /**
   * The variables for the run's shell: `{}` when its agent may use no integration. `baseEnv` is only read to append
   * git config after any existing `GIT_CONFIG_COUNT` entries. The result never holds a token.
   */
  environmentForRun(run: IntegrationRunIdentity, baseEnv: Readonly<Record<string, string | undefined>>): Promise<Readonly<Record<string, string>>>;
}

export class DefaultIntegrationRunAccess implements IntegrationRunAccess {
  constructor(private readonly deps: Readonly<{
    access: Pick<IntegrationAccessRule, "grantsForAgent">;
    definitions: DeliveryDefinitions;
    passes: RunPassRegistry;
    proxyBaseUrl: () => string;
  }>) {}

  async environmentForRun(
    run: IntegrationRunIdentity,
    baseEnv: Readonly<Record<string, string | undefined>>,
  ): Promise<Readonly<Record<string, string>>> {
    const grants = await this.deps.access.grantsForAgent(run.agentDefinitionId);
    if (grants.length === 0) {
      this.deps.passes.clearGrants(run.runId);
      return Object.freeze({});
    }
    const proxyBaseUrl = this.deps.proxyBaseUrl();
    const pass = this.deps.passes.issue(run, grants);
    const variables: Record<string, string> = {};
    for (const grant of grants) {
      const definition = this.deps.definitions.get(grant.integrationId);
      if (definition) Object.assign(variables, definition.shellVariables(proxyBaseUrl, pass, { ...baseEnv, ...variables }));
    }
    return Object.freeze(variables);
  }
}
