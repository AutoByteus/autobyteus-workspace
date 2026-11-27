import { z } from "zod";
/**
 * Where an agent's (or a Team's) launch values came from and the layers skipped before it; `configured` marks a copy
 * started from a configured placement of the coordinating run; `model_router` a choice of the node's Model Router,
 * with its one-sentence reason and task kind (autobyteus-32); `agent_history` the agent's most-used usable launch after
 * a default was skipped as exhausted (autobyteus-646 R-8). Absent on records written before sources existed
 * ("not recorded").
 */
export declare const collaborationLaunchConfigurationSourceDtoSchema: z.ZodUnion<readonly [z.ZodObject<{
    origin: z.ZodEnum<{
        agent_default: "agent_default";
        team_default: "team_default";
        agent_history: "agent_history";
        inherited: "inherited";
        configured: "configured";
        settings: "settings";
    }>;
    fallbacks: z.ZodArray<z.ZodObject<{
        layer: z.ZodEnum<{
            agent_default: "agent_default";
            team_default: "team_default";
            model_router: "model_router";
        }>;
        runtimeKind: z.ZodNullable<z.ZodString>;
        llmModelIdentifier: z.ZodNullable<z.ZodString>;
        reason: z.ZodEnum<{
            incomplete: "incomplete";
            runtime_unavailable: "runtime_unavailable";
            signed_out: "signed_out";
            model_unavailable: "model_unavailable";
            blocked: "blocked";
            model_settings_invalid: "model_settings_invalid";
            router_not_active: "router_not_active";
            router_failed: "router_failed";
        }>;
        detail: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    origin: z.ZodLiteral<"model_router">;
    fallbacks: z.ZodArray<z.ZodObject<{
        layer: z.ZodEnum<{
            agent_default: "agent_default";
            team_default: "team_default";
            model_router: "model_router";
        }>;
        runtimeKind: z.ZodNullable<z.ZodString>;
        llmModelIdentifier: z.ZodNullable<z.ZodString>;
        reason: z.ZodEnum<{
            incomplete: "incomplete";
            runtime_unavailable: "runtime_unavailable";
            signed_out: "signed_out";
            model_unavailable: "model_unavailable";
            blocked: "blocked";
            model_settings_invalid: "model_settings_invalid";
            router_not_active: "router_not_active";
            router_failed: "router_failed";
        }>;
        detail: z.ZodString;
    }, z.core.$strict>>;
    choiceReason: z.ZodString;
    taskKind: z.ZodString;
}, z.core.$strict>]>;
export type CollaborationLaunchConfigurationSourceDto = Readonly<z.infer<typeof collaborationLaunchConfigurationSourceDtoSchema>>;
//# sourceMappingURL=launch-source-dtos.d.ts.map