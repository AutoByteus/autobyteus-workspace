import path from "node:path";

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function isCandidateKey(key: string): boolean {
  const keyLower = key.toLowerCase();
  return (keyLower.includes("output") && keyLower.includes("path")) || keyLower.includes("destination");
}

const extractCandidatePathFromObject = (value: unknown): string | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if ("output_file_url" in candidate && "local_file_path" in candidate) {
    return asTrimmedString(candidate.local_file_path);
  }

  for (const [key, entry] of Object.entries(candidate)) {
    const resolved = asTrimmedString(entry);
    if (!resolved) {
      continue;
    }

    if (isCandidateKey(key) || key === "file_path") {
      return resolved;
    }
  }

  return null;
};

export function extractCandidateOutputPath(
  toolArgs: Record<string, unknown> | null | undefined,
  toolResult: unknown,
): string | null {
  return extractCandidatePathFromObject(toolResult) ?? extractCandidatePathFromObject(toolArgs);
}

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
