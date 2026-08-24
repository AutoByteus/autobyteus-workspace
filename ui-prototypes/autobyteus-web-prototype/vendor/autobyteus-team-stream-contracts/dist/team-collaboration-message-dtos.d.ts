import { z } from "zod";
export declare const teamCommunicationMessageDtoSchema: z.ZodObject<{
    message_id: z.ZodString;
    sender_agent_run_id: z.ZodString;
    receiver_agent_run_id: z.ZodString;
    content: z.ZodString;
    message_type: z.ZodString;
    reference_files: z.ZodArray<z.ZodObject<{
        reference_id: z.ZodString;
        path: z.ZodString;
        type: z.ZodEnum<{
            file: "file";
            image: "image";
            audio: "audio";
            video: "video";
            pdf: "pdf";
            csv: "csv";
            excel: "excel";
            other: "other";
        }>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, z.core.$strict>>;
    created_at: z.ZodString;
}, z.core.$strict>;
export declare const teamCommunicationMessagePayloadSchema: z.ZodObject<{
    change_sequence: z.ZodNumber;
    message: z.ZodObject<{
        message_id: z.ZodString;
        sender_agent_run_id: z.ZodString;
        receiver_agent_run_id: z.ZodString;
        content: z.ZodString;
        message_type: z.ZodString;
        reference_files: z.ZodArray<z.ZodObject<{
            reference_id: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<{
                file: "file";
                image: "image";
                audio: "audio";
                video: "video";
                pdf: "pdf";
                csv: "csv";
                excel: "excel";
                other: "other";
            }>;
            created_at: z.ZodString;
            updated_at: z.ZodString;
        }, z.core.$strict>>;
        created_at: z.ZodString;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const teamMemberInputContextFileDtoSchema: z.ZodObject<{
    path: z.ZodString;
    type: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export declare const teamMemberInputMessagePayloadSchema: z.ZodObject<{
    change_sequence: z.ZodNumber;
    recipient_agent_run_id: z.ZodString;
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
    sender_agent_run_id: z.ZodNullable<z.ZodString>;
    parent_communication_message_id: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export declare const teamExternalUserMessagePayloadSchema: z.ZodObject<{
    agent_run_id: z.ZodString;
    member_address: z.ZodString;
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
export type TeamCommunicationMessageDto = Readonly<z.infer<typeof teamCommunicationMessageDtoSchema>>;
export type TeamCommunicationMessagePayload = Readonly<z.infer<typeof teamCommunicationMessagePayloadSchema>>;
export type TeamMemberInputMessagePayload = Readonly<z.infer<typeof teamMemberInputMessagePayloadSchema>>;
export type TeamExternalUserMessagePayload = Readonly<z.infer<typeof teamExternalUserMessagePayloadSchema>>;
//# sourceMappingURL=team-collaboration-message-dtos.d.ts.map