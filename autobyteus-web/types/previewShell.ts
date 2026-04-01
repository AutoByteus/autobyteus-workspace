export type PreviewHostBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PreviewShellSessionSummary = {
  preview_session_id: string;
  title: string | null;
  url: string;
};

export type PreviewShellSnapshot = {
  previewVisible: boolean;
  activePreviewSessionId: string | null;
  sessions: PreviewShellSessionSummary[];
};

