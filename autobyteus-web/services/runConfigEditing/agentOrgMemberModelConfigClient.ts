import { z } from 'zod'
import { agentOrgLaunchConfigurationDtoSchema } from '@autobyteus/collaboration-stream-contracts'
import { getApolloClient } from '~/utils/apolloClient'
import { AgentOrgMemberModelConfig } from '~/graphql/queries/runModelOptionsQueries'
import { UpdateStoppedAgentOrgMemberModelConfig } from '~/graphql/mutations/agentOrgRunMutations'
import type { ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'

export type AgentOrgMemberModelConfigIdentity = Readonly<{ orgRunId: string; memberAddress: string; agentRunId: string }>
const editability = z.object({ editable: z.boolean(), reason: z.string().nullable() })
const canonicalSchema = z.object({ orgRunId: z.string().min(1), memberAddress: z.string().min(1), agentRunId: z.string().min(1),
  launchConfiguration: agentOrgLaunchConfigurationDtoSchema.extend({ skillAccessMode: z.enum(['PRELOADED_ONLY', 'NONE']) }), isActive: z.boolean(), editability })
const optionsSchema = z.object({ currentModelIdentifier: z.string(), currentContextTokens: z.number().nullable(),
  replacements: z.array(z.object({ llmModelIdentifier: z.string(), contextTokens: z.number().positive() })), unavailableReason: z.string().nullable() })
const readSchema = canonicalSchema.extend({ modelOptions: optionsSchema })
const resultSchema = z.object({ success: z.boolean(), outcome: z.enum(['UPDATED', 'UNCHANGED', 'RUN_ACTIVE', 'RUN_ARCHIVED', 'NOT_FOUND',
  'MODEL_UNAVAILABLE', 'SCHEMA_UNAVAILABLE', 'VALIDATION_FAILED', 'PERSISTENCE_FAILED', 'PERSISTENCE_INDETERMINATE', 'INTERNAL_ERROR']),
  message: z.string(), isActive: z.boolean(), editability, canonical: canonicalSchema.nullable(),
  fieldErrors: z.array(z.object({ path: z.string(), message: z.string() })) })
export type AgentOrgMemberModelConfigCanonical = z.infer<typeof canonicalSchema>
export type AgentOrgMemberModelConfigRead = z.infer<typeof readSchema>
export const assertAgentOrgModelConfigIdentity = (identity: AgentOrgMemberModelConfigIdentity, canonical: AgentOrgMemberModelConfigCanonical) => {
  if (identity.orgRunId !== canonical.orgRunId || identity.memberAddress !== canonical.memberAddress || identity.agentRunId !== canonical.agentRunId
    || (canonical.isActive && canonical.editability.editable)) throw new Error('Org model configuration identity/lifecycle mismatch.')
}
export async function readAgentOrgMemberModelConfig(identity: AgentOrgMemberModelConfigIdentity) {
  const { data, errors } = await getApolloClient().query({ query: AgentOrgMemberModelConfig, variables: { identity }, fetchPolicy: 'network-only' })
  if (errors?.length) throw new Error(errors.map(error => error.message).join(', '))
  const canonical = readSchema.parse(data?.getAgentOrgMemberModelConfig)
  assertAgentOrgModelConfigIdentity(identity, canonical)
  if (canonical.modelOptions.currentModelIdentifier !== canonical.launchConfiguration.llmModelIdentifier) throw new Error('Org model options mismatch.')
  return canonical
}
export async function saveAgentOrgMemberModelConfig(identity: AgentOrgMemberModelConfigIdentity, selection: ExistingRunModelSelection) {
  const { data, errors } = await getApolloClient().mutate({ mutation: UpdateStoppedAgentOrgMemberModelConfig, variables: { input: { ...identity, ...selection } } })
  if (errors?.length) throw new Error(errors.map(error => error.message).join(', '))
  const result = resultSchema.parse(data?.updateStoppedAgentOrgMemberModelConfig)
  if (result.canonical) assertAgentOrgModelConfigIdentity(identity, result.canonical)
  if (result.success !== ['UPDATED', 'UNCHANGED'].includes(result.outcome)
    || (result.success && (!result.canonical || result.isActive || result.canonical.isActive))) throw new Error('Unverified Org model configuration result.')
  return result
}
