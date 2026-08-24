export type TeamReferenceFileType = 'file' | 'image' | 'audio' | 'video' | 'pdf' | 'csv' | 'excel' | 'other';

export interface TeamReferenceFile {
  referenceId: string;
  path: string;
  type: TeamReferenceFileType;
  createdAt: string;
  updatedAt: string;
}
