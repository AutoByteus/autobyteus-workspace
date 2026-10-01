import { z } from "zod";
/** A delegated child (task Agent or task Team) was committed under its host TeamRun. */
export declare const teamTaskExecutionStartedPayloadSchema: z.ZodObject<{
    change_sequence: z.ZodNumber;
    parent_team_run_id: z.ZodString;
    execution: z.ZodUnion<readonly [z.ZodType<Readonly<{
        kind: "task_agent";
        address: string;
        agent_run_id: string;
        platform_agent_run_id: string | null;
        delegator_agent_run_id: string | null;
        started_at: string;
        source?: import("./team-execution-view-dtos.js").TaskAgentExecutionSourceDto;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        kind: "task_agent";
        address: string;
        agent_run_id: string;
        platform_agent_run_id: string | null;
        delegator_agent_run_id: string | null;
        started_at: string;
        source?: import("./team-execution-view-dtos.js").TaskAgentExecutionSourceDto;
    }>, unknown>>, z.ZodType<Readonly<{
        kind: "task_team";
        address: string;
        team_run_id: string;
        members: readonly import("./team-execution-view-dtos.js").TaskTeamMemberExecutionDto[];
        task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
        delegator_agent_run_id: string | null;
        started_at: string;
        source?: import("./team-execution-view-dtos.js").TaskTeamExecutionSourceDto;
    }>, unknown, z.core.$ZodTypeInternals<Readonly<{
        kind: "task_team";
        address: string;
        team_run_id: string;
        members: readonly import("./team-execution-view-dtos.js").TaskTeamMemberExecutionDto[];
        task_executions: readonly import("./team-execution-view-dtos.js").TaskExecutionDto[];
        delegator_agent_run_id: string | null;
        started_at: string;
        source?: import("./team-execution-view-dtos.js").TaskTeamExecutionSourceDto;
    }>, unknown>>]>;
}, z.core.$strict>;
export type TeamTaskExecutionStartedPayload = Readonly<z.infer<typeof teamTaskExecutionStartedPayloadSchema>>;
/** A collaborator entry was committed at the root; it precedes any task execution at its address. */
export declare const teamCollaboratorAddedPayloadSchema: z.ZodObject<{
    change_sequence: z.ZodNumber;
    collaborator: z.ZodType<import("./team-execution-view-dtos.js").CollaboratorEntryDto, unknown, z.core.$ZodTypeInternals<import("./team-execution-view-dtos.js").CollaboratorEntryDto, unknown>>;
}, z.core.$strict>;
export type TeamCollaboratorAddedPayload = Readonly<z.infer<typeof teamCollaboratorAddedPayloadSchema>>;
//# sourceMappingURL=team-task-execution-message-dtos.d.ts.map