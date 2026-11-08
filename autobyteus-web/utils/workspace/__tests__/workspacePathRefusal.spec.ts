import { describe, expect, it } from 'vitest'
import { ApolloError } from '@apollo/client/core'
import { GraphQLError } from 'graphql'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { readWorkspacePathRefusal, workspacePathRefusalText } from '~/utils/workspace/workspacePathRefusal'

const refusal = (reason: string) => new ApolloError({
  graphQLErrors: [new GraphQLError('refused', { extensions: { code: 'WORKSPACE_PATH_REFUSED', reason } })],
})
const t = (key: string) => localizationRuntime.translate(key)

describe('workspacePathRefusal', () => {
  it('reads the reason of a WORKSPACE_PATH_REFUSED createWorkspace error only', () => {
    expect(readWorkspacePathRefusal(refusal('missing'))).toBe('missing')
    expect(readWorkspacePathRefusal(refusal('not_a_folder'))).toBe('not_a_folder')
    expect(readWorkspacePathRefusal(refusal('not_absolute'))).toBe('not_absolute')
    expect(readWorkspacePathRefusal(refusal('something_new'))).toBeNull()
    expect(readWorkspacePathRefusal(new ApolloError({
      graphQLErrors: [new GraphQLError('boom', { extensions: { code: 'INTERNAL_SERVER_ERROR' } })],
    }))).toBeNull()
    expect(readWorkspacePathRefusal(new Error('network'))).toBeNull()
    expect(readWorkspacePathRefusal(null)).toBeNull()
  })

  it('says which refusal it was, with the drive form for a Windows path', () => {
    expect(workspacePathRefusalText('not_absolute', 'relative/dir', t)).toBe('Enter a full path, starting with /.')
    expect(workspacePathRefusalText('not_absolute', 'projects\\app', t)).toBe('Enter a full path, starting with a drive like C:\\.')
    expect(workspacePathRefusalText('not_absolute', 'C:projects', t)).toBe('Enter a full path, starting with a drive like C:\\.')
    expect(workspacePathRefusalText('missing', '/definitely/not/a/folder', t)).toBe('No folder at this path.')
    expect(workspacePathRefusalText('not_a_folder', '/etc/hosts', t)).toBe('This path is a file, not a folder.')
  })
})
