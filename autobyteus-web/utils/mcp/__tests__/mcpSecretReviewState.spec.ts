import { beforeEach, describe, expect, it } from 'vitest'
import { MCP_SECRET_REVIEW_STORAGE_PREFIX, mcpSecretReviewState } from '../mcpSecretReviewState'

describe('mcpSecretReviewState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reads nothing reviewed when the key is absent or unreadable', () => {
    expect(mcpSecretReviewState.read('embedded-local')).toEqual(new Set())
    localStorage.setItem(`${MCP_SECRET_REVIEW_STORAGE_PREFIX}embedded-local`, '{not json')
    expect(mcpSecretReviewState.read('embedded-local')).toEqual(new Set())
  })

  it('keeps marks per node key and adds to earlier ones', () => {
    mcpSecretReviewState.markReviewed('embedded-local', [{ serverId: 'a', field: 'env:TOKEN_LIMIT' }], ['a', 'b'])
    mcpSecretReviewState.markReviewed('embedded-local', [{ serverId: 'b', field: 'token' }], ['a', 'b'])

    expect(mcpSecretReviewState.read('embedded-local')).toEqual(new Set(['a|env:TOKEN_LIMIT', 'b|token']))
    expect(mcpSecretReviewState.read('remote-entry-1')).toEqual(new Set())
  })

  it('drops the marks of servers that no longer exist when it writes', () => {
    mcpSecretReviewState.markReviewed('embedded-local', [{ serverId: 'gone', field: 'env:API_KEY' }], ['gone'])
    mcpSecretReviewState.markReviewed('embedded-local', [{ serverId: 'kept', field: 'header:X-Api-Key' }], ['kept'])

    expect([...mcpSecretReviewState.read('embedded-local')]).toEqual(['kept|header:X-Api-Key'])
  })
})
