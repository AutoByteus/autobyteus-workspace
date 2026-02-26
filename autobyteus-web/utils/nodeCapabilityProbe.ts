import type { CapabilityProbeState, NodeCapabilities } from '~/types/node';
import { deriveNodeEndpoints } from '~/utils/nodeEndpoints';

export interface NodeCapabilityProbeResult {
  capabilities: NodeCapabilities;
  state: CapabilityProbeState;
  error: string | null;
}

const CONSERVATIVE_CAPABILITIES: NodeCapabilities = {
  terminal: false,
  fileExplorerStreaming: false,
};

function withTimeout(signalTimeoutMs: number): AbortController {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), signalTimeoutMs);
  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timer);
    },
    { once: true },
  );
  return controller;
}

export async function probeNodeCapabilities(
  baseUrl: string,
  options?: {
    timeoutMs?: number;
    fetchImpl?: typeof globalThis.fetch;
  },
): Promise<NodeCapabilityProbeResult> {
  const fetchImpl =
    options && Object.prototype.hasOwnProperty.call(options, 'fetchImpl')
      ? options.fetchImpl
      : globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return {
      capabilities: { ...CONSERVATIVE_CAPABILITIES },
      state: 'unknown',
      error: 'global fetch is not available',
    };
  }

  const timeoutMs = options?.timeoutMs ?? 2500;
  const endpoints = deriveNodeEndpoints(baseUrl);
  const controller = withTimeout(timeoutMs);

  try {
    const response = await fetchImpl(endpoints.health, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        capabilities: { ...CONSERVATIVE_CAPABILITIES },
        state: 'degraded',
        error: `health probe failed with status ${response.status}`,
      };
    }

    return {
      capabilities: {
        terminal: true,
        fileExplorerStreaming: true,
      },
      state: 'ready',
      error: null,
    };
  } catch (error) {
    return {
      capabilities: { ...CONSERVATIVE_CAPABILITIES },
      state: 'degraded',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    controller.abort();
  }
}
