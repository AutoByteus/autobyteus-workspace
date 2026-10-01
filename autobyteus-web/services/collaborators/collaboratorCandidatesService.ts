import { shallowReactive } from 'vue'
import { GetCollaboratorMentionCandidates } from '~/graphql/queries/collaboratorQueries'
import { getApolloClient } from '~/utils/apolloClient'

export type CollaboratorRootKind = 'agent' | 'agent_team' | 'agent_org'

/** One `@` option; the server decides what is offered (shared, not built-in, not in the run). */
export type CollaboratorMentionCandidate = Readonly<
  | { kind: 'agent'; definitionId: string; name: string; description: string }
  | { kind: 'agent_team'; definitionId: string; name: string; description: string; memberCount: number; coordinatorName: string }
>

export type CollaboratorCandidateEntry = Readonly<{
  status: 'loading' | 'ready' | 'error'
  /** The last good list; kept while a refresh is loading so the menu does not flicker. */
  candidates: readonly CollaboratorMentionCandidate[]
  /** False for application-owned runs, which cannot host collaborators. */
  available: boolean
}>

type CandidatesPayload = {
  collaboratorMentionCandidates?: {
    availability: string
    candidates: Array<{
      kind: string
      definitionId: string
      name: string
      description: string
      memberCount?: number | null
      coordinatorName?: string | null
    }>
  } | null
}

const keyOf = (rootKind: CollaboratorRootKind, rootRunId: string): string => `${rootKind}:${rootRunId}`
const cache = shallowReactive(new Map<string, CollaboratorCandidateEntry>())
const inFlight = new Map<string, Promise<void>>()

const toCandidate = (raw: NonNullable<CandidatesPayload['collaboratorMentionCandidates']>['candidates'][number]): CollaboratorMentionCandidate | null => {
  if (raw.kind === 'agent') {
    return Object.freeze({ kind: 'agent', definitionId: raw.definitionId, name: raw.name, description: raw.description })
  }
  if (raw.kind === 'agent_team') {
    return Object.freeze({
      kind: 'agent_team', definitionId: raw.definitionId, name: raw.name, description: raw.description,
      memberCount: raw.memberCount ?? 0, coordinatorName: raw.coordinatorName ?? '',
    })
  }
  return null
}

const fetchCandidates = async (rootKind: CollaboratorRootKind, rootRunId: string): Promise<void> => {
  const key = keyOf(rootKind, rootRunId)
  const previous = cache.get(key)
  cache.set(key, Object.freeze({ status: 'loading', candidates: previous?.candidates ?? [], available: previous?.available ?? true }))
  try {
    const result = await getApolloClient().query<CandidatesPayload>({
      query: GetCollaboratorMentionCandidates,
      variables: { rootSubjectKind: rootKind, rootRunId },
      fetchPolicy: 'network-only',
    })
    if (result.errors?.length) throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '))
    const payload = result.data?.collaboratorMentionCandidates
    if (!payload) throw new Error('No collaborator candidates were returned.')
    cache.set(key, Object.freeze({
      status: 'ready',
      available: payload.availability === 'AVAILABLE',
      candidates: Object.freeze(payload.candidates.map(toCandidate).filter((entry: CollaboratorMentionCandidate | null): entry is CollaboratorMentionCandidate => entry !== null)),
    }))
  } catch (error) {
    console.warn(`Failed to load @ mention candidates for ${key}.`, error)
    cache.set(key, Object.freeze({ status: 'error', candidates: previous?.candidates ?? [], available: previous?.available ?? true }))
  }
}

/**
 * The `@` menu's candidate list per root. The server's candidate policy is the only authority;
 * the list is refreshed whenever the menu opens and when a collaborator is added to the root.
 */
export const collaboratorCandidatesService = Object.freeze({
  entry(rootKind: CollaboratorRootKind, rootRunId: string): CollaboratorCandidateEntry | null {
    return cache.get(keyOf(rootKind, rootRunId)) ?? null
  },

  refresh(rootKind: CollaboratorRootKind, rootRunId: string): Promise<void> {
    const key = keyOf(rootKind, rootRunId)
    const pending = inFlight.get(key)
    if (pending) return pending
    const attempt = fetchCandidates(rootKind, rootRunId).finally(() => inFlight.delete(key))
    inFlight.set(key, attempt)
    return attempt
  },

  /** A collaborator was added (or the run changed): the next menu open fetches again. */
  invalidate(rootKind: CollaboratorRootKind, rootRunId: string): void {
    cache.delete(keyOf(rootKind, rootRunId))
  },

  /** Test support. */
  reset(): void {
    cache.clear()
    inFlight.clear()
  },
})
