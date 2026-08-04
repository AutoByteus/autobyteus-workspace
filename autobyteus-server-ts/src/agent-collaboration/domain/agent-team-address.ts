import { CollaborationContractError } from "./collaboration-contract-error.js";

declare const agentTeamAddressBrand: unique symbol;

/** Canonical, rooted logical address of a node in an AgentTeam definition/run tree. */
export type AgentTeamAddress = string & {
  readonly [agentTeamAddressBrand]: true;
};

const invalidAddress = (value: unknown, detail: string): never => {
  throw new CollaborationContractError(
    "COLLABORATION_ADDRESS_INVALID",
    `AgentTeam address '${String(value)}' is invalid: ${detail}`,
  );
};

export const assertValidAgentTeamMemberName = (
  value: string,
  fieldName = "memberName",
): string => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    value === "." ||
    value === ".." ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    throw new CollaborationContractError(
      "COLLABORATION_MEMBER_NAME_INVALID",
      `${fieldName} '${String(value)}' must be a non-empty trimmed path-safe member name.`,
    );
  }
  return value;
};

const parseRootedSegments = (value: string): readonly string[] => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return invalidAddress(value, "a non-empty already-trimmed value is required");
  }
  if (!value.startsWith("/") || value.startsWith("./")) {
    return invalidAddress(value, "a canonical rooted value beginning with '/' is required");
  }
  if (value === "/") {
    return Object.freeze([]);
  }
  const body = value.slice(1);
  if (body.endsWith("/") || body.includes("//") || body.includes("\\")) {
    return invalidAddress(
      value,
      "repeated separators, backslashes, and trailing separators are not allowed",
    );
  }
  const segments = body.split("/");
  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment !== segment.trim() ||
      segment === "." ||
      segment === ".." ||
      segment.includes("\\")
    ) {
      return invalidAddress(value, `segment '${segment}' is not canonical`);
    }
  }
  return Object.freeze(segments);
};

export const createAgentTeamAddress = (
  segments: readonly string[],
): AgentTeamAddress => {
  for (const segment of segments) {
    assertValidAgentTeamMemberName(segment, "address segment");
  }
  return (segments.length === 0 ? "/" : `/${segments.join("/")}`) as AgentTeamAddress;
};

export const assertAgentTeamAddress = (value: string): AgentTeamAddress => {
  parseRootedSegments(value);
  return value as AgentTeamAddress;
};

export const getAgentTeamAddressSegments = (
  value: AgentTeamAddress | string,
): readonly string[] => parseRootedSegments(value);

export const getAgentTeamAddressBasename = (
  value: AgentTeamAddress | string,
): string | null => getAgentTeamAddressSegments(value).at(-1) ?? null;

export const getParentAgentTeamAddress = (
  value: AgentTeamAddress | string,
): AgentTeamAddress | null => {
  const segments = getAgentTeamAddressSegments(value);
  return segments.length === 0 ? null : createAgentTeamAddress(segments.slice(0, -1));
};

export const appendAgentTeamAddress = (
  parent: AgentTeamAddress | string,
  memberName: string,
): AgentTeamAddress => createAgentTeamAddress([
  ...getAgentTeamAddressSegments(parent),
  assertValidAgentTeamMemberName(memberName),
]);

export const isAgentTeamAddressAncestor = (
  candidateAncestor: AgentTeamAddress | string,
  candidateDescendant: AgentTeamAddress | string,
): boolean => {
  const ancestor = getAgentTeamAddressSegments(candidateAncestor);
  const descendant = getAgentTeamAddressSegments(candidateDescendant);
  return ancestor.length < descendant.length &&
    ancestor.every((segment, index) => descendant[index] === segment);
};

export const rebaseDefinitionAgentTeamAddress = (
  value: string,
  mountAddress: AgentTeamAddress | string,
): AgentTeamAddress => createAgentTeamAddress([
  ...getAgentTeamAddressSegments(mountAddress),
  ...getAgentTeamAddressSegments(assertAgentTeamAddress(value)),
]);
