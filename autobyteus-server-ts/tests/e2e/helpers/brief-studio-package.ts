import fs from "node:fs";
import path from "node:path";

/** The Brief Studio sample application's importable package, built by `test:integration:prepare`. */
export const BRIEF_STUDIO_PACKAGE = path.resolve(process.cwd(), "..", "applications/brief-studio/dist/importable-package");

/**
 * Fails a suite that imports Brief Studio when its package is not built, naming the command that builds it
 * (call it first in the suite's beforeAll), so a clean clone fails loudly instead of skipping the suite.
 */
export const assertBriefStudioPackageBuilt = (): void => {
  if (!fs.existsSync(path.join(BRIEF_STUDIO_PACKAGE, "applications", "brief-studio", "application.json"))) {
    throw new Error(
      `Brief Studio importable package missing (${BRIEF_STUDIO_PACKAGE}); build it with: pnpm -C autobyteus-server-ts test:integration:prepare`,
    );
  }
};
