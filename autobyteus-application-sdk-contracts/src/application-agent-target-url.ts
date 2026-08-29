import type { ApplicationAgentTargetAddress } from "./application-agent-bindings.js";
import { parseApplicationAgentMemberAddress } from "./application-agent-member-address.js";

const decodeSegment = (value: string): string | null => {
  try {
    const decoded = decodeURIComponent(value);
    return decoded && decoded === decoded.trim() ? decoded : null;
  } catch {
    return null;
  }
};

export const getApplicationAgentTargetUrlSegments = (address: ApplicationAgentTargetAddress): string[] => {
  const bindingId = address.bindingId.trim();
  if (!bindingId) throw new Error("Application agent bindingId is required.");
  if (address.memberAddress === null) return [bindingId, "targets", "root"];
  const memberAddress = parseApplicationAgentMemberAddress(address.memberAddress);
  if (!memberAddress) throw new Error("Application agent memberAddress is invalid.");
  return [bindingId, "targets", "member", memberAddress];
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
  if (segments.length === 3 && segments[2] === "root") {
    return { bindingId, memberAddress: null };
  }
  if (segments.length === 4 && segments[2] === "member") {
    const memberAddress = parseApplicationAgentMemberAddress(decodeSegment(segments[3]!));
    return memberAddress
      ? { bindingId, memberAddress }
      : null;
  }
  return null;
};
