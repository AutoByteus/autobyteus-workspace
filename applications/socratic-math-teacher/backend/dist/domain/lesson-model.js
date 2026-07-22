import { createApplicationAgentTeamMemberTargetAddress, } from "../vendor/application-backend-sdk.js";
const UNUSABLE_BINDING_STATUSES = new Set(["TERMINATING", "TERMINATED", "FAILED", "ORPHANED"]);
const isApplicationAgentTeamBinding = (binding) => binding.runtime.subject === "TEAM_RUN";
export const deriveTutorTargetAddress = (lesson, binding) => {
    if (lesson.status !== "active" || !lesson.latestBindingId || (lesson.latestBindingStatus
        && UNUSABLE_BINDING_STATUSES.has(lesson.latestBindingStatus)) || !binding || binding.status !== "ATTACHED") {
        return null;
    }
    if (!isApplicationAgentTeamBinding(binding)) {
        throw new Error("Socratic tutor binding must be an agent-team binding.");
    }
    return createApplicationAgentTeamMemberTargetAddress(binding, "tutor");
};
