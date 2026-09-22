import type { ExistingAgentModelConfigDraft, ExistingTeamRunModelConfigDraft } from './ExistingRunModelConfigDraft'
import type { ExistingAgentOrgModelConfigDraft } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import type { ExistingAgentOrgWorkspaceDraft } from '~/services/runConfigEditing/existingAgentOrgWorkspaceDraft'
import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import type { RunModelConfigEditability } from '~/stores/runHistoryTypes'

export type ExistingAgentOrgRunConfigDraft = Readonly<{
  kind: 'agent_org'
  orgRunId: string
  isActive: boolean
  editability: RunModelConfigEditability
  executionTree: AgentOrgExecutionTree
  planner: ExistingAgentOrgModelConfigDraft
  workspaceDraft: ExistingAgentOrgWorkspaceDraft
}>

export type ExistingRunConfigDraft = ExistingAgentModelConfigDraft | ExistingTeamRunModelConfigDraft | ExistingAgentOrgRunConfigDraft
