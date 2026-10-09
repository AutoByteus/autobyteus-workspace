# Follow-up Task Brief: existing team runs should pick up members added to the team definition later

- Requested by: the user, 2026-10-09, in the Solution Designer conversation of `delegated-copy-member-contact-delegator`
- Purpose: bookkeeping. Create a **TODO** Project Task; do not start or delegate it now.
- Relation: separate from `delegated-copy-member-contact-delegator` (that ticket covers `@` of the delegating PM in standalone Agent runs only and does not solve this).

## Problem (user's case)

- A team run was started when its team definition had two members.
- Later a third member was added to the team definition as a **private (team-local) member**, not a shared agent.
- The existing team run still shows and knows only two members, so the third member can't be reached from it:
  - `@` and `list_available_agents` offer only shared agents.
  - The run has no address for the new member, so `send_message_to` / `delegate_task` to it are not found.
- Starting a new team run gets all three members but **loses the existing run's history**, which the user needs to keep.

## Evidence (Solution Designer, code reading 2026-10-09, not runtime-verified)

- A team run stores its member list in its execution tree at creation. Restore reuses the stored tree (`autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` `restoreTeamRun` → manager restore; `createTeamRunFromRootConfig` plans members from the definition only at creation).
- `@`/catalog eligibility only covers shared definitions (`autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-candidate-policy.ts`, `isEligibleAgent`: `ownershipScope === "shared"`).

## Desired Outcome (proposed, needs user approval in its own ticket)

An existing team run can gain members added to its team definition later. Existing members keep their history, and the new member joins with a fresh conversation and is reachable like any other member (`@` by the user, `send_message_to` by teammates, handoff rules).

## Open Questions For That Ticket

1. Automatic on reopen, or an explicit user action (e.g. "update members from definition")?
2. Which runtime/model settings does the new member get in an old run?
3. What happens to members removed or renamed in the definition?
4. Should team copies already delegated (e.g. by the Project Task Manager) also pick up new members?

## Interim Workaround

Files the old run wrote (tickets, handoff files) persist in the workspace. A new run's coordinator can be pointed at them, but the conversations themselves are not carried over.
