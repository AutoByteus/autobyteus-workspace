import { asObject, type JsonObject } from "../codex-app-server-json.js";

export type CodexPermissionGrantScope = "turn" | "session";

export type CodexPermissionApprovalResponse = {
  permissions: JsonObject;
  scope: CodexPermissionGrantScope;
  strictAutoReview?: boolean | null;
};

const normalizePermissionProfile = (value: unknown): JsonObject => {
  const profile = asObject(value) ?? {};
  return {
    fileSystem: profile.fileSystem ?? null,
    network: profile.network ?? null,
  };
};

export const buildCodexPermissionGrantResponse = (
  requestedPermissions: unknown,
  scope: CodexPermissionGrantScope,
): CodexPermissionApprovalResponse => ({
  permissions: normalizePermissionProfile(requestedPermissions),
  scope,
});

export const buildCodexPermissionNoGrantResponse = (): CodexPermissionApprovalResponse => ({
  permissions: {
    fileSystem: null,
    network: null,
  },
  scope: "turn",
});

export const buildCodexPermissionApprovalArguments = (input: {
  permissions: unknown;
  cwd: string | null;
  reason: string | null;
}): JsonObject => {
  const next: JsonObject = {
    permissions: normalizePermissionProfile(input.permissions),
  };
  if (input.cwd) {
    next.cwd = input.cwd;
  }
  if (input.reason) {
    next.reason = input.reason;
  }
  return next;
};
