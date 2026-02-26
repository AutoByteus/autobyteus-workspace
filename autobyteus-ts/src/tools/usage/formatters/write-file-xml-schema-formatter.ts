import { BaseXmlSchemaFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class WriteFileXmlSchemaFormatter extends BaseXmlSchemaFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `<tool name="write_file">
    <arguments>
        <arg name="path" type="string" description="The absolute or relative path where the file will be written." required="true" />
        <arg name="content" type="string" description="The content to write to the file." required="true">
            IMPORTANT: To ensure reliable streaming, you MUST enclose the file content with the sentinel tags __START_CONTENT__ and __END_CONTENT__.
            The parser will strip these tags, but they are critical for preventing XML parsing errors if the content contains special characters.
        </arg>
    </arguments>
</tool>`;
  }
}
