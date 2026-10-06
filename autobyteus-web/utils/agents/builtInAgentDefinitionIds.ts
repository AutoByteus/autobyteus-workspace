import { DEFAULT_CHAT_AGENT_DEFINITION_ID } from '~/utils/chat/chatDefaults'

/**
 * The platform's built-in Agent definitions. They are bootstrapped as ordinary shared definitions
 * with no marker in the catalog, so the web keeps their ids here.
 *
 * Mirrors `BUILT_IN_AGENT_DEFINITIONS` in
 * `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts`. Keep the two in sync: the
 * server never admits a built-in as an `@` collaborator.
 */
export const BUILT_IN_AGENT_DEFINITION_IDS: ReadonlySet<string> = new Set([
  'autobyteus-retrospective-skill-improver',
  DEFAULT_CHAT_AGENT_DEFINITION_ID,
])

export const isBuiltInAgentDefinitionId = (id: string): boolean => BUILT_IN_AGENT_DEFINITION_IDS.has(id)
