import type {
  EditableTeamFormAgentNode,
  EditableTeamFormMemberNode,
  EditableTeamRunFormModel,
  EditableTeamScopeFormModel,
} from './EditableTeamRunFormModel'
import type {
  ExistingTeamFormAgentNode,
  ExistingTeamFormMemberNode,
  ExistingTeamRunFormModel,
  ExistingTeamScopeFormModel,
} from './ExistingTeamRunFormModel'

export type TeamScopeFormModel = EditableTeamScopeFormModel | ExistingTeamScopeFormModel
export type TeamFormAgentNode = EditableTeamFormAgentNode | ExistingTeamFormAgentNode
export type TeamRunFormMemberNode = EditableTeamFormMemberNode | ExistingTeamFormMemberNode
export type TeamRunFormModel = EditableTeamRunFormModel | ExistingTeamRunFormModel
