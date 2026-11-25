## Agents' system prompt is shorter: the long-running-commands section is gone

(For the release that includes this change. User-facing. No user action is needed, so there is no "What you need to do" section.)

- **Every agent's system prompt no longer ends with a "Long-Running Commands" section.** Since v1.5.13, Claude, Codex, Grok, Antigravity, DeepSeek and native AutoByteus agents were told, at the end of their system prompt, how to start a long build or test suite once in the background, act on its completion notice and not wait with sleep loops. That text is removed from all of them. Nothing else in the prompt changes: the order and text of the other sections stay as they were. New runs and restored runs get the shorter prompt; a saved run keeps the prompt it started with until it is restored.
- **The habit is kept as a best-practice note in the node's global memory** ("Best practice: long-running commands"), where any agent can read it. Each runtime's own shell tool still describes its background runs and completion notices.
- **The shell limits and the background-task display do not change.** Claude's 2-hour shell limit, the end reason and exit code of a background task on the desktop and the phone, and the Background Tasks panel work as in v1.5.13 and later.

### Good to know

- How well agents wait for a long job without the section was never measured, before or after. If an agent starts a job twice or waits with sleep loops, tell it to read the global-memory note, or put the habit in that agent's own instructions.
