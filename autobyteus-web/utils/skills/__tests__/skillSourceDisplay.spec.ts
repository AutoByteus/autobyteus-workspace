import { describe, expect, it } from 'vitest'
import type { SkillSource } from '~/stores/skillSourcesStore'
import { skillSourceDisplayName } from '../skillSourceDisplay'

const github = (repositoryUrl: string) => ({ repositoryUrl } as NonNullable<SkillSource['github']>)

describe('skillSourceDisplayName', () => {
  it.each([
    ['https://github.com/acme/docs-skills', 'acme/docs-skills'],
    ['https://github.com/acme/docs-skills.git', 'acme/docs-skills'],
    ['https://github.com/acme/docs-skills/', 'acme/docs-skills'],
    ['https://GitHub.com/Acme/Docs', 'Acme/Docs'],
  ])('names a GitHub source %s by owner/repository', (url, expected) => {
    expect(skillSourceDisplayName({ path: '/managed/g1', github: github(url) })).toBe(expected)
  })

  it('falls back to the full URL when it is not an owner/repository GitHub URL', () => {
    expect(skillSourceDisplayName({ path: '/managed/g1', github: github('https://example.com/x') }))
      .toBe('https://example.com/x')
  })

  it.each([
    ['/x/skills-library', 'skills-library'],
    ['/Users/a/.codex/skills', '.codex/skills'],
    ['/Users/a/.autobyteus/server-data/skills/', 'server-data/skills'],
    ['C:\\Users\\a\\Skills', 'a/Skills'],
    ['/skills', 'skills'],
  ])('names a folder source %s by its last segment, keeping the parent of a generic "skills"', (path, expected) => {
    expect(skillSourceDisplayName({ path, github: null })).toBe(expected)
  })

  it('returns the raw path when it has no segments', () => {
    expect(skillSourceDisplayName({ path: '/', github: null })).toBe('/')
  })
})
