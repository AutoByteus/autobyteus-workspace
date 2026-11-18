# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results go in `api-e2e-execution-coverage-report.md`.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/tickets/in-progress/large-runs-load-less/` unless absolute.

## Investigation Meta

- Requirements doc: `requirements-doc.md` (SR-001 approved; SR-003 current; DEC-001…DEC-004)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-003, DS-001…DS-007; `Large` / `High`)
- Supplemental task artifacts: `evidence/M-*`, `evidence/probes/*.mjs`
- Design review: `design-review-report.md` (ARCH-REV-003 Pass), `architecture-review-revision-record.md`
- Implementation handoff: `implementation-handoff.md` (IR-003), `implementation-revision-record.md`
- Code review: `code-review-report.md` (CRR-002 Pass), `code-review-revision-record.md`
- Delivery revision record: N/A
- API/E2E revision record: `api-e2e-revision-record.md`; current revision `API-REV-003` (round 3: CRR-007 after IR-006, SR-007/SR-008: lists kept unless a message was published past them)
- Round: 2. Trigger: code review CRR-005 Pass after the API-08 rework (IR-004 `935c5c9fa9`/`da91ae689a`, SR-004/SR-005; IR-005 `99cd853f79`, SR-006). Prior investigation: round 1 (this file)
- Code: `f48bdfc0ab` … `438ea7fb65` on base `origin/personal` @ `efd28d5c4a`. Head `f4e7b1d13b` (ticket files only after `438ea7fb65`)

## Current Requirement And Design Basis

- REQ-001 / AC-003 / QR-005: opening a Team or Org run loads the focused member only; another member loads when opened.
- REQ-002 / AC-001, AC-002: views and live snapshots carry no message log. The Team tab loads its participant's messages when shown. Live messages are added in order, and the list equals the stored log (buffer from before the request, merge by ID, reload on every rebuild).
- REQ-003 / AC-004 / QR-002: one view read per hub selection; Settings reuses it.
- REQ-004 / AC-005, AC-006 / QR-003: admission by structure only. A damaged log is reported where it is read (Team tab "unavailable" with the reason, desktop and mobile; resume refused with the reason); the view still opens.
- REQ-005 / AC-007 / QR-004: the long-token copy opens within 1 s, with wrapping, copy and search unchanged (DS-006, DS-007).
- Preserved: complete history, live order, statuses, Task summaries, reference links, Settings content, auto-scroll; remote participants get no query (Team tab empty, as today).
- Legacy / compatibility removal check: the removed contract fields and `getTeamCommunicationMessages` are gone with no wrapper; persisted data `Not Affected`. Both match the summary.

## Supported Scenarios And Real Usage

- SCN-001…SCN-007 as in the requirements.
- Added from investigation:
  - SCN-002b (AC-002 live): a teammate sends the focused participant a message while its Team tab is still loading. Real use produces this on a large log or a slow link. The probe holds the participant response in the browser (network emulation) while the message is sent, then releases it.
  - SCN-002c (AC-002 live): the app loses its connection, a message arrives meanwhile, and the connection comes back (the stream reconnects and the root context is rebuilt).
  - SCN-006b (code review C-11): a long unbroken token in a **tool result** (an agent reading base64 or minified text). The tool-call renderer is outside DS-007's mapping, so measure it.
  - SCN-007b: the damaged log seen on the phone (mobile message screens, CR-001).
- Contrived: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| API / transport / contract | Yes | three view contracts without messages; `collaborationParticipantMessages` | contract tests, server unit/integration, server E2E (IMP-05) | — | reuse |
| Domain / backend | Yes | records owners; structure-only admission; strict validation where read | server unit/integration (damaged log: org unit, team API integration) | damaged log through the real server and UI, resume refusal | browser probe |
| Frontend / browser integration | Yes | participant-message owner, MemberLoader, focused-only staging, Settings reuse, Team tab states | web specs (stubs) | real request counts on Team/Org open (M-151 never measured); live merge with a real stream; reconnect | browser probe on a probe-owned real stack |
| Rendering performance | Yes | DS-006, DS-007 | L-010 probe (IMP-11) | tool-result renderer; wrapping, copy and search by hand | browser probe |
| Mobile (phone access) | Yes | message screens' loading/unavailable states | component specs (IMP-13) | the real screen with a damaged log | browser probe, phone viewport |
| Startup / readiness | Yes | structure-only scan, per-package admission | startup-scan probe (IMP-10), tests | — | reuse |
| Persisted data | No | — | — | — | — |
| Desktop shell | No | — | — | — | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less`, branch `codex/large-runs-load-less` @ `f4e7b1d13b`.
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/large-runs-load-less/TESTING.md`. Renderer and client/server → web specs plus a browser probe on a probe-owned stack; one heavy run at a time across worktrees; clean env; scripted AGY for real tool calls without a provider; never the user's app or data.
- Stacks: `delegated-launch-defaults-probe.mjs` (real Chrome → Nuxt dev → built backend `dist/app.js`, scripted AGY, owned data root; case modules registered by the probe). `delegated-copies-large-hub-probe.mjs` (seed `--seed-to`, measure `--from-seed`, cases S, S-ROWS, `--live` L-001…L-011). Phone pairing pattern from `owner-scoped-file-reads-probe.mjs`.
- No provider credentials are needed.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| server unit/integration/E2E changed by the ticket; contract tests | views without messages; the query; damaged log; admission | AC-001, AC-002, AC-005, AC-006 | Still Valid | IMP-12 (clean clone `b58a3106c3`), IMP-05 | Reuse |
| web specs (participant owner, MemberLoader, team/org hydration, AC-004 count, per-frame check, long-run helper, mobile states) | client behavior with stubs | AC-002…AC-004, AC-006, AC-007 | Still Valid (stubbed transport) | IMP-12, IMP-13, reviewer 62/62 | Reuse; prove the real boundary in the browser |
| `delegated-copies-large-hub-probe.mjs` (S, S-ROWS, L-001…L-011; reads messages through the new query) | hub rows, copy open, live hub journeys, long-token copy | AC-001, AC-004, AC-007 | Still Valid | IMP-10, IMP-11 (S, S-ROWS, L-010 only) | Reuse those; run the live cases on the head as a hub regression |
| `evidence/probes/startup-scan-probe.mjs` | scan time vs log size | AC-005 | Still Valid | IMP-10 (`85` vs `89` ms) | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-008, all (repository layer) | every suite | Reused | IMP-12 (clean clone `b58a3106c3`), IMP-13 (`438ea7fb65`, mobile), the reviewer's 62/62 | Since `b58a3106c3` only the mobile files changed, and IMP-13 covers them |
| API-02 | AC-001, AC-004, AC-005, AC-007; QR-001…QR-004 | seed probes | Reused | IMP-10 (`e66b453d5b`: QR-001 176,226 B; QR-002 0 view + 1 participant read; QR-003 85 vs 89 ms), IMP-11 (`b58a3106c3`: QR-004 199 ms) | Since then only the renderers (DS-007) and the mobile screens changed: no effect on the view, the requests or the scan |
| API-03 | AC-003, QR-005, REQ-001 (Team) | browser, real stack | Durable (new case module) | A six-member Team run whose members all have conversations, stopped. Fresh page → open the run → count `GetTeamMemberRunProjection` / `GetTeamMemberFileChanges`; open another member → one more pair; statuses unchanged; the Team tab → one `CollaborationParticipantMessages` | M-151 was never measured |
| API-04 | AC-003, QR-005 (Org) | same | Durable | An Org (agents and a placed Team) with conversations, stopped; the same counts with the Org operations | Same |
| API-05 | AC-002 live; SCN-002b, SCN-002c | browser, real stream | Durable | Team run: hold the focused participant's message response; a teammate sends it a message (scripted tool call); release → the list equals the stored log, the new message once. Then offline → a message → online (reconnect) → the list equals the stored log | The merge and reload are spec-proven only |
| API-06 | AC-006; SCN-007, SCN-007b | browser (desktop and phone), real server | Durable | A stopped Team run whose stored message log is damaged: the run opens with its members; the Team tab shows "unavailable" with the reason; a message (resume) is refused with the reason; the phone's message screen shows unavailable with the reason | Proven by server tests and component specs only |
| API-07 | AC-007; SCN-006b (C-11) | browser | Durable (in the hub probe's L-010) | L-010 `--large-shape unbroken` gains display checks: every long block has the class and wraps (no horizontal overflow), a block selects whole (copy), `window.find` finds text in it, the feed ends at the bottom. SCN-006b settled from the code: the conversation's tool card shows only the tool name and a one-line truncated summary from the arguments (`ToolCallIndicator.vue`, `toolCardPresentation.ts`); results appear only in the Activity panel on demand, and the scripted AGY emits no tool rows | L-010 already opens the AC's 20 × 60 KB copy |
| API-08 | AC-001, AC-002, AC-004, AC-007; hub regression | large-hub probe on a seed | Existing probe | `--seed-to`, then `--from-seed … --live` (S, S-ROWS, L-001…L-011) on the head | The live hub journeys ran only on the earlier ticket's code |

- Test progress log: `Yes`

Round 2 plan (the reload rule of SR-004…SR-006: keep a root's loaded lists within one live sequence while the base has not passed the sequence they are consistent through):
- API-08 first (round 1 Fail). L-001 and L-002 assert the expected counts: one participant fetch per running-hub selection; after a delegation at most one per loaded list, and none for the hub when the delegation added no hub message (SR-004: "a new child … with no message in the reconnect window gives 0").
- API-09 (new, durable LRL-005): a running Team opened in a fresh page with its Team tab: one fetch; a live message: none; a stop and resume from the composer (a new live sequence): a reload, and the list equals the stored log.
- API-03…API-06 rerun on the rebuilt server (the Team open read and the views gained fields); API-07 inside the hub run.
- API-01 reuses IR-004/IR-005's checks (`evidence/IMP-IR004-checks.log`, `IMP-IR005-checks.log`).
- Found during execution: the hub probe still read the removed `isChildHydrated` (L-004, L-009, L-011, L-005): a baseline fix reads `MemberLoader` instead.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-03…API-07 | `autobyteus-web/tests/e2e/large-runs-load-less-cases.mjs`, registered in `delegated-launch-defaults-probe.mjs` (script `test:e2e:large-runs-load-less`) | The real boundary for member loading, the live merge, the damaged log and long-token rendering; scripted AGY costs nothing |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Remote participants (no query; Team tab empty) | Preserved behavior "as today"; needs a remote node; the guard is code-reviewed (`agentOrgExecutionContext.ts`, `agentRunCollaborationIndex.ts`) and spec-covered | Low | No | Residual |
| Sequence-gap / `checkpoint_required` reopen | Not produced by real use on demand; the same `reloadRoot` path as the reconnect in API-05; spec-covered | Low | No | Residual |
| Reasoning renderer with long tokens | Scripted AGY emits no reasoning | Low | No | Residual |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes`
- Reroute Required Before Validation Execution: `No`

## Round 3 Note

- API-08 rechecked first. L-012 is added to the hub probe: a delegation whose new copy reports to the hub at once must show the report once, with at most one list fetch. The probe also records each browser error's time and stack, to trace FU-006. All other cases are rerun unchanged.
