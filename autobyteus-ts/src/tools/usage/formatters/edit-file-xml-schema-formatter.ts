import { BaseXmlSchemaFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';
import {
  EDIT_FILE_DESCRIPTION,
  EDIT_FILE_PATCH_DESCRIPTION,
  EDIT_FILE_PATCH_EXAMPLE
} from '../../file/edit-file-contract.js';

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class EditFileXmlSchemaFormatter extends BaseXmlSchemaFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `<tool name="edit_file" description="${escapeXmlAttribute(EDIT_FILE_DESCRIPTION)}">
    <arguments>
        <arg name="path" type="string" description="Absolute filesystem path, or a relative file path paired with base_dir. If path is relative, you must provide an absolute base_dir. If base_dir is omitted, path must be absolute. Absolute paths are used directly and take precedence if base_dir is also supplied. Relative paths are never resolved from the configured workspace, process cwd, or prior shell cd state." required="true" />
        <arg name="base_dir" type="string" description="Optional absolute directory used only when path is relative; it is required for a relative path. If path is absolute, omit base_dir (an absolute path takes precedence if both are supplied). This applies to this tool call only and does not change shell or agent working-directory state. Do not provide a relative base_dir." required="false" />
        <arg name="patch" type="string" description="${escapeXmlAttribute(EDIT_FILE_PATCH_DESCRIPTION)}" required="true">
            Example patch:
${EDIT_FILE_PATCH_EXAMPLE}
            IMPORTANT: To ensure reliable streaming, you MUST enclose the patch content with the sentinel tags __START_PATCH__ and __END_PATCH__.
            The parser will strip these tags, but they are critical for preventing XML parsing errors if the patch contains special characters.
        </arg>
    </arguments>
</tool>`;
  }
}
