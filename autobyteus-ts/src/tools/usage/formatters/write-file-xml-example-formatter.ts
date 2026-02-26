import { BaseExampleFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class WriteFileXmlExampleFormatter implements BaseExampleFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `### Example 1: Create a Python file
        
<tool name="write_file">
    <arguments>
        <arg name="path">/path/to/hello.py</arg>
        <arg name="content">
__START_CONTENT__
def hello():
    print("Hello, World!")

if __name__ == "__main__":
    hello()
__END_CONTENT__
        </arg>
    </arguments>
</tool>

### Example 2: Create a configuration file

<tool name="write_file">
    <arguments>
        <arg name="path">config/settings.json</arg>
        <arg name="content">
__START_CONTENT__
{
    "debug": true,
    "log_level": "INFO"
}
__END_CONTENT__
        </arg>
    </arguments>
</tool>`;
  }
}
