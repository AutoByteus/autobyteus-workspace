import path from "node:path";
import { OutgoingFiles } from "../../src/agent-collaboration/execution/remote/outgoing-files.js";
import type { RemoteRunChannelAccess } from "../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import type { RemoteFiles } from "../../src/agent-collaboration/execution/remote/transferred-files.js";
import type { ClientIdentity } from "../../src/node-access/domain/client-identity.js";
import type { PeerGateway } from "../../src/remote-collaboration/channel/peer-gateway.js";
import { REMOTE_RECEIVED_FILES_PATH, REMOTE_RECEIVED_FILES_STATUS_PATH } from "../../src/remote-collaboration/domain/remote-requests.js";
import { ReceivedFiles } from "../../src/remote-collaboration/inbound/received-files.js";

/**
 * autobyteus-587: one in-process node's file transfer, as `composeRemoteFiles` builds it for a server, with the sending
 * agent's workspace given per run (`workspaceOf`) instead of the process run manager: its received files at
 * `<dataDir>/received_files`, placed into agent folders inside `memoryDir`, and its outgoing files through its channel.
 */
export const inProcessPeerFiles = (input: Readonly<{
  dataDir: string;
  memoryDir: string;
  channel: RemoteRunChannelAccess;
  /** The sending agent's workspace folder, or null (no workspace: its files are refused). */
  workspaceOf?: (agentRunId: string) => string | null;
  maxFileBytes?: () => number;
}>): Readonly<{ receivedFiles: ReceivedFiles; remoteFiles: RemoteFiles; storeDir: string }> => {
  const storeDir = path.join(input.dataDir, "received_files");
  const receivedFiles = new ReceivedFiles({ storeDir, memoryDir: input.memoryDir, maxFileBytes: input.maxFileBytes ?? (() => 2048 * 1024 * 1024) });
  // The run's workspace ID is its run ID here; the "workspace manager" answers the folder the test gave that run.
  const outgoing = new OutgoingFiles({
    runs: { getActiveRun: (agentRunId: string) => ({ config: { workspaceId: agentRunId } }) as never },
    workspaces: { getWorkspaceRootPathForHistory: async (agentRunId: string) => input.workspaceOf?.(agentRunId) ?? null },
    channel: input.channel,
  });
  return { receivedFiles, remoteFiles: Object.freeze({ outgoing, received: receivedFiles }), storeDir };
};

/**
 * The file routes of a fake network that hands each request to the peer's gateway (as `api/rest/remote.ts` does): the
 * status is JSON; a piece is raw bytes with its envelope in the query. Null for any other route.
 */
export const peerFilesRequest = async (gateway: PeerGateway, url: string, init: RequestInit, caller: ClientIdentity | null)
  : Promise<Readonly<{ status: number; answer: unknown }> | null> => {
  const { pathname, searchParams } = new URL(url);
  if (pathname === REMOTE_RECEIVED_FILES_STATUS_PATH) return gateway.receivedFilesStatus(JSON.parse(String(init.body)), caller);
  if (!pathname.startsWith(`${REMOTE_RECEIVED_FILES_PATH}/`)) return null;
  return gateway.receivedFilePiece({
    fromNodeId: searchParams.get("fromNodeId") ?? undefined, toNodeId: searchParams.get("toNodeId") ?? undefined,
    sha256: pathname.slice(REMOTE_RECEIVED_FILES_PATH.length + 1), offset: searchParams.get("offset") ?? undefined, size: searchParams.get("size") ?? undefined,
    bytes: Buffer.from(init.body as Uint8Array),
  }, caller);
};
