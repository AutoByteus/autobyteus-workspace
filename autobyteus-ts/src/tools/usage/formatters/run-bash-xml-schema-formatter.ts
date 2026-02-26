import { BaseXmlSchemaFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class RunBashXmlSchemaFormatter extends BaseXmlSchemaFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `## run_bash

Runs a command in the terminal.

**Syntax:**
\`\`\`xml
<run_bash>
command_to_execute
</run_bash>
\`\`\`

**Parameters:**
- Content between tags: The shell command to execute.
- Optional XML attributes:
  - \`background="true|false"\` (default false)
  - \`timeout_seconds="30"\` (foreground timeout)

The command runs in the agent's configured working directory.

When using structured/native tool calling (not XML shorthand), you can also pass:
- \`background\` (boolean, default false) to run asynchronously and get a process handle
- \`timeout_seconds\` (integer, default 30) for foreground execution timeout`;
  }
}
