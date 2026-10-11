# API/E2E Coverage Investigation — draft-run-id-validation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; REQ-001..009, AC-001..009)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-003)
- Design Spec: `design-spec.md` (SR-003)
- Supplemental Task Artifacts: none behavior-defining. The prior handover and the OBS-001 report from `composer-context-file-removal` are evidence only.
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass, 9.5/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code review Pass (CRR-001) from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/` unless absolute. Reviewed range: `d28c56d5d..36a444f0e`.

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

- Every owner ID field of every draft and final kind uses `safeIdentity` (REQ-001). Stored filenames must match `^[A-Za-z0-9._-]+$`, must not be dot-only, and must not contain `..` (REQ-008).
- Any malformed input on any context-file route answers 400 with `detail`, never 500, and no file is read, written, moved or deleted (REQ-002, REQ-003).
- The runtime treats a malformed locator as unresolved (REQ-004).
- Legitimate IDs keep working (REQ-005): `<slug>_<32hex>`, `temp-…`, `temp-chat-…`, `team-draft-<uuid>`.
- `agent_draft` and `team_member_draft` descriptors reject extra fields (REQ-009). Agent-final maps validation errors to 400 (REQ-007).
- Persisted data: `Not Affected`. Legacy/compatibility check: clean (trim-and-accept removed, no fallbacks).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (crafted IDs/filenames on every route), SCN-002 (final reads), SCN-003 (runtime resolution), SCN-004 (normal attach/preview/remove/send).
- Real-use scenarios added from investigating the implemented behavior:
  - RU-1, first send from New chat with an attachment:
    - The user presses `+` on an Agent run or a Team run (copy settings), attaches a file and sends.
    - The `temp-chat-…` draft is finalized into the new run, and the sent file is then read at its final locator: agent final `/rest/runs/<runId>/…` (route changed by D4), or team member final.
    - This is the only real UI path where uploads are finalized and final files read. It is the "agent-final reads after send" item from the review.
  - RU-2, legitimate-ID inventory: which real UI paths produce which owner IDs.
    - Producers (grep of `autobyteus-web`): run views produce `<slug>_<32hex>`; New chat produces `temp-chat-…`.
    - `temp-<ms>-<n>` comes only from the mobile launch coordinator, and the mobile composer never uploads.
    - `team-draft-<uuid>` is the finalize fallback owner in `agentTeamRunStore` when no attachment draft owner is given. Desktop/web New chat always passes its `temp-chat` owner.
    - So `temp-` and `team-draft-` are proven at the integration layer (inject upload → GET → DELETE, finalize), which is the real route code; there is no UI path that uploads under them.
- Contrived scenarios not tested: none recorded by the designer.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001/002 draft GET/DELETE traversal IDs | Changed (200/204/500 → 400) | AC-001/002 | Raw-HTTP probe rows + sentinels |
| BEH-003/004 upload/finalize traversal/extra-field owner | Changed (→ 400, nothing written/moved) | AC-003, AC-009 | Integration (inject; body-level, so no URL normalization gap) + live rows on the built server |
| BEH-005 agent-final malformed runId/filename | Changed (404/500 → 400) | AC-007 | Raw-HTTP probe rows |
| BEH-006 runtime resolution | Changed (throw → null for final kinds) | AC-005 | Unit + integration with the real layout; the normalizer already caught throws (no user-visible change) |
| BEH-008 filename allowlist | Changed | AC-008 | Integration + probe dot-only row |
| SCN-004 / REQ-005 legitimate flows | Preserved | AC-006 | Full composer probe (CF-002..009) + RU-1 send/final read |
| Containment guard → 400 | Changed | AC-004 | Unit (layout) + probe rows |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Owner codec, filename allowlist, layout guard | Unit (context-files 127) | — | None |
| API / transport / contract | Yes | Draft wildcard routes, upload, finalize, agent-final route | Integration (raw HTTP for dot segments, inject otherwise) | Built server, real prefix/hook, real IDs from real runs | Live API (probe CF-001) |
| Frontend component / state | No (web source untouched) | — | — | Legitimate client flows still accepted | Browser regression |
| Browser integration / user journey | Indirect | The server now rejects inputs that clients might send | — | Real UI-produced IDs/filenames must pass | Browser (CF-002..009, RU-1) |
| Authentication / session / permissions | No | Remote-access policy unchanged | CF-001 bearer rows | — | Rerun CF-001 |
| Desktop renderer / shell | No | — | — | — | — |
| Process / lifecycle | Indirect | Restart paths reuse the same routes | — | — | CF-004/005 rerun |
| Persisted-data transition | No (`Not Affected`) | Existing drafts/finals must stay readable | Migration suites (stricter filename) | — | CF-005 after restart |
| Worker / runtime | Yes (resolver) | `ContextFileLocalPathResolver` | Unit + real-layout integration | Normalizer behavior is unchanged (already catches) | None beyond repository |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation` (branch `codex/draft-run-id-validation`)
- Stack: pnpm monorepo; Fastify server, Nuxt web.
- Testing guideline: `TESTING.md` (worktree root), including "Composer Context-File Removal Regression".
- Conflicting instructions: none.
- Secrets: N/A (scripted AGY CLI).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Guideline | Server tests + the browser probe; never touch the user's running app |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Existing durable probe | Owns built backend, Nuxt and Chrome; `--cases`, `--ledger` |

| Component | Working Directory | Start / Setup | Notes | Readiness | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Built backend | `autobyteus-server-ts` | `prebuild && build`; probe spawns `dist/app.js` | Scripted AGY CLI | `listening` + GraphQL | Process group SIGTERM |
| Nuxt dev | `autobyteus-web` | probe spawns `nuxi dev` | — | HTTP 200 | Process group SIGTERM |
| Chrome | — | `playwright-core` | headless | — | close |

| Data / Fixture Need | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Runs with real `<slug>_<32hex>` IDs, delegated children | Public GraphQL + real `delegate_task` | Private data root | Removed |
| Sentinels (draft root, other owner, app data, keeper draft) | Probe writes them | Private data root | Removed |

## Persisted Data Transition Coverage Basis

- Decision: `Not Affected`.
- Evidence planned:
  - The migration suites run the stricter `assertStoredFilename` against historical names.
  - The probe's restart case (CF-005) reads and deletes drafts created before a restart.
  - RU-1 reads finalized files written by the server.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Validity | Action |
| --- | --- | --- | --- | --- |
| `tests/unit/context-files/context-file-owner-types.test.ts` | Every kind/field, legitimate formats, extra fields, filename allowlist | REQ-001/005/008/009 | Still Valid | Keep |
| `tests/unit/context-files/context-file-layout.test.ts` | Guard error class | REQ-003 | Still Valid | Keep |
| `tests/unit/context-files/context-file-local-path-resolver.test.ts` | Malformed → null | REQ-004 | Still Valid | Keep |
| `tests/integration/api/rest/draft-context-files-universal.integration.test.ts` | Raw-HTTP traversal + snapshot, upload/finalize rejection, legitimate formats, real-layout resolver | AC-001..006, 008, 009 | Still Valid | Keep |
| `tests/integration/api/rest/context-files.integration.test.ts` | Agent-final 400 + legitimate run ID | AC-007 | Still Valid | Keep |
| `tests/unit/app-data-migrations/**` | Historical filenames under the stricter validator | REQ-008 (persisted) | Still Valid | Keep |
| Probe CF-001 (graded rows updated by the implementer) | Live traversal rows | AC-001/002/007/008 | Still Valid | Extend (see below) |
| Probe CF-002..CF-009 | Real composer journeys | SCN-004 / REQ-005 | Still Valid | Rerun |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Evidence | Planned Artifact | Why Durable |
| --- | --- | --- | --- | --- |
| CF-001 (extended) | Live upload/finalize rejection (traversal, untrimmed, extra-field owners; traversal draft owner on finalize), and an agent-final invalid filename (`%00`) on the built server; snapshot of draft root + memory `context_files` unchanged | AC-003, AC-007, AC-008, AC-009 | `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Built-server proof alongside the existing traversal rows |
| CF-011 | RU-1: `+` on the Manager run → New chat (copied AGY settings) → attach → send. The `temp-chat-…` draft is finalized, the final file is readable at its agent-final locator (200, bytes) and the draft is gone | REQ-005, AC-006, AC-007 (valid side), SCN-004 | same probe | Only real UI path covering finalize + agent-final read |
| CF-012 | RU-1 for a Team: `+` on a Team run → New chat for the team → attach → send. The final file is readable at its team-member final locator | REQ-005, AC-006, SCN-004 | same probe | Same, Team final route |

## Durable Coverage To Update

| Case ID | Path | Update | Evidence |
| --- | --- | --- | --- |
| CF-001 | probe | Add the live rejection rows above | AC-003/007/008/009 |
| — | `TESTING.md` | Describe CF-011/CF-012 and the new CF-001 rows | — |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts prebuild && build` | Current dist | Pass | `/tmp/drv-api-e2e/server-build.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | Types | Pass | `/tmp/drv-api-e2e/typecheck.log` |
| 3 | `vitest run tests/unit/context-files tests/integration/api/rest tests/unit/agent-execution/input tests/unit/app-data-migrations` | Codec, layout, resolver, REST, normalizer, migrations | Pass — 62 files, 517 tests | `/tmp/drv-api-e2e/server-targeted.log` |
| 4 | `pnpm -C autobyteus-server-ts test:unit` | Server unit regression | Pass — 669 files passed, 4 skipped; 5254 tests passed, 7 skipped | `/tmp/drv-api-e2e/server-unit.log` |

The full server integration suite was not rerun. The implementer and code reviewer ran it (only the accepted PB-001 exception fails); the change's integration files ran in row 3; and no source changed since.

Web unit suites are not rerun: no web source changed (the only web file is the probe script).

## Test-Case Ledger Decision

- Ledger required: `Yes` (11 probe cases with restarts).
- Path: `api-e2e-test-case-ledger.md`.

## Post-Repository Confidence Scorecard

Filled after the repository results; see the execution report for the final values.

| Category | Score | Supports | Uncertainty | Improve With |
| --- | --- | --- | --- | --- |
| Requirement / AC proof | 85% | Every AC has unit/integration tests, including raw-HTTP traversal | Not on the built server with real run IDs | Probe CF-001 |
| Changed-boundary directness | 85% | Real route code in-process | Real prefix/hook/dist | Probe |
| Integration realism / mock gap | 80% | Real layout and owner resolver | Clients' real IDs and filenames never sent | Browser journeys |
| Environment / fixture fidelity | 80% | Hand-written fixtures | Real runs, delegation, New chat drafts | Probe |
| Failure / edge / lifecycle | 90% | Snapshot-based nothing-touched assertions | Restarts with real drafts | CF-005 |
| User-surface / browser | 70% | None (server change) | Whether any real client flow is now rejected | CF-002..CF-012 |
| Durable regression coverage | 90% | Kind-complete tests; graded probe rows | Finalize + final read not in the probe | CF-011/012 |

- Overall post-repository confidence: 83%
- Every critical AC directly proven at the repository level: `Yes` (in-process); built-server proof pending
- Any category below 90%: `Yes` (six)
- Target met: `No`

## Broader Validation Decision

- Decision: `Required`
- Mode: Live API + Browser (the existing probe, extended)
- Gap addressed:
  - Built-server behavior with real IDs.
  - Proof that no supported client flow (attach, preview, remove, send, finalize, final read) is rejected by the stricter rules.
- Expected confidence: ≥ 95%.
- Browser rationale: the change is server-only, but its risk is rejecting legitimate client input. Only real client flows prove that.

## Desktop Application Validation Decision

- Web-equivalent renderer only; no shell behavior changed. The user's running app (`~/.autobyteus`, port 29695) is not touched.

## Live Environment And Fixture Plan

- `pnpm -C autobyteus-web test:e2e:composer-context-file-removal --output-dir <ticket>/api-e2e-evidence/run-N --ledger <ticket>/api-e2e-test-case-ledger.md`.
- Evidence: `evidence.json` (statuses, details, snapshots, sentinels, final locators), screenshots, logs. Cleanup is owned by the probe.

## Temporary Executable Validation Plan

None.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| A live runtime turn with a malformed locator | The normalizer already catches resolver throws and keeps the URI, so there is no user-visible difference; the resolver is proven with the real layout in integration | Low | None |
| UI uploads under `temp-<ms>-<n>` / `team-draft-<uuid>` | No desktop/web UI path uploads under these owners (RU-2) | Low | Integration covers them |
| CND-002 `..` inside user filenames | Pre-existing (reviewer note) | — | Separate ticket candidate |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed: `Yes`
- Durable coverage added/updated: `Yes` (probe CF-001 rows, CF-011, CF-012; TESTING.md)
- Post-repository confidence: 83%
- Broader validation: `Required`
- Reroute: `No`
