# Follow-ups: workspace-tree-vs-chooser

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Architecture reviewer (ARCH-REV-001 AR-001), recorded by the Solution Designer | GraphQL `createAgentRun` (`autobyteus-server-ts/src/api/graphql/types/agent-run.ts:201`) has no caller: the web defines it only in `graphql/mutations/agentMutations.ts:13-15` and generated types; chat and mobile use `PrepareAgentRun` | Repository-wide search (2026-11-05): no other caller; external clients not checked | Its removal needs a check for callers outside the repository (Principle 7, public API); this ticket does not depend on it | No | "Check whether anything outside the repository (peer nodes, applications, scripts) calls the GraphQL `createAgentRun`; if not, remove it, its web mutation and generated types, and its tests." | — |
