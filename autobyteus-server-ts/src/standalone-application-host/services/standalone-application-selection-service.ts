import fs from "node:fs/promises";
import path from "node:path";
import { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import { FileApplicationBundleProvider } from "../../application-bundles/providers/file-application-bundle-provider.js";
import type { ApplicationPackageRegistrySnapshot } from "../../application-packages/domain/application-package-registry-snapshot.js";
import type { StandaloneApplicationHostConfig } from "../config/standalone-application-host-config.js";
import type { StandaloneApplicationSelection } from "../domain/standalone-application-selection.js";

const PACKAGE_ID = "standalone" as const;

const buildRegistrySnapshot = (
  config: StandaloneApplicationHostConfig,
): ApplicationPackageRegistrySnapshot => ({
  packages: [{
    packageId: PACKAGE_ID,
    displayName: "Standalone application package",
    packageRootPath: config.packageRoot,
    sourceKind: "LOCAL_PATH",
    source: config.packageRoot,
    applicationCount: 1,
    isPlatformOwned: false,
    isRemovable: false,
    managedInstallPath: null,
    bundledSourceRootPath: null,
  }],
  diagnostics: [],
  refreshedAt: new Date().toISOString(),
});

class SelectedApplicationBundleProvider extends FileApplicationBundleProvider {
  constructor(private readonly localApplicationId: string) {
    super();
  }

  override async getCatalogSnapshot(registrySnapshot: ApplicationPackageRegistrySnapshot) {
    const snapshot = await super.getCatalogSnapshot(registrySnapshot);
    return {
      ...snapshot,
      applications: snapshot.applications.filter(
        (application) => application.localApplicationId === this.localApplicationId,
      ),
      diagnostics: snapshot.diagnostics.filter(
        (diagnostic) => diagnostic.localApplicationId === this.localApplicationId,
      ),
    };
  }
}

export class StandaloneApplicationSelectionService {
  async resolve(config: StandaloneApplicationHostConfig): Promise<{
    selection: StandaloneApplicationSelection;
    bundleService: ApplicationBundleService;
  }> {
    const packageStat = await fs.stat(config.packageRoot).catch(() => null);
    if (!packageStat?.isDirectory()) {
      throw new Error(`Standalone package root is not a directory: ${config.packageRoot}`);
    }
    const provider = new SelectedApplicationBundleProvider(config.localApplicationId);
    const registrySnapshot = buildRegistrySnapshot(config);
    const bundleService = new ApplicationBundleService({
      provider,
      packageRegistryService: {
        getRegistrySnapshot: async () => structuredClone(registrySnapshot),
      },
    });
    const snapshot = await bundleService.getCatalogSnapshot();
    const expectedApplicationRoot = path.join(
      config.packageRoot,
      "applications",
      config.localApplicationId,
    );
    const diagnostic = snapshot.diagnostics.find(
      (entry) => entry.localApplicationId === config.localApplicationId,
    );
    if (diagnostic) {
      throw new Error(
        `Standalone application '${config.localApplicationId}' is invalid: ${diagnostic.message}`,
      );
    }
    if (snapshot.applications.length !== 1) {
      throw new Error(
        `Standalone application '${config.localApplicationId}' was not found under `
        + `${path.join(config.packageRoot, "applications")}.`,
      );
    }
    const bundle = snapshot.applications[0]!;
    if (path.resolve(bundle.applicationRootPath) !== path.resolve(expectedApplicationRoot)) {
      throw new Error("Standalone application selection resolved an unexpected application root.");
    }
    return {
      bundleService,
      selection: Object.freeze({
        packageId: PACKAGE_ID,
        packageRoot: config.packageRoot,
        localApplicationId: config.localApplicationId,
        applicationId: bundle.id,
        applicationRoot: bundle.applicationRootPath,
        uiRoot: path.join(bundle.applicationRootPath, "ui"),
        entryHtmlPath: path.join(bundle.applicationRootPath, bundle.entryHtmlRelativePath),
        bundle,
      }),
    };
  }
}
