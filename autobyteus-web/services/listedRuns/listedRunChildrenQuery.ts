import {
  RUN_COLLABORATION_STATUSES_MAX_RUNS,
  runCollaborationStatusesDtoSchema,
  type ListedRunRefDto,
  type RunCollaborationStatusesDto,
} from '@autobyteus/collaboration-stream-contracts'
import { GetRunCollaborationStatuses } from '~/graphql/queries/collaboratorQueries'
import { getApolloClient } from '~/utils/apolloClient'

/** One listed run's answer: its activity and its local children, each by its identity with its agents' statuses. */
export type ListedRunAnswer = RunCollaborationStatusesDto[number]
export type ListedRunChild = ListedRunAnswer['children'][number]

/**
 * The listed runs' children (autobyteus-461 SR-055), at most 100 runs per read as the server allows: one read for up to
 * 100 runs, one more per further 100. Never the view; never restores a run.
 */
export const readListedRunChildren = async (runs: readonly ListedRunRefDto[]): Promise<ListedRunAnswer[]> => {
  const batches: ListedRunRefDto[][] = []
  for (let start = 0; start < runs.length; start += RUN_COLLABORATION_STATUSES_MAX_RUNS) {
    batches.push(runs.slice(start, start + RUN_COLLABORATION_STATUSES_MAX_RUNS))
  }
  const answers = await Promise.all(batches.map(async (batch) => {
    const result = await getApolloClient().query<{ runCollaborationStatuses: unknown }>({
      query: GetRunCollaborationStatuses, variables: { runs: batch.map(({ kind, runId }) => ({ kind, runId })) },
      fetchPolicy: 'network-only', context: { queryDeduplication: false },
    })
    if (result.errors?.length) throw new Error(result.errors.map((error: { message: string }) => error.message).join(', '))
    return runCollaborationStatusesDtoSchema.parse(result.data?.runCollaborationStatuses ?? [])
  }))
  return answers.flat()
}
