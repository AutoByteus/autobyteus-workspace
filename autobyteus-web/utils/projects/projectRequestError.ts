import type { ProjectErrorCode } from '~/types/project'

type GraphqlErrorLike = { message?: string; extensions?: Record<string, unknown> }

/** A failed Project or Project Task request. `code` carries the server `ProjectError` code when there is one. */
export class ProjectRequestError extends Error {
  constructor(message: string, readonly code: ProjectErrorCode | string | null) {
    super(message)
    this.name = 'ProjectRequestError'
  }
}

/** Normalises a thrown request failure (e.g. an Apollo error) into a `ProjectRequestError`. */
export const toProjectRequestError = (cause: unknown): ProjectRequestError => {
  if (cause instanceof ProjectRequestError) {
    return cause
  }
  const graphqlError = (cause as { graphQLErrors?: GraphqlErrorLike[] } | null)?.graphQLErrors?.[0]
  const code = typeof graphqlError?.extensions?.code === 'string' ? graphqlError.extensions.code : null
  const message = graphqlError?.message || (cause instanceof Error ? cause.message : String(cause))
  return new ProjectRequestError(message, code)
}

/** Throws a `ProjectRequestError` when a GraphQL response carries errors. */
export const throwProjectGraphqlErrors = (errors: readonly GraphqlErrorLike[] | null | undefined): void => {
  const first = errors?.[0]
  if (!first) {
    return
  }
  const code = typeof first.extensions?.code === 'string' ? first.extensions.code : null
  throw new ProjectRequestError(errors!.map((entry) => entry.message).join(', '), code)
}
