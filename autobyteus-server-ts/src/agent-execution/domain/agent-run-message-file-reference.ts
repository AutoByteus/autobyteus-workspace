export type AgentRunMessageFileReferenceArtifactType =
  | "file"
  | "image"
  | "audio"
  | "video"
  | "pdf"
  | "csv"
  | "excel"
  | "other";

export interface AgentRunMessageFileReferencePayload {
  referenceId: string;
  teamRunId: string;
  senderRunId: string;
  senderMemberName: string | null;
  receiverRunId: string;
  receiverMemberName: string | null;
  path: string;
  type: AgentRunMessageFileReferenceArtifactType;
  messageType: string;
  createdAt: string;
  updatedAt: string;
}
