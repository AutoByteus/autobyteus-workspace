export const assignmentName = (line: string): string | null =>
  /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/.exec(line)?.[1] ?? null;

export const linesWithEndings = (content: string): string[] =>
  content.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g)?.filter((line) => line.length > 0) ?? [];

export const splitLineEnding = (line: string): { body: string; ending: string } => {
  const ending = line.endsWith("\r\n")
    ? "\r\n"
    : line.endsWith("\r")
      ? "\r"
      : line.endsWith("\n")
        ? "\n"
        : "";
  return { body: ending ? line.slice(0, -ending.length) : line, ending };
};
