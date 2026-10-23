# Implementation Handoff — A remote run's title (autobyteus-269)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: no architecture review. The design is `Small / Low` on the direct route (Solution Designer, `handoff-implementation.md`). This handoff goes to API/E2E after the lightweight self-review below.
- Requirements doc: `tickets/in-progress/remote-run-title/requirements-doc.md` (Approved, SR-002)
- Investigation notes: `tickets/in-progress/remote-run-title/investigation-notes.md` (F-01 … F-07; the reproduction is F-03)
- Solution revision record: `tickets/in-progress/remote-run-title/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/remote-run-title/design-spec.md` (SR-004, commit `d7c2a3b7ee`; § Window Title Rule)
- Supplemental task artifacts: `evidence/reproduction-history-titles.json` (the reproduction)
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: Solution Designer round 2 (SR-004), from API/E2E F-001 (the sidebar showed the work packet wrapper for an active peer-started Agent run)

## Current Implementation Summary

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-run-title`, branch `codex/remote-run-title`, base `origin/personal` `33171e1385`. Two implementation commits:

- `05be574608` (IR-001, server; stands with no rework per SR-004), items 1–5 below;
- `2aefde62d5` (IR-002, window title rule, SR-004), item 6 below.


1. **The title methods:**
   - `AgentRunService.recordRunTitle(runId, content)` and `TeamRunService.recordRunTitle(teamRunId, content)` (by ID) go to their own catalogs;
   - `recordRunActivity` now calls them, so there is one write path per kind.
2. **The trigger:** the receiver's new `RemoteRunTitles` dependency, `recordFirstMessage(root, content)`. In `RemoteMessageReceiver.accept`, after `acceptRemoteWorkPacket` answers accepted, the request's `content` (the raw description; the "You have a new task…" notification is built later, on this node) is recorded for `request.targetRoot`. It is not awaited; a failure is logged with `console.warn`, naming the run, and the packet stays accepted. A refused packet, a refused link or a `message` records nothing.
3. **The composition:** `agent` goes to `agentRuns.recordRunTitle`, `agent_team` to `teamRuns.recordRunTitle`, and `agent_org` does nothing (a peer never starts an Org). The `Pick` types widened; `build-studio-server.ts` already passes the full services.
4. **Tests:**
   - receiver unit cases;
   - service unit cases;
   - AC-602 at the catalog;
   - the in-process A→B delegations (standalone and Team) now record and assert the title.
5. **Docs:** `run_history.md`, `remote_collaboration.md`, and the web's `agent_orgs.md` and `agent_execution_architecture.md`.
6. **Window title rule (SR-004, `autobyteus-web`):** the stored title is the one source whenever it has a value; the live first-user-message summary only fills an empty stored title.
   - Sidebar: `utils/runTreeLiveStatusMerge.ts` `mergeHistoryRowWithContext` resolves the live summary only when `row.summary` is empty. Status and activity overlays are unchanged.
   - Header: `composables/chat/useStandaloneRunTitle.ts` returns the cleaned stored history title first, then the live first user message.
   - Cleaning: `skillRequestInstruction.parseSingleLine` (the single-line, compacted form of the instruction; shares one matcher with `parse`), and `runTreeSummary.resolveStoredTitleSummary(summary)`, which drops it (a tags-only title reads as the instruction). It is applied where stored Agent titles are read: the history row projection (`utils/runTreeProjection.ts`, so stopped rows are cleaned too) and the header.
   - **One more window writer, beyond the design's two paths:** a local submission's navigation patch (`stores/runHistoryNavigationPatches.ts` `patchStandalone`) wrote the live first user message into the row's summary. For a peer-started run that is the packet, so after an owner message the merge's "stored wins" would have kept the wrapper. It now applies the live summary only when the row is not a history row with a stored title (drafts and local rows are patched as before). This applies the design's rule ("Forbidden: the window replacing a non-empty stored title") at the third writer; no new behavior.
   - Docs: `agent_execution_architecture.md` § Workspace History Row Titles now states the SR-004 rule and corrects the earlier "system task notification" sentence.
   - Tests: see § Checks Run (IMP-04).

- Implementation cycle: `Rework` (round 2, SR-004)
- Implementation revision record: `tickets/in-progress/remote-run-title/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-001 … SR-004
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: API/E2E round 1 (F-001)
- Related delivery revision IDs: N/A
- Triggering finding IDs: F-001 (API/E2E), via SR-004

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: server: about 40 lines across four files. Window (IR-002): about 40 source lines across six files, display precedence and cleaning only. No contract change between nodes or with the window, no persistence change, and the existing title owners and rule are reused.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (see § Self-Review)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-601 / BEH-601 | A peer-started Agent or Team run's title is its delegated description, by the first-non-empty, one-line rule | `RemoteMessageReceiver.accept` (accepted `work_packet`) → `RemoteRunTitles.recordFirstMessage(targetRoot, content)` → composition → `AgentRunService.recordRunTitle` / `TeamRunService.recordRunTitle` → `recordRunSummary` / `recordTeamRunSummary` | Implemented. In-process: the standalone run "publisher_r1" gets "Publish the video draft."; the Team run "studio_team_b" gets "Draft the episode." through the real `TeamRunService` |
| AC-601 (later owner message) | A later owner message doesn't replace it | Unchanged catalog rule: the first non-empty value wins (`agent-run-history-catalog-service.test.ts` "updates first summary only …") | Covered by the existing catalog test. The two-server assertion is API/E2E's |
| AC-602 | A 300-character description gives a one-line title of at most 100 characters | Existing compactor | New catalog unit case (multi-line, 300+ characters → one line, ≤ 100, ends with `...`) |
| REQ-602 / AC-603 | User-started titles, local copies and the packet text unchanged | `recordRunActivity` delegates with the same arguments; the packet text and its builder are untouched | The window callers' tests (`agent-run-command-coordinator`, `agent-team-stream-handler`, `agent-stream-handler`) pass unchanged |
| REQ-603 / AC-604 | No migration | No migration or read-time fallback added | By construction |
| REQ-604 | Docs name the remote work packet as a title source | The four docs above | Implemented |
| BEH-601 in the window (SR-004) | The window shows the stored title whenever it has one; the live first user message fills only an empty one | `buildRunTreeProjection` (stored title, cleaned) → `mergeRunTreeWithLiveContexts` (live summary only for an empty stored title) → sidebar; `patchStandalone` (no overwrite of a history row's stored title); `useStandaloneRunTitle` (stored first) → header | Implemented; IMP-04 unit cases fail on the old source (4 red) and pass now |
| REQ-602 / AC-603 in the window | User-started rows read as today | `resolveStoredTitleSummary` + `skillRequestInstruction.parseSingleLine`: a compacted skill-tagged stored title reads as the user text, like the live summary | Implemented; a stopped skill-tagged run now also reads without the prefix (stated consistency gain) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Source (paths under `autobyteus-server-ts/src`):
  - `remote-collaboration/inbound/remote-message-receiver.ts`
  - `compositions/remote-collaboration-composition.ts`
  - `agent-execution/services/agent-run-service.ts`
  - `agent-team-execution/services/team-run-service.ts`
- Tests:
  - `tests/unit/remote-collaboration/remote-message-receiver.test.ts`
  - `standalone-remote-delegation.test.ts`, `team-remote-delegation.test.ts`
  - `tests/unit/agent-execution/agent-run-create-service.test.ts`
  - `tests/unit/agent-team-execution/team-run-service.test.ts`
  - `tests/unit/run-history/services/agent-run-history-catalog-service.test.ts`
- Window source (IR-002, paths under `autobyteus-web`):
  - `utils/runTreeLiveStatusMerge.ts`
  - `composables/chat/useStandaloneRunTitle.ts`
  - `stores/runHistoryNavigationPatches.ts`
  - `utils/runTreeProjection.ts`
  - `utils/runTreeSummary.ts`
  - `utils/skills/skillRequestInstruction.ts`
- Window tests:
  - `utils/__tests__/runTreeLiveStatusMerge.spec.ts` (the old "live first message overrides the stored summary" case replaced by "stored wins" and "empty stored is filled")
  - `utils/__tests__/runTreeSummary.skillRequest.spec.ts`, `utils/skills/__tests__/skillRequestInstruction.spec.ts`
  - `utils/__tests__/runTreeProjection.spec.ts`
  - `composables/chat/__tests__/useStandaloneRunTitle.spec.ts` (new)
  - `stores/__tests__/runHistoryNavigationStoredTitle.spec.ts` (new)
- Docs: `autobyteus-server-ts/docs/modules/run_history.md`, `remote_collaboration.md`; `autobyteus-web/docs/agent_orgs.md`, `agent_execution_architecture.md`.

## Important Assumptions

1. **Team `recordRunActivity` now passes `summary ?? ""`** instead of possibly `undefined`. The catalog treats both alike: an empty compacted summary records nothing (`team-run-history-catalog-service.ts:113`).
2. **The warning** uses `console.warn`, as the window path's local logger does. `remote-collaboration` has no logger of its own.
3. **Corrected (SR-004): the work packet is a `user` message in the window.** The round-1 assumption was wrong. The packet is projected as a `kind: "message", role: "user"` entry, which `runProjectionConversation.ts` maps to `type: 'user'` on the observed runtimes, so the window's first-user-message summary for a peer-started run *is* the packet wrapper. IR-002 therefore makes the stored title win in every window path that showed or wrote the live summary (sidebar merge, standalone navigation patch, header).
4. **Where stored titles are cleaned:** the Agent history row projection and the header, the two places that read the raw stored Agent title. Team rows keep showing the stored Team title unchanged, as the design says.

## Known Risks

- **Corrected (SR-004): the round-1 risk was understated.** It was not limited to a later owner message: because the packet itself is the run's first `user` message, the sidebar showed the packet wrapper for *any* active peer-started Agent run whose context was loaded, even with no owner message. IR-002 fixes this (stored title wins).
- **Residual, Team navigation patch (not changed; for the Solution Designer).** `patchTeamMember` in `stores/runHistoryNavigationPatches.ts` writes the focused member's live first user message into the Team node's summary on a local submission. For a peer-started Team, when the owner messages the coordinator, that is the packet wrapper, so the Team row shows it until the next navigation topology refresh (which rebuilds from the stored title). A `TeamTreeNode` carries no history/draft marker, so the rule can't be applied there without a wider change than this round; I left it as is. This is pre-existing for user-started Teams too (messaging a second member retitles the row transiently). The Solution Designer may take it in scope or record a follow-up.
- **Header after the fix shows the compacted stored title** (one line, at most 100 characters, `...` when truncated) instead of the full first message, by design (stored first). The 42-character `title` is unaffected in practice.
- **Two-server E2E assertions** (RC-05, RC-21, and a later owner message) are API/E2E's to author and run; the design lists them.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: a bug fix on existing owners.
- Reviewed root-cause classification: the title trigger was missing on the remote path (F-02).
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: none.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (none found)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (one function type)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (small deltas)
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (DEC-602: no migration)
- Design-spec decision reference: `design-spec.md` § Legacy Removal Policy / Persisted Data
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree was already installed and prepared (the handoff says so). The untracked `dist/` folders are build outputs and not part of this change.
- Test-owned data only; no running app or `~/.autobyteus` data touched.

## Self-Review (direct route)

- Only the design's owners changed. The receiver depends only on the `RemoteRunTitles` function type and never imports run-history or the catalogs.
- The trigger fires only on an accepted work packet; refused packets, refused links and messages record nothing (unit cases).
- The answer path doesn't wait on the catalog, and a failing write can't turn an accepted packet into a refusal (unit case).
- The recorded text is `request.content`, the raw description, never the task notification built later.
- Org roots: nothing recorded (a peer never starts an Org).
- No migration and no read-time fallback.
- The docs match the code.
- IR-002: only display precedence and cleaning changed; status/activity overlays untouched. Drafts and local rows keep their live summary. The single-line parser shares the matcher with `parse` (one owner of the wording); a compaction round-trip test pins both forms together. Changed files stay small (largest touched source, `runTreeProjection.ts`, 422 lines).

## Checks Run

Evidence: `tickets/in-progress/remote-run-title/evidence/implementation/`. Environment: macOS Darwin 25.5.0, Node v22.23.1.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm exec tsc -p tsconfig.build.json --noEmit` (`autobyteus-server-ts`) | `05be574608` | macOS | server sources | all | Pass | `IMP-01-server-typecheck.log` | `TYPECHECK EXIT 0` |
| IMP-02 | `pnpm exec vitest run tests/unit/remote-collaboration tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-execution/agent-run-command-coordinator.test.ts tests/unit/services/agent-streaming tests/unit/run-history/services` | `05be574608` | macOS | the receiver trigger, the title methods, the catalogs, the in-process delegations, the window callers | REQ-601, AC-601 (stored rule), AC-602, AC-603 | Pass | `IMP-02-focused.log` | `Test Files  61 passed (61)`, `Tests  439 passed (439)` |
| IMP-03 | `pnpm exec vitest run tests/unit` (`autobyteus-server-ts`) | `05be574608` | macOS | the whole server unit suite | AC-603 | Pass | `IMP-03-server-unit-full.log` | `Test Files  788 passed \| 4 skipped (792)`, `Tests  6473 passed \| 7 skipped (6480)` |
| IMP-04 | `NUXT_TEST=true npx vitest run` on the 9 title specs (`runTreeLiveStatusMerge`, `runTreeSummary.skillRequest`, `skillRequestInstruction`, `runTreeProjection`, `useStandaloneRunTitle`, `runHistoryNavigationStoredTitle`, `runHistoryNavigationProjection`, `localUserSubmission`, `AgentWorkspaceSurface`) (`autobyteus-web`) | `2aefde62d5` | macOS | the merge, the header, the cleaning, the projection, the navigation patch | BEH-601 window rule, AC-603 window | Pass | `IMP-04-web-focused.log` | `Test Files  9 passed (9)`, `Tests  90 passed (90)`. Against the old source the 4 rule cases fail (stored-wins merge, header, projection cleaning, navigation patch) |
| IMP-05 | `pnpm -s guard:web-boundary && pnpm -s guard:localization-boundary && pnpm -s audit:localization-literals` (`autobyteus-web`) | `2aefde62d5` | macOS | web boundaries, localization | — | Pass | `IMP-05-web-guards.log` | exit 0 |
| IMP-06 | `NUXT_TEST=true npx vitest run` (`autobyteus-web`, full) | `2aefde62d5` | macOS | the whole web unit suite | AC-603 window | Pass | `IMP-06-web-unit-full.log` | `Test Files  653 passed \| 2 skipped (655)`, `Tests  4661 passed \| 5 skipped (4666)` |

- Not run, and why:
  - the two-server E2E assertions (RC-05, RC-21, later owner message) are API/E2E's;
  - the durable browser probe of beta's sidebar that SR-004 adds (peer-started Agent and Team rows show the description, active and after a reload; a user-started run with and without a skill tag reads as today) is E2E, so it is API/E2E's to author and run;
  - no web typecheck script exists in `autobyteus-web/package.json`; the specs compile the changed files;
  - AC-605 is the user's check on his Docker node.

## Frontend Rendered-Result Check (When Applicable)

IR-002 changes which text the sidebar row and the conversation header show, not layout or styling. I did not render it: the case that matters (an active peer-started run) needs the two-node cluster, which the durable browser probe SR-004 adds will exercise; that probe is API/E2E's. The precedence and cleaning are covered by the IMP-04 unit cases. Remaining uncertainty: none known in layout; the text paths are the three named in item 6 (plus the Team residual in Known Risks).

## Downstream Coverage Hints / Suggested Scenarios

- Two-server E2E:
  - RC-05 (remote Agent) and RC-21 (remote Team): beta's `listWorkspaceRunHistory` title equals the delegated description before any owner message;
  - after an owner message, the title is unchanged;
  - a description over 100 characters, or with line breaks, gives a one-line title of at most 100 characters.
- Optionally: a refused work packet (unlinked sender) creates no title.
- SR-004 browser probe on beta's sidebar (and conversation header):
  - peer-started Agent and Team rows show the description while active (context loaded) and after a reload;
  - after the owner messages a peer-started Agent run, its row still shows the description;
  - a user-started run without a skill tag reads as its first message; with a skill tag it reads without the "Use the X skill for this request." prefix, active and stopped.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-601 at the two-server level; AC-605 with the user.
- The SR-004 durable browser probe above.
