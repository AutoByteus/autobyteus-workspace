import {
  createApplicationAgentTeamMemberTargetAddress,
  type ApplicationAgentBinding,
  type ApplicationAgentTargetAddress,
  type ApplicationAgentTeamBinding,
} from "@autobyteus/application-backend-sdk";

export type LessonStatus = "active" | "closed" | "blocked";

export type LessonSummary = {
  lessonId: string;
  prompt: string;
  status: LessonStatus;
  latestBindingId: string | null;
  latestRunId: string | null;
  latestBindingStatus: string | null;
  lastErrorMessage: string | null;
  updatedAt: string;
  artifactCatchupCompletedAt?: string | null;
};

export type LessonRecord = LessonSummary & {
  createdAt: string;
  closedAt: string | null;
};

export type LessonDetail = LessonRecord & {
  tutorTargetAddress: ApplicationAgentTargetAddress | null;
};

const UNUSABLE_BINDING_STATUSES = new Set(["TERMINATING", "TERMINATED", "FAILED", "ORPHANED"]);
const TUTOR_MEMBER_ADDRESS = "/tutor";

const isApplicationAgentTeamBinding = (
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding,
): binding is ApplicationAgentTeamBinding => binding.runtime.subject === "TEAM_RUN";

export const deriveTutorTargetAddress = (lesson: Pick<
  LessonSummary,
  "status" | "latestBindingId" | "latestBindingStatus"
>, binding: ApplicationAgentBinding | ApplicationAgentTeamBinding | null): ApplicationAgentTargetAddress | null => {
  if (lesson.status !== "active" || !lesson.latestBindingId || (
    lesson.latestBindingStatus
    && UNUSABLE_BINDING_STATUSES.has(lesson.latestBindingStatus)
  ) || !binding || binding.status !== "ATTACHED") {
    return null;
  }

  if (!isApplicationAgentTeamBinding(binding)) {
    throw new Error("Socratic tutor binding must be an agent-team binding.");
  }
  const tutorMember = binding.runtime.members.find(
    (member) => member.memberAddress === TUTOR_MEMBER_ADDRESS,
  );
  if (!tutorMember) {
    throw new Error(
      `Socratic tutor binding must contain configured memberAddress '${TUTOR_MEMBER_ADDRESS}'.`,
    );
  }
  return createApplicationAgentTeamMemberTargetAddress(binding, tutorMember.agentRunId);
};
