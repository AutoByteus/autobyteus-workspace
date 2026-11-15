import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProjectTaskContextClient } from '../projectTaskContextClient'
import { ContextFileUploadError } from '~/utils/contextFiles/contextFileUploadFailure'

const { node, transport } = vi.hoisted(() => ({
  node: {bindingRevision: 1, getBoundEndpoints: () => ({rest: 'http://node/rest/'}), waitForBoundBackendReady: vi.fn(async () => true)},
  transport: {fetchWithRemoteAccessCredential: vi.fn(), getActiveRemoteAccessCredential: vi.fn(() => null)},
}))
vi.mock('~/stores/windowNodeContextStore', () => ({useWindowNodeContextStore: () => node}))
vi.mock('~/utils/remoteAccess/authorizedTransport', () => transport)

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}})
const file = new File(['x'], 'clip.mp4', {type: 'video/mp4'})

describe('Project Task context client: size limits and upload failures', () => {
  beforeEach(() => { vi.resetAllMocks(); node.waitForBoundBackendReady.mockResolvedValue(true) })

  it('reads the node limits from the shared context-file route', async () => {
    transport.fetchWithRemoteAccessCredential.mockResolvedValue(json(200, {otherFileMaxBytes: 26214400, audioVideoMaxBytes: 2147483648, audioVideoMimeTypes: ['video/mp4']}))
    await expect(createProjectTaskContextClient('p').sizeLimits()).resolves.toEqual({otherFileMaxBytes: 26214400, audioVideoMaxBytes: 2147483648, audioVideoMimeTypes: ['video/mp4']})
    expect(transport.fetchWithRemoteAccessCredential.mock.calls[0][0]).toBe('http://node/rest/context-files/size-limits')
  })

  it.each([
    [json(413, {error: {code: 'CONTEXT_FILE_TOO_LARGE', message: 'Uploaded file is too large.', maxBytes: 26214400}}), {reason: 'too_large', maxBytes: 26214400}],
    [json(415, {error: {code: 'CONTEXT_FILE_TYPE_UNSUPPORTED', message: 'Unsupported file type: x'}}), {reason: 'unsupported_type'}],
    [json(400, {error: {code: 'TASK_CONTEXT_INVALID', message: 'Context bytes are incomplete.'}}), {reason: 'other'}],
    [json(404, {error: {code: 'PROJECT_NOT_FOUND', message: 'Project was not found.'}}), {reason: 'other'}],
  ])('turns the upload answer %# into a typed failure (the route group\'s {error} envelope)', async (response, failure) => {
    transport.fetchWithRemoteAccessCredential.mockResolvedValue(response)
    const error = await createProjectTaskContextClient('p').upload('d', file).catch((e) => e)
    expect(error).toBeInstanceOf(ContextFileUploadError)
    expect(error.failure).toEqual(failure)
  })

  it('reports a lost connection as interrupted', async () => {
    transport.fetchWithRemoteAccessCredential.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await createProjectTaskContextClient('p').upload('d', file).catch((e) => e)
    expect(error.failure).toEqual({reason: 'interrupted'})
    const limits = await createProjectTaskContextClient('p').sizeLimits().catch((e) => e)
    expect(limits.failure).toEqual({reason: 'interrupted'})
  })

  it('keeps the other operations\' error text as before', async () => {
    transport.fetchWithRemoteAccessCredential.mockResolvedValue(json(404, {error: {code: 'TASK_CONTEXT_NOT_FOUND', message: 'Task context was not found.'}}))
    await expect(createProjectTaskContextClient('p').remove('d', 'ctx_a__b.txt')).rejects.toThrow('Task context was not found.')
  })
})
