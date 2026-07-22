const UNUSABLE_BINDING_STATUSES = new Set(["TERMINATING", "TERMINATED", "FAILED", "ORPHANED"]);
export const deriveTutorTargetAddress = (lesson) => {
    if (lesson.status !== "active" || !lesson.latestBindingId || (lesson.latestBindingStatus
        && UNUSABLE_BINDING_STATUSES.has(lesson.latestBindingStatus))) {
        return null;
    }
    return {
        bindingId: lesson.latestBindingId,
        target: {
            kind: "AGENT_TEAM_MEMBER",
            memberRouteKey: "tutor",
        },
    };
};
