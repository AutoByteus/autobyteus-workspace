import type { UpdateInfo } from 'electron-updater';

/** Formatting helpers of the app update state (moved unchanged from `appUpdater.ts`). */

export function isPrereleaseVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+-/.test(version);
}

export function toIsoNow(): string {
  return new Date().toISOString();
}

export function normalizeReleaseNotes(releaseNotes: UpdateInfo['releaseNotes']): string | null {
  if (typeof releaseNotes === 'string') {
    return releaseNotes;
  }

  if (Array.isArray(releaseNotes)) {
    const notes = releaseNotes
      .map((item) => (item && typeof item.note === 'string' ? item.note.trim() : ''))
      .filter((item) => item.length > 0);

    return notes.length > 0 ? notes.join('\n\n') : null;
  }

  return null;
}

export function buildErrorDedupeSignature(
  kind: string,
  code: string | null,
  diagnostic: string,
): string {
  const diagnosticHeadline = diagnostic
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0)
    ?.trim() ?? 'none';

  return `${kind}:${code ?? 'none'}:${diagnosticHeadline}`;
}
