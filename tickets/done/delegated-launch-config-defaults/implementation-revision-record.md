# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round's delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer pass notice (ARCH-REV-002), round 1 | N/A | `Initial Baseline` | SR-004, ARCH-REV-002 | Implemented; local checks pass; ready for Code Review |
| IR-002 | Code Reviewer, `code-review-report.md`, CRR-001 (round 1, `Fail`) | CR-001 | `Local Fix` | SR-004, ARCH-REV-002, CRR-001 | Dead `RootTeamRun.getAgentExecution` removed; checks pass; back to delta source review |
| IR-003 | Solution Designer, `handoff-sr-005-switcher-seeding.md` (SR-005 + SR-006, reopened) | N/A (reopened bug + user request) | `Initial Baseline` of the reopened round (direct route) | SR-005, SR-006 | Switcher/carried starts seed members; Settings collaborators/copies use the collapsible read-only member rows; checks pass |

## Revision Entries

### IR-001 — Definition launch defaults honored for delegated copies, collaborators and user team/Org starts

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002, `Pass`), implementation round 1.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented per `design-spec.md` (SR-004); local implementation checks pass (see `implementation-handoff.md`).
- Related solution revision IDs: SR-001..SR-004 (current SR-004)
- Related architecture-review revision IDs: ARCH-REV-001 (AR-001..AR-003, resolved in design), ARCH-REV-002 (`Pass`)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001..REQ-011; BEH-001, BEH-002, BEH-003, BEH-005, BEH-007, BEH-008 (changed); BEH-004, BEH-006, BEH-009 (preserved).
- Implementation delta:
  - Server: `CollaboratorLaunchResolver` replaces `CollaboratorRunnabilityValidator`; the entry builder captures definition defaults; per-member optional launch values and sources on records and DTOs; one `effectiveMemberLaunchConfiguration` for every member read; `launch_notes` on `delegate_task`, notes appended to `send_message_to` bring-ins.
  - Contracts: optional source/member-launch fields and `teamMemberLaunchConfiguration`/`collaborationMemberLaunchConfiguration` (+ `…LaunchSource`).
  - Web: four selectors use the contract functions; fresh team/Org/mobile starts seed members from their defaults (pinned rows, notes); read-only "Collaborators and delegated copies" Settings section.
- Changed files or areas: see `implementation-handoff.md` → Key Files Or Areas.
- Local validation and result: server typecheck clean; server unit suite and touched-area suites pass; contract package tests pass; web full `test:nuxt` passes; web guards pass; a rendered self-check of the New chat member drawer and the Org launch page (see handoff).
- Next recipient or routing: per `get_handoff_rules` (Large / High → source review).
- Remaining limitations or risks: UNK-001 (unauthenticated runtime surfaces at its first turn); DEC-006 follow-up; Settings rows for a saved Team/Org run are read from the canonical draft tree (refresh shows newly added copies); mobile has no per-member rows, so its seeding shows no note.

### IR-002 — Remove dead `RootTeamRun.getAgentExecution` (CR-001)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-001 (round 1, Full Review, `Fail`).
- Triggering finding IDs: CR-001 (Low, Local Fix)
- Classification: `Local Fix`
- Prior authoritative result: IR-001 — `getAgentExecution` kept (test-only) and listed as a follow-up; its `launchConfiguration` read a collaborator-Team member's own launch outside `effectiveMemberLaunchConfiguration` (`null` for members without their own).
- Current authoritative result: the method is removed; no member-launch read outside the effective-member function remains in `root-team-run.ts`.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why recorded: Core Principle 7 / design Removal Plan ("Dead code in touched files — In This Change").
- Approved behavior or requirement IDs affected: none (no production caller; behavior unchanged). Protects DS-005 single member-launch rule.
- Implementation delta:
  - `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts`: removed `getAgentExecution` and the now-unused `AgentLaunchConfiguration` import.
  - `autobyteus-server-ts/tests/unit/agent-team-execution/team-root-collaborators.test.ts`: removed its three uses (lines 59, 62, 117) and an unused destructured `product`. The two placement assertions (a collaborator Team member's containing TeamRun and ancestor scope; a collaborator Agent at the root) are re-expressed through the production `TeamRunExecutionTreeLocationService.findAgent` on the stored tree, since no other test covers collaborator placement scopes. The extra-copy assertion is not re-expressed: the same test already asserts that copy's placement on the execution tree (`team.taskExecutions` addresses).
  - `tests/unit/agent-team-execution/helpers/team-root-collaborator-harness.ts`: the harness also returns `memoryDir`.
- Local validation and result: server typecheck 0 errors; `vitest run tests/unit/agent-team-execution tests/unit/agent-collaboration` 65 files / 532 tests pass; `team-root-collaborators.test.ts` with the re-expressed assertions 7/7; full `test:unit` (see handoff).
- Next recipient or routing: `/software_engineering_team/code_reviewer` (targeted delta review).
- Remaining limitations or risks: unchanged from IR-001 plus the CRR-001 non-blocking residual risks (copies without a recorded source show "As configured in this run" with no Team-row model; `chatDraftStore.ts` 492 / `teamExecutionViewState.ts` 497 lines near the limit; Settings reads the editor's loaded tree).

### IR-003 — Reopened: switcher starts seed members (SR-005); Settings uses the collapsible member rows (SR-006)

- Triggering role, report path, and round: `/software_engineering_team/solution_designer`, `handoff-sr-005-switcher-seeding.md` (Architecture Design Complete, SR-005, then SR-006 with the "same look as Members" addendum); reopened round after release `v1.5.3-beta.1`.
- Triggering finding IDs: N/A (user-reported defect, Task context screenshots 37–39; user request, screenshots 40–42).
- Classification: `Initial Baseline` of the reopened round (direct route, `Medium` / `Low`).
- Prior authoritative result: round 1 as released (IR-002 + API/E2E + delivery); New-chat heading switcher and carried starts did not seed members; Settings listed collaborators/copies in a flat, always-expanded `RunDelegatedLaunchList`.
- Current authoritative result: see `implementation-handoff.md` → "Reopened Round (IR-003)".
- Related solution revision IDs: SR-005, SR-006
- Related architecture-review revision IDs: N/A (direct route)
- Related code-review revision IDs: N/A (direct route)
- Related API/E2E revision IDs: N/A (new round)
- Related delivery revision IDs: N/A (new round)
- Why recorded: reopened implementation round.
- Approved behavior or requirement IDs affected: REQ-009/AC-011 (BEH-005), REQ-007/AC-010 refined by SR-006 (BEH-008).
- Implementation delta (web only):
  - `stores/chatDraftStore.ts`: `retarget` and carried `startForDefinition` seed Team members; `seedTeamMembers` loads definitions and handles its own errors (used by fresh, carried and switcher starts).
  - `stores/agentOrgLaunchDraftStore.ts`: carried Org start seeds placed teams and agents.
  - `utils/runSettings/runMemberTree.ts`: `launchNotes` (tagged notes), optional `badge`/`sourceKey`, exported `memberNode`, `countRunMemberNotes`.
  - `utils/runSettings/delegatedLaunchRows.ts`: projects read-only `RunMemberNode` trees (keys `<address>@<run ID>`; Team note once; launch/coordinator lookups for copies without a recorded source).
  - `components/run-settings/RunMemberRow.vue`, `RunMembersSection.vue`, `ExistingRunSettings.vue`, `components/workspace/config/ExistingRunConfigEditor.vue`; removed `RunDelegatedLaunchList.vue` + spec; localization key `runSettings.members.noteCount`.
  - Tests: `chatDraftStore.spec.ts` (5 SR-005 cases), `agentOrgLaunchDraftStore.spec.ts` (carried Org), `delegatedLaunchRows.spec.ts` (rewritten for nodes), new `RunDelegatedLaunchSection.spec.ts`; node fixtures gained `launchNotes`. Probe: new DLP-008; Settings reader expands rows; collapsed checks (running/stopped); Team-note-once assertion; precise read-only check.
- Local validation and result: web full suite 4243 pass; guards pass; bug tests and DLP-008 fail on the old stores and pass now; full DLP probe (see handoff).
- Next recipient or routing: per `get_handoff_rules` (direct API/E2E).
- Remaining limitations or risks: user verification pending; 390 px nested-card clipping (existing layout); `chatDraftStore.ts` at the 500-line limit.
