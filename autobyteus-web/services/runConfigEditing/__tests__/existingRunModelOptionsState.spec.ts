import { beforeEach, describe, expect, it, vi } from 'vitest'

const apollo = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => apollo }))

import { loadExistingRunModelOptions } from '../existingRunModelOptionsClient'
import { loadDelegatedLaunchModelOptions } from '../delegatedLaunchSelectionClient'
import { mergeReloadedOptions, optionsStateOfAnswer } from '../existingRunModelOptionsState'

/** SR-004 (CR-004): the server says whether a scope's model list could be read; only that flag decides. */
const UNREADABLE = 'The model list of Claude Agent SDK could not be read: the CLI did not answer. Try again.'
const readable = { currentModelIdentifier: 'haiku', modelListReadable: true, currentModel: null, unavailableReason: null,
  replacements: [{ llmModelIdentifier: 'sonnet' }] }
const unreadable = { currentModelIdentifier: 'haiku', modelListReadable: false, currentModel: null, replacements: [], unavailableReason: UNREADABLE }
const shown = (...ids: string[]) => ({ status: 'ready' as const, options: { currentModelIdentifier: 'haiku', currentModel: null, unavailableReason: null,
  replacements: ids.map((llmModelIdentifier) => ({ llmModelIdentifier })) as never } })
const unavailable = { status: 'unavailable' as const, options: null, message: UNREADABLE }

beforeEach(() => apollo.query.mockReset())

describe('optionsStateOfAnswer', () => {
  it('maps a readable answer to a ready state without the flag, even when it is empty or carries a capacity note', () => {
    expect(optionsStateOfAnswer(readable as never)).toEqual({ status: 'ready', options: { currentModelIdentifier: 'haiku', currentModel: null,
      unavailableReason: null, replacements: [{ llmModelIdentifier: 'sonnet' }] } })
    const note = { ...readable, replacements: [], unavailableReason: 'The current model\'s context capacity could not be verified.' }
    expect(optionsStateOfAnswer(note as never)).toMatchObject({ status: 'ready', options: { replacements: [], unavailableReason: note.unavailableReason } })
  })

  it('maps an unreadable answer to unavailable with the server\'s message, not to a ready empty list', () => {
    expect(optionsStateOfAnswer(unreadable as never)).toEqual(unavailable)
  })
})

describe('mergeReloadedOptions', () => {
  it('a readable row replaces its row', () => {
    const merged = mergeReloadedOptions({ '/': shown('sonnet') }, { '/': shown('sonnet', 'opus') })
    expect(merged).toEqual({ options: { '/': shown('sonnet', 'opus') }, complete: true })
  })

  it('an unreadable row keeps a ready row and reports the read as incomplete', () => {
    expect(mergeReloadedOptions({ '/': shown('sonnet') }, { '/': unavailable })).toEqual({ options: { '/': shown('sonnet') }, complete: false })
  })

  it('an unreadable row becomes unavailable (with the message) when nothing ready was shown', () => {
    for (const before of [{ status: 'loading' as const, options: null }, { status: 'unavailable' as const, options: null }, undefined]) {
      expect(mergeReloadedOptions({ '/': before } as never, { '/': unavailable })).toEqual({ options: { '/': unavailable }, complete: false })
    }
  })

  it('merges per row: one scope readable and one not', () => {
    const merged = mergeReloadedOptions({ '/a': shown('x'), '/b': shown('y') }, { '/a': shown('x', 'z'), '/b': unavailable })
    expect(merged).toEqual({ options: { '/a': shown('x', 'z'), '/b': shown('y') }, complete: false })
  })
})

describe('the options clients', () => {
  it('map every scope of an agent, team and org answer by its modelListReadable flag', async () => {
    apollo.query.mockResolvedValueOnce({ data: { agentRunModelOptions: unreadable } })
    await expect(loadExistingRunModelOptions({ kind: 'agent', runId: 'r' } as never)).resolves.toEqual({ '/': unavailable })
    apollo.query.mockResolvedValueOnce({ data: { teamRunModelOptions: [{ ...readable, scopeAddress: '/' }, { ...unreadable, scopeAddress: '/m' }] } })
    const team = await loadExistingRunModelOptions({ kind: 'team', teamRunId: 't' } as never)
    expect(team['/']!.status).toBe('ready')
    expect(team['/m']).toEqual(unavailable)
  })

  it('refuse an answer without the flag as a failed read', async () => {
    const { modelListReadable: _flag, ...withoutFlag } = readable
    apollo.query.mockResolvedValueOnce({ data: { agentRunModelOptions: withoutFlag } })
    await expect(loadExistingRunModelOptions({ kind: 'agent', runId: 'r' } as never)).rejects.toThrow('Model options unavailable.')
  })

  it('map the delegated copies by the same flag, keyed by where the choice is recorded', async () => {
    apollo.query.mockResolvedValueOnce({ data: { delegatedLaunchModelOptions: [
      { ...readable, scope: 'agent', agentRunId: 'a1', teamRunId: null }, { ...unreadable, scope: 'team', agentRunId: null, teamRunId: 't1' }] } })
    const options = await loadDelegatedLaunchModelOptions({ rootKind: 'AGENT_TEAM', rootRunId: 'root' })
    expect(options['agent:a1']!.status).toBe('ready')
    expect(options['team:t1']).toEqual(unavailable)
  })
})
