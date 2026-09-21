export type OrgMdFields = { name: string; description: string; category?: string; instructions: string };
export class OrgMdParseError extends Error {
  readonly code = "DEFINITION_CONTRACT_INVALID";
  constructor(message: string, readonly filePath?: string) { super(message); this.name = "OrgMdParseError"; }
}
export const parseOrgMd = (content: string, filePath?: string): OrgMdFields => {
  if (!content.startsWith("---\n")) throw new OrgMdParseError(`org.md must start with '---'${filePath ? ` (${filePath})` : ""}.`, filePath);
  const close = content.indexOf("\n---\n", 4);
  if (close < 0) throw new OrgMdParseError(`org.md is missing its closing frontmatter delimiter.`, filePath);
  const fields: Record<string, string> = {};
  for (const line of content.slice(4, close).split("\n")) {
    const colon = line.indexOf(":");
    if (colon > 0) fields[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  if (!fields.name) throw new OrgMdParseError("org.md frontmatter requires name.", filePath);
  let instructions = content.slice(close + 5);
  if (instructions.startsWith("\n")) instructions = instructions.slice(1);
  return { name: fields.name, description: fields.description ?? "", category: fields.category || undefined, instructions };
};
export const serializeOrgMd = (value: OrgMdFields): string => [
  "---", `name: ${value.name}`, `description: ${value.description}`,
  ...(value.category ? [`category: ${value.category}`] : []), "---", "", value.instructions,
].join("\n");
