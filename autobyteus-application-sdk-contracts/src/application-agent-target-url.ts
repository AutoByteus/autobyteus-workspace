import type { ApplicationAgentTargetAddress } from "./application-agent-bindings.js";

const decodeSegment = (value: string): string | null => {
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded || null;
  } catch {
    return null;
  }
};

export const getApplicationAgentTargetUrlSegments = (address: ApplicationAgentTargetAddress): string[] => {
  const bindingId = address.bindingId.trim();
  if (!bindingId) throw new Error("Application agent bindingId is required.");
  if (address.target.kind === "AGENT_RUN") return [bindingId, "targets", "agent-run"];
  if (address.target.kind === "AGENT_TEAM_RUN") return [bindingId, "targets", "agent-team-run"];
  const memberAddress = address.target.memberAddress.trim();
  if (!memberAddress.startsWith("/")) throw new Error("Application agent memberAddress is required.");
  return [bindingId, "targets", "agent-team-member", memberAddress];
};

export const encodeApplicationAgentTargetUrl = (address: ApplicationAgentTargetAddress): string =>
  `/${getApplicationAgentTargetUrlSegments(address).map(encodeURIComponent).join("/")}`;

export const decodeApplicationAgentTargetUrl = (path: string): ApplicationAgentTargetAddress | null => {
  const rawPath = path.startsWith("/") ? path.slice(1) : path;
  if (!rawPath || rawPath.endsWith("/") || rawPath.includes("//") || rawPath.includes("?") || rawPath.includes("#")) {
    return null;
  }
  const segments = rawPath.split("/");
  if (segments.length < 3 || segments[1] !== "targets") return null;
  const bindingId = decodeSegment(segments[0]!);
  if (!bindingId) return null;
  if (segments.length === 3 && segments[2] === "agent-run") {
    return { bindingId, target: { kind: "AGENT_RUN" } };
  }
  if (segments.length === 3 && segments[2] === "agent-team-run") {
    return { bindingId, target: { kind: "AGENT_TEAM_RUN" } };
  }
  if (segments.length === 4 && segments[2] === "agent-team-member") {
    const memberAddress = decodeSegment(segments[3]!);
    return memberAddress?.startsWith("/")
      ? { bindingId, target: { kind: "AGENT_TEAM_MEMBER", memberAddress } }
      : null;
  }
  return null;
};
