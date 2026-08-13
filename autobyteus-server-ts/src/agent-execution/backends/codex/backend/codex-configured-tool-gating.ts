import type { CodexDynamicToolRegistration } from "../codex-dynamic-tool.js";

export const filterDynamicToolRegistrationsByToolNames = (
  registrations: CodexDynamicToolRegistration[] | null | undefined,
  requestedToolNames: Set<string>,
): CodexDynamicToolRegistration[] | null => {
  if (!registrations || registrations.length === 0 || requestedToolNames.size === 0) {
    return null;
  }

  const filtered = registrations.filter((registration) => {
    const toolName =
      typeof registration.spec?.name === "string" ? registration.spec.name.trim() : "";
    return toolName.length > 0 && requestedToolNames.has(toolName);
  });

  return filtered.length > 0 ? filtered : null;
};
