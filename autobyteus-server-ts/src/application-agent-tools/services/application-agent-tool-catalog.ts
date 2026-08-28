import type { ApplicationCatalogSnapshot } from "../../application-bundles/domain/application-catalog-snapshot.js";
import type { ApplicationBundle } from "../../application-bundles/domain/models.js";
import {
  cloneApplicationAgentToolDeclarationSnapshot,
  createApplicationAgentToolDeclarationSnapshot,
  type ApplicationAgentToolDeclarationSnapshot,
} from "../domain/application-agent-tool-declaration-snapshot.js";

export type PreparedApplicationAgentToolCatalogDelta = Readonly<{
  owner: ApplicationAgentToolCatalog;
  nextCatalog: Map<string, ReadonlyMap<string, ApplicationAgentToolDeclarationSnapshot>>;
}>;

const buildApplicationSlice = (
  applications: readonly Pick<ApplicationBundle, "id" | "agentTools">[],
): Map<string, ReadonlyMap<string, ApplicationAgentToolDeclarationSnapshot>> => {
  const slice = new Map<string, ReadonlyMap<string, ApplicationAgentToolDeclarationSnapshot>>();
  for (const application of applications) {
    const byName = new Map<string, ApplicationAgentToolDeclarationSnapshot>();
    for (const declaration of application.agentTools) {
      if (byName.has(declaration.name)) {
        throw new Error(
          `Application '${application.id}' declares duplicate agent tool '${declaration.name}'.`,
        );
      }
      byName.set(
        declaration.name,
        createApplicationAgentToolDeclarationSnapshot(declaration),
      );
    }
    slice.set(application.id, byName);
  }
  return slice;
};

export class ApplicationAgentToolCatalog {
  private initialized = false;
  private byApplicationId = new Map<
    string,
    ReadonlyMap<string, ApplicationAgentToolDeclarationSnapshot>
  >();

  initializeFromBundleSnapshot(snapshot: ApplicationCatalogSnapshot): void {
    if (this.initialized) {
      throw new Error("Application agent tool catalog is already initialized.");
    }
    this.byApplicationId = buildApplicationSlice(snapshot.applications);
    this.initialized = true;
  }

  assertInitialized(): void {
    if (!this.initialized) {
      throw new Error("Application agent tool catalog is not initialized.");
    }
  }

  listToolNames(applicationId: string): string[] {
    this.assertInitialized();
    return [...(this.byApplicationId.get(applicationId)?.keys() ?? [])]
      .sort((left, right) => left.localeCompare(right));
  }

  getDeclarationSnapshot(
    applicationId: string,
    toolName: string,
  ): ApplicationAgentToolDeclarationSnapshot | null {
    this.assertInitialized();
    const snapshot = this.byApplicationId.get(applicationId)?.get(toolName) ?? null;
    return snapshot ? cloneApplicationAgentToolDeclarationSnapshot(snapshot) : null;
  }

  prepareDelta(input: Readonly<{
    applications: readonly Pick<ApplicationBundle, "id" | "agentTools">[];
    removeApplicationIds?: Iterable<string>;
  }>): PreparedApplicationAgentToolCatalogDelta {
    this.assertInitialized();
    const replacements = buildApplicationSlice(input.applications);
    const removals = new Set(input.removeApplicationIds ?? []);
    for (const applicationId of replacements.keys()) removals.delete(applicationId);
    const nextCatalog = new Map(this.byApplicationId);
    for (const applicationId of removals) nextCatalog.delete(applicationId);
    for (const [applicationId, declarations] of replacements) {
      nextCatalog.set(applicationId, declarations);
    }
    return Object.freeze({
      owner: this,
      nextCatalog,
    });
  }

  commitPreparedDelta(delta: PreparedApplicationAgentToolCatalogDelta): void {
    this.assertInitialized();
    if (delta.owner !== this) {
      throw new Error("Application agent tool catalog delta belongs to another catalog.");
    }
    this.byApplicationId = delta.nextCatalog;
  }
}
