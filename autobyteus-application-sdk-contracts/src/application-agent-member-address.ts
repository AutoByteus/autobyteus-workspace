export type ApplicationAgentMemberAddress = `/${string}`;

export const parseApplicationAgentMemberAddress = (
  value: unknown,
): ApplicationAgentMemberAddress | null => {
  if (typeof value !== "string" || value !== value.trim()) return null;
  if (!value.startsWith("/") || value === "/" || value.endsWith("/")) return null;
  if (value.includes("//") || value.includes("\\")) return null;
  const segments = value.slice(1).split("/");
  if (segments.some((segment) =>
    !segment || segment !== segment.trim() || segment === "." || segment === "..")) return null;
  return value as ApplicationAgentMemberAddress;
};

export const isApplicationAgentMemberAddress = (
  value: unknown,
): value is ApplicationAgentMemberAddress =>
  parseApplicationAgentMemberAddress(value) !== null;
