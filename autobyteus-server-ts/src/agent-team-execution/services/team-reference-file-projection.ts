import { createHash } from "node:crypto";
import path from "node:path";

export type TeamReferenceFileType = "file" | "image" | "audio" | "video" | "pdf" | "csv" | "excel" | "other";
export type TeamReferenceFileProjection = Readonly<{
  referenceId: string;
  path: string;
  type: TeamReferenceFileType;
  createdAt: string;
  updatedAt: string;
}>;

const referenceType = (filePath: string): TeamReferenceFileType => {
  const extension = path.extname(filePath).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(extension)) return "image";
  if ([".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"].includes(extension)) return "audio";
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(extension)) return "video";
  if (extension === ".pdf") return "pdf";
  if (extension === ".csv") return "csv";
  if ([".xls", ".xlsx"].includes(extension)) return "excel";
  return "file";
};

/** Creates the one current API/stream reference projection from a persisted absolute path. */
export const projectTeamReferenceFile = (
  ownerId: string,
  filePath: string,
  timestamp: string,
): TeamReferenceFileProjection => Object.freeze({
  referenceId: createHash("sha256").update(`${ownerId}\0${filePath}`).digest("hex"),
  path: filePath,
  type: referenceType(filePath),
  createdAt: timestamp,
  updatedAt: timestamp,
});
