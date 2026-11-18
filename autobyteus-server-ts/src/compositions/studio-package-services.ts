import type { AppConfig } from "../config/app-config.js";
import { ApplicationPackageRootSettingsStore } from "../application-packages/stores/application-package-root-settings-store.js";
import { ApplicationPackageRegistryStore } from "../application-packages/stores/application-package-registry-store.js";
import { BuiltInApplicationPackageMaterializer } from "../application-packages/services/built-in-application-package-materializer.js";
import { ApplicationPackageRegistryService } from "../application-packages/services/application-package-registry-service.js";
import { FileApplicationBundleProvider } from "../application-bundles/providers/file-application-bundle-provider.js";
import { ApplicationBundleService } from "../application-bundles/services/application-bundle-service.js";

/** The studio's application package registry and bundle services (moved from `build-studio-server.ts`, autobyteus-500 CR-500-007). */
export const createStudioPackageServices = (appConfig: AppConfig) => {
  const packageRegistryService = new ApplicationPackageRegistryService({
    rootSettingsStore: new ApplicationPackageRootSettingsStore(appConfig),
    registryStore: new ApplicationPackageRegistryStore(appConfig),
    builtInMaterializer: new BuiltInApplicationPackageMaterializer(appConfig),
  });
  const bundleProvider = new FileApplicationBundleProvider();
  const bundleService = new ApplicationBundleService({
    provider: bundleProvider,
    packageRegistryService,
  });
  return { packageRegistryService, bundleProvider, bundleService };
};
