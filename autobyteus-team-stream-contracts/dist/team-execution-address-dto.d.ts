import { z } from "zod";
export declare const agentTeamAddressDtoSchema: z.ZodString;
export declare const teamExecutionAddressDtoSchema: z.ZodObject<{
    root_team_run_id: z.ZodString;
    task_team_run_ids: z.ZodArray<z.ZodString>;
    member_address: z.ZodString;
    task_agent_run_id: z.ZodNullable<z.ZodString>;
}, z.core.$strict>;
export type TeamExecutionAddressDto = Readonly<z.infer<typeof teamExecutionAddressDtoSchema>>;
export declare const teamAgentExecutionBindingDtoSchema: z.ZodUnion<readonly [z.ZodObject<{
    kind: z.ZodLiteral<"persistent_agent">;
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"task_agent">;
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"task_team_agent">;
    execution_address: z.ZodObject<{
        root_team_run_id: z.ZodString;
        task_team_run_ids: z.ZodArray<z.ZodString>;
        member_address: z.ZodString;
        task_agent_run_id: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>;
    agent_run_id: z.ZodString;
}, z.core.$strict>]>;
export type TeamAgentExecutionBindingDto = Readonly<z.infer<typeof teamAgentExecutionBindingDtoSchema>>;
//# sourceMappingURL=team-execution-address-dto.d.ts.map