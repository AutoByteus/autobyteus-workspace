import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { normalizeRootPath as pathKey } from '~/stores/runHistoryReadModel'
import { useWorkspaceStore } from '~/stores/workspace'
import { createTeamConfigurationView } from '~/services/teamExecution/teamExecutionContextFactory'
import { collectConfiguredAgents, collectConfiguredTeams } from '~/services/teamExecution/teamExecutionTreeSelectors'
import { buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults'

type ReadDependencies = Pick<ReturnType<typeof useRunHistoryStore>, 'refreshTeamResumeConfig' | 'resolveWorkspaceMetadataByRootPath'>

/** Snapshot-at-click canonical configuration, never retained execution/model state. */
export const loadTeamRunLaunchSeed = async (
  input: { teamRunId: string; expectedDefinitionId: string; workspaceMetadata?: readonly WorkspaceMetadata[] },
  dependencies: ReadDependencies = useRunHistoryStore(),
): Promise<TeamRunConfig> => {
  const resume = await dependencies.refreshTeamResumeConfig(input.teamRunId)
  const tree = resume.executionTree
  if (resume.teamRunId !== input.teamRunId || tree.root_team.team_run_id !== input.teamRunId
    || tree.root_team.team_definition_id !== input.expectedDefinitionId) {
    throw new Error('The source Team configuration no longer matches this run and definition.')
  }
  const known = [...Object.values(useWorkspaceStore().workspaceMetadataById), ...(input.workspaceMetadata ?? [])]
  const pending = new Map<string, Promise<WorkspaceMetadata>>()
  const workspaces = new Map<string, WorkspaceMetadata>()
  const resolve = (path: string): Promise<WorkspaceMetadata> => {
    const key = pathKey(path)
    let request = pending.get(key)
    if (!request) {
      request = (async () => {
        const metadata = known.find(item => pathKey(item.workspaceRootPath) === key)
          ?? await dependencies.resolveWorkspaceMetadataByRootPath(path)
        if (!metadata?.workspaceId || pathKey(metadata.workspaceRootPath) !== key) {
          throw new Error(`Workspace metadata for source path '${path}' is unavailable. Open that workspace, then retry copying this Team.`)
        }
        return { ...metadata }
      })()
      pending.set(key, request)
    }
    return request
  }
  const configured = [
    ...collectConfiguredTeams(tree).map(team => ({ address: team === tree.root_team ? '/' : team.address, launch: team.default_launch_configuration })),
    ...collectConfiguredAgents(tree).map(agent => ({ address: agent.address, launch: agent.launch_configuration })),
  ]
  await Promise.all(configured.map(async ({ address, launch }) => {
    if (pathKey(launch.workspace_root_path)) workspaces.set(address, await resolve(launch.workspace_root_path!))
  }))
  return buildEditableTeamRunSeed(createTeamConfigurationView({ tree, workspaceMetadataByAddress: workspaces }))
}
