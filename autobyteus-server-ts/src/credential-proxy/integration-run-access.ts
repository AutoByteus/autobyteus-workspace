import type { DeliveryDefinitions } from "./delivery-definitions.js";
import type { IntegrationAccessRule } from "./integration-access-rule.js";
import type { IntegrationCatalog } from "./integration-catalog.js";
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
  /**
   * The display names of the integrations that the run's agent may use through these skills (by name) but that the
   * run's pass does not hold: their access starts when the run is prepared again (restarted). A read only; it grants
   * nothing.
   */
  integrationsStartingOnRestart(run: IntegrationRunIdentity, skillNames: readonly string[]): Promise<readonly string[]>;
}

export class DefaultIntegrationRunAccess implements IntegrationRunAccess {
  constructor(private readonly deps: Readonly<{
    access: Pick<IntegrationAccessRule, "grantsForAgent">;
    definitions: DeliveryDefinitions;
    passes: RunPassRegistry;
    catalog: Pick<IntegrationCatalog, "describe">;
    proxyBaseUrl: () => string;
  }>) {}

  async integrationsStartingOnRestart(run: IntegrationRunIdentity, skillNames: readonly string[]): Promise<readonly string[]> {
    if (skillNames.length === 0) return [];
    const names = new Set(skillNames);
    const held = this.deps.passes.grantedIntegrationIds(run.runId);
    const grants = await this.deps.access.grantsForAgent(run.agentDefinitionId);
    return grants
      .filter((grant) => names.has(grant.skillName) && !held.has(grant.integrationId))
      .flatMap((grant) => {
        const described = this.deps.catalog.describe(grant.integrationId);
        return described ? [described.name] : [];
      });
  }

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
