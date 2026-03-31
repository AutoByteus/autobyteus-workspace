import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { deriveNodeEndpoints } from '~/utils/nodeEndpoints';
import { resolveDefaultEmbeddedBaseUrl } from '~/utils/embeddedNodeBaseUrl';
import { EMBEDDED_NODE_ID, type NodeEndpoints, type WindowNodeContext } from '~/types/node';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useWindowNodeContextStore = defineStore('windowNodeContext', () => {
  const windowId = ref<number | null>(null);
  const nodeId = ref<string>(EMBEDDED_NODE_ID);
  const nodeBaseUrl = ref<string>(resolveDefaultEmbeddedBaseUrl());
  const bindingRevision = ref(0);
  const initialized = ref(false);
  const lastReadyError = ref<string | null>(null);

  const isEmbeddedWindow = computed(() => nodeId.value === EMBEDDED_NODE_ID);
  const boundEndpoints = computed<NodeEndpoints>(() => deriveNodeEndpoints(nodeBaseUrl.value));

  function bumpBindingRevisionIfChanged(nextNodeId: string, nextBaseUrl: string): void {
    const normalizedBaseUrl = nextBaseUrl.trim();
    if (nodeId.value === nextNodeId && nodeBaseUrl.value === normalizedBaseUrl) {
      return;
    }
    bindingRevision.value += 1;
  }

  function initializeFromWindowContext(context: WindowNodeContext, baseUrl?: string): void {
    const resolvedNodeId = context.nodeId || EMBEDDED_NODE_ID;
    const resolvedBaseUrl =
      baseUrl && baseUrl.trim()
        ? baseUrl.trim()
        : resolvedNodeId === EMBEDDED_NODE_ID
          ? resolveDefaultEmbeddedBaseUrl()
          : nodeBaseUrl.value;

    bumpBindingRevisionIfChanged(resolvedNodeId, resolvedBaseUrl);

    windowId.value = context.windowId;
    nodeId.value = resolvedNodeId;
    nodeBaseUrl.value = resolvedBaseUrl;
    initialized.value = true;
  }

  function bindNodeContext(nextNodeId: string, nextBaseUrl: string): void {
    bumpBindingRevisionIfChanged(nextNodeId, nextBaseUrl);
    nodeId.value = nextNodeId;
    nodeBaseUrl.value = nextBaseUrl.trim();
  }

  function getBoundEndpoints(): NodeEndpoints {
    return boundEndpoints.value;
  }

  async function waitForBoundBackendReady(options?: {
    timeoutMs?: number;
    pollMs?: number;
  }): Promise<boolean> {
    const timeoutMs = options?.timeoutMs ?? 10000;
    const pollMs = options?.pollMs ?? 400;
    const deadline = Date.now() + timeoutMs;
    const healthUrl = boundEndpoints.value.health;

    lastReadyError.value = null;

    if (typeof globalThis.fetch !== 'function') {
      lastReadyError.value = 'global fetch is not available';
      return false;
    }

    while (Date.now() < deadline) {
      try {
        const response = await globalThis.fetch(healthUrl, { method: 'GET' });
        if (response.ok) {
          return true;
        }
        lastReadyError.value = `health check failed with status ${response.status}`;
      } catch (error) {
        lastReadyError.value = error instanceof Error ? error.message : String(error);
      }
      await delay(pollMs);
    }

    if (!lastReadyError.value) {
      lastReadyError.value = 'backend readiness timed out';
    }
    return false;
  }

  return {
    windowId,
    nodeId,
    nodeBaseUrl,
    bindingRevision,
    initialized,
    lastReadyError,
    isEmbeddedWindow,
    boundEndpoints,
    initializeFromWindowContext,
    bindNodeContext,
    getBoundEndpoints,
    waitForBoundBackendReady,
  };
});
