import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { composeExtensions } from "../../src/compositions/extensions-composition.js";
import type { ExtensionManager } from "../../src/extensions/services/extension-manager.js";

/**
 * A real Extension Manager for tests that build a GraphQL or REST server but do not exercise extensions: its folder
 * is a fresh temporary one, and its catalog fetch never reaches the network (the catalog answers `unreachable`).
 */
export const testExtensionManager = (
  dataDir: string = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-test-extensions-")),
): ExtensionManager => composeExtensions({
  dataDir,
  platform: "test-platform",
  isDesktopNode: false,
  catalogSource: { url: "https://extensions.invalid/extensions-catalog.json", publicKeyPem: "" },
  fetch: async () => { throw new Error("tests do not fetch the extension catalog"); },
});
