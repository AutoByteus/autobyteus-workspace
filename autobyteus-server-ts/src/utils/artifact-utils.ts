import path from "node:path";

export function isCandidateKey(key: string): boolean {
  const keyLower = key.toLowerCase();
  return (keyLower.includes("output") && keyLower.includes("path")) || keyLower.includes("destination");
}

export function extractCandidateOutputPath(
  toolArgs: Record<string, unknown> | null | undefined,
  toolResult: unknown,
): string | null {
  if (toolResult && typeof toolResult === "object" && !Array.isArray(toolResult)) {
    const result = toolResult as Record<string, unknown>;
    if ("output_file_url" in result && "local_file_path" in result) {
      const localPath = result["local_file_path"];
      if (typeof localPath === "string") {
        return localPath;
      }
    }

    for (const [key, value] of Object.entries(result)) {
      if ((isCandidateKey(key) || key === "file_path") && typeof value === "string") {
        return value;
      }
    }
  }

  if (toolArgs && typeof toolArgs === "object") {
    for (const [key, value] of Object.entries(toolArgs)) {
      if (isCandidateKey(key) && typeof value === "string") {
        return value;
      }
    }
  }

  return null;
}

export function inferArtifactType(pathStr: string): string | null {
  if (!pathStr) {
    return null;
  }

  const ext = path.extname(pathStr).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) {
    return "image";
  }
  if ([".mp3", ".wav", ".ogg", ".flac", ".m4a"].includes(ext)) {
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
  if ([".xlsx", ".xls"].includes(ext)) {
    return "excel";
  }
  return "file";
}
