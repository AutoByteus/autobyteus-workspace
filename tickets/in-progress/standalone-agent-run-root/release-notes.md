## Improvements
- A standalone agent run's token usage now includes the usage of its collaborators and their task copies, including for existing runs as far as their records allow.
- Messages between agents now state the sender's full address, so an agent can reply by address to a sender inside a team.
- The Event Monitor's "earlier events" page now shows who sent each agent-to-agent message ("From <Sender>:").
- A collaborator's Team tab now shows the host agent's name in the usual readable format.

## Fixes
- A collaborator in a standalone run can no longer delegate a task to itself; the request is rejected as it is in Team and Org runs.
