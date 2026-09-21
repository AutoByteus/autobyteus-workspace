import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { projectAgentOrgReference } from '../agentOrgReferenceProjection'

describe('projectAgentOrgReference', () => {
  it('matches the server owner/path identity and preserves accepted reference presentation', () => {
    const filePath = '/tmp/review diagram.svg'
    expect(projectAgentOrgReference('review-1', filePath, '2026-09-01T00:00:00.000Z')).toEqual({
      referenceId: createHash('sha256').update(`review-1\0${filePath}`).digest('hex'),
      path: filePath,
      type: 'image',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    })
  })
})
