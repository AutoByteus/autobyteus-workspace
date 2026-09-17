import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import type { AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import type { AgentOrgDefinitionReferences } from '~/services/agentOrgDefinition/agentOrgDefinitionReferences'
export const seedFixture = (runId = 'org-run') => {
  const view = JSON.parse(JSON.stringify(taskBearingView())) as ReturnType<typeof taskBearingView>
  view.is_active = false
  view.agent_statuses = []
  const root = view.execution_tree.rootOrg
  root.orgRunId = runId
  view.task_records.orgRunId = runId
  view.communication_messages.orgRunId = runId
  const launch = { ...root.defaultLaunchConfiguration, workspaceRootPath: '/source/root', llmModelIdentifier: 'root-model', llmConfig: { budget: 0, enabled: false } }
  root.defaultLaunchConfiguration = launch
  for (const member of root.members) {
    if ('agentRunId' in member) member.launchConfiguration = { ...launch, llmModelIdentifier: 'direct-model', autoExecuteTools: true }
    else {
      member.defaultLaunchConfiguration = { ...launch, llmModelIdentifier: 'team-model', workspaceRootPath: '/source/team', llmConfig: null }
      for (const child of member.members) child.launchConfiguration = { ...member.defaultLaunchConfiguration,
        llmModelIdentifier: 'mounted-model', llmConfig: { budget: 3, enabled: false } }
    }
  }
  const definition: AgentOrgDefinition = { id: root.orgDefinitionId, name: 'Seed Lab', description: '', instructions: '', revision: '1', avatarUrl: null,
    defaultLaunchConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: 'catalog-model', llmConfig: null }, handoffs: [],
    members: root.members.map(member => ({ memberName: member.address.slice(1), ref: 'agentRunId' in member ? member.agentDefinitionId : member.teamDefinitionId,
      refType: 'agentRunId' in member ? 'AGENT' : 'AGENT_TEAM', refScope: 'SHARED' })) }
  const references: AgentOrgDefinitionReferences = { agents: {}, teams: {}, unavailable: [] }
  for (const member of root.members) {
    if ('agentRunId' in member) references.agents[member.agentDefinitionId] = { id: member.agentDefinitionId, name: member.address, description: '' }
    else {
      references.teams[member.teamDefinitionId] = { id: member.teamDefinitionId, name: 'Seed Team', description: '', instructions: '', coordinatorMemberName: 'lead',
        nodes: member.members.map(child => ({ memberName: child.address.split('/').at(-1)!, ref: child.agentDefinitionId, refScope: 'SHARED' })) }
      for (const child of member.members) references.agents[child.agentDefinitionId] = { id: child.agentDefinitionId, name: child.address, description: '' }
    }
  }
  return { view, definition, references }
}
