## Semantic memory for agents

- An agent can now have its own semantic memory: a private folder on the node where it keeps the reusable knowledge it learns, such as how a website's controls work. Every run of that agent uses the same folder, in any Project, as a team member or when another agent delegates work to a copy of it, so knowledge learned once is reused instead of relearned.
- Turn it on with the new **Semantic memory** switch in the agent's form. For an agent from a package, the switch is your personal setting and **Reset to the package's setting** returns to the package's value. Package authors can enable it with `"semanticMemoryEnabled": true` in the agent's `agent-config.json`.
- The agent's detail page shows whether semantic memory is on and where its folder is.
- The agent is told the folder's path in its instructions and can write there with its normal tools in every runtime. With auto-execute off, the DeepSeek harness asks for approval before writing there.
- Turning the switch off, deleting the agent or updating its package never deletes the folder; turning it on again gives the same folder. Agents without semantic memory work exactly as before.
