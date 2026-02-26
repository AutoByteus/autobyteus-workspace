import type { BaseSchemaFormatter, BaseExampleFormatter } from "autobyteus-ts";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";

export class UpdatePromptXmlSchemaFormatter implements BaseSchemaFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `<tool name="update_prompt">
    <arguments>
        <arg name="prompt_id" type="string" description="The ID of the prompt to update." required="true" />
        <arg name="new_content" type="string" description="The complete new content to replace the existing prompt content." required="true">
            IMPORTANT: To ensure reliable streaming, you MUST enclose the new content with the sentinel tags __START_CONTENT__ and __END_CONTENT__.
            The parser will strip these tags. Do NOT include line numbers in the new content.
        </arg>
    </arguments>
</tool>`;
  }
}

export class UpdatePromptXmlExampleFormatter implements BaseExampleFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `### Example: Replace a prompt's entire content

> **When to use which tool:**
> - \`update_prompt\` - For **complete rewrites** when most of the content needs to change
> - \`patch_prompt\` - For **partial edits** (efficient, preserves unchanged lines with unified diff)

First use \`get_prompt\` to view the current prompt content.
Then use \`update_prompt\` to completely replace it:

<tool name="update_prompt">
    <arguments>
        <arg name="prompt_id">123</arg>
        <arg name="new_content">
__START_CONTENT__
You are an expert Python developer.
You write clean, tested code for Python 3.10+.
Always follow best practices and include comprehensive error handling.
__END_CONTENT__
        </arg>
    </arguments>
</tool>

**IMPORTANT**: 
- Do NOT include line numbers in the new content (they are only for reference in \`get_prompt\`)
- For small/targeted changes, prefer \`patch_prompt\` with unified diff format`;
  }
}
