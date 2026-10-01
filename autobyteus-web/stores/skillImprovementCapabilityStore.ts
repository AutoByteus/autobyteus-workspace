import { GetSkillImprovementCapability } from '~/graphql/queries/skillImprovementQueries'
import { SetSkillImprovementEnabled } from '~/graphql/mutations/skillImprovementMutations'
import {
  createBoundNodeCapabilityStore,
  type BoundNodeCapabilityStatus,
} from '~/stores/capabilities/createBoundNodeCapabilityStore'

export type SkillImprovementCapabilitySource = 'SERVER_SETTING' | 'INITIALIZED_DISABLED'

export interface SkillImprovementCapability {
  enabled: boolean
  settingKey: 'ENABLE_SKILL_IMPROVEMENT'
  source: SkillImprovementCapabilitySource
}

export type SkillImprovementCapabilityStatus = BoundNodeCapabilityStatus

export const useSkillImprovementCapabilityStore = createBoundNodeCapabilityStore<SkillImprovementCapability>({
  id: 'skillImprovementCapability',
  query: GetSkillImprovementCapability,
  mutation: SetSkillImprovementEnabled,
  queryField: 'skillImprovementCapability',
  mutationField: 'setSkillImprovementEnabled',
  label: 'Skill Improvement',
})
