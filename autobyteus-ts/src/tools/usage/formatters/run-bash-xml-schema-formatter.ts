import { BaseXmlSchemaFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class RunBashXmlSchemaFormatter extends BaseXmlSchemaFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `## run_bash

Runs a command in the terminal.

**Syntax:**
\`\`\`xml
<run_bash>
command_to_execute_in_workspace_root
</run_bash>

<run_bash cwd="packages/api">
command_to_execute_in_workspace_subdir
</run_bash>

<run_bash cwd="/absolute/path/to/workspace/or/subdir">
command_to_execute
</run_bash>
\`\`\`

**Parameters:**
- Content between tags: The shell command to execute.
- Optional XML attributes:
  - \`cwd="relative/or/absolute/path"\` (optional; relative values resolve from the workspace root, absolute values are also allowed)
  - \`background="true|false"\` (default false)
  - \`timeout_seconds="30"\` (foreground timeout)

The command runs in the provided \`cwd\`. Do not rely on a prior \`cd\` from an earlier call.
If \`cwd\` is omitted, the workspace root is used when available.
If a task targets a nested directory, reuse that same \`cwd\` on every command that should run there, including \`pwd\`, \`git init\`, redirects such as \`pwd > runtime/pwd.txt\`, and file-creation commands.
Relative \`cwd\` values are resolved from the workspace root, never from a prior shell state.
Do not invent generic sandbox aliases like \`/workspace\` or \`/home/ubuntu\`; use the actual path provided in the task or context.
Each successful result includes \`effectiveCwd\` so you can verify where the command actually ran before deciding the next step.

When using structured/native tool calling (not XML shorthand), you can also pass:
- \`cwd\` (string, optional) as a workspace-root-relative or absolute working-directory path such as \`packages/api\` or \`/Users/alice/project\`
- \`background\` (boolean, default false) to run asynchronously and get a process handle
- \`timeout_seconds\` (integer, default 30) for foreground execution timeout`;
  }
}
