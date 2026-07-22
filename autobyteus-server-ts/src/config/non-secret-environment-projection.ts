import dotenv from 'dotenv';

export type EnvironmentRecordParser = (contents: string) => Record<string, string>;

const assignmentPattern = /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/gm;

const endOfPhysicalLine = (contents: string, offset: number): number => {
  let cursor = offset;
  while (cursor < contents.length && contents[cursor] !== '\r' && contents[cursor] !== '\n') {
    cursor += 1;
  }
  return cursor;
};

const isEscaped = (contents: string, offset: number): boolean => {
  let backslashes = 0;
  for (let cursor = offset - 1; cursor >= 0 && contents[cursor] === '\\'; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
};

const endOfAssignment = (contents: string, valueOffset: number): number => {
  let cursor = valueOffset;
  while (contents[cursor] === ' ' || contents[cursor] === '\t') cursor += 1;
  const quote = contents[cursor];
  if (quote !== "'" && quote !== '"' && quote !== '`') {
    return endOfPhysicalLine(contents, cursor);
  }

  cursor += 1;
  while (cursor < contents.length) {
    if (contents[cursor] === quote && !isEscaped(contents, cursor)) {
      return endOfPhysicalLine(contents, cursor + 1);
    }
    cursor += 1;
  }
  return contents.length;
};

const maskExcludedAssignments = (
  contents: string,
  excludedNames: ReadonlySet<string>,
): string => {
  const excludedRanges: Array<{ start: number; end: number }> = [];
  assignmentPattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = assignmentPattern.exec(contents)) !== null) {
    const name = match[1];
    const end = endOfAssignment(contents, assignmentPattern.lastIndex);
    if (name && excludedNames.has(name)) excludedRanges.push({ start: match.index, end });
    assignmentPattern.lastIndex = Math.max(end, assignmentPattern.lastIndex);
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
