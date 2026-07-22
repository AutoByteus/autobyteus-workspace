import dotenv from 'dotenv';

export type EnvironmentRecordParser = (contents: string) => Record<string, string>;

// This deliberately mirrors dotenv's complete assignment grammar while capturing only the name.
// Excluded ranges are erased before dotenv.parse can decode or retain any value.
const assignmentPattern = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(?:\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/gm;

const maskExcludedAssignments = (
  contents: string,
  excludedNames: ReadonlySet<string>,
): string => {
  const excludedRanges: Array<{ start: number; end: number }> = [];
  assignmentPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = assignmentPattern.exec(contents)) !== null) {
    const name = match[1];
    if (name && excludedNames.has(name)) {
      excludedRanges.push({ start: match.index, end: assignmentPattern.lastIndex });
    }
  }

  let cursor = 0;
  let admitted = '';
  for (const range of excludedRanges) {
    admitted += contents.slice(cursor, range.start);
    admitted += contents.slice(range.start, range.end).replace(/[^\r\n]/g, ' ');
    cursor = range.end;
  }
  return admitted + contents.slice(cursor);
};

export const parseNonSecretEnvironment = (
  contents: string,
  excludedNames: ReadonlySet<string>,
  parse: EnvironmentRecordParser = dotenv.parse,
): Record<string, string> => parse(maskExcludedAssignments(contents, excludedNames));
