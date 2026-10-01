import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GET_SKILL_NAME_ISSUES } from '~/graphql/skills'
import { useToasts } from '~/composables/useToasts'
import { useLocalization } from '~/composables/useLocalization'
import {
  newlyShadowedRuntimeDefaultPaths,
  runtimeDefaultFolderLabel,
  toSkillNameConflict,
  type SkillNameConflict,
  type SkillNameIssue,
} from '~/utils/skills/skillNames'

/**
 * One skill per name (D-19) on the web: the copies the catalog ignores (Skills page banner), the
 * conflict pop-up after a rejected import, and the notice when a runtime default copy is ignored.
 */
export const useSkillNamesStore = defineStore('skillNames', () => {
  const issues = ref<SkillNameIssue[]>([])
  const conflicts = ref<SkillNameConflict[]>([])

  async function fetchIssues(): Promise<SkillNameIssue[]> {
    const { data } = await getApolloClient().query({ query: GET_SKILL_NAME_ISSUES, fetchPolicy: 'network-only' })
    issues.value = (data?.skillNameIssues ?? []).map((issue: SkillNameIssue) => ({
      name: issue.name,
      usedPath: issue.usedPath,
      ignoredPaths: [...issue.ignoredPaths],
      kind: issue.kind,
    }))
    return issues.value
  }

  function showConflicts(next: SkillNameConflict[]): void {
    conflicts.value = next
  }

  function dismissConflicts(): void {
    conflicts.value = []
  }

  /**
   * Runs an import-like action (add a skill folder, import/update/reload a package, create a skill).
   * A duplicate name opens the conflict pop-up and rethrows; on success the banner issues are
   * refreshed and newly ignored runtime default copies are announced with a toast.
   */
  async function runWithSkillNameChecks<T>(action: () => Promise<T>): Promise<T> {
    const before = await fetchIssues().catch(() => issues.value)
    let result: T
    try {
      result = await action()
    } catch (error) {
      const conflict = toSkillNameConflict(error)
      if (conflict) showConflicts(conflict.conflicts)
      throw error
    }
    const after = await fetchIssues().catch(() => null)
    if (after) announceShadowedRuntimeDefaults(newlyShadowedRuntimeDefaultPaths(before, after))
    return result
  }

  function announceShadowedRuntimeDefaults(paths: string[]): void {
    if (paths.length === 0) return
    const { t } = useLocalization()
    const folder = runtimeDefaultFolderLabel(paths)
    const count = paths.length
    const key = folder
      ? (count === 1 ? 'skills.nameNotice.ignoredOneFromFolder' : 'skills.nameNotice.ignoredManyFromFolder')
      : (count === 1 ? 'skills.nameNotice.ignoredOne' : 'skills.nameNotice.ignoredMany')
    useToasts().addToast(t(key, { count, folder: folder ?? '' }), 'info', 6000)
  }

  return { issues, conflicts, fetchIssues, showConflicts, dismissConflicts, runWithSkillNameChecks }
})
