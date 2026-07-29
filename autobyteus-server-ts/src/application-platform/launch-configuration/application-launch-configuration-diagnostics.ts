import type {
  ApplicationLaunchIssue,
  ApplicationLaunchReadiness,
} from "@autobyteus/application-sdk-contracts";

export class ApplicationLaunchConfigurationError extends Error {
  readonly code = "APPLICATION_SETUP_REQUIRED";

  constructor(readonly readiness: ApplicationLaunchReadiness) {
    super(
      readiness.status === "RUNNABLE"
        ? "The requested application launch slot has no runnable configuration."
        : readiness.issues.map((issue) => issue.message).join("; "),
    );
    this.name = "ApplicationLaunchConfigurationError";
  }
}

export const buildApplicationLaunchIssue = (input: {
  slotKey: string;
  scope: ApplicationLaunchIssue["scope"];
  code: ApplicationLaunchIssue["code"];
  message: string;
  staleMembers?: ApplicationLaunchIssue["staleMembers"];
}): ApplicationLaunchIssue => ({
  severity: "blocking",
  slotKey: input.slotKey,
  scope: input.scope,
  code: input.code,
  message: input.message,
  ...(input.staleMembers ? { staleMembers: structuredClone(input.staleMembers) } : {}),
});
