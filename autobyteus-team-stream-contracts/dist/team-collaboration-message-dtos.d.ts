import { z } from "zod";
export declare const teamCommunicationReferenceFileDtoSchema: z.ZodObject<{
    reference_id: z.ZodString;
    path: z.ZodString;
    type: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, z.core.$strict>;
export declare const teamCommunicationMessagePayloadSchema: z.ZodObject<{
    message_id: z.ZodString;
    sender_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    receiver_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    content: z.ZodString;
    message_type: z.ZodString;
    reference_files: z.ZodArray<z.ZodObject<{
        reference_id: z.ZodString;
        path: z.ZodString;
        type: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, z.core.$strict>>;
    created_at: z.ZodString;
}, z.core.$strict>;
export declare const teamMemberInputContextFileDtoSchema: z.ZodObject<{
    path: z.ZodString;
    type: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export declare const teamMemberInputMessagePayloadSchema: z.ZodObject<{
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    message_id: z.ZodString;
    dedupe_key: z.ZodString;
    content: z.ZodString;
    input_origin: z.ZodEnum<{
        user_message: "user_message";
        inter_agent_delivery: "inter_agent_delivery";
    }>;
    received_at: z.ZodString;
    context_file_paths: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        type: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
    sender_address: z.ZodNullable<z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
    parent_communication_message_id: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export declare const teamExternalUserMessagePayloadSchema: z.ZodObject<{
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    content: z.ZodString;
    received_at: z.ZodString;
    provider: z.ZodString;
    transport: z.ZodString;
    account_id: z.ZodString;
    peer_id: z.ZodString;
    thread_id: z.ZodNullable<z.ZodString>;
    external_message_id: z.ZodString;
    context_file_paths: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        type: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type TeamCommunicationMessagePayload = Readonly<z.infer<typeof teamCommunicationMessagePayloadSchema>>;
export type TeamMemberInputMessagePayload = Readonly<z.infer<typeof teamMemberInputMessagePayloadSchema>>;
export type TeamExternalUserMessagePayload = Readonly<z.infer<typeof teamExternalUserMessagePayloadSchema>>;
//# sourceMappingURL=team-collaboration-message-dtos.d.ts.map