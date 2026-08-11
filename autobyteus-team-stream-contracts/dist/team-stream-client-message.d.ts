import { z } from "zod";
export declare const teamStreamClientMessageSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"SEND_MESSAGE">;
    payload: z.ZodObject<{
        content: z.ZodString;
        context_file_paths: z.ZodArray<z.ZodString>;
        image_urls: z.ZodArray<z.ZodString>;
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        message_id: z.ZodString;
        dedupe_key: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"INTERRUPT_GENERATION">;
    payload: z.ZodObject<{
        command_id: z.ZodString;
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"APPROVE_TOOL">;
    payload: z.ZodObject<{
        invocation_id: z.ZodString;
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        reason: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"DENY_TOOL">;
    payload: z.ZodObject<{
        invocation_id: z.ZodString;
        execution_address: z.ZodObject<{
            root_team_run_id: z.ZodString;
            task_team_run_ids: z.ZodArray<z.ZodString>;
            member_address: z.ZodString;
            task_agent_run_id: z.ZodNullable<z.ZodString>;
        }, z.core.$strict>;
        reason: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>], "type">;
export type TeamStreamClientMessage = Readonly<z.infer<typeof teamStreamClientMessageSchema>>;
export declare const parseTeamStreamClientMessage: (value: string | unknown) => TeamStreamClientMessage;
export declare const serializeTeamStreamClientMessage: (message: TeamStreamClientMessage) => string;
//# sourceMappingURL=team-stream-client-message.d.ts.map