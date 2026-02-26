export interface ParsedSkillDiffFile {
  filePath: string;
  diff: string;
}

function resolveDiffPath(fromPath: string, toPath: string): string {
  const normalizedFrom = fromPath === 'dev/null' ? '/dev/null' : fromPath;
  const normalizedTo = toPath === 'dev/null' ? '/dev/null' : toPath;

  if (normalizedTo === '/dev/null') return normalizedFrom;
  if (normalizedFrom === '/dev/null') return normalizedTo;
  return normalizedTo || normalizedFrom;
}

export function parseUnifiedDiffByFile(diffContent: string): ParsedSkillDiffFile[] {
  if (!diffContent || !diffContent.trim()) return [];

  const lines = diffContent.split('\n');
  const parsed: ParsedSkillDiffFile[] = [];
  let currentLines: string[] = [];
  let currentPath = '';

  const flush = () => {
    if (currentLines.length === 0) return;
    parsed.push({
      filePath: currentPath || 'Full diff',
      diff: currentLines.join('\n'),
    });
  };

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      flush();
      currentLines = [line];

      const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
      if (match) {
        const fromPath = match[1];
        const toPath = match[2];
        currentPath = resolveDiffPath(fromPath, toPath);
      } else {
        currentPath = 'Unknown file';
      }
      continue;
    }

    if (currentLines.length === 0) {
      currentPath = 'Full diff';
      currentLines = [line];
      continue;
    }

    currentLines.push(line);
  }

  flush();
  return parsed;
}
