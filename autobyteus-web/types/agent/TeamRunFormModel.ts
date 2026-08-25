import type {
  EditableTeamFormAgentNode,
  EditableTeamFormMemberNode,
  EditableTeamRunFormModel,
  EditableTeamScopeFormModel,
} from './EditableTeamRunFormModel'
import type {
  StoredTeamFormAgentNode,
  StoredTeamFormMemberNode,
  StoredTeamRunFormModel,
  StoredTeamScopeFormModel,
} from './StoredTeamRunFormModel'

export type TeamScopeFormModel = EditableTeamScopeFormModel | StoredTeamScopeFormModel
export type TeamFormAgentNode = EditableTeamFormAgentNode | StoredTeamFormAgentNode
export type TeamRunFormMemberNode = EditableTeamFormMemberNode | StoredTeamFormMemberNode
export type TeamRunFormModel = EditableTeamRunFormModel | StoredTeamRunFormModel
