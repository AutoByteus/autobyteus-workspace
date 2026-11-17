## Agents on the AutoByteus runtime use far fewer tokens per request

- An agent that runs on the AutoByteus runtime no longer sends the full description of every tool it has with each message. It sends the four base tools (run commands, read, edit and write files) plus a search tool; for any other tool it searches by name or by what it needs, gets the tool's full description, and calls it. The tool does the same work as before.
- The first request of a conversation is much smaller: for the Project Task Manager it falls from about 7,600 tokens to about 2,500, and for the Daily Assistant from about 8,300 to about 2,500 (measured on DeepSeek V4 Flash). All twelve evaluation tasks succeed with and without the change.
- It works with every provider the AutoByteus runtime can reach in our checks (DeepSeek, Gemini, GLM, Grok, OpenAI, Claude).
- Changing an agent's tools while a conversation runs no longer invalidates the provider's cache of that conversation: the agent is told what was added or removed and can search for it.
- When you review each tool call, a tool that is not one of the four base tools now asks for approval twice: first for the search, then for the tool itself. Running tools automatically is unchanged.
- Runs and conversations created before this version continue as they are; nothing needs converting.
