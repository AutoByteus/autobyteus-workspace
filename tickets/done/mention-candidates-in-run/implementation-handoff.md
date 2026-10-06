# Implementation Handoff — mention-candidates-in-run

## Upstream Artifact Package

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-candidates-in-run/tickets/in-progress/mention-candidates-in-run/`.

- Upstream review applicability and handoff-rule result: direct implementation route (Medium / Low). Independent architecture review was not selected.
- Requirements doc: `requirements-doc.md` (SR-001, Approved 2026-10-06)
- Investigation notes: `investigation-notes.md` (E-01..E-06)
- Solution revision record: `solution-revision-record.md` (SR-001)
- Design spec: `design-spec.md` (SR-001)
- Architecture handoff: `handoff-architecture-design-complete.md`
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: `N/A` (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

What the code does now:

1. **Policy split, one owner.**
   - `CollaboratorCandidatePolicy.requireEligible` is the `@` check: application-root rule, shared and not built-in, not the run's own definition. It accepts definitions already in the run.
   - `requireAdmissible` = `requireEligible` plus the existing "already in this run unless it has a collaborator entry" rejection. It is used only by bring-in (`ensure`/`plan`) and catalog copies (`catalogTaskSource`), through the admission's private `admissible`.
   - `listCandidates` no longer filters in-run definitions; it leaves out only the run's own definition (`port.rootDefinition()`).
2. **`resolveMentions` reports `inRun`.** It uses `requireEligible`. A definition counts as in the run when it has a collaborator entry or an in-run placement (`inRunPlacementsByDefinition`, by `catalogDefinitionKey`). Its address is the entry's, else the preferred in-run placement's (through `CatalogAddressMap`), else the catalog address. `plan` marks a reused entry `inRun: true` and a new one `false`.
3. **Note contract.**
   - `MentionedCollaborator.inRun: boolean` is required.
   - An in-run entry line gets the suffix `, already in this run`.
   - When any entry is in the run, the guidance is `NOTE_GUIDANCE + " " + IN_RUN_GUIDANCE`. Notes with no in-run mention are byte-identical to the previous release.
   - The parser accepts the new guidance, the current one and the saved ones. `ENTRY_PATTERN` takes the optional suffix, and saved notes parse as `inRun: false`. The tracked contracts `dist/` was rebuilt.
4. **Web New chat mirror.** `draftInRunDefinitionIds` became `draftOwnDefinitionIds` (the target's own definition only). A Team target's shared members are offered; team-local definitions were never eligible.
5. **Copy (en / zh-CN)**, exactly the design strings:
   - `chat.mentions.headerPrefix`, `listAria`, `footerRelay`
   - `chat.new.subtitleDefaultAfterAt`
   - `noticeFailed` "Couldn’t mention {{name}}" / "无法提及 {{name}}"
   - `noticeFailedDetail` "{{reason}}"
   - The placeholder is unchanged.
6. **Docs:** server `docs/modules/agent_communication.md` (`@` resolution, Admission step 1, In the run, Candidates) and web `docs/chat.md` (New Chat Draft, `@` In A Live Run, Failure notice). Three stale web comments were corrected: `useComposerMentionMenu.ts`, `messageTypes.ts`, `useMentionCandidates.ts`.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - 7 production files changed: 2 server, 1 contracts source (+ rebuilt dist), 1 web util, 2 localization files, plus comment-only edits in 3 web files.
  - Everything stays within existing owners. There is no new owner, persistence, API shape, concurrency or security change.
  - The bring-in invariant (BEH-006) is kept by `requireAdmissible` and covered by tests.
- Selected route: `Direct API/E2E` (confirmed via `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Yes` (see Self-Review below)
- New design impact or escalation trigger: `None`.
  - `requireAdmissible`'s only caller is still `CollaboratorAdmission.admissible`. It serves `ensure`, `plan` and `catalogTaskSource`; the last two already used it, and `catalogTaskSource` only sees definitions not in the run.
  - No web consumer relies on candidates excluding in-run definitions. `chatDraftStore.retarget` filters chosen mentions through the same draft mirror, so it now keeps a mention of a Team target's member and drops one that becomes the target itself.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 | Candidates include in-run definitions; only built-ins, Orgs, non-shared, the run's own definition (and all, for application runs) excluded | `collaborator-candidate-policy.ts` `listCandidates` | Done (unit: admission policy, standalone, Org) |
| BEH-002 / REQ-002 | In-run mention accepted, resolved to its in-run address | `requireEligible` + `CollaboratorAdmission.resolveMentions` | Done. Collaborator → entry address; configured / collaborator-Team member → preferred placement (e.g. `/product_team/lead`, `/director`) |
| BEH-003 / REQ-003 | In-run entries marked; extended guidance; other notes unchanged | `collaborator-mention-note.ts` | Done (contracts tests incl. byte-identity, Org stream test with a configured member) |
| REQ-004 | Every earlier note form still parses into chips | `parseCollaboratorMentionNote` (`ENTRY_PATTERN`, guidance list) | Done (contracts: all saved forms; web: the new in-run form renders as chips) |
| BEH-004 / REQ-005 | New chat draft excludes only the target's own definition | `draftMentionEligibility.ts` | Done (web unit + `chatDraftStore` retarget) |
| BEH-005 / REQ-006 | Copy describes delegating / addressing (en, zh-CN); placeholder unchanged | `localization/messages/{en,zh-CN}/chat.ts` | Done |
| BEH-006 / AC-006 | Bring-in never admits a second instance of an in-run definition | `requireAdmissible` (eligible + in-run rule) | Preserved (unit: configured member and collaborator-Team member rejected "already in this run"; collaborator entry reused) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. There is no per-focused-agent exclusion and no menu badges, prompt and tool descriptions are untouched, and bring-in and `list_available_agents` are unchanged.

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-collaboration/collaborators/{collaborator-candidate-policy,collaborator-admission}.ts`
- `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` (and its tracked `dist/`)
- `autobyteus-web/utils/collaborators/draftMentionEligibility.ts`
- `autobyteus-web/localization/messages/{en,zh-CN}/chat.ts`
- Docs: `autobyteus-server-ts/docs/modules/agent_communication.md`, `autobyteus-web/docs/chat.md`
- Tests:
  - contracts `collaborator-mention-note.test.mjs`
  - server `collaborator-admission.test.ts`, `standalone-agent-run-root.test.ts`, `team-root-collaborators.test.ts`, `team-root-agent-initiated-collaborators.test.ts`, `agent-org-collaborators.test.ts`
  - web `draftMentionEligibility.spec.ts`, `collaboratorMentionText.spec.ts`, `chatDraftStore.spec.ts`

## Important Assumptions

- Mentioning the run's own definition fails with `COLLABORATOR_ADD_FAILED`, message "<Name> is this run's own definition." Previously it was "is already in this run". This is the recorded clarification that the own definition stays excluded.
- In an Org root, `rootDefinition()` is null, so every configured member (including the focused one) is a candidate. This is the design's accepted residual: the per-run list may show the focused member its own definition, which is harmless.

## Known Risks

- Agents may message an in-run instance where the user wanted a fresh copy, or the reverse. This follows the user's chosen neutral wording; the user's own text decides.
- The visible copy changed. Any web E2E probe asserting "Bring into this run" or "Couldn't add" would need its expectation updated. A grep of `autobyteus-web/tests` found none.

## Self-Review (direct route)

- Spine and ownership: `@` still flows stream handler → root → `CollaboratorAdmission` → policy. The policy remains the single eligibility owner, now with two explicit checks. The web reaches candidates through GraphQL only. Note wording stays in the contracts package.
- No compatibility wrappers. Tolerant parsing of saved notes is display of stored history, approved by REQ-004.
- Removed: the in-run candidate filter, the in-run rejection on the `@` path, `draftInRunDefinitionIds` and the Team-placement exclusion, and the tests asserting those behaviors (all updated).
- Shared structure tight: `inRun` has one meaning (in the run at resolution time). No optional fields were added.
- File sizes: `collaborator-candidate-policy.ts` is about 200 effective lines, `collaborator-admission.ts` about 215. Every changed file's delta is under 70 lines.
- Edge reviewed: the address regex is lazy (`\/\S+?`) with an optional suffix, so `/x, already in this run` parses to `/x`. Names keep the greedy `(.+)` before ` (Agent)`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes`
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration`. Saved notes are read by the tolerant parser.
- Implementation follows it: `Yes`. Saved forms parse with `inRun: false`; there is no migration code.
- Deviation: `None`

## Environment Or Dependency Notes

- Fresh worktree setup: `pnpm install --frozen-lockfile`; shared builds (`autobyteus-ts`, application SDK contracts / backend SDK) and `prisma generate`; `pnpm -C autobyteus-web exec nuxi prepare`. The untracked SDK `dist/` folders are not committed.
- The server `typecheck` script is still broken at baseline (TS6059), so I used `tsc -p tsconfig.build.json --noEmit`.

## Local Implementation Checks Run

These are local implementation checks only; they are not API/E2E sign-off.

- Contracts: `pnpm -C autobyteus-agent-presentation-contracts test` → 12/12 pass
- Server source typecheck: `tsc -p tsconfig.build.json --noEmit` → exit 0
- Server focused suites (`tests/unit/agent-collaboration`, `agent-team-execution`, `agent-org-execution`, `standalone-agent-run-root`, `services/agent-streaming`, `agent-tools/agent-discovery`, `tests/integration/standalone-agent-run-root`, `task-delegation-tool-lifecycle`): all pass. The only failures in that run were 3 `tests/unit/api/graphql` files (5 tests: `memory-view-member-resolver`, `studio-application-api-services`, `workspace-converter`), and they fail identically on the unmodified source.
- Web (`pnpm -C autobyteus-web test:nuxt utils/collaborators components/conversation composables/agentInput composables/runSettings stores/__tests__ localization services/runSubmission services/agentStreaming --run`): all pass except `stores/__tests__/workspaceSelectionComposition.spec.ts` (1 test), which fails identically on the unmodified source.
- Broad server run (`tests/unit tests/integration tests/architecture`): 747 files; 666 passed, 61 failed, 20 skipped (5,073 tests passed, 179 failed). Of the 61 failing files, only `tests/integration/collaboration-definition-admission/org-owned-team-local-agent.test.ts` touches collaboration admission, and it fails identically on the unmodified source (1/18; the test "supplies fresh mounted enclosing instructions …"). The other 60 are outside the changed code (application backend, file explorer, websocket/integration managers, prisma log policy, media storage, workspace manager, status projectors, etc.), the same families that fail on the unmodified base of the previous package. They were not re-baselined one by one here.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: the `@` menu header, list aria label and footer in live-run composers and New chat; the New chat "after @" hint; the mention failure notice.
- Approved references: requirements-doc REQ-006 and design-spec § 5 (exact strings).
- Existing design system and adjacent surfaces reviewed: the strings render through the unchanged `ChatTargetMenu` / `CollaboratorAddFailureNotice`; only localization values changed.
- Rendered surface used / states inspected: `Not rendered` here. The change is copy-only (localization values) plus candidate data. I verified it through web unit specs (localization and component specs in the run above). No layout, component or style change was made.
- Visual or interaction issues found and corrected: none (not rendered).
- Remaining unverified: the actual rendered menu in en and zh-CN (string length and wrapping of "Delegate to an agent or team" in the menu header). This is left for API/E2E or a browser probe.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/003 live: in a Team run where an agent already brought in Agent Package Creator, `@Agent` lists it. Send "@Agent Package Creator …". Expect the stored note entry `- Agent Package Creator (Agent) at /agent_package_creator, already in this run` plus the extended guidance, no new collaborator entry, and the chip shown.
- AC-002: a Team run's shared configured member is listed and resolves to its configured address.
- AC-004: `@` of a definition not in the run gives a note identical to the previous release.
- AC-007: New chat for a Team target lists its shared members. Sending a first message mentioning one is accepted by the server.
- AC-008: menu, footer, aria label, after-@ hint and failure notice copy in en and zh-CN; placeholder unchanged.
- AC-006: an agent's `send_message_to` to an in-run definition's catalog address never creates a duplicate.
- Own definition: `@` in a standalone run never lists the host's own Agent; mentioning it via the API fails with "… is this run's own definition."

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Live validation of AC-001..AC-008 in standalone, Team and Org runs, including the rendered en and zh-CN menu copy.
