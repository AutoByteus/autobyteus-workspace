export type BriefStatus =
  | "not_started"
  | "researching"
  | "draft_ready"
  | "in_review"
  | "approved"
  | "rejected"
  | "blocked";

export type BriefSummary = {
  briefId: string;
  title: string;
  status: BriefStatus;
  latestBindingId: string | null;
  latestRunId: string | null;
  latestBindingStatus: string | null;
  lastErrorMessage: string | null;
  updatedAt: string;
};

export type BriefDetail = BriefSummary & {
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
};
