import { isNodeServerStatus, NODE_UPDATE_REST_PATH, type NodeServerStatus } from '../../shared/nodeUpdateContract';

/** Each C1 request gives up after this long (DS-003). */
export const NODE_UPDATE_REQUEST_TIMEOUT_MS = 10_000;

type FetchResponse = Readonly<{ status: number; json: () => Promise<unknown> }>;
export type NodeUpdateFetch = (url: string, init?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}) => Promise<FetchResponse>;

/**
 * The result of an update request. Only `accepted` (C1 202) is an attempt; a refusal before the start (409) or a
 * request that was not delivered changes nothing (DS-003 step 4).
 */
export type NodeUpdateRequestResult =
  | { kind: 'accepted' }
  | { kind: 'refused'; code: string | null; message: string }
  | { kind: 'not-delivered'; message: string };

export interface NodeUpdateClient {
  /** `GET {baseUrl}/rest/node-update?target=V`; null when the node does not answer with a C1 status. */
  getStatus(baseUrl: string, targetVersion: string): Promise<NodeServerStatus | null>;
  /** `POST {baseUrl}/rest/node-update { version }`. */
  requestUpdate(baseUrl: string, version: string): Promise<NodeUpdateRequestResult>;
}

const urlOf = (baseUrl: string): string => `${baseUrl.trim().replace(/\/+$/, '')}${NODE_UPDATE_REST_PATH}`;

/**
 * The main process's own small C1 client (autobyteus-356); C1 is frozen, so it shares only the contract types. C1 is an
 * owner route: each request carries this desktop's owner credential for the node (autobyteus-437; the main process's
 * fetch is not a window request, so the attacher does not add it).
 */
export function createNodeUpdateClient(options: Readonly<{
  fetch?: NodeUpdateFetch;
  timeoutMs?: number;
  /** This desktop's owner credential for a node base URL; null when it holds none. */
  credentialFor(baseUrl: string): string | null;
}>): NodeUpdateClient {
  const fetchImpl: NodeUpdateFetch = options.fetch ?? ((url, init) => fetch(url, init));
  const timeoutMs = options.timeoutMs ?? NODE_UPDATE_REQUEST_TIMEOUT_MS;
  const credentialHeaders = (baseUrl: string): Record<string, string> => {
    const credential = options.credentialFor(baseUrl);
    return credential ? { authorization: `Bearer ${credential}` } : {};
  };
  return {
    async getStatus(baseUrl, targetVersion) {
      try {
        const response = await fetchImpl(`${urlOf(baseUrl)}?target=${encodeURIComponent(targetVersion)}`,
          { headers: credentialHeaders(baseUrl), signal: AbortSignal.timeout(timeoutMs) });
        const answer = await response.json();
        return isNodeServerStatus(answer) ? answer : null;
      } catch {
        return null;
      }
    },
    async requestUpdate(baseUrl, version) {
      try {
        const response = await fetchImpl(urlOf(baseUrl), {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...credentialHeaders(baseUrl) },
          body: JSON.stringify({ version }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const answer = await response.json().catch(() => null) as { accepted?: unknown; refused?: unknown; message?: unknown } | null;
        if (response.status === 202 && answer?.accepted === true) return { kind: 'accepted' };
        return {
          kind: 'refused',
          code: typeof answer?.refused === 'string' ? answer.refused : null,
          message: typeof answer?.message === 'string' ? answer.message : `HTTP ${response.status}`,
        };
      } catch (error) {
        return { kind: 'not-delivered', message: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}
