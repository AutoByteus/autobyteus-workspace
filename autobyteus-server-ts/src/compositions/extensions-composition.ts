import path from "node:path";
import { ExtensionCatalog } from "../extensions/catalog/extension-catalog.js";
import type { ExtensionCatalogSource } from "../extensions/catalog/extension-catalog-source.js";
import { ExtensionPackageInstaller } from "../extensions/packages/extension-package-installer.js";
import { ServerPartHost } from "../extensions/server-parts/server-part-host.js";
import { ExtensionManager } from "../extensions/services/extension-manager.js";
import { ExtensionLog } from "../extensions/storage/extension-log.js";
import { ExtensionStateStore } from "../extensions/storage/extension-state-store.js";

/**
 * Builds the node's Extension Manager with its collaborators (design-spec.md, Dependency Rules). The extensions
 * folder is `<data dir>/extensions` on every node (extension-contract.md §7).
 */
export const composeExtensions = (input: Readonly<{
  dataDir: string;
  platform: string;
  /** The desktop app's own node: `desktop-node` extensions are offered here. */
  isDesktopNode: boolean;
  catalogSource: ExtensionCatalogSource;
  fetch: typeof fetch;
}>): ExtensionManager => {
  const store = new ExtensionStateStore(path.join(input.dataDir, "extensions"));
  const log = new ExtensionLog((id) => store.logFile(id));
  return new ExtensionManager({
    catalog: new ExtensionCatalog(input.catalogSource, input.fetch),
    installer: new ExtensionPackageInstaller(input.fetch),
    host: new ServerPartHost({ platform: input.platform, log: (id, line) => log.append(id, line) }),
    store,
    log,
    platform: input.platform,
    isDesktopNode: input.isDesktopNode,
  });
};
