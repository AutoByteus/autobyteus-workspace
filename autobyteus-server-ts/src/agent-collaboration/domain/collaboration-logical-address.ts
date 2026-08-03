import { CollaborationContractError } from "./collaboration-contract-error.js";

export type ParsedRuntimeCollaborationAddress = Readonly<{
  origin: "root" | "immediate_team";
  segments: readonly string[];
}>;

const invalidAddress = (value: unknown, detail: string): never => {
  throw new CollaborationContractError(
    "COLLABORATION_ADDRESS_INVALID",
    `Collaboration address '${String(value)}' is invalid: ${detail}`,
  );
};

export const assertValidCollaborationMemberName = (
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

const parseSegments = (value: string, body: string): readonly string[] => {
  if (body.length === 0) {
    return Object.freeze([]);
  }
  if (body.endsWith("/") || body.includes("//") || body.includes("\\")) {
    return invalidAddress(value, "repeated separators, backslashes, and trailing separators are not allowed");
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
  return Object.freeze([...segments]);
};

export const parseRuntimeCollaborationAddress = (
  value: string,
): ParsedRuntimeCollaborationAddress => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return invalidAddress(value, "a non-empty already-trimmed value is required");
  }
  if (value === "/") {
    return Object.freeze({ origin: "root", segments: Object.freeze([]) });
  }
  if (value === "./") {
    return Object.freeze({ origin: "immediate_team", segments: Object.freeze([]) });
  }
  if (value.startsWith("./")) {
    return Object.freeze({
      origin: "immediate_team",
      segments: parseSegments(value, value.slice(2)),
    });
  }
  if (value.startsWith("/")) {
    return Object.freeze({
      origin: "root",
      segments: parseSegments(value, value.slice(1)),
    });
  }
  return invalidAddress(value, "the value must start with '/' or './'");
};

export const parseDefinitionCollaborationAddress = (
  value: string,
): readonly string[] => {
  const parsed = parseRuntimeCollaborationAddress(value);
  if (parsed.origin !== "root") {
    return invalidAddress(value, "definition endpoints must be definition-root absolute");
  }
  return parsed.segments;
};

export const formatAbsoluteCollaborationAddress = (
  segments: readonly string[],
): string => {
  for (const segment of segments) {
    assertValidCollaborationMemberName(segment, "address segment");
  }
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
};

export const resolveRuntimeCollaborationAddress = (
  value: string,
  immediateTeamPath: readonly string[],
): readonly string[] => {
  const parsed = parseRuntimeCollaborationAddress(value);
  const segments = parsed.origin === "root"
    ? parsed.segments
    : [...immediateTeamPath, ...parsed.segments];
  return Object.freeze([...segments]);
};

export const rebaseDefinitionCollaborationAddress = (
  value: string,
  mountPath: readonly string[],
): string => formatAbsoluteCollaborationAddress([
  ...mountPath,
  ...parseDefinitionCollaborationAddress(value),
]);
