import { DefinitionCatalogChangeHub } from "../definition-catalog/changes/definition-catalog-change-hub.js";
import {
  PackageDefinitionMonitor,
  type AncestorWatcherFactory,
  type DefinitionWatcherFactory,
} from "../definition-catalog/monitor/package-definition-monitor.js";
import type { DefinitionCatalogSync } from "../definition-catalog/services/definition-catalog-sync.js";

/** The studio server's package monitor and change feed around the process definition catalog. */
export type DefinitionCatalogFeed = Readonly<{
  hub: DefinitionCatalogChangeHub;
  monitor: PackageDefinitionMonitor;
  close(): Promise<void>;
}>;

/**
 * Wires publication (sync → hub) and registration (full reconcile → monitor roots), then arms
 * the monitor on the registered roots before the first catalog read, so changes made during
 * startup are not missed. Startup never waits for watcher readiness.
 */
export const composeDefinitionCatalogFeed = async (input: {
  sync: DefinitionCatalogSync;
  createWatcher?: DefinitionWatcherFactory;
  createAncestorWatcher?: AncestorWatcherFactory;
}): Promise<DefinitionCatalogFeed> => {
  const hub = new DefinitionCatalogChangeHub();
  const monitor = new PackageDefinitionMonitor({
    sink: input.sync,
    createWatcher: input.createWatcher,
    createAncestorWatcher: input.createAncestorWatcher,
  });
  PackageDefinitionMonitor.bindProcessInstance(monitor);
  input.sync.setPublisher((subjects) => hub.broadcast({ type: "definitions_changed", subjects: [...subjects] }));
  input.sync.setRegistrationListener((roots) => monitor.syncRoots(roots));
  await monitor.syncRoots(input.sync.listPackageRoots());

  let closed = false;
  return Object.freeze({
    hub,
    monitor,
    close: async () => {
      if (closed) return;
      closed = true;
      input.sync.setRegistrationListener(null);
      input.sync.setPublisher(null);
      PackageDefinitionMonitor.releaseProcessInstance(monitor);
      try {
        await monitor.close();
      } finally {
        hub.closeAll();
      }
    },
  });
};
