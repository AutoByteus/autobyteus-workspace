export interface AgentMdFields {
  name: string;
  description: string;
  category?: string;
  role?: string;
  instructions: string;
}

export class AgentMdParseError extends Error {
  constructor(message: string, public readonly filePath?: string) {
    super(message);
    this.name = "AgentMdParseError";
  }
}

/**
 * Parse an agent.md file using index-based parsing (not split("---", 3)).
 * Format:
 *   ---\n
 *   key: value\n
 *   ...\n
 *   ---\n
 *   \n
 *   instructions body
 */
export function parseAgentMd(content: string, filePath?: string): AgentMdFields {
  const OPEN_DELIMITER = "---\n";
  const CLOSE_DELIMITER = "\n---\n";

  // Must start with the opening delimiter
  if (!content.startsWith(OPEN_DELIMITER)) {
    throw new AgentMdParseError(
      `agent.md must start with '---' frontmatter delimiter${filePath ? ` (${filePath})` : ""}`,
      filePath,
    );
  }

  // Find the closing delimiter after the opening one
  const closeIndex = content.indexOf(CLOSE_DELIMITER, OPEN_DELIMITER.length);
  if (closeIndex === -1) {
    throw new AgentMdParseError(
      `agent.md missing closing '---' frontmatter delimiter${filePath ? ` (${filePath})` : ""}`,
      filePath,
    );
  }

  const frontmatterBlock = content.slice(OPEN_DELIMITER.length, closeIndex);
  // Everything after the closing "\n---\n"
  const bodyStart = closeIndex + CLOSE_DELIMITER.length;
  // Strip a leading newline if present (the blank line after ---)
  let instructions = content.slice(bodyStart);
  if (instructions.startsWith("\n")) {
    instructions = instructions.slice(1);
  }

  // Parse frontmatter key: value lines
  const fields: Record<string, string> = {};
  for (const line of frontmatterBlock.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key) {
      fields[key] = value;
    }
  }

  const name = fields["name"];
  if (!name) {
    throw new AgentMdParseError(
      `agent.md frontmatter missing required 'name' field${filePath ? ` (${filePath})` : ""}`,
      filePath,
    );
  }

  const description = fields["description"] ?? "";

  return {
    name,
    description,
    category: fields["category"] || undefined,
    role: fields["role"] || undefined,
    instructions,
  };
}

export function serializeAgentMd(
  fields: Omit<AgentMdFields, "instructions">,
  instructions: string,
): string {
  const lines: string[] = ["---"];
  lines.push(`name: ${fields.name}`);
  lines.push(`description: ${fields.description}`);
  if (fields.category) {
    lines.push(`category: ${fields.category}`);
  }
  if (fields.role) {
    lines.push(`role: ${fields.role}`);
  }
  lines.push("---");
  lines.push("");
  lines.push(instructions);
  return lines.join("\n");
}
