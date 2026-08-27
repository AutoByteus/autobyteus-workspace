export const parseApplicationAgentMemberAddress = (value) => {
    if (typeof value !== "string" || value !== value.trim())
        return null;
    if (!value.startsWith("/") || value === "/" || value.endsWith("/"))
        return null;
    if (value.includes("//") || value.includes("\\"))
        return null;
    const segments = value.slice(1).split("/");
    if (segments.some((segment) => !segment || segment !== segment.trim() || segment === "." || segment === ".."))
        return null;
    return value;
};
export const isApplicationAgentMemberAddress = (value) => parseApplicationAgentMemberAddress(value) !== null;
//# sourceMappingURL=application-agent-member-address.js.map