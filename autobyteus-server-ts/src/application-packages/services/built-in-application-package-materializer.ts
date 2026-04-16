import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { resolveBundledApplicationResourceRoot } from "../../application-bundles/utils/bundled-application-resource-root.js";
import { getManagedBuiltInApplicationPackageRoot } from "../utils/managed-built-in-application-package-root.js";

type AppConfigLike = {
  getAppDataDir(): string;
  getAppRootDir(): string;
};

const pathExists = (targetPath: string): boolean => {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
};

export class BuiltInApplicationPackageMaterializer {
  private static instance: BuiltInApplicationPackageMaterializer | null = null;

  static getInstance(
    config: AppConfigLike = appConfigProvider.config,
  ): BuiltInApplicationPackageMaterializer {
    if (!BuiltInApplicationPackageMaterializer.instance) {
      BuiltInApplicationPackageMaterializer.instance =
        new BuiltInApplicationPackageMaterializer(config);
    }
    return BuiltInApplicationPackageMaterializer.instance;
  }

  static resetInstance(): void {
    BuiltInApplicationPackageMaterializer.instance = null;
  }

  private hasMaterialized = false;

  constructor(
    private readonly config: AppConfigLike = appConfigProvider.config,
  ) {}

  getManagedRootPath(): string {
    return getManagedBuiltInApplicationPackageRoot(this.config.getAppDataDir());
  }

  getBundledSourceRootPath(): string {
    return resolveBundledApplicationResourceRoot(this.config.getAppRootDir());
  }

  async ensureMaterialized(): Promise<void> {
    const targetRoot = this.getManagedRootPath();
    const targetApplicationsDir = path.join(targetRoot, "applications");

    if (this.hasMaterialized && pathExists(targetApplicationsDir)) {
      return;
    }

    const sourceRoot = this.getBundledSourceRootPath();
    const sourceApplicationsDir = path.join(sourceRoot, "applications");

    await fsPromises.mkdir(targetRoot, { recursive: true });

    if (path.resolve(sourceApplicationsDir) === path.resolve(targetApplicationsDir)) {
      await fsPromises.mkdir(targetApplicationsDir, { recursive: true });
      this.hasMaterialized = true;
      return;
    }

    await fsPromises.rm(targetApplicationsDir, {
      recursive: true,
      force: true,
    });

    if (pathExists(sourceApplicationsDir)) {
      await fsPromises.cp(sourceApplicationsDir, targetApplicationsDir, {
        recursive: true,
        force: true,
      });
    } else {
      await fsPromises.mkdir(targetApplicationsDir, { recursive: true });
    }

    this.hasMaterialized = true;
  }
}
