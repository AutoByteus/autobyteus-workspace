import { z } from "zod";
import { nonEmptyStringSchema } from "@autobyteus/agent-presentation-contracts";
const nullableText = nonEmptyStringSchema.nullable();
/** The layers skipped before a launch's values were chosen, and why. */
const collaborationLaunchFallbacksDtoSchema = z.array(z.object({
    layer: z.enum(["agent_default", "team_default", "model_router"]),
    runtimeKind: nullableText,
    llmModelIdentifier: nullableText,
    reason: z.enum([
        "incomplete", "runtime_unavailable", "signed_out", "model_unavailable", "blocked", "model_settings_invalid",
        "router_not_active", "router_failed",
    ]),
    detail: nonEmptyStringSchema,
}).strict());
/**
 * Where an agent's (or a Team's) launch values came from and the layers skipped before it; `configured` marks a copy
 * started from a configured placement of the coordinating run; `model_router` a choice of the node's Model Router,
 * with its one-sentence reason and task kind (autobyteus-32); `agent_history` the agent's most-used usable launch after
 * a default was skipped as exhausted (autobyteus-646 R-8), `node_fallback` the node's own choice after it (R-17); both
 * also name who chose an automatic runtime switch (R-19). Absent on records written before sources existed
 * ("not recorded").
 */
export const collaborationLaunchConfigurationSourceDtoSchema = z.union([
    z.object({
        origin: z.enum(["agent_default", "team_default", "agent_history", "node_fallback", "inherited", "configured", "settings"]),
        fallbacks: collaborationLaunchFallbacksDtoSchema,
    }).strict(),
    z.object({
        origin: z.literal("model_router"),
        fallbacks: collaborationLaunchFallbacksDtoSchema,
        choiceReason: nonEmptyStringSchema,
        taskKind: nonEmptyStringSchema,
    }).strict(),
]);
//# sourceMappingURL=launch-source-dtos.js.map