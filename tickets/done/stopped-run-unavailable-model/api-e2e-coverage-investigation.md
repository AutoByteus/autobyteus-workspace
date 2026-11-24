# API/E2E Coverage Investigation — stopped-run-unavailable-model (autobyteus-53)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-006, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-006, `Ready`)
- Design Review Report / Architecture Review Revision Record: `design-review-report.md` (ARCH-REV-002 Pass) / `architecture-review-revision-record.md`
- Implementation Handoff / Revision Record: `implementation-handoff.md` (IR-002) / `implementation-revision-record.md`
- Code Review Report / Revision Record: `code-review-report.md` / `code-review-revision-record.md` (CRR-002 Pass)
- API/E2E Revision Record: `api-e2e-revision-record.md`; current revision `API-REV-001`
- Follow-ups: `follow-ups.md` (FU-001)
- Testing guideline read: `/TESTING.md` (root; no closer `TESTING*.md` for `autobyteus-server-ts`); also `AGENTS.md`, `docs/isolated-app-instances.md`
- Round / trigger: API-001, `/code_reviewer` CRR-002 handoff (`Medium` / `High`, reviewed route)
- Prior investigation reviewed: `N/A` (first round)

## Current Requirement And Design Basis

The user's rule (DEC-003): every offered AutoByteus model can be chosen on a stopped native run. The model the session last ran on is the reference (DEC-005): both capacities verified and the new one equal or bigger → same session; otherwise (smaller, unknown, old model gone) → the save makes a pending hand-over and the next message starts a fresh session with the notice and the marker "Model changed from {old} to {new}." A scope with no session (Team default row, never-started run) accepts any offered model directly (DEC-007). Runs that cannot switch runtime keep their refusal (DEC-006, AC-009).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (removed local model), SCN-003 (unverified), SCN-004 (equal or bigger), SCN-005 (smaller). SCN-002 (a retired API model) is the same path as SCN-001; its model comes from a provider, not the catalog's scripted endpoint, so it is covered by SCN-001's gone-model case.
- Real-use scenarios added from the implementation: (1) a re-edit sequence on a pending hand-over (AC-006) as a user clicking Save several times before sending; (2) a server restart between Save and the first message, and a first message whose archive step fails (RS-04/RS-05 shape), for native → native; (3) an Org save of two members in one call (the CRR-001 path), and the Org member's record on disk (CRR-002's second fix).
- Unsupported/contrived scenarios not tested: none recorded by the designer.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002/006 save and menu of a native run on a gone, unverified or smaller model | Changed | requirements AC-001, AC-002, AC-004, AC-005 | New built-server E2E MH-01, MH-05, MH-06 |
| BEH-005 equal or bigger verified → same session | Preserved | AC-003 | MH-02 (needs verified capacity; see FU-001) |
| BEH-003/AC-006 re-edits and undo while pending | Changed (one reference model) | AC-006 (a)-(d) | MH-02 |
| REQ-005 / AC-008 Team member, Team default row, Org members | Changed | AC-008; CRR-001 CR-001 | MH-03, MH-04 |
| REQ-006 / DEC-008 marker text | Changed | AC-002 | MH-01, MH-03, MH-04, MH-06 assert the exact text |
| REQ-007 / AC-010 texts | Changed | AC-010 | MH-01 asserts the Save message; WEB-01 for the help text catalog |
| AC-007 runtime switch, undo, members, session renewal | Preserved | AC-007 | AC007 sweep of the existing suites |
| AC-009 run that cannot hand over keeps its refusal | Preserved | AC-009 | Unit only (IMP-02/03); no realistic path needs a built server (a peer-started run needs two nodes) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | selection service, switch rule, three save paths, two options paths | Unit + integration (IMP-02..IMP-06) | Wiring across the built server | Built-server E2E (done) |
| API / transport / contract | Yes (behavior; no schema change) | GraphQL options and save results | — | The same | Built-server E2E (done) |
| Frontend component / state | Locale texts only | two locale files | WEB-01, WEB-02, IMP-05 | Rendered Settings menu | User check (AC-011); isolated app not usable (below) |
| Persisted data | Yes | `pendingRuntimeSwitch` with the same runtime; Org member's `platformAgentRunId` written | Unit | Real files after save, restart, activation | MH-04, MH-06 read the real files |
| Process lifecycle | Yes | pending hand-over across a restart; failed first start | RS-04/RS-05 (AGY → native only) | native → native | MH-06 |
| Desktop shell | No | — | — | — | N/A |

## Test Case Decisions

| Existing Test | Decision | Reason |
| --- | --- | --- |
| `tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` (RS-01..RS-09) | Still Valid | runs unchanged (AC007) |
| `runtime-switch-members-built-server` (MS-01..05), `...-extended-...` (EX-01..05), `agy-switch-back-built-server` (SB-01..03), `lost-session-renewal-built-server`, `stopped-run-edit-root-built-server`, `delegated-copy-model-change`, `stopped-run-model-config-graphql`, `tests/e2e/agent-org-runs/*` | Still Valid | run unchanged; MS-04, EX-01 and SB-01 first needed a repair: they read the Org's own file for `rootOrg.members`, which holds only units since the Org became a container. Cause in the test (Rule 9) → `Needs Update`: baseline-fix commit `cef4f79481` (helper `tests/e2e/helpers/org-run-tree.ts`) |
| `tests/unit/agent-org-execution/agent-org-run-manager-model-selection-save.test.ts` | Needs Update | the code review's non-blocking note: the "equal/bigger" case saved the model the member had (`UNCHANGED`); now baseline `equal`, save `large`, expects `UPDATED`, same session |
| Web settings and editor tests | Still Valid | WEB-01, WEB-02 |

New behavior without adequate durable coverage → `Add Durable Coverage`: `tests/e2e/runtime/native-model-handover-built-server.e2e.test.ts`.

## Planned Cases

| Case ID | Criteria | Real trigger | Notes |
| --- | --- | --- | --- |
| MH-01 | AC-001, AC-002, AC-010, REQ-006 | Save on a stopped native run whose LM Studio model was deleted; then a message | fake LM Studio endpoint (list loses a model); request bodies recorded |
| MH-02 | AC-003, AC-004, AC-006 (a)-(d) | Repeated Saves | models with a verified capacity: a custom OpenAI-compatible endpoint's `context_window` (`live`); the real catalog gives LM Studio models none (FU-001) |
| MH-03 | AC-008 | Team member save; Team default row save | CONFIGURED_AGENT / CONFIGURED_TEAM scopes |
| MH-04 | AC-008, CR-001 | One Org save of a direct Agent and a mounted Team's Agent | records read from disk |
| MH-05 | AC-005 | Save of an equal-window LM Studio model | unverified → hand-over |
| MH-06 | lifecycle (REQ-003) | Restart, then a first message whose archive step fails, then retry | RS-04/RS-05 shape |
| MH-MUT | test validity | dist mutations | two mutations |
| AC007 | AC-007 | existing suites on the rebuilt `dist` | |
| IMP-02/03/04/06 | AC-003..006, AC-009, AC-010 (server) | Reused | no source changed since `0c58796856` (`git diff --name-only 0c58796856 HEAD -- autobyteus-server-ts/src autobyteus-web autobyteus-ts` is empty) |
| TC, WEB-01, WEB-02 | compile gates, web texts | | |

## Environment And Setup

- `pnpm -C autobyteus-server-ts build` first; `env -i PATH HOME=<resolved temp> TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fake AGY>`; the server is `dist/app.js` on a test-owned data root (`test-support/live-e2e`), private HOME and database.
- No real provider, key or vault was used; the models are scripted endpoints on loopback (LM Studio list and chat completions; `/v1/models` for the custom provider).
- The machine's real LM Studio listens on `:1234`; the server under test is pointed at the fake through `LMSTUDIO_HOSTS` and never reads `:1234`.
- Isolated desktop instance: not used. Its embedded server receives only a system-baseline environment, so the fake endpoint cannot be given (`LMSTUDIO_HOSTS` does not pass), and the default host (`:1234`) is the user's own LM Studio.
