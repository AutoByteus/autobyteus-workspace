# Implementation Plan - team-member-deregistration-on-team-terminate

1. Add explicit managed-agent deregistration API in `TeamManager`.
2. Route team shutdown step through that API (remove stale singleton IDs).
3. Update unit tests for shutdown step + manager cleanup behavior.
4. Add core integration test for deterministic team/member ID reuse after terminate.
5. Add backend integration test (`autobyteus-server-ts`) for terminate -> recreate via `AgentTeamInstanceManager`.
6. Run targeted test suites and confirm pass.
