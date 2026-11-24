# Delivery / Release / Deployment Report — autobyteus-628 (conversation-order-628)

**Status of this report: delivery round 1 is `Blocked`.** Integration and verification ran; finalization has not started (nothing moved to `done`, nothing pushed by delivery, no merge). The blocking findings and their recipient are under "Escalation / Reroute". Sections that depend on finalization are marked `Not started`.

## Release / Publication / Deployment Scope

Finalize the verified ticket on `origin/personal`, without a release (the user did not ask for one and `RELEASE.md` makes none the default).

## Project Release Guide

- Release guide path and revision: `RELEASE.md` at the repository root, read from the merged tree (`origin/personal` `e5d878832b`; the ticket never changed it). Not created by this delivery.
- Deviations from the guide and why: `None` so far. Delivery reran more than the guide's minimum (one relevant check and both typechecks) because the ticket changes every stream's wire contract: the whole server integration suite, the whole web suite, the whole server unit suite and the three contract packages' own suites; that is how the blocking findings were found.
- Proposed guide fixes, and whether the user agreed: `None`.

## Handoff Summary

- Handoff summary artifact: not written (written after the blockers are resolved)
- Handoff summary status: `Not started`
- Delivery revision record: `delivery-revision-record.md`
- Current delivery revision ID: `DR-001` (result `Blocked`)
- Notes: `docs-sync-report.md` is written and valid.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `1f761bc8db`
- Latest tracked remote base reference checked: `origin/personal` `e5d878832b` (`git fetch origin personal`, 2026-11-24, at the start of delivery)
- Base advanced since bootstrap or previous refresh: `Yes` (35 commits: autobyteus-53 (a stopped native run's model hand-over), autobyteus-588 (Antigravity capsule tool names), autobyteus-377 (Antigravity tool results); 78 non-ticket files: `autobyteus-server-ts` tests 39 and src 25, docs, two web locale files)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`cd39725cee`): the architecture reviewer's `design-review-report.md` and `architecture-review-revision-record.md` were untracked in the worktree (the Code Reviewer's housekeeping note); committed before the merge
- Integration method: `Merge` (`git merge origin/personal`), merge commit `54cee15c8e`; no conflict; no file in common with the ticket's 167 non-ticket files
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (commands and results below; evidence in `evidence/delivery/`)

| Check | Command | Result |
| --- | --- | --- |
| `DEL-01` server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)`, `PASS` |
| `DEL-01` web typecheck | `pnpm -C autobyteus-web typecheck` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS` |
| `DEL-02` contract `dist/` | `pnpm check:contract-dist` | `PASS: the tracked dist/ of 3 contract packages matches their source.` |
| `DEL-BLOCK` the three contract packages' own suites (TESTING.md "Other packages") | `pnpm -C autobyteus-agent-presentation-contracts test`; `… autobyteus-collaboration-stream-contracts test`; `… autobyteus-team-stream-contracts test` | **FAIL**: 2 of 23, 4 of 39 and 2 of 14 tests fail; every failure names the now-required `occurred_at` / `accepted_at` (Finding 1) |
| `DEL-03` the ticket's server unit files (39 files) and web specs (34 files) | `vitest run` the ticket's test files | server `Test Files 39 passed`, `Tests 459 passed`; web `34 passed`, `433 passed` |
| `DEL-04` whole server integration | `pnpm -C autobyteus-server-ts test:integration:prepare`; `test:integration` | `Test Files 92 passed \| 21 skipped (113)`, `Tests 523 passed \| 71 skipped (594)` (the same counts as API/E2E's SI-1) |
| `DEL-04` whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt` | `Test Files 803 passed (803)`, `Tests 6124 passed \| 2 skipped` |
| whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | `Test Files 1 failed \| 1080 passed`, `Tests 1 failed \| 9027 passed`: `runtime-memory-event-accumulator.test.ts` "preserves post-card reasoning when authoritative call arguments arrive only at result"; the file passes alone (25 tests); see Finding 2 |
| `DEL-05` rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `build exit 0` each |
| `DEL-05` phone cases on the merged build | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-66,MSP-75,MSP-76,MSP-77,MSP-99,MSP-105 --output-dir <dir>` | `"result": "Pass"`, six cases Pass, no duplicate ID, no unknown browser error, cleanup `serversLeft: 0`; MSP-105's three rounds (phone clock 2 s behind sending, 2 s ahead, 2 s behind watching) `live.ok` and `reopened.ok` true |
| Build-input rule | `git diff --name-only 1f761bc8db HEAD` against TESTING.md's Fresh-start build list | matches (the contract packages' `src/` and `dist/`); API/E2E ran the fresh-clone build (FS-1) and the build-only Desktop Release run (IMP-15) on the ticket's final code; none of the base's 35 commits touches a build input, so neither is rerun |

- Post-integration verification result: `Blocked` (Findings 1 and 2)
- No-rerun rationale: not applicable (new base commits were integrated)
- Delivery edits started only after integrated state was current: `Yes`
- Handoff state current with latest tracked remote base: `Yes` at `e5d878832b` at the time of writing; to be re-checked when delivery resumes
- Blocker: Findings 1 and 2 below

## Verification

- Evidence judged: `Insufficient` for finalization until the findings are resolved; the execution report's own proof is sound for what it ran.
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-001, 95.1 %, every critical criterion `Proven`), opened below, plus the integrated-state reruns above.
- What was mocked or not tested: the phone's clock is an init script offsetting `Date` by ±2 s; the whole probe's Antigravity is a scripted CLI; MSP-106 and MSP-107 use a real Claude CLI and a real model (test vault), and delivery did not rerun them (they are gated live cases; the merge adds only unrelated Antigravity and model hand-over code); Codex was not run live (it shares the external writer Claude uses); N-5 is covered by unit tests on the real writers; the desktop window's rendering is the same builder as the phone's; no physical phone.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (the phone's clock behind or ahead: You, notice, reply, live) | `MSP-106-107-live/mobile-shell-probe.json` MSP-106 (Claude Team member), MSP-107 (native); MSP-105; delivery's rerun of MSP-105 | each round `live.ok` true with the node's `kinds` `["message:user","system_task_notification","message:assistant"]`, phone clock `-2001` ms and `+2000` ms; MSP-105's three rounds Pass again on the merged tree | Proven |
| AC-002 (another client sends while the phone, clock behind, watches) | MSP-106 `behind-watches`; MSP-105 `behind-watches` | `live.ok` true | Proven |
| AC-003 (reload keeps the order) | MSP-106, MSP-107, MSP-105 `reopened.ok`; unit proofs IMP-02, IMP-09 | `reopened.ok` true in every round; the node's stored times (`nodeUser`, `nodeNotice`, `nodeReply`) in the order You < notice < reply | Proven for the founder's shape (see Finding 2 for an effect on stored order elsewhere) |
| AC-004 (compaction rows keep the messages' order) | unit specs IMP-01, IMP-07 | passes in the whole web suite on the merged tree | Proven (web specs, as its verification intent states) |
| AC-005 (preserved behavior) | whole server integration, whole web suite, MSP-99 and the notice cases, whole server unit suite | integration and web green; MSP-99, MSP-75…77 Pass; **one accumulator test fails in the whole server unit run, and three contract suites fail** | **Not Proven** until Findings 1 and 2 are resolved |
| AC-006 (every row's time is the node's) | MSP-106/107 `liveTimes`, `reopenedTimes` | `userIsNodeTime` and `replyIsNodeTime` true live and reopened in all rounds (the phone's state times equal the node's within 3 ms with the phone clock ±2 s); unit proofs IMP-06, IMP-07, IMP-16 | Proven |

- More evidence requested (from whom, what, result): the blocking findings go to the Solution Designer (below); API/E2E will need to rerun the affected suites after the fix.
- User check needed: `No`
- User check reference, when needed: `N/A`
- Re-verification after later re-integration: `Not started`

## Release Decision

- Decision: `No release`
- Decided by: the release guide's default. A release is available once the ticket is delivered.

## Docs Sync Result

- Docs sync artifact: `docs-sync-report.md`
- Docs sync result: `Updated`
- Docs updated: `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` (Row Times), `docs/modules/{agent_streaming,agent_execution,run_history}.md`, `autobyteus-web/docs/agent_execution_architecture.md`; `docs/design-cases.md` (by the ticket)
- No-impact rationale (if applicable): n/a

## Ticket State Transition

- Ticket moved to `tickets/done/conversation-order-628`: `No` (blocked)
- Archived ticket path: `Not started`

## Version / Tag / Release Commit

None (no release).

## Repository Finalization

- Bootstrap context source: the Solution Designer's bootstrap (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628`, branch `codex/conversation-order-628`, base `origin/personal`) and `RELEASE.md` "Finalization Target".
- Ticket branch commit result: the delivery documents and evidence are committed locally as a checkpoint (see the delivery revision record); nothing was archived.
- Ticket branch push result: `Not started` (the remote ticket branch is still at `52d8c1792c`, which API/E2E pushed for the build-only run)
- Target advanced after verification / acceptance: `Not applicable`
- Merge into target result / push target branch result: `Not started`
- User's checkout of the target branch: `Not updated` (nothing finalized)
- Repository finalization status: `Blocked`
- Blocker: Findings 1 and 2

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not started` (written when delivery resumes; the ticket's release note must say that the app and every node must be on the same release, DESIGN.md rule 9, because a node of an earlier release sends no `occurred_at`)

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/conversation-order-628` (kept: the fix happens in it)
- Worktree, prune, local branch, remote branch cleanup: `Not required yet`

## Escalation / Reroute (Use Only If Final Handoff Cannot Complete)

- Classification: **Finding 1: `Local Fix`. Finding 2: `Design Impact` (or `Unclear` until the Solution Designer decides).**
- Recommended recipient: `/solution_designer` for both: it decides Finding 2 and can route Finding 1 to implementation with it, so one round fixes both. (Finding 1 alone would be implementation's.)
- Why final handoff could not complete:

**Finding 1 (Local Fix): the three contract packages' own test suites fail because of this ticket's required fields.**
- `occurred_at` is now required on the timed presentation messages and `accepted_at` on each pending-input entry, but the packages' fixtures were not updated, and nobody ran `pnpm -C <package> test` (TESTING.md, "Other packages: SDKs, contracts, message gateway": `pnpm -C <package> test`). The execution report's reused U-1 lists the web, server and `autobyteus-ts` units, both typechecks, the guards and `check:contract-dist`, not these suites.
- Failing, all of them naming the new fields (`evidence/delivery/DEL-BLOCK-contract-package-tests-*.log`):
  - `autobyteus-agent-presentation-contracts/tests/agent-presentation-contracts.test.mjs`: "accepts a strict root-neutral message and rejects root identity"; "compaction carries direct diagnostics separately from provider-native identity";
  - `autobyteus-collaboration-stream-contracts`: "a agent_org batch envelope covers a contiguous range"; "a agent_org single event keeps its one sequence and rejects a range"; "current versionless Org snapshot carries exact live held/queued state"; "rejects duplicate/unowned input projections and missing live input field";
  - `autobyteus-team-stream-contracts`: "a content batch covers a contiguous sequence range with ordered per-segment items"; "an ordinary Team message keeps its single sequence and does not accept a range".
- Ticket scope: `ticket-scope.md` ("Existing tests assert behavior this change removed or replaced: this ticket, rewritten to the approved behavior"). The fix is to give those fixtures the required fields, and to add the three suites to what API/E2E and implementation run for a contract change.

**Finding 2 (Design Impact / Unclear): the recorder now stores a trace at the event's own time, which changes the stored order of reasoning and tool traces when event times differ.**
- Before this ticket the recorder's `extractTimestamp(event.payload)` returned `null` for an event without a payload time, and `ExternalRuntimeMemoryWriter.toTimestampSeconds` then used `Date.now()` at the moment of writing: a trace's `ts` was its write time, so the stored order was the write order. With D-3 the recorder uses `extractEventTime(event)`, the event's own `occurredAt`: a reasoning trace takes the time of its segment's first event (`segment.ts = segment.ts ?? extractEventTime(event)`), a tool call written when its arguments arrive at the result takes the result's time, and the reload sorts by `ts`.
- Evidence (`evidence/delivery/DEL-BLOCK-accumulator-distinct-event-times/`):
  - `tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` failed once in the whole server unit run ("preserves post-card reasoning when authoritative call arguments arrive only at result": the reasoning trace "A\n\nB" is received before the tool call and result instead of after them), and passes alone (25 tests): the helper the ticket changed stamps `occurredAt: Date.now()`, so the suite passes when its events share one millisecond and fails when the clock ticks between them;
  - the same file with the helper stamping strictly increasing times (7 ms apart, as real events would be) fails **7 of 25** tests deterministically (`distinct-times-run.log`; the reproduction is `zz-distinct-times.test.ts.txt`): "persists run-owned reasoning closure exactly once before the next tool", "keeps reasoning open across a matching result and flushes one trace at the next tool", "preserves post-card reasoning when authoritative call arguments arrive only at result", "keeps the first boundary for an unseen insufficient terminal when readiness arrives later", "keeps reasoning open across matching TOOL_EXECUTION_FAILED updates", "keeps reasoning open across matching TOOL_DENIED updates", "retries rotation from an existing provider boundary marker when no complete segment exists".
- Why it matters: those tests state the stored order the product relies on for a reload (the live conversation shows a tool card and then the reasoning that follows it; the stored order was the write order). With real event times, a reload of an external runtime's run can read post-card reasoning before its tool card while the live view showed the card first: the live-versus-reload mismatch this ticket exists to remove. The design (`Change Scope`, "Deliberately left alone") promised "the stored traces and their writer (old and new runs read the same way)"; D-3 changes the `ts` the recorder writes for traces built from several events, and the design does not decide which event's time such a trace takes. The live cases (MSP-106, MSP-107) do not interleave reasoning with a tool card whose arguments arrive at its result, so they could not show it.
- Delivery did not choose the rule, since it is a design decision (for example: a trace written at flush keeps its flush time; a call trace takes its start event's time; or the replay orders by sequence within a turn). The existing tests, with distinct times, are the executable statement of the order the owner must keep or consciously change.

## Release Notes Summary

- Release notes artifact: `Not started`
- Release notes status: `Not started`

## Deployment Steps

None.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected` (no stored field or migration; SR-006 and D-3 change the time a writer chooses, which is what Finding 2 is about)
- Delivery action required: `None` from delivery

## Verification Checks

See "Initial Delivery Integration Refresh" and "Verification" above.

## Rollback Criteria

Not applicable until finalization.

## Final Status

- Verification complete (from the evidence, or the user's check where needed): `No`
- Repository finalization complete: `No`
- Applicable release/deployment/rollout complete or not required: `Yes` (not required)
- Applicable safe cleanup complete or not required: `No` (not started)
- Unresolved blocker: Findings 1 and 2
- Successful terminal package eligible for return: `No`
- Terminal package sent to the Solution Designer: `No`
- Terminal message/reference: the `Blocked` message to the Solution Designer (below)
