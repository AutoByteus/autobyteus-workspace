import { BaseXmlSchemaFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class RunBashXmlSchemaFormatter extends BaseXmlSchemaFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `## run_bash

Runs a stateless non-interactive bash command.

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
  - \`timeout_seconds="30"\` (command timeout)

The command runs in the provided \`cwd\`. Do not rely on a prior \`cd\` from an earlier call.
If \`cwd\` is omitted, the workspace root is used when available.
If a task targets a nested directory, reuse that same \`cwd\` on every command that should run there, including \`pwd\`, \`git init\`, redirects such as \`pwd > runtime/pwd.txt\`, and file-creation commands.
Relative \`cwd\` values are resolved from the workspace root, never from a prior shell state.
Do not invent generic sandbox aliases like \`/workspace\` or \`/home/ubuntu\`; use the actual path provided in the task or context.
Each successful result includes \`effectiveCwd\` so you can verify where the command actually ran before deciding the next step.
For long-running commands, use normal bash syntax such as \`npm run dev > server.log 2>&1 &\`; if ordinary live background descendants remain after the shell exits, the result includes \`backgroundProcesses\` entries identified by \`pid\`.

When using structured/native tool calling (not XML shorthand), you can also pass:
- \`cwd\` (string, optional) as a workspace-root-relative or absolute working-directory path such as \`packages/api\` or \`/Users/alice/project\`
- \`timeout_seconds\` (integer, default 30) for execution timeout`;
  }
}
