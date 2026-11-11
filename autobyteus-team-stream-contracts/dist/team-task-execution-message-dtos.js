import { z } from "zod";
import { remoteTaskExecutionDtoSchema } from "@autobyteus/agent-presentation-contracts";
import { nonEmptyStringSchema } from "./schema-helpers.js";
import { taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema } from "./team-execution-view-dtos.js";
/** Identity of one child row (a run on this node the Team delegated to, or a peer's run). */
export const teamTaskExecutionReferenceDtoSchema = z.union([
    z.object({ agent_run_id: nonEmptyStringSchema }).strict(),
    z.object({ team_run_id: nonEmptyStringSchema }).strict(),
]);
/** A child row on this node with the Team run it is listed under, as the view projects it. */
export const teamChildRunRowDtoSchema = z.object({
    parent_team_run_id: nonEmptyStringSchema,
    execution: z.union([taskAgentExecutionDtoSchema, taskTeamExecutionDtoSchema]),
}).strict();
/**
 * The Team run's child rows changed (autobyteus-461 DS-8, SR-042 … SR-044): each new or reopened child's row (a run on
 * this node with its parent Team run, or a peer's run), and the runs that left the view. Unsequenced: the client applies
 * it by membership (a held added row is skipped, an unknown removed row ignored), never through a recovery.
 */
export const teamChildRunsChangedPayloadSchema = z.object({
    run_id: nonEmptyStringSchema,
    added: z.array(z.union([teamChildRunRowDtoSchema, remoteTaskExecutionDtoSchema])),
    removed: z.array(teamTaskExecutionReferenceDtoSchema),
}).strict();
//# sourceMappingURL=team-task-execution-message-dtos.js.map