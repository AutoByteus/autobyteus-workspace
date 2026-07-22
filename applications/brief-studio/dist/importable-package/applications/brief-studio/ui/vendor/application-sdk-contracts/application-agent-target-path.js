const decodeSegment = (value) => {
    try {
        const decoded = decodeURIComponent(value).trim();
        return decoded || null;
    }
    catch {
        return null;
    }
};
export const getApplicationAgentTargetPathSegments = (address) => {
    const bindingId = address.bindingId.trim();
    if (!bindingId)
        throw new Error("Application agent bindingId is required.");
    if (address.target.kind === "AGENT_RUN")
        return [bindingId, "targets", "agent-run"];
    if (address.target.kind === "AGENT_TEAM_RUN")
        return [bindingId, "targets", "agent-team-run"];
    const memberRouteKey = address.target.memberRouteKey.trim();
    if (!memberRouteKey)
        throw new Error("Application agent memberRouteKey is required.");
    return [bindingId, "targets", "agent-team-member", memberRouteKey];
};
export const encodeApplicationAgentTargetPath = (address) => `/${getApplicationAgentTargetPathSegments(address).map(encodeURIComponent).join("/")}`;
export const decodeApplicationAgentTargetPath = (path) => {
    const rawPath = path.startsWith("/") ? path.slice(1) : path;
    if (!rawPath || rawPath.endsWith("/") || rawPath.includes("//") || rawPath.includes("?") || rawPath.includes("#")) {
        return null;
    }
    const segments = rawPath.split("/");
    if (segments.length < 3 || segments[1] !== "targets")
        return null;
    const bindingId = decodeSegment(segments[0]);
    if (!bindingId)
        return null;
    if (segments.length === 3 && segments[2] === "agent-run") {
        return { bindingId, target: { kind: "AGENT_RUN" } };
    }
    if (segments.length === 3 && segments[2] === "agent-team-run") {
        return { bindingId, target: { kind: "AGENT_TEAM_RUN" } };
    }
    if (segments.length === 4 && segments[2] === "agent-team-member") {
        const memberRouteKey = decodeSegment(segments[3]);
        return memberRouteKey ? { bindingId, target: { kind: "AGENT_TEAM_MEMBER", memberRouteKey } } : null;
    }
    return null;
};
//# sourceMappingURL=application-agent-target-path.js.map