type E2eStreamMessage = {
  type: string;
  payload: Record<string, unknown>;
};

type E2eAddressSegment = {
  kind?: unknown;
  memberRouteKey?: unknown;
  member_path?: unknown;
};

type E2eAddress = {
  segments?: unknown;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const addressFromPayload = (
  payload: Record<string, unknown>,
  key: "senderAddress" | "receiverAddress",
): E2eAddress | null => asRecord(payload[key]) as E2eAddress | null;

const terminalMemberRouteKey = (address: E2eAddress | null): string | null => {
  const segments = Array.isArray(address?.segments)
    ? address.segments
    : [];
  const memberSegments = segments
    .map((segment) => asRecord(segment) as E2eAddressSegment | null)
    .filter((segment): segment is E2eAddressSegment => segment?.kind === "member");
  const routeKey = memberSegments.length > 0
    ? memberSegments[memberSegments.length - 1]?.memberRouteKey
    : null;
  return typeof routeKey === "string" && routeKey.trim().length > 0
    ? routeKey.trim()
    : null;
};

const routeKeyMatchesMemberName = (
  routeKey: string | null,
  memberName: string,
): boolean => {
  if (!routeKey) return false;
  return routeKey === memberName || routeKey.split("/").filter(Boolean).at(-1) === memberName;
};

const hasRemovedFlatParticipantFields = (payload: Record<string, unknown>): boolean => [
  "senderRunId",
  "receiverRunId",
  "senderMemberName",
  "receiverMemberName",
  "senderMemberPath",
  "receiverMemberPath",
  "senderMemberRouteKey",
  "receiverMemberRouteKey",
  "senderRepresentedSubTeam",
  "receiverRepresentedSubTeam",
  "taskTeamScope",
].some((field) => field in payload);

export const isE2eTeamCommunicationMessage = (
  message: E2eStreamMessage,
  input: {
    senderMemberName: string;
    recipientMemberName: string;
    content: string;
  },
): boolean => {
  if (
    message.type !== "TEAM_COMMUNICATION_MESSAGE" ||
    message.payload.content !== input.content ||
    hasRemovedFlatParticipantFields(message.payload)
  ) {
    return false;
  }

  const senderRouteKey = terminalMemberRouteKey(addressFromPayload(message.payload, "senderAddress"));
  const receiverRouteKey = terminalMemberRouteKey(addressFromPayload(message.payload, "receiverAddress"));
  return (
    routeKeyMatchesMemberName(senderRouteKey, input.senderMemberName) &&
    routeKeyMatchesMemberName(receiverRouteKey, input.recipientMemberName)
  );
};
