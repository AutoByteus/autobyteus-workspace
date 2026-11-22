import path from "node:path";
import { OutgoingFiles } from "../agent-collaboration/execution/remote/outgoing-files.js";
import type { RemoteRunChannelAccess } from "../agent-collaboration/execution/remote/remote-run-channel.js";
import { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import { resolveReceivedFileMaxBytes } from "../config/received-file-size-limit-setting.js";
import { ReceivedFiles } from "../remote-collaboration/inbound/received-files.js";
import type { WorkspaceManager } from "../workspaces/workspace-manager.js";

/**
 * A host's file transfer between nodes (autobyteus-587), built once by its composition root before the run services:
 * the node's received files at `<data>/received_files` (the peer routes upload into them, roots place them, history
 * deletes and the startup sweep clean them), and its outgoing files (the router's `node` path and `TaskDelegation` upload
 * them, SR-010).
 * `OutgoingFiles` reads the sending agent's live run from the process run manager at send time: the run services
 * create that manager after this, and nothing sends before the server listens; a missing one throws.
 */
export const composeRemoteFiles = (input: Readonly<{
  appDataDir: string;
  memoryDir: string;
  /** The host's channel to its peers (`() => null` on a host without peers: any file is then refused, nothing is sent). */
  channel: RemoteRunChannelAccess;
  workspaces: Pick<WorkspaceManager, "getWorkspaceRootPathForHistory">;
}>): Readonly<{ receivedFiles: ReceivedFiles; outgoingFiles: OutgoingFiles }> => {
  const receivedFiles = new ReceivedFiles({
    storeDir: path.join(input.appDataDir, "received_files"), memoryDir: input.memoryDir, maxFileBytes: resolveReceivedFileMaxBytes,
  });
  const outgoingFiles = new OutgoingFiles({
    runs: { getActiveRun: (runId) => AgentRunManager.getInstance().getActiveRun(runId) },
    workspaces: input.workspaces,
    channel: input.channel,
  });
  return Object.freeze({ receivedFiles, outgoingFiles });
};
