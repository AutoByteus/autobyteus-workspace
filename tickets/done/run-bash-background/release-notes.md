## Background commands for AutoByteus agents

- AutoByteus agents can run a long command in the background with `run_bash` (for example a build or a dev server). The call returns right away with the command's process id and an output file the agent can read with ordinary commands such as `tail`.
- Commands started with `&` in a normal `run_bash` call are tracked the same way.
- When background commands finish, the agent is told once, with the exit code or signal, how long it ran and its last output lines. Commands that end close together are reported in one notice, and an agent that was idle wakes up to handle it. No polling is needed.
- The Activity tab's Background Tasks panel now shows AutoByteus background commands, running and finished. An agent with a running background command is not shut down for being idle.
- An agent stops a background command with `kill <pid>`; everything the command started stops with it. Ending or terminating a run stops its background commands. Pressing Stop leaves them running, and their result still arrives.
- The separate background-process tools are retired. Agents that still list them start normally; the old names are skipped.
