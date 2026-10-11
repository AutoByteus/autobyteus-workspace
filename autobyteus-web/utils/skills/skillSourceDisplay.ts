import type { SkillSource } from '~/stores/skillSourcesStore'

/**
 * The name a skill source row leads with (skill-sources-dialog-redesign).
 * - GitHub: `owner/repository` from the repository URL.
 * - Folder (Default or Local folder): the last path segment; when that segment is the generic
 *   `skills`, the parent segment is kept too (`.codex/skills`, `server-data/skills`).
 * The full path or URL stays available as the row's secondary line, tooltip and copy value.
 */
export function skillSourceDisplayName(source: Pick<SkillSource, 'path' | 'github'>): string {
  if (source.github) {
    const match = /github\.com\/([^/]+)\/([^/?#]+?)(?:\.git)?\/?$/i.exec(source.github.repositoryUrl)
    return match ? `${match[1]}/${match[2]}` : source.github.repositoryUrl
  }
  const segments = source.path.split(/[\\/]+/).filter(Boolean)
  const last = segments.at(-1)
  if (!last) return source.path
  return last.toLowerCase() === 'skills' && segments.length > 1 ? `${segments.at(-2)}/${last}` : last
}
