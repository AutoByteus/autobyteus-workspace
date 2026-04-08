import { BaseXmlSchemaFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class EditFileXmlSchemaFormatter extends BaseXmlSchemaFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `<tool name="edit_file">
    <arguments>
        <arg name="path" type="string" description="The filesystem path to the file to patch. This may be absolute or relative to the configured workspace root. Relative paths are resolved from the workspace root, never from prior shell cd state." required="true" />
        <arg name="patch" type="string" description="A git diff style unified diff patch for this file. Use ---/+++ file headers and numeric hunk headers such as @@ -10,7 +10,8 @@. Match the file's existing style exactly." required="true">
            IMPORTANT: To ensure reliable streaming, you MUST enclose the patch content with the sentinel tags __START_PATCH__ and __END_PATCH__.
            The parser will strip these tags, but they are critical for preventing XML parsing errors if the patch contains special characters.
        </arg>
    </arguments>
</tool>`;
  }
}
