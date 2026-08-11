import { z } from "zod";
import { nonEmptyStringSchema } from "./schema-helpers.js";
const isCanonicalRootedAddress = (value) => {
    if (!value.startsWith("/") || value.startsWith("./"))
        return false;
    if (value === "/")
        return true;
    if (value.endsWith("/") || value.includes("//") || value.includes("\\"))
        return false;
    return value.slice(1).split("/").every((segment) => segment.length > 0 && segment === segment.trim() && segment !== "." && segment !== "..");
};
export const agentTeamAddressDtoSchema = z.string().refine(isCanonicalRootedAddress, {
    message: "member_address must be one canonical rooted AgentTeam address.",
});
export const teamExecutionAddressDtoSchema = z.object({
    root_team_run_id: nonEmptyStringSchema,
    task_team_run_ids: z.array(nonEmptyStringSchema),
    member_address: agentTeamAddressDtoSchema,
    task_agent_run_id: nonEmptyStringSchema.nullable(),
}).strict();
const persistentAgentExecutionBindingDtoSchema = z.object({
    kind: z.literal("persistent_agent"),
    execution_address: teamExecutionAddressDtoSchema,
}).strict().superRefine((value, context) => {
    if (value.execution_address.task_team_run_ids.length !== 0 || value.execution_address.task_agent_run_id !== null) {
        context.addIssue({ code: "custom", message: "persistent_agent requires a persistent execution address." });
    }
});
const taskAgentExecutionBindingDtoSchema = z.object({
    kind: z.literal("task_agent"),
    execution_address: teamExecutionAddressDtoSchema,
}).strict().superRefine((value, context) => {
    if (value.execution_address.task_agent_run_id === null) {
        context.addIssue({ code: "custom", message: "task_agent requires task_agent_run_id." });
    }
});
const taskTeamAgentExecutionBindingDtoSchema = z.object({
    kind: z.literal("task_team_agent"),
    execution_address: teamExecutionAddressDtoSchema,
    agent_run_id: nonEmptyStringSchema,
}).strict().superRefine((value, context) => {
    if (value.execution_address.task_team_run_ids.length === 0 || value.execution_address.task_agent_run_id !== null) {
        context.addIssue({ code: "custom", message: "task_team_agent requires a task-Team address and no task-Agent run ID." });
    }
});
export const teamAgentExecutionBindingDtoSchema = z.union([
    persistentAgentExecutionBindingDtoSchema,
    taskAgentExecutionBindingDtoSchema,
    taskTeamAgentExecutionBindingDtoSchema,
]);
//# sourceMappingURL=team-execution-address-dto.js.map