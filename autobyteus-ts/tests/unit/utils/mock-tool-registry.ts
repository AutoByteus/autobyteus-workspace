/**
 * Mock Tool Registry and Definitions for testing LLM Tool Calls 
 * before the full Tools module is migrated.
 */

export const mockToolDefinition = {
  name: "write_file",
  description: "Write a file",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "The path to the file" },
      content: { type: "string", description: "The content to write" }
    },
    required: ["path", "content"]
  }
};

export class MockToolRegistry {
  getToolDefinition(name: string) {
    if (name === "write_file") {
      return mockToolDefinition;
    }
    return null;
  }
}
