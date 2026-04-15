export type BriefStatus =
  | "researching"
  | "draft_ready"
  | "in_review"
  | "approved"
  | "rejected"
  | "blocked";

export type BriefSummary = {
  briefId: string;
  applicationSessionId: string;
  title: string;
  status: BriefStatus;
  updatedAt: string;
};

export type BriefDetail = BriefSummary & {
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
};
