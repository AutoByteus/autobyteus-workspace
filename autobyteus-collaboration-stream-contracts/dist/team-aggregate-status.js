const statusRank = Object.freeze({
    offline: 0,
    idle: 1,
    error: 2,
    initializing: 3,
    running: 4,
});
const normalizeAgentStatus = (status, authority) => {
    const normalized = typeof status === "string" ? status.trim().toLowerCase() : "";
    if (normalized === "running" || normalized === "initializing")
        return authority === "live" ? normalized : "offline";
    if (normalized === "error")
        return "error";
    if (normalized === "idle")
        return "idle";
    return "offline";
};
/**
 * The one team status rule: the highest-ranked member status
 * (offline < idle < error < initializing < running). Unknown values count as offline.
 */
export const foldTeamAggregateStatus = (statuses, authority) => {
    let aggregate = "offline";
    for (const candidate of statuses) {
        const status = normalizeAgentStatus(candidate, authority);
        if (statusRank[status] > statusRank[aggregate])
            aggregate = status;
        if (aggregate === "running")
            break;
    }
    return aggregate;
};
//# sourceMappingURL=team-aggregate-status.js.map