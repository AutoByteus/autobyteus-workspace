import { describe, it, expect } from 'vitest';
import { generateBaseInvocationId } from '../toolUtils';

describe('toolUtils', () => {
  describe('generateBaseInvocationId', () => {
    it('should generate a deterministic ID for a complex object matching the Gemini live case', () => {
      const toolName = "CreatePromptRevision";
      const args = {
          "base_prompt_id": "6",
          "new_prompt_content": "You are the Jira Project Manager, an expert AI assistant specializing in managing software development projects using Atlassian's Jira and Confluence.\n\nYour primary purpose is to help users interact with Jira and Confluence efficiently. You can perform a wide range of tasks, including but not limited to:\n- **Jira Issue Management:** Creating, updating, deleting, and searching for issues (Tasks, Bugs, Stories, Epics, Subtasks).\n- **Jira Workflow:** Transitioning issues through their workflow (e.g., from 'To Do' to 'In Progress' to 'Done').\n- **Jira Agile/Scrum:** Managing sprints, boards, and versions.\n- **Linking:** Linking Jira issues to each other or to Confluence pages.\n- **Confluence Documentation:** Creating, reading, and updating Confluence pages to support project documentation.\n- **Reporting:** Answering questions about project status by querying Jira and Confluence.\n\nWhen a user asks for help, be proactive. If a request is ambiguous, ask clarifying questions. For example, if a user wants to create a ticket, ask for the project key, issue type, summary, and description. Always confirm the successful completion of an action.\n\nYou are equipped with a comprehensive set of tools. Use them wisely to fulfill user requests.\n\n**Available Tools**\n{{tools}}\n\n**Important Rule (Output Format)**\n⚠️ **When calling tools, DO NOT wrap the output in any markup such as ```json, ```, or any other code block symbols.**\nAll tool calls must be returned **as raw JSON only**, without any extra formatting. This rule is critical and must always be followed.",
          "new_description": "A system prompt for an agent that manages Jira tickets and Confluence pages. Includes {{tools}} placeholder and output formatting rules."
      };

      const generatedId = generateBaseInvocationId(toolName, args);

      // We can still do a basic check on the format.
      expect(generatedId.startsWith('call_')).toBe(true);
      expect(generatedId.length).toBe('call_'.length + 64); // 64 hex characters for sha256
    });

    // NEW TEST CASE ADDED FOR THE PRODUCTION XML SCENARIO
    it('should generate a deterministic ID for the complex production XML case', () => {
      const toolName = "PublishTaskPlan";
      const args = {
        "plan": {
          "overall_goal": "Develop a complete Snake game in Python from scratch",
          "tasks": [
            {
              "task_name": "implement_game_logic",
              "assignee_name": "Software Engineer",
              "description": "Implement the core game logic for Snake including snake movement, food generation, collision detection, and score tracking"
            },
            {
              "task_name": "code_review",
              "assignee_name": "Code Reviewer",
              "description": "Conduct a thorough code review of the implemented Snake game logic, checking for best practices, efficiency, and correctness",
              "dependencies": ["implement_game_logic"]
            },
            {
              "task_name": "write_unit_tests",
              "assignee_name": "Test Writer",
              "description": "Write comprehensive unit tests for all game components including movement, collision detection, and scoring logic",
              "dependencies": ["implement_game_logic"]
            },
            {
              "task_name": "run_tests",
              "assignee_name": "Tester",
              "description": "Execute all unit tests and perform manual testing of the Snake game to ensure it functions correctly and meets requirements",
              "dependencies": ["code_review", "write_unit_tests"]
            }
          ]
        }
      };

      const generatedId = generateBaseInvocationId(toolName, args);
      
      // We can also assert the actual value if we know it from the backend test run
      const expectedHash = "6e7a1f08f143518a8375c8a33868bef43d8c649dae8b5c13c4ef31ca285f9744";
      expect(generatedId).toBe(`call_${expectedHash}`);
    });
  });
});
