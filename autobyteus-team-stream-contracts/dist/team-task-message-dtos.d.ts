import { z } from "zod";
export declare const taskDelegationReferenceFileDtoSchema: z.ZodObject<{
    reference_id: z.ZodString;
    path: z.ZodString;
    type: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strict>;
export declare const taskDelegationActivatedPayloadSchema: z.ZodObject<{
    sender_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    content: z.ZodString;
    reference_files: z.ZodArray<z.ZodObject<{
        reference_id: z.ZodString;
        path: z.ZodString;
        type: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, z.core.$strict>>;
    created_at: z.ZodString;
    started_at: z.ZodString;
    task_id: z.ZodString;
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    event_type: z.ZodLiteral<"TASK_DELEGATION_ACTIVATED">;
}, z.core.$strict>;
export declare const taskDelegationResultSubmittedPayloadSchema: z.ZodObject<{
    submission_id: z.ZodString;
    submitted_at: z.ZodString;
    task_id: z.ZodString;
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    event_type: z.ZodLiteral<"TASK_DELEGATION_RESULT_SUBMITTED">;
}, z.core.$strict>;
export declare const taskDelegationResultReviewedPayloadSchema: z.ZodObject<{
    review_id: z.ZodString;
    reviewed_submission_id: z.ZodString;
    decision: z.ZodEnum<{
        accept: "accept";
        request_revision: "request_revision";
    }>;
    reviewed_at: z.ZodString;
    task_id: z.ZodString;
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    event_type: z.ZodLiteral<"TASK_DELEGATION_RESULT_REVIEWED">;
}, z.core.$strict>;
export declare const teamTaskDelegationPayloadSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    sender_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    content: z.ZodString;
    reference_files: z.ZodArray<z.ZodObject<{
        reference_id: z.ZodString;
        path: z.ZodString;
        type: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, z.core.$strict>>;
    created_at: z.ZodString;
    started_at: z.ZodString;
    task_id: z.ZodString;
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    event_type: z.ZodLiteral<"TASK_DELEGATION_ACTIVATED">;
}, z.core.$strict>, z.ZodObject<{
    submission_id: z.ZodString;
    submitted_at: z.ZodString;
    task_id: z.ZodString;
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    event_type: z.ZodLiteral<"TASK_DELEGATION_RESULT_SUBMITTED">;
}, z.core.$strict>, z.ZodObject<{
    review_id: z.ZodString;
    reviewed_submission_id: z.ZodString;
    decision: z.ZodEnum<{
        accept: "accept";
        request_revision: "request_revision";
    }>;
    reviewed_at: z.ZodString;
    task_id: z.ZodString;
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    event_type: z.ZodLiteral<"TASK_DELEGATION_RESULT_REVIEWED">;
}, z.core.$strict>], "event_type">;
export type TeamTaskDelegationPayload = Readonly<z.infer<typeof teamTaskDelegationPayloadSchema>>;
//# sourceMappingURL=team-task-message-dtos.d.ts.map