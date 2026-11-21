## Running teams follow their team definition

- A running team now changes with its team definition. Add a member, remove one, change the coordinator or the handoff rules (in the app or in the agent package's files), and the running team follows. You no longer need to start a new team run.
- A new member joins the running team Offline and starts the first time it is needed. A handoff rule to it works right away.
- A removed member leaves the team. Its teammates can no longer message it; they are told it left the team and to check their handoff rules. Its conversation and history stay readable.
- A member removed while it is still working finishes its current turn first. Its row in the team tree is tagged **Leaving** until it stops, and you can still open it and answer its approvals.
- The remaining members are told once what changed: who joined, who left, and whether their handoff rules changed.
- A team that is stopped picks up the changes when you open it again, also after a restart.
- A team copy that an agent started from a team definition follows it too. Teams inside an Org and teams run by an application keep their members.
- If the team definition cannot be used (for example a file with an error), the running team keeps its members and a warning is logged.
