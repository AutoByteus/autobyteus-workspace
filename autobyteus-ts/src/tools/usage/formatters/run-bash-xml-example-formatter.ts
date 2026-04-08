import { BaseExampleFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class RunBashXmlExampleFormatter implements BaseExampleFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `### Example 1: List files in the workspace root

<run_bash>
ls -la
</run_bash>

### Example 2: Run tests

<run_bash cwd="/absolute/path/to/workspace/tests">
python -m pytest tests/ -v
</run_bash>

### Example 3: Structured call with background handle

<run_bash cwd="/absolute/path/to/workspace/apps/web" background="true">
npm run dev
</run_bash>`;
  }
}
