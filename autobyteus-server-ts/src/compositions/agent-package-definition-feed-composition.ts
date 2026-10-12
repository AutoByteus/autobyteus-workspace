import { AgentPackageDefinitionChangeHub } from "../agent-package-definitions/changes/agent-package-definition-change-hub.js";
import {
  AgentPackageFolderWatcher,
  type PackageFolderWatchFactory,
  type ParentFolderWatchFactory,
} from "../agent-package-definitions/monitor/agent-package-folder-watcher.js";
import type { AgentPackageDefinitionReloader } from "../agent-package-definitions/services/agent-package-definition-reloader.js";

/** The studio server's agent package folder watcher and change feed around the process agent package definitions. */
export type AgentPackageDefinitionFeed = Readonly<{
  hub: AgentPackageDefinitionChangeHub;
  watcher: AgentPackageFolderWatcher;
  close(): Promise<void>;
}>;

/**
 * Wires change announcements (reloader → hub) and registration (full reload → watched package
 * folders), then starts watching the registered package folders before the first read, so
 * changes made during startup are not missed. Startup never waits for watcher readiness.
 */
export const composeAgentPackageDefinitionFeed = async (input: {
  reloader: AgentPackageDefinitionReloader;
  createWatcher?: PackageFolderWatchFactory;
  createParentFolderWatch?: ParentFolderWatchFactory;
}): Promise<AgentPackageDefinitionFeed> => {
  const hub = new AgentPackageDefinitionChangeHub();
  const watcher = new AgentPackageFolderWatcher({
    sink: input.reloader,
    createWatcher: input.createWatcher,
    createParentFolderWatch: input.createParentFolderWatch,
  });
  AgentPackageFolderWatcher.bindProcessInstance(watcher);
  input.reloader.setPublisher((changedLists) => hub.broadcast({ type: "agent_package_definitions_changed", changedLists: [...changedLists] }));
  input.reloader.setRegistrationListener((roots) => watcher.syncPackageFolders(roots));
  await watcher.syncPackageFolders(input.reloader.listPackageRoots());

  let closed = false;
  return Object.freeze({
    hub,
    watcher,
    close: async () => {
      if (closed) return;
      closed = true;
      input.reloader.setRegistrationListener(null);
      input.reloader.setPublisher(null);
      AgentPackageFolderWatcher.releaseProcessInstance(watcher);
      try {
        await watcher.close();
      } finally {
        hub.closeAll();
      }
    },
  });
};
