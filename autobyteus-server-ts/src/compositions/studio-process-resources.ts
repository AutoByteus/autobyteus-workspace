import { shutdownPrisma } from "repository_prisma";
import { setProcessProviderRelayAccess } from "../credential-proxy/provider-relays/provider-relay-process-access.js";
import type { CredentialProxyHost } from "../credential-proxy/credential-proxy-host.js";
import type { configureStudioApplicationApiServices } from "../api/graphql/studio-application-api-services.js";
import { stopMemorySyncWorker } from "../memory-sync/source/memory-sync-worker.js";
import { shutdownMemorySearch } from "../memory-search/memory-search.js";
import { stopDefaultAgentRunEventPipeline } from "../agent-execution/events/default-agent-run-event-pipeline.js";
import { getSecretVaultRuntime } from "../secret-management/secret-vault-runtime.js";
import type { AgentToolsMcpHost } from "../agent-tools/mcp/agent-tools-mcp-host.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../agent-tools/mcp/agent-tool-mcp-session-authority.js";
import type { GeneralProcessRunSupervisor } from "../agent-execution/runtime/general-process-run-supervisor.js";
import type { HostDefinitionServices } from "./host-definition-services.js";
import type { AgentPackageDefinitionFeed } from "./agent-package-definition-feed-composition.js";
import type { PlatformNoticeSources } from "./platform-notice-sources.js";
import type { UpdateNotifications } from "./update-notifications-composition.js";
import type { AgentRuntimeStatusHandle } from "./agent-runtime-status-composition.js";

/** The studio server's process resources: how they close, and how their file watches end for a process exit. */

export type StudioApiHandle = ReturnType<typeof configureStudioApplicationApiServices>;

/**
 * Process exit only: the process-shutdown cleanups call it right before they close the studio. Ends the studio's
 * in-process file watches (agent package folders, skill folders) without closing their OS watches, whose close can
 * block the main thread for seconds on a busy Mac (autobyteus-524 FU-007); the process exit releases them. The
 * closes that follow find the watchers stopped. Any other close (an in-process test server, a failed start) closes
 * the OS watches.
 */
export const stopStudioFileWatchesForProcessExit = (input: {
  agentPackageDefinitionFeed: AgentPackageDefinitionFeed | null;
  platformNotices: PlatformNoticeSources | null;
}): void => {
  input.agentPackageDefinitionFeed?.watcher.stopForProcessExit();
  input.platformNotices?.stopFileWatchesForProcessExit();
};

export const closeStudioProcessResources = async (input: {
  hostDefinitionServices: HostDefinitionServices;
  agentPackageDefinitionFeed: AgentPackageDefinitionFeed | null;
  agentToolsMcpHost: AgentToolsMcpHost | null;
  credentialProxyHost: CredentialProxyHost | null;
  generalProcessAuthority: ScopedAgentToolMcpSessionAuthority | null;
  generalProcessRunSupervisor: GeneralProcessRunSupervisor | null;
  platformNotices: PlatformNoticeSources | null;
  updateNotifications: UpdateNotifications | null;
  studioApiHandle: StudioApiHandle | null;
  agentRuntimeStatus: AgentRuntimeStatusHandle | null;
}): Promise<void> => {
  stopMemorySyncWorker();
  shutdownMemorySearch();
  try {
    input.updateNotifications?.close();
  } catch (error) {
    console.warn("UPDATE_NOTIFICATIONS_CLOSE_FAILED", error);
  }
  try {
    // Vendor update/sign-in processes started from Settings → Agent Runtimes end with the server (QR-003).
    await input.agentRuntimeStatus?.close();
  } catch (error) {
    console.warn("AGENT_RUNTIME_STATUS_CLOSE_FAILED", error);
  }
  // Platform notices stop first, so none go out and no run is changed while runs stop.
  await input.platformNotices?.close();
  try {
    await input.generalProcessRunSupervisor?.close();
  } finally {
    try {
      input.generalProcessAuthority?.close();
    } finally {
      try {
        await input.agentToolsMcpHost?.close();
      } finally {
        try {
          if (input.credentialProxyHost) setProcessProviderRelayAccess(null);
          await input.credentialProxyHost?.close();
        } catch (error) {
          console.warn("CREDENTIAL_PROXY_CLOSE_FAILED", error);
        }
        try {
          input.studioApiHandle?.close();
        } finally {
          try {
            await stopDefaultAgentRunEventPipeline();
          } finally {
            try {
              try {
                await input.agentPackageDefinitionFeed?.close();
              } finally {
                input.hostDefinitionServices.close();
              }
            } finally {
              try {
                await getSecretVaultRuntime().close();
              } finally {
                await shutdownPrisma();
              }
            }
          }
        }
      }
    }
  }
};
