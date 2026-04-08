import { BaseExampleFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class RunBashXmlExampleFormatter implements BaseExampleFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `### Example 1: List files in the workspace root

<run_bash>
ls -la
</run_bash>

### Example 2: Run tests in a workspace-relative nested directory

<run_bash cwd="tests">
python -m pytest tests/ -v
</run_bash>

### Example 3: Use the same workspace-relative cwd for every command in a nested target

<run_bash cwd="services/checkout-api">
git init
</run_bash>

<run_bash cwd="services/checkout-api">
pwd > runtime/pwd.txt
</run_bash>

### Example 4: Use an absolute cwd when needed

<run_bash cwd="/absolute/path/to/workspace/apps/web" background="true">
npm run dev
</run_bash>`;
  }
}
