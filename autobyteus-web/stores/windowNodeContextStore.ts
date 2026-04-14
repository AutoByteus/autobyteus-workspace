import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { deriveNodeEndpoints } from '~/utils/nodeEndpoints';
import { resolveDefaultEmbeddedBaseUrl } from '~/utils/embeddedNodeBaseUrl';
import { EMBEDDED_NODE_ID, type NodeEndpoints, type WindowNodeContext } from '~/types/node';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatReadyError(error: unknown, requestTimeoutMs: number): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return `health check timed out after ${requestTimeoutMs}ms`;
  }

  return error instanceof Error ? error.message : String(error);
}

function createAbortError(): Error {
  if (typeof DOMException === 'function') {
    return new DOMException('The operation was aborted.', 'AbortError');
  }

  const abortError = new Error('The operation was aborted.');
  abortError.name = 'AbortError';
  return abortError;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => reject(createAbortError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
}

export const useWindowNodeContextStore = defineStore('windowNodeContext', () => {
  const windowId = ref<number | null>(null);
  const nodeId = ref<string>(EMBEDDED_NODE_ID);
  const nodeBaseUrl = ref<string>(resolveDefaultEmbeddedBaseUrl());
  const bindingRevision = ref(0);
  const initialized = ref(false);
  const lastReadyError = ref<string | null>(null);
  let electronHealthCheckPromise: Promise<unknown> | null = null;

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

  function getElectronHealthCheckPromise(): Promise<unknown> {
    if (electronHealthCheckPromise) {
      return electronHealthCheckPromise;
    }

    if (typeof window === 'undefined' || !window.electronAPI?.checkServerHealth) {
      return Promise.reject(new Error('Electron health bridge is not available'));
    }

    const trackedPromise = window.electronAPI.checkServerHealth().finally(() => {
      if (electronHealthCheckPromise === trackedPromise) {
        electronHealthCheckPromise = null;
      }
    });

    electronHealthCheckPromise = trackedPromise;
    return trackedPromise;
  }

  async function probeBoundBackendReady(healthUrl: string, requestTimeoutMs: number): Promise<boolean> {
    if (
      nodeId.value === EMBEDDED_NODE_ID &&
      typeof window !== 'undefined' &&
      window.electronAPI?.checkServerHealth
    ) {
      try {
        const result = await withTimeout(getElectronHealthCheckPromise(), requestTimeoutMs) as {
          status?: string;
          data?: unknown;
          message?: string;
        };
        if (result.status === 'ok') {
          return true;
        }

        lastReadyError.value =
          result.message ||
          (result.status === 'starting'
            ? 'backend is still starting'
            : `health check returned status ${result.status || 'unknown'}`);
        return false;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          electronHealthCheckPromise = null;
        }
        lastReadyError.value = formatReadyError(error, requestTimeoutMs);
        return false;
      }
    }

    if (typeof globalThis.fetch !== 'function') {
      lastReadyError.value = 'global fetch is not available';
      return false;
    }

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = setTimeout(() => controller?.abort(), requestTimeoutMs);

    try {
      const response = await globalThis.fetch(healthUrl, {
        method: 'GET',
        signal: controller?.signal,
      });
      if (response.ok) {
        return true;
      }

      lastReadyError.value = `health check failed with status ${response.status}`;
      return false;
    } catch (error) {
      lastReadyError.value = formatReadyError(error, requestTimeoutMs);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
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

    while (Date.now() < deadline) {
      const remainingMs = deadline - Date.now();
      const requestTimeoutMs = Math.max(1, Math.min(2000, remainingMs));

      const isReady = await probeBoundBackendReady(healthUrl, requestTimeoutMs);
      if (isReady) {
        return true;
      }

      const sleepMs = Math.min(pollMs, Math.max(0, deadline - Date.now()));
      if (sleepMs > 0) {
        await delay(sleepMs);
      }
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
