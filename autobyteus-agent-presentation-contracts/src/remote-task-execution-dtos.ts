import { z } from "zod";
import { agentAddressSchema, nonEmptyStringSchema } from "./schema-helpers.js";

/**
 * A run a root delegated to another node (autobyteus-278): a child of its delegator's root, like a local
 * delegated copy, except that its facts (title, statuses, conversation) come from its node. `node_name` is this
 * owner's label for that node (the name agents use in `node`). Shared by the Agent, Team and Org root streams.
 */
const remoteLaunchFallbacksDtoSchema = z.array(z.object({
  layer: z.enum(["agent_default", "team_default", "model_router"]),
  runtime_kind: nonEmptyStringSchema.nullable(),
  llm_model_identifier: nonEmptyStringSchema.nullable(),
  reason: z.enum([
    "incomplete", "runtime_unavailable", "signed_out", "model_unavailable", "blocked", "model_settings_invalid",
    "router_not_active", "router_failed",
  ]),
  detail: nonEmptyStringSchema,
}).strict());

/**
 * One agent's launch on the other node, as that node resolved it (autobyteus-32 REQ-009): its address under this root,
 * runtime, model and source (with the Model Router's reason and task kind when it chose). Absent on links recorded
 * before autobyteus-32.
 */
export const remoteAgentLaunchDtoSchema = z.object({
  address: agentAddressSchema,
  runtime_kind: nonEmptyStringSchema,
  llm_model_identifier: nonEmptyStringSchema,
  source: z.union([
    z.object({ origin: z.enum(["agent_default", "team_default", "inherited", "configured"]), fallbacks: remoteLaunchFallbacksDtoSchema }).strict(),
    z.object({
      origin: z.literal("model_router"), fallbacks: remoteLaunchFallbacksDtoSchema,
      choice_reason: nonEmptyStringSchema, task_kind: nonEmptyStringSchema,
    }).strict(),
  ]),
}).strict();
export type RemoteAgentLaunchDto = Readonly<z.infer<typeof remoteAgentLaunchDtoSchema>>;

export const remoteTaskExecutionDtoSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("agent"),
    address: agentAddressSchema,
    agent_run_id: nonEmptyStringSchema,
    node_id: nonEmptyStringSchema,
    node_name: nonEmptyStringSchema,
    delegator_agent_run_id: nonEmptyStringSchema,
    started_at: nonEmptyStringSchema,
    launches: z.array(remoteAgentLaunchDtoSchema).optional(),
  }).strict(),
  z.object({
    kind: z.literal("agent_team"),
    address: agentAddressSchema,
    team_run_id: nonEmptyStringSchema,
    node_id: nonEmptyStringSchema,
    node_name: nonEmptyStringSchema,
    coordinator_address: agentAddressSchema,
    /** Every member at its address as mounted under this root (the coordinator included). */
    members: z.array(z.object({ address: agentAddressSchema, agent_run_id: nonEmptyStringSchema }).strict()).min(1),
    delegator_agent_run_id: nonEmptyStringSchema,
    started_at: nonEmptyStringSchema,
    launches: z.array(remoteAgentLaunchDtoSchema).optional(),
  }).strict(),
]);

export const remoteAgentStatusSchema = z.enum(["offline", "initializing", "idle", "running", "error"]);

/**
 * What the run's node answered about one remote run: its title and the statuses of its own agents (an Agent's
 * run, or a Team's members). `reachable: false` when the node did not answer; then there is no title and no
 * status, and the window shows "Couldn't reach {node}." with Retry. `run_id` is the Agent run or the Team run.
 */
export const remoteTaskExecutionSummaryDtoSchema = z.object({
  node_id: nonEmptyStringSchema,
  run_id: nonEmptyStringSchema,
  reachable: z.boolean(),
  title: z.string().nullable(),
  statuses: z.array(z.object({ agent_run_id: nonEmptyStringSchema, status: remoteAgentStatusSchema }).strict()),
}).strict();

export type RemoteTaskExecutionDto = Readonly<z.infer<typeof remoteTaskExecutionDtoSchema>>;
export type RemoteTaskExecutionSummaryDto = Readonly<z.infer<typeof remoteTaskExecutionSummaryDtoSchema>>;
export type RemoteAgentStatus = z.infer<typeof remoteAgentStatusSchema>;

/** The run ID a remote execution names on its node: the Agent run, or the Team run. */
export const remoteTaskExecutionRunIdOf = (execution: RemoteTaskExecutionDto): string =>
  execution.kind === "agent" ? execution.agent_run_id : execution.team_run_id;

/** The agents of a remote execution as this root shows them: the Agent run, or every Team member. */
export const remoteTaskExecutionAgentsOf = (
  execution: RemoteTaskExecutionDto,
): readonly Readonly<{ address: string; agent_run_id: string }>[] => execution.kind === "agent"
  ? [{ address: execution.address, agent_run_id: execution.agent_run_id }]
  : execution.members;
