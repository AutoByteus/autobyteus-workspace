import { z } from "zod";
import {
  agentAddressSchema,
  agentPresentationMessageSchema,
  jsonValueSchema,
  nonEmptyStringSchema,
} from "@autobyteus/agent-presentation-contracts";

const timestamp = nonEmptyStringSchema;
const nullableText = nonEmptyStringSchema.nullable();

export const agentOrgLaunchConfigurationDtoSchema = z.object({
  runtimeKind: z.enum(["autobyteus", "claude_agent_sdk", "codex_app_server"]),
  llmModelIdentifier: nonEmptyStringSchema,
  llmConfig: z.record(z.string(), jsonValueSchema).nullable(),
  autoExecuteTools: z.boolean(),
  skillAccessMode: nonEmptyStringSchema,
  workspaceRootPath: nullableText,
}).strict();

const configuredAgent = z.object({
  address: agentAddressSchema, agentDefinitionId: nonEmptyStringSchema,
  role: z.string().nullable(), description: z.string().nullable(), agentRunId: nonEmptyStringSchema,
  platformAgentRunId: nullableText, launchConfiguration: agentOrgLaunchConfigurationDtoSchema,
}).strict();

type TaskAgentExecutionDto = Readonly<{
  address: string;
  agentRunId: string;
  platformAgentRunId: string | null;
  startedAt: string;
  settledAt: string | null;
}>;
type TaskTeamAgentExecutionDto = Readonly<{
  address: string;
  agentRunId: string;
  platformAgentRunId: string | null;
}>;
type TaskTeamNestedExecutionDto = Readonly<{
  address: string;
  teamRunId: string;
  members: readonly TaskTeamMemberExecutionDto[];
  taskExecutions: readonly TaskExecutionDto[];
}>;
type TaskTeamMemberExecutionDto = TaskTeamAgentExecutionDto | TaskTeamNestedExecutionDto;
type TaskTeamExecutionDto = Readonly<{
  address: string;
  teamRunId: string;
  members: readonly TaskTeamMemberExecutionDto[];
  taskExecutions: readonly TaskExecutionDto[];
  startedAt: string;
  settledAt: string | null;
}>;
type TaskExecutionDto = TaskAgentExecutionDto | TaskTeamExecutionDto;

const taskAgent: z.ZodType<TaskAgentExecutionDto> = z.object({
  address: agentAddressSchema, agentRunId: nonEmptyStringSchema, platformAgentRunId: nullableText,
  startedAt: timestamp, settledAt: timestamp.nullable(),
}).strict();
const taskTeamMember: z.ZodType<TaskTeamMemberExecutionDto> = z.lazy(() => z.union([
  z.object({ address: agentAddressSchema, agentRunId: nonEmptyStringSchema, platformAgentRunId: nullableText }).strict(),
  z.object({ address: agentAddressSchema, teamRunId: nonEmptyStringSchema, members: z.array(taskTeamMember), taskExecutions: z.array(taskExecution) }).strict(),
]));
const taskTeam: z.ZodType<TaskTeamExecutionDto> = z.lazy(() => z.object({
  address: agentAddressSchema, teamRunId: nonEmptyStringSchema, members: z.array(taskTeamMember),
  taskExecutions: z.array(taskExecution), startedAt: timestamp, settledAt: timestamp.nullable(),
}).strict());
const taskExecution: z.ZodType<TaskExecutionDto> = z.lazy(() => z.union([taskAgent, taskTeam]));

const configuredTeam = z.object({
  address: agentAddressSchema, teamDefinitionId: nonEmptyStringSchema,
  role: z.string().nullable(), description: z.string().nullable(), teamRunId: nonEmptyStringSchema,
  coordinatorAddress: agentAddressSchema, defaultLaunchConfiguration: agentOrgLaunchConfigurationDtoSchema,
  members: z.array(configuredAgent), taskExecutions: z.array(taskExecution),
}).strict().superRefine((team, context) => {
  if (!team.members.some((member) => member.address === team.coordinatorAddress)) {
    context.addIssue({
      code: "custom",
      path: ["coordinatorAddress"],
      message: `Configured Team '${team.address}' coordinator is not one of its direct Agent members.`,
    });
  }
});

const handoff = z.object({ from: agentAddressSchema, to: agentAddressSchema, rules: z.array(nonEmptyStringSchema).min(1) }).strict();

export const agentOrgExecutionTreeDtoSchema = z.object({
  schemaVersion: z.literal(1), subjectKind: z.literal("agent_org"), createdAt: timestamp,
  archivedAt: timestamp.nullable(),
  applicationBinding: z.object({ applicationId: nonEmptyStringSchema, bindingId: nonEmptyStringSchema }).strict().nullable(),
  handoffs: z.array(handoff),
  rootOrg: z.object({
    address: z.literal("/"), orgDefinitionId: nonEmptyStringSchema, orgDefinitionName: nonEmptyStringSchema,
    orgRunId: nonEmptyStringSchema, defaultLaunchConfiguration: agentOrgLaunchConfigurationDtoSchema,
    members: z.array(z.union([configuredAgent, configuredTeam])), taskExecutions: z.array(taskExecution),
  }).strict(),
}).strict();

const taskExecutionReference = z.union([
  z.object({ agentRunId: nonEmptyStringSchema }).strict(), z.object({ teamRunId: nonEmptyStringSchema }).strict(),
]);
const taskSubmission = z.object({ submissionId: nonEmptyStringSchema, message: nonEmptyStringSchema, referenceFiles: z.array(nonEmptyStringSchema), createdAt: timestamp }).strict();
const taskReview = z.object({ reviewId: nonEmptyStringSchema, reviewedSubmissionId: nonEmptyStringSchema, decision: z.enum(["accept", "request_revision"]), comment: z.string().nullable(), referenceFiles: z.array(nonEmptyStringSchema), createdAt: timestamp }).strict();
const taskInterruption = z.object({ interruptionId: nonEmptyStringSchema, reason: nonEmptyStringSchema, createdAt: timestamp }).strict();
const taskUpdate = z.union([taskSubmission, taskReview, taskInterruption]);
export const agentOrgTaskRecordDtoSchema = z.object({
  taskId: nonEmptyStringSchema, delegatorAgentRunId: nonEmptyStringSchema,
  recipientAddress: agentAddressSchema, taskExecution: taskExecutionReference,
  description: nonEmptyStringSchema, referenceFiles: z.array(nonEmptyStringSchema),
  status: z.enum(["active", "awaiting_review", "accepted", "interrupted"]),
  updates: z.array(taskUpdate), createdAt: timestamp,
}).strict();
export const agentOrgTaskRecordsDtoSchema = z.object({
  schemaVersion: z.literal(1), subjectKind: z.literal("agent_org"), orgRunId: nonEmptyStringSchema,
  records: z.array(agentOrgTaskRecordDtoSchema),
}).strict();

export const agentOrgCommunicationMessageDtoSchema = z.object({
  messageId: nonEmptyStringSchema, senderAgentRunId: nonEmptyStringSchema,
  receiverAgentRunId: nonEmptyStringSchema, content: nonEmptyStringSchema,
  messageType: nonEmptyStringSchema, referenceFiles: z.array(nonEmptyStringSchema), createdAt: timestamp,
}).strict();
export const agentOrgCommunicationMessagesDtoSchema = z.object({
  schemaVersion: z.literal(1), subjectKind: z.literal("agent_org"), orgRunId: nonEmptyStringSchema,
  messages: z.array(agentOrgCommunicationMessageDtoSchema),
}).strict();

export const agentOrgAgentStatusDtoSchema = z.object({
  member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema,
  status: z.enum(["offline", "initializing", "idle", "running", "error"]),
  trigger: nullableText, tool_name: nullableText, error_message: nullableText, error_details: nullableText,
}).strict();

export const agentOrgExecutionViewDtoSchema = z.object({
  base_change_sequence: z.number().int().nonnegative(), is_active: z.boolean(),
  execution_tree: agentOrgExecutionTreeDtoSchema, task_records: agentOrgTaskRecordsDtoSchema,
  communication_messages: agentOrgCommunicationMessagesDtoSchema, agent_statuses: z.array(agentOrgAgentStatusDtoSchema),
}).strict();

const taskEvent = z.union([
  z.object({ kind: z.literal("activated"), task: agentOrgTaskRecordDtoSchema }).strict(),
  z.object({ kind: z.literal("submitted"), task: agentOrgTaskRecordDtoSchema, submission: taskSubmission }).strict(),
  z.object({ kind: z.literal("reviewed"), task: agentOrgTaskRecordDtoSchema, review: taskReview }).strict(),
  z.object({ kind: z.literal("settled"), task: agentOrgTaskRecordDtoSchema, settledAt: timestamp }).strict(),
]);
export const agentOrgExecutionEventDtoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("agent_presentation"), member_address: agentAddressSchema, agent_run_id: nonEmptyStringSchema, message: agentPresentationMessageSchema }).strict(),
  z.object({ kind: z.literal("task"), event: taskEvent }).strict(),
  z.object({ kind: z.literal("communication"), message: agentOrgCommunicationMessageDtoSchema }).strict(),
]);

export type AgentOrgExecutionTreeDto = Readonly<z.infer<typeof agentOrgExecutionTreeDtoSchema>>;
export type AgentOrgExecutionViewDto = Readonly<z.infer<typeof agentOrgExecutionViewDtoSchema>>;
export type AgentOrgExecutionEventDto = Readonly<z.infer<typeof agentOrgExecutionEventDtoSchema>>;
export type AgentOrgTaskRecordDto = Readonly<z.infer<typeof agentOrgTaskRecordDtoSchema>>;
export type AgentOrgCommunicationMessageDto = Readonly<z.infer<typeof agentOrgCommunicationMessageDtoSchema>>;
