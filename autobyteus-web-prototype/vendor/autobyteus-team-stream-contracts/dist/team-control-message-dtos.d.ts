import { z } from "zod";
export declare const teamConnectedPayloadSchema: z.ZodObject<{
    session_id: z.ZodString;
    root_team_run_id: z.ZodString;
}, z.core.$strict>;
export declare const teamRunLifecyclePayloadSchema: z.ZodObject<{
    is_active: z.ZodBoolean;
}, z.core.$strict>;
export declare const teamSendMessageClientPayloadSchema: z.ZodObject<{
    content: z.ZodString;
    context_file_paths: z.ZodArray<z.ZodString>;
    image_urls: z.ZodArray<z.ZodString>;
    agent_run_id: z.ZodString;
    message_id: z.ZodString;
    dedupe_key: z.ZodString;
}, z.core.$strict>;
export declare const teamInterruptClientPayloadSchema: z.ZodObject<{
    command_id: z.ZodString;
    agent_run_id: z.ZodString;
}, z.core.$strict>;
export declare const teamToolApprovalClientPayloadSchema: z.ZodObject<{
    invocation_id: z.ZodString;
    agent_run_id: z.ZodString;
    reason: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
//# sourceMappingURL=team-control-message-dtos.d.ts.map