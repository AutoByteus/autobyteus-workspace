import type { TeamReferenceFile, TeamReferenceFileType } from '~/types/teamReferenceFile';

const normalizePath = (value: string): string => value.replace(/\\/g, '/').trim();

const readString = (value: unknown): string | null => (
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
);

const normalizeType = (value: unknown): TeamReferenceFileType | null => {
  switch (value) {
    case 'file':
    case 'image':
    case 'audio':
    case 'video':
    case 'pdf':
    case 'csv':
    case 'excel':
    case 'other':
      return value;
    default:
      return null;
  }
};

export const inferTeamReferenceFileType = (filePath: string): TeamReferenceFileType => {
  const lower = filePath.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(lower)) return 'image';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower)) return 'audio';
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(lower)) return 'video';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.csv')) return 'csv';
  if (/\.(xlsx|xls)$/.test(lower)) return 'excel';
  return 'file';
};

export const normalizeTeamReferenceFiles = (
  rawReferences: unknown,
  fallbackTimestamp = new Date().toISOString(),
): TeamReferenceFile[] => {
  const input = Array.isArray(rawReferences) ? rawReferences : [];
  const byPath = new Map<string, TeamReferenceFile>();
  input.forEach((rawReference, index) => {
    let reference: TeamReferenceFile | null = null;
    if (typeof rawReference === 'string') {
      const path = normalizePath(rawReference);
      if (path) {
        reference = {
          referenceId: `reference:${index}:${path}`,
          path,
          type: inferTeamReferenceFileType(path),
          createdAt: fallbackTimestamp,
          updatedAt: fallbackTimestamp,
        };
      }
    } else if (rawReference && typeof rawReference === 'object' && !Array.isArray(rawReference)) {
      const record = rawReference as Record<string, unknown>;
      const path = normalizePath(String(record.path || ''));
      if (path) {
        const createdAt = readString(record.createdAt ?? record.created_at) ?? fallbackTimestamp;
        reference = {
          referenceId: readString(record.referenceId ?? record.reference_id) || `reference:${index}:${path}`,
          path,
          type: normalizeType(record.type) ?? inferTeamReferenceFileType(path),
          createdAt,
          updatedAt: readString(record.updatedAt ?? record.updated_at) ?? createdAt,
        };
      }
    }
    if (!reference) return;
    const existing = byPath.get(reference.path);
    if (!existing || reference.updatedAt.localeCompare(existing.updatedAt) >= 0) {
      byPath.set(reference.path, reference);
    }
  });
  return [...byPath.values()];
};
