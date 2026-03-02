import type { BaseSchemaFormatter, BaseExampleFormatter } from "autobyteus-ts";
import type { ToolDefinition } from "autobyteus-ts/tools/registry/tool-definition.js";

export class CreatePromptXmlSchemaFormatter implements BaseSchemaFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `<tool name="create_prompt">
    <arguments>
        <arg name="name" type="string" description="The unique name for the prompt (e.g., 'CodeGenerator')." required="true" />
        <arg name="category" type="string" description="The category for the prompt (e.g., 'Development', 'Testing')." required="true" />
        <arg name="prompt_content" type="string" description="The main text content of the prompt." required="true">
            IMPORTANT: To ensure reliable streaming, you MUST enclose the prompt content with the sentinel tags __START_CONTENT__ and __END_CONTENT__.
            The parser will strip these tags, but they are critical for preventing XML parsing errors if the content contains special characters.
        </arg>
    </arguments>
</tool>`;
  }
}

export class CreatePromptXmlExampleFormatter implements BaseExampleFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `### Example 1: Create a new system prompt

<tool name="create_prompt">
    <arguments>
        <arg name="name">ExpertCoder</arg>
        <arg name="category">Coding</arg>
        <arg name="prompt_content">
__START_CONTENT__
You are an expert Python developer.
You follow PEP 8 standards strictly.
Always perform comprehensive error handling.
__END_CONTENT__
        </arg>
    </arguments>
</tool>`;
  }
}
