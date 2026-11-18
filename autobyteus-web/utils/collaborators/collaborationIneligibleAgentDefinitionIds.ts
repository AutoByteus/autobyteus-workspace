/** The internal Model Router agent's definition id (autobyteus-32), `MODEL_ROUTER_AGENT_DEFINITION_ID` on the server. */
export const MODEL_ROUTER_AGENT_DEFINITION_ID = 'autobyteus-model-router'

/**
 * Agent definitions that are never collaborators (`@` candidates, listed or delegated to). They are
 * bootstrapped as ordinary shared definitions with no marker in the catalog, so the web keeps their
 * ids here.
 *
 * Mirrors the `BUILT_IN_AGENT_DEFINITIONS` entries marked `collaborationEligible: false` in
 * `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts`, which the server's
 * `CollaboratorCandidatePolicy` never admits. Keep the two in sync.
 */
export const COLLABORATION_INELIGIBLE_AGENT_DEFINITION_IDS: ReadonlySet<string> = new Set([
  MODEL_ROUTER_AGENT_DEFINITION_ID,
])

export const isCollaborationIneligibleAgentDefinitionId = (id: string): boolean =>
  COLLABORATION_INELIGIBLE_AGENT_DEFINITION_IDS.has(id)
