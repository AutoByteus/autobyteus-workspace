# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative; this file records the baseline or delta of each round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-001 (Pass), round 1 | SR-004; ARCH-REV-002; IR-001; CRR-001 | N/A | Fail / 83.9% |
| API-REV-002 | Code reviewer, `code-review-report.md` CRR-003 (`Full Re-Audit` of IR-002, Pass), round 2 | SR-004 notes 14–16; ARCH-REV-003 (Fail), ARCH-REV-004 (Pass); IR-002; CRR-002, CRR-003 | Fail / 83.9% (API-REV-001) | Pass / 94.9% |

## Revision Entries

### API-REV-001 — Built-server switch to and from the native runtime, settings, codegen, journal identity, baseline

- Triggering role, report path, and round: Code reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/code-review-report.md`, round 1
- Triggering finding or case IDs: none (the review passed; it listed the coverage to add)
- Related revision IDs: SR-004, ARCH-REV-002, IR-001, CRR-001; delivery `N/A`
- Why recorded: first validation of the approved design on the reviewed `Large` + `High` route
- Coverage decisions or durable test paths changed: added `tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` (RS-01 native pair, RS-02 settings, RS-03 host with a delegated copy) and `tests/agent-work-journal/services/work-journal-unswitched-identity.test.ts`; updated the 331 `work-journal-neutral-vocabulary.e2e.test.ts` (per-file journal runtime); regenerated `autobyteus-web/generated/graphql.ts`.
- Cases added, changed, removed, or rechecked: API-01…API-08 run, OBS-1 observed, API-09 Not Tested; implementer's clean-clone suites reused.
- Commands, environment, fixture, or broader-validation delta: build of the worktree at `60c3ac4ec8`; built server as a child process with a native model stand-in and the scripted AGY; codegen against it; a base-commit worktree for the journal byte comparison; live Claude and Codex repeated.

#### Prior Failure Resolution

None. (One stale assertion of mine in the 331 journal E2E failed in API-07 and was updated; see the report.)

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`
- Prior result and confidence: N/A
- Current result and confidence: Fail / 83.9% (post-repository 84.0%)
- New or remaining failure IDs: F-1 (switch to the native runtime leaks the candidate's `system_instruction` into the previous agent's archive, I-7), F-2 (the reopened chat starts at the latest marker)
- Recommended owner: Solution Designer (both are `Design Impact`), after the code reviewer's failure-origin review
- Remaining risks, blocked evidence, or untested scope: OBS-1, C-6 corner, native runtime on a real provider, rendered Settings page and chat in a browser, a stored pending switch across a server restart.

### API-REV-002 — Rework IR-002 validated on a fresh build, a clean clone and the real UI

- Triggering role, report path, and round: Code reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-resume/tickets/in-progress/cross-runtime-resume/code-review-report.md` (CRR-003), round 2
- Triggering finding or case IDs: API-REV-001 F-1, F-2, OBS-1 (= CRR-002 F-3); the reviewer's requests: rerun RS-01…RS-03 on a fresh build, a failed switch attempt on the built server, Grok as a target, a pending switch across a restart, RS-01's title and comment
- Related revision IDs: SR-004 notes 14–16; ARCH-REV-003, ARCH-REV-004; IR-002; CRR-002, CRR-003
- Why recorded: rework of the failures of API-REV-001
- Coverage decisions or durable test paths changed: `runtime-switch-native-built-server.e2e.test.ts` (RS-01 retitled and strict, restart support, RS-04…RS-08 added), `recent-run-projection-graphql.e2e.test.ts` (spy follows descriptors, manifest read allowed for the chat reader), new browser probe `autobyteus-web/tests/e2e/runtime-switch-probe.mjs` with the package script `test:e2e:runtime-switch`
- Cases added, changed, removed, or rechecked: R2-API-01…R2-API-12 run (R2-API-13 the optional hardening and the Electron shell not run); API-REV-001's cases rerun or superseded (RS-01…RS-03 now pass)
- Commands, environment, fixture, or broader-validation delta: fresh build of `25c1acb705`; a clean clone (install, build, 8 built-server cases); a failed archive step produced by a folder in the segment file's place; a Grok process that ends after its session opened; a server restart; a real Chrome on the real Nuxt app against the built backend with the scripted models; compiled-output mutations (watermark, discard, derived hand-over, pending model context, chat reader) each caught

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1 the native candidate's `system_instruction` in the previous agent's archived segment (I-7) | `Design Impact` | fixed: segment = exactly the previous agent's records; the candidate's instruction follows the new marker, once | R2-API-02 (RS-01), R2-API-05 (RS-05), R2-API-06 (RS-06, RS-07) |
| F-2 the reopened chat started at the latest marker (I-10) | `Design Impact` | fixed: the reloaded chat shows the earlier conversation and every marker | R2-API-02 (`chat-projection.json`), R2-API-06, R2-API-12 (the real UI after a reload) |
| OBS-1 / F-3 a model edit while a switch to native is pending | `Unclear` → `Local Fix` | fixed: a fresh selection; the first message runs on the model chosen last | R2-API-06c (RS-08, with the fix removed it fails with the round-1 message) |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (Round 2 section), `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`
- Prior result and confidence: Fail / 83.9%
- Current result and confidence: Pass / 94.9% (post-repository 90.3%)
- New or remaining failure IDs: none. Two earlier suites needed updates (the 331 journal E2E in round 1; `recent-run-projection-graphql` in this round: the pinned "no manifest read on first hydration" no longer holds by design, O-1)
- Recommended owner: Code reviewer (test-code review), then Delivery
- Remaining risks, blocked evidence, or untested scope: native and Grok runtimes on real providers; a real process kill between the marker and the user record (emulated); the Electron shell; observations O-1…O-4 (the code reviewer should confirm O-1); the optional hardening of `begin` not exercised; the deletion of the implementer's scratch clone `/tmp/crr-clean` by my mistake (disclosed in the report)
