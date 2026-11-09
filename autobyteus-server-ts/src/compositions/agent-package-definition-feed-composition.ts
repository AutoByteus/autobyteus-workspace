import { AgentPackageDefinitionChangeHub } from "../agent-package-definitions/changes/agent-package-definition-change-hub.js";
import {
  AgentPackageFolderWatcher,
  type PackageFolderWatchFactory,
  type ParentFolderWatchFactory,
} from "../agent-package-definitions/monitor/agent-package-folder-watcher.js";
import type { AgentPackageDefinitionList } from "../agent-package-definitions/domain/agent-package-definition-types.js";
import type { HostDefinitionServices } from "./host-definition-services.js";

/** The studio server's agent package folder watcher and change feed around the process agent package definitions. */
export type AgentPackageDefinitionFeed = Readonly<{
  hub: AgentPackageDefinitionChangeHub;
  watcher: AgentPackageFolderWatcher;
  close(): Promise<void>;
}>;

/**
 * Wires change announcements (the reloader and the personal settings → hub, through one announce
 * function) and registration (full reload → watched package folders), then starts watching the
 * registered package folders before the first read, so changes made during startup are not missed.
 * Startup never waits for watcher readiness.
 */
export const composeAgentPackageDefinitionFeed = async (input: {
  /**
   * The process definitions: the reloader of the agent package definitions; the agent definition
   * change signal, told about every announcement so running agents can take their definitions'
   * tools; the personal settings, announced through the same function as the reloader.
   */
  definitions: Pick<HostDefinitionServices, "agentPackageDefinitions" | "agentDefinitionChanges" | "personalSettings">;
  createWatcher?: PackageFolderWatchFactory;
  createParentFolderWatch?: ParentFolderWatchFactory;
}): Promise<AgentPackageDefinitionFeed> => {
  const { reloader } = input.definitions.agentPackageDefinitions;
  const { agentDefinitionChanges, personalSettings } = input.definitions;
  const hub = new AgentPackageDefinitionChangeHub();
  const watcher = new AgentPackageFolderWatcher({
    sink: reloader,
    createWatcher: input.createWatcher,
    createParentFolderWatch: input.createParentFolderWatch,
  });
  AgentPackageFolderWatcher.bindProcessInstance(watcher);
  const announce = (changedLists: readonly AgentPackageDefinitionList[]): void => {
    hub.broadcast({ type: "agent_package_definitions_changed", changedLists: [...changedLists] });
    agentDefinitionChanges.notifyChanged();
  };
  reloader.setPublisher(announce);
  personalSettings.setPublisher(announce);
  reloader.setRegistrationListener((roots) => watcher.syncPackageFolders(roots));
  await watcher.syncPackageFolders(reloader.listPackageRoots());

  let closed = false;
  return Object.freeze({
    hub,
    watcher,
    close: async () => {
      if (closed) return;
      closed = true;
      reloader.setRegistrationListener(null);
      reloader.setPublisher(null);
      personalSettings.setPublisher(null);
      AgentPackageFolderWatcher.releaseProcessInstance(watcher);
      try {
        await watcher.close();
      } finally {
        hub.closeAll();
      }
    },
  });
};
