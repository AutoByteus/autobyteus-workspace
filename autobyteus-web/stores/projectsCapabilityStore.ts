import { GetProjectsCapability } from '~/graphql/queries/projectsCapabilityQueries'
import { SetProjectsEnabled } from '~/graphql/mutations/projectsCapabilityMutations'
import {
  createBoundNodeCapabilityStore,
  type BoundNodeCapabilityStatus,
} from '~/stores/capabilities/createBoundNodeCapabilityStore'

export type ProjectsCapabilitySource = 'SERVER_SETTING' | 'INITIALIZED_DISABLED'

export interface ProjectsCapability {
  enabled: boolean
  settingKey: 'ENABLE_PROJECTS'
  source: ProjectsCapabilitySource
}

export type ProjectsCapabilityStatus = BoundNodeCapabilityStatus

export const useProjectsCapabilityStore = createBoundNodeCapabilityStore<ProjectsCapability>({
  id: 'projectsCapability',
  query: GetProjectsCapability,
  mutation: SetProjectsEnabled,
  queryField: 'projectsCapability',
  mutationField: 'setProjectsEnabled',
  label: 'Projects',
})
