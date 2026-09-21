import { GetAgentOrgEndpointCatalog } from '~/graphql/queries/agentOrgDefinitionQueries'
import { getApolloClient } from '~/utils/apolloClient'

export type AgentOrgEndpointCatalogItem = Readonly<{
  kind: 'agent' | 'agent_team'
  address: string
  memberName: string
  definitionId: string
  coordinatorAddress: string | null
  coordinatorMemberName: string | null
}>

export type AgentOrgEndpointCatalog = Readonly<{
  from: readonly AgentOrgEndpointCatalogItem[]
  to: readonly AgentOrgEndpointCatalogItem[]
}>

const requiredString = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim())
const endpoint = (value: unknown): AgentOrgEndpointCatalogItem => {
  const candidate = value as Partial<AgentOrgEndpointCatalogItem> | null
  if (!candidate || (candidate.kind !== 'agent' && candidate.kind !== 'agent_team')
    || !requiredString(candidate.address) || !requiredString(candidate.memberName) || !requiredString(candidate.definitionId)
    || (candidate.kind === 'agent' && (candidate.coordinatorAddress !== null || candidate.coordinatorMemberName !== null))
    || (candidate.kind === 'agent_team'
      && (!requiredString(candidate.coordinatorAddress) || !requiredString(candidate.coordinatorMemberName)))) {
    throw new Error('Invalid Agent Org endpoint catalog response.')
  }
  return {
    kind: candidate.kind,
    address: candidate.address,
    memberName: candidate.memberName,
    definitionId: candidate.definitionId,
    coordinatorAddress: candidate.coordinatorAddress ?? null,
    coordinatorMemberName: candidate.coordinatorMemberName ?? null,
  }
}

export async function loadAgentOrgEndpointCatalog(orgId: string): Promise<AgentOrgEndpointCatalog> {
  if (!requiredString(orgId)) throw new Error('Agent Org endpoint catalog requires an Org ID.')
  const client = getApolloClient()
  const { data, errors } = await client.query({
    query: GetAgentOrgEndpointCatalog,
    variables: { id: orgId },
    fetchPolicy: 'network-only',
  })
  if (errors?.length) throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
  const catalog = data?.agentOrgEndpointCatalog
  if (!catalog || !Array.isArray(catalog.from) || !Array.isArray(catalog.to)) {
    throw new Error('Invalid Agent Org endpoint catalog response.')
  }
  return { from: catalog.from.map(endpoint), to: catalog.to.map(endpoint) }
}
