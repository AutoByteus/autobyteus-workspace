import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationCatalogReconciliationService } from "../../application-platform/runtime/application-catalog-reconciliation-service.js";

export class ApplicationCatalogRefreshCoordinator {
  constructor(private readonly dependencies: {
    bundleService: Pick<ApplicationBundleService, "refresh" | "getCatalogSnapshot">;
    catalogReconciliation: Pick<ApplicationCatalogReconciliationService, "reconcile">;
    agentDefinitionService: Pick<AgentDefinitionService, "refreshCache">;
    agentTeamDefinitionService: Pick<AgentTeamDefinitionService, "refreshCache">;
  }) {}

  async refresh(): Promise<void> {
    await this.dependencies.bundleService.refresh();
    const snapshot = await this.dependencies.bundleService.getCatalogSnapshot();
    await this.dependencies.catalogReconciliation.reconcile(snapshot);
    await this.dependencies.agentDefinitionService.refreshCache();
    await this.dependencies.agentTeamDefinitionService.refreshCache();
  }
}
