import { z } from "zod";
import { agentAddressSchema, nonEmptyStringSchema } from "@autobyteus/agent-presentation-contracts";
import { collaborationRootKindSchema } from "./collaboration-participant-messages-dtos.js";

/** An agent of a delegated team run: its address in the team run's own space, its run and its definition. */
const childRunMemberIdentitySchema = z.object({
  address: agentAddressSchema,
  agentRunId: nonEmptyStringSchema,
  agentDefinitionId: nonEmptyStringSchema.nullable(),
}).strict();

const identityCore = {
  /** Its name under the delegating run: the address it was delegated to (an agent run's own address once stored). */
  address: agentAddressSchema,
  /** The agent of the delegating run that delegated to it; absent for a run recorded before its delegator was stored. */
  delegatorAgentRunId: nonEmptyStringSchema.optional(),
  startedAt: nonEmptyStringSchema,
};

/**
 * A run a run delegated to on this node, by what does not change while it runs (autobyteus-461 SR-055, SR-056): its
 * address, its run and agents (a team run's coordinator among them), its delegator and when it started. The view's child row is this identity plus the
 * child's launch details, read fresh; the listed-runs poll carries the identity alone.
 */
export const childRunIdentityDtoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent"), ...identityCore, agentRunId: nonEmptyStringSchema,
    agentDefinitionId: nonEmptyStringSchema.nullable() }).strict(),
  z.object({ kind: z.literal("agent_team"), ...identityCore, teamRunId: nonEmptyStringSchema,
    /** The member the delegation went to, its coordinator: a team row opens it. */
    coordinatorAgentRunId: nonEmptyStringSchema,
    members: z.array(childRunMemberIdentitySchema) }).strict(),
]);

/** One agent of a child with its status, from the child's own run when it runs, else `offline`. */
export const childRunAgentStatusDtoSchema = z.object({
  agentRunId: nonEmptyStringSchema,
  memberAddress: agentAddressSchema,
  status: nonEmptyStringSchema,
}).strict();

/** A listed run, by its kind and run ID. */
export const listedRunRefDtoSchema = z.object({ kind: collaborationRootKindSchema, runId: nonEmptyStringSchema }).strict();

/** The peer node a child runs on (autobyteus-278), named from this node's own peer registry. */
export const childRunNodeDtoSchema = z.object({ nodeId: nonEmptyStringSchema, nodeName: nonEmptyStringSchema }).strict();

/**
 * One child of a listed run: its identity, the address of the agent of the listed run that delegated to it (the row's
 * "started by"; null when it has no delegator or that agent's address is unknown), its agents' statuses, and the peer
 * node it runs on (`null`: this node). A child on a peer node has its identity from its Task entry (no definitions)
 * and no statuses: nothing is asked of a peer per poll (SR-057); an open view observes it live.
 */
export const listedRunChildDtoSchema = z.object({
  row: childRunIdentityDtoSchema,
  delegatorAddress: agentAddressSchema.nullable(),
  statuses: z.array(childRunAgentStatusDtoSchema),
  node: childRunNodeDtoSchema.nullable(),
}).strict();

/**
 * `runCollaborationStatuses(runs)` (autobyteus-461 SR-055, SR-057): for each listed run, whether it is active and the
 * runs it delegated to that its view shows, on this node and on peer nodes (one hop). Never restores a run.
 */
export const runCollaborationStatusesDtoSchema = z.array(z.object({
  kind: collaborationRootKindSchema,
  runId: nonEmptyStringSchema,
  isActive: z.boolean(),
  children: z.array(listedRunChildDtoSchema),
}).strict());

/** At most this many runs per read. */
export const RUN_COLLABORATION_STATUSES_MAX_RUNS = 100;

export type ChildRunIdentityDto = z.infer<typeof childRunIdentityDtoSchema>;
export type ChildRunAgentStatusDto = z.infer<typeof childRunAgentStatusDtoSchema>;
export type ListedRunRefDto = z.infer<typeof listedRunRefDtoSchema>;
export type ListedRunChildDto = z.infer<typeof listedRunChildDtoSchema>;
export type ChildRunNodeDto = z.infer<typeof childRunNodeDtoSchema>;
export type RunCollaborationStatusesDto = z.infer<typeof runCollaborationStatusesDtoSchema>;
