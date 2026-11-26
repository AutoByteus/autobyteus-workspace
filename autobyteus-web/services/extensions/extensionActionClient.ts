import { deriveNodeEndpoints } from '~/utils/nodeEndpoints'

/**
 * Calls one action of a node's extension (extension-contract.md §6): `POST <node>/rest/extensions/:id/actions/:action`
 * with a JSON body or a WAV recording. The desktop attaches the node's owner credential by the request's origin. The
 * node answers `{ output }`, or `{ code, message }` with `EXTENSION_NOT_INSTALLED`, `EXTENSION_OFF`, `EXTENSION_BUSY`,
 * `UNKNOWN_ACTION`, `RECORDING_TOO_LONG` or `ACTION_FAILED`.
 */
export class ExtensionActionError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
  }
}

export type ExtensionActionInput = { json: unknown } | { wav: ArrayBuffer | Blob }

export const callExtensionAction = async (
  nodeBaseUrl: string,
  extensionId: string,
  action: string,
  input: ExtensionActionInput,
): Promise<unknown> => {
  const url = `${deriveNodeEndpoints(nodeBaseUrl).rest}/extensions/${encodeURIComponent(extensionId)}/actions/${encodeURIComponent(action)}`
  const wav = 'wav' in input
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': wav ? 'audio/wav' : 'application/json' },
      body: wav ? input.wav : JSON.stringify(input.json ?? null),
    })
  } catch (cause) {
    throw new ExtensionActionError('NODE_UNREACHABLE', cause instanceof Error ? cause.message : String(cause))
  }
  const body = await response.json().catch(() => null) as { output?: unknown; code?: string; message?: string } | null
  if (!response.ok) {
    throw new ExtensionActionError(body?.code ?? `HTTP_${response.status}`, body?.message ?? `The node answered HTTP ${response.status}.`)
  }
  return body?.output ?? null
}
