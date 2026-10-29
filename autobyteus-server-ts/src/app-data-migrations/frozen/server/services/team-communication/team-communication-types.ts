export type TeamCommunicationReferenceFileType =
  | "file" | "image" | "audio" | "video" | "pdf" | "csv" | "excel" | "other";

export interface TeamCommunicationReferenceFile {
  referenceId: string;
  path: string;
  type: TeamCommunicationReferenceFileType;
  createdAt: string;
  updatedAt: string;
}
