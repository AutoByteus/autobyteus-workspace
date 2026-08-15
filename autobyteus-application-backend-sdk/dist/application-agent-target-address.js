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
export const createApplicationAgentTeamMemberTargetAddress = (binding, agentRunId) => {
    const bindingId = requireBindingId(binding);
    requireRuntimeSubject(binding, "TEAM_RUN");
    const normalizedAgentRunId = typeof agentRunId === "string" ? agentRunId.trim() : "";
    if (!normalizedAgentRunId) {
        throw new Error("Application agent-team member target requires agentRunId.");
    }
    const members = Array.isArray(binding.runtime.members) ? binding.runtime.members : [];
    if (!members.some((member) => member?.agentRunId === normalizedAgentRunId)) {
        throw new Error(`Application agent-team binding '${bindingId}' does not contain agentRunId '${normalizedAgentRunId}'.`);
    }
    return {
        bindingId,
        target: {
            kind: "AGENT_TEAM_MEMBER",
            agentRunId: normalizedAgentRunId,
        },
    };
};
//# sourceMappingURL=application-agent-target-address.js.map