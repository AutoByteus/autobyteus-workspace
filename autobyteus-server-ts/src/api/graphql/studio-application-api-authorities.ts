import type { ApplicationBundleService } from "../../application-bundles/services/application-bundle-service.js";
import type { ApplicationPackageRegistryService } from "../../application-packages/services/application-package-registry-service.js";

type StudioApplicationApiAuthorities = Readonly<{
  bundleService: ApplicationBundleService;
  packageRegistryService: ApplicationPackageRegistryService;
}>;

let configuredAuthorities: StudioApplicationApiAuthorities | null = null;

export const configureStudioApplicationApiAuthorities = (
  authorities: StudioApplicationApiAuthorities,
): void => {
  if (configuredAuthorities) {
    throw new Error("Studio application API authorities are already configured.");
  }
  configuredAuthorities = Object.freeze(authorities);
};

export const getStudioApplicationBundleService = (): ApplicationBundleService => {
  if (!configuredAuthorities) {
    throw new Error("Studio application API authorities are not configured.");
  }
  return configuredAuthorities.bundleService;
};

export const getStudioApplicationPackageRegistryService =
  (): ApplicationPackageRegistryService => {
    if (!configuredAuthorities) {
      throw new Error("Studio application API authorities are not configured.");
    }
    return configuredAuthorities.packageRegistryService;
  };
