import {
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  type AgentTeamAddress,
} from "./agent-team-address.js";
import { CollaborationContractError } from "./collaboration-contract-error.js";

declare const recipientAddressExpressionBrand: unique symbol;

/** Strict operation-boundary expression. It is resolved immediately to AgentTeamAddress. */
export type RecipientAddressExpression = string & {
  readonly [recipientAddressExpressionBrand]: true;
};

type ParsedRecipientAddressExpression = Readonly<{
  origin: "root" | "immediate_team";
  segments: readonly string[];
}>;

const invalidExpression = (value: unknown, detail: string): never => {
  throw new CollaborationContractError(
    "COLLABORATION_ADDRESS_INVALID",
    `Recipient address '${String(value)}' is invalid: ${detail}`,
  );
};

const parseSegments = (value: string, body: string): readonly string[] => {
  if (body.length === 0) return Object.freeze([]);
  if (body.endsWith("/") || body.includes("//") || body.includes("\\")) {
    return invalidExpression(
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
      return invalidExpression(value, `segment '${segment}' is not canonical`);
    }
  }
  return Object.freeze(segments);
};

export const parseRecipientAddressExpression = (
  value: string,
): RecipientAddressExpression => {
  parseRecipientAddressExpressionParts(value);
  return value as RecipientAddressExpression;
};

const parseRecipientAddressExpressionParts = (
  value: string,
): ParsedRecipientAddressExpression => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return invalidExpression(value, "a non-empty already-trimmed value is required");
  }
  if (value === "/") return Object.freeze({ origin: "root", segments: Object.freeze([]) });
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
    return Object.freeze({ origin: "root", segments: parseSegments(value, value.slice(1)) });
  }
  return invalidExpression(value, "the value must start with '/' or './'");
};

export const resolveRecipientAddressExpression = (
  expression: RecipientAddressExpression | string,
  immediateTeamAddress: AgentTeamAddress,
): AgentTeamAddress => {
  const parsed = parseRecipientAddressExpressionParts(expression);
  return createAgentTeamAddress(parsed.origin === "root"
    ? parsed.segments
    : [...getAgentTeamAddressSegments(immediateTeamAddress), ...parsed.segments]);
};
