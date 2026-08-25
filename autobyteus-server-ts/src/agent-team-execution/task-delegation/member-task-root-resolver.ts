import type { RootTeamRun } from "../domain/root-team-run.js";

/** Selector-free capability for the exact RootTeamRun that created a member. */
export type MemberTaskRootResolver = Readonly<{
  resolveActiveRoot(): Promise<RootTeamRun>;
}>;

export const requireMemberTaskRootResolver = (
  value: MemberTaskRootResolver | null | undefined,
): MemberTaskRootResolver => {
  if (!value || typeof value.resolveActiveRoot !== "function") {
    throw new Error("MemberTaskRootResolver is required.");
  }
  return value;
};
