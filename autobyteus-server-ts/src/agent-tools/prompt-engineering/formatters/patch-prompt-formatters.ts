import type { BaseSchemaFormatter, BaseExampleFormatter } from "autobyteus-ts";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";

export class PatchPromptXmlSchemaFormatter implements BaseSchemaFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `<tool name="patch_prompt">
    <arguments>
        <arg name="prompt_id" type="string" description="The ID of the prompt to create a revision of." required="true" />
        <arg name="patch" type="string" description="Unified diff patch describing the edits to apply to the prompt content." required="true">
            IMPORTANT: To ensure reliable streaming, you MUST enclose the patch content with the sentinel tags __START_PATCH__ and __END_PATCH__.
            The parser will strip these tags, but they are critical for preventing XML parsing errors if the patch contains special characters.
        </arg>
    </arguments>
</tool>`;
  }
}

export class PatchPromptXmlExampleFormatter implements BaseExampleFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `### Example: Update a prompt using a patch

First use \`get_prompt\` to view the prompt content. It will show a virtual file like \`prompt_123.md\`.
Then apply changes using \`patch_prompt\` with a standard unified diff:

<tool name="patch_prompt">
    <arguments>
        <arg name="prompt_id">123</arg>
        <arg name="patch">
__START_PATCH__
--- a/prompt_123.md
+++ b/prompt_123.md
@@ -1,3 +1,3 @@
 You are an expert Python developer.
-You write code for Python 3.8+.
+You write code for Python 3.10+.
 Always perform comprehensive error handling.
__END_PATCH__
        </arg>
    </arguments>
</tool>

**IMPORTANT**: 
- The \`get_prompt\` output shows line numbers (e.g., "1: text") for reference only
- Do NOT include line numbers in your patch content
- Use standard unified diff format with file headers (--- and +++)`;
  }
}
