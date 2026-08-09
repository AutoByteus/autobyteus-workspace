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

export const upsertEnvironmentAssignment = (content: string, key: string, value: string): string => {
  let found = false;
  const updated = linesWithEndings(content).map((line) => {
    const { body, ending } = splitLineEnding(line);
    if (assignmentName(body) === key) {
      found = true;
      return `${key}=${value}${ending}`;
    }
    return line;
  }).join("");

  if (found) {
    return updated;
  }
  const preferredEnding = content.includes("\r\n") ? "\r\n" : "\n";
  return `${content}${content.length > 0 && !/[\r\n]$/.test(content) ? preferredEnding : ""}${key}=${value}`;
};

export const removeEnvironmentAssignment = (content: string, key: string): string =>
  linesWithEndings(content).filter((line) => {
    const { body } = splitLineEnding(line);
    return assignmentName(body) !== key;
  }).join("");
