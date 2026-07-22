const requireBindingId = (binding) => {
    const bindingId = typeof binding?.bindingId === "string" ? binding.bindingId.trim() : "";
    if (!bindingId) {
        throw new Error("Application agent target address requires binding.bindingId.");
    }
    return bindingId;
};
const requireRuntimeSubject = (binding, expectedSubject) => {
    if (binding.runtime?.subject === expectedSubject)
        return;
    if (expectedSubject === "AGENT_RUN") {
        throw new Error("Application agent target address requires an AGENT_RUN binding.");
    }
    throw new Error("Application agent-team target address requires a TEAM_RUN binding.");
};
export const createApplicationAgentTargetAddress = (binding) => {
    const bindingId = requireBindingId(binding);
    requireRuntimeSubject(binding, "AGENT_RUN");
    return {
        bindingId,
        target: { kind: "AGENT_RUN" },
    };
};
export const createApplicationAgentTeamTargetAddress = (binding) => {
    const bindingId = requireBindingId(binding);
    requireRuntimeSubject(binding, "TEAM_RUN");
    return {
        bindingId,
        target: { kind: "AGENT_TEAM_RUN" },
    };
};
export const createApplicationAgentTeamMemberTargetAddress = (binding, memberRouteKey) => {
    const bindingId = requireBindingId(binding);
    requireRuntimeSubject(binding, "TEAM_RUN");
    const normalizedMemberRouteKey = typeof memberRouteKey === "string" ? memberRouteKey.trim() : "";
    if (!normalizedMemberRouteKey) {
        throw new Error("Application agent-team member target address requires memberRouteKey.");
    }
    const members = Array.isArray(binding.runtime.members) ? binding.runtime.members : [];
    if (!members.some((member) => member?.memberRouteKey === normalizedMemberRouteKey)) {
        throw new Error(`Application agent-team binding '${bindingId}' does not contain memberRouteKey '${normalizedMemberRouteKey}'.`);
    }
    return {
        bindingId,
        target: {
            kind: "AGENT_TEAM_MEMBER",
            memberRouteKey: normalizedMemberRouteKey,
        },
    };
};
//# sourceMappingURL=application-agent-target-address.js.map