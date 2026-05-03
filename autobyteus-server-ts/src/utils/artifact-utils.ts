import path from "node:path";

export function inferArtifactType(pathStr: string): string | null {
  if (!pathStr) {
    return null;
  }

  const ext = path.extname(pathStr).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) {
    return "image";
  }
  if ([".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"].includes(ext)) {
    return "audio";
  }
  if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) {
    return "video";
  }
  if (ext === ".pdf") {
    return "pdf";
  }
  if (ext === ".csv") {
    return "csv";
  }
  if ([".xlsx", ".xls", ".xlsm"].includes(ext)) {
    return "excel";
  }
  return "file";
}
