# API/E2E Execution Coverage Report — draft-run-id-validation

## Execution Round Meta

- Requirements Doc: `requirements-doc.md` (Approved; REQ-001..009, AC-001..009)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-003)
- Design Spec: `design-spec.md` (SR-003)
- Supplemental Task Artifacts: none behavior-defining
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: code review Pass (CRR-001)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/` unless absolute. Reviewed source: `36a444f0e` (base `d28c56d5d`).

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation written before durable changes and final execution: `Yes`
- Plan followed: `Yes`
- Existing coverage decisions revised: none (all `Still Valid`)
- Reroute required: `No`
- Notes:
  - During development, the CF-011/CF-012 "message rendered" check matched the text still sitting in the New chat composer.
  - It now waits for the launched run's center pane to show the message and its file chip. run-1 used the corrected check.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`. It was initialized before execution, and each case was recorded when it finished (the probe's `--ledger` option).
- Long-running checkpoints: N/A (the full run takes about 90 s)
- Reconciled: `Yes`. Nothing is interrupted or unstarted.

| Case ID | Final Result | Last Event | Evidence | Follow-Up |
| --- | --- | --- | --- | --- |
| CF-001 | Pass | run-1 | `api-e2e-evidence/run-1/evidence.json` → `cases.CF-001` | — |
| CF-002, CF-003, CF-006, CF-007, CF-008, CF-009 | Pass | run-1 | screenshots + evidence | — |
| CF-011 | Pass | run-1 | `new-chat-agent-send-*.png` | — |
| CF-012 | Pass | run-1 | `new-chat-team-send-*.png` | — |
| CF-004, CF-005 | Pass | run-1 | `outage-remove-error.png`, `offline-*.png` | — |

## Compatibility / Legacy Scope Check

- Backward compatibility in requirements/design: `No`
- Compatibility-only or legacy behavior in implementation: `No`. Trim-and-accept is removed. Untrimmed IDs return 400 live; for example, upload owner `" <runId>"` gives `draftRunId must be a safe non-empty identity.`
- Persisted-data decision followed: `Yes` (`Not Affected`). Server-generated filenames and every real client ID pass.
- Compatibility-only durable coverage: `No`

## Changed Boundary And Evidence Matrix

| Case ID | Requirement / AC | Changed Boundary | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| CF-001 | AC-001, AC-002, AC-007, AC-008, REQ-001/002 | Draft wildcard routes, agent-final route, codec | Raw HTTP against built `dist/app.js` | Durable + Live | Pass | `mapping` (42 rows) |
| CF-001 | AC-003, AC-009 | Upload, finalize | Built server | Durable + Live | Pass | `rejected` (9 requests), `snapshotUnchanged` |
| CF-001 | QR-001, REQ-002 | Nothing touched | Data-root context-file snapshot + sentinels | Durable + Live | Pass | `snapshotUnchanged: true`, 4 sentinels intact |
| CF-002/003/006/007/008/009/004/005 | REQ-005, AC-006, SCN-004 | Every real composer flow against the stricter server | Browser (real stack) | Durable + Browser | Pass | screenshots |
| CF-011 | REQ-005, AC-006, AC-007 (valid side) | Finalize of a `temp-chat-…` draft; agent-final read | Browser + raw HTTP | Durable + Browser | Pass | `finalLocator`, `finalRead: 200` |
| CF-012 | REQ-005, AC-006 | Same for the team-member final | Browser + raw HTTP | Durable + Browser | Pass | same |
| (repo) | AC-004, AC-005, AC-006 formats | Containment guard class; runtime resolver; `temp-`/`team-draft-` IDs | Unit + integration | Durable | Pass | targeted suites |

## Additional Repository Coverage Execution

None beyond the investigation's table:
- `prebuild && build`: pass.
- typecheck: pass.
- Targeted server suites: 62 files, 517 tests, all pass (context-files, REST, provider-input normalizer, app-data migrations).
- Server `test:unit`: 669 files, 5254 tests, all pass.
- Web source is unchanged, so web suites were not rerun.

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Change | Final Supporting Evidence | Residual |
| --- | --- | --- | --- | --- | --- |
| Requirement / AC proof | 85% | 96% | +11 | AC-001/002/003/007/008/009 live on the built server; AC-004/005 and the `temp-`/`team-draft-` formats in unit/integration with the real layout; AC-006 through real UI flows | AC-004's guard-only path can't be reached over HTTP now that the codec rejects first (unit-proven) |
| Changed-boundary directness | 85% | 97% | +12 | Real router, `/rest` prefix, remote-access hook, raw-socket requests | — |
| Integration realism / mock gap | 80% | 96% | +16 | Real client flows (paste, picker, ×, Clear All, clone, send, finalize, final read) against the stricter server | Model scripted (AGY fake CLI) |
| Environment / fixture fidelity | 80% | 95% | +15 | Real `<slug>_<32hex>` and `temp-chat-…` IDs from real runs, delegation and New chat | Web-equivalent renderer |
| Failure / edge / lifecycle | 90% | 96% | +6 | 42 graded rows; 9 rejected writes; whole data-root context-file snapshot unchanged; restart and outage flows | — |
| User surface / browser | 70% | 95% | +25 | 11 browser cases, including first-send finalize and the launched run rendering the file | Packaged Electron not exercised (no shell change) |
| Durable regression coverage | 90% | 96% | +6 | Probe extended (CF-001 rows, CF-011, CF-012); passed twice | — |

- Overall post-repository confidence: 83%
- Overall final confidence: 96% (671 / 7 = 95.9)
- Calculation method: simple average
- Every critical AC directly proven: `Yes`
- Any final category below 90%: `No`
- 95% target met: `Yes`
- Confidence-limiting residual risks: none material.

## Broader Validation Decision And Execution

- Decision: `Required`. Mode: Live API + Browser (the extended durable probe). No deviation from the plan.
- Gap addressed: the built server rejects malformed input and touches nothing. Every real client flow, including send/finalize/final read, still passes the stricter rules.
- Startup:
  - Build: `pnpm -C autobyteus-server-ts prebuild && build`.
  - Run: `pnpm -C autobyteus-web test:e2e:composer-context-file-removal --output-dir <ticket>/api-e2e-evidence/run-1 --ledger <ticket>/api-e2e-test-case-ledger.md`.
  - The probe starts the backend (`listening` + GraphQL), then Nuxt (HTTP 200), then Chrome 154 headless.
- Environment: scripted AGY CLI (`AGY_FAKE_CASE=linked_skills`), inherited `AUTOBYTEUS_*` cleared, free loopback ports, private `$TMPDIR` data root.
- Fixtures: runs and definitions via GraphQL; delegated children via real `delegate_task`; sentinels written by the probe; phone credential paired via the public API.

| Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Draft traversal IDs, GET + DELETE: `agent-runs` `%2E%2E`, `..%2F..%2Fx`, `..%2Fagent-runs%2Fvictim` | 400 + detail | 400 `draftRunId must be a safe non-empty identity.` (6/6) | `mapping` | Pass |
| `team-runs` traversal (`..%2Fagent-runs%2Fvictim`, `%2E%2E`), GET + DELETE | 400 + detail | 400 `teamDraftId must be a safe non-empty identity.` (4/4) | `mapping` | Pass |
| `/rest/runs/%2E%2E/…` and `/rest/runs/<runId>/context-files/ctx_a%00.txt` (GET) | 400 + detail | 400 `runId must be a safe non-empty identity.` / 400 `storedFilename is invalid.` | `mapping` | Pass |
| Dot-only `%2E` filename on an existing owner folder, GET + DELETE | 400; owner folder and keeper draft intact | 400 `storedFilename is invalid.`; keeper bytes unchanged | `mapping`, `sentinelState.keeperDraft` | Pass |
| Other rows (Org/collab `%2E%2E`, `%2E%2E%2F` filenames, absent owners, literal `..`) | 400/404 as before | All match (42/42 rows) | `mapping` | Pass |
| Upload: owners `../agent-runs/victim`, `..`, untrimmed, extra field (agent); traversal, extra field (team) | 400 + detail, nothing written | 6× 400 with specific detail | `rejected` | Pass |
| Finalize: traversal / extra-field / team traversal draft owner, targeting the victim sentinel | 400 + detail, nothing moved | 3× 400; victim sentinel intact | `rejected`, `sentinelState.otherOwner` | Pass |
| All context files in the data root before vs after every malformed request | Identical | Identical (`snapshotUnchanged: true`) | evidence | Pass |
| Legitimate upload → GET → DELETE for all 4 owner kinds, with real IDs | 200/204/404/204 | As expected | `perKind` | Pass |
| Paired bearer DELETE / forged bearer | 204 / 401 | 204 / 401 | `bearer` | Pass |
| Composer journeys (CF-002/003/006) with real IDs: `<slug>_<32hex>` owners, `temp-chat-…` (New chat), `%2Fmanager`/`%2Fworker` team members, Org members | Attach, ×, Clear All work; DELETE 204 at locators | All 9 journeys pass | screenshots, `removals` | Pass |
| CF-007/008/009/004/005 | As in the prior ticket | All pass | screenshots | Pass |
| CF-011: `+` on the Manager → New chat → attach → send | Draft under `agent-runs/temp-chat-<ms>-<n>`; finalize 200; GET at `/rest/runs/<runId>/context-files/ctx_…__spec-c.txt` → 200 with the bytes; draft gone; run opens with the message and file chip | As expected (`temp-chat-1791605788652-1`) | `new-chat-agent-send-*.png` | Pass |
| CF-012: `+` on the Team run → New chat for the team → attach → send | Finalize 200; GET at `/rest/team-runs/<teamRunId>/agent-runs/<agentRunId>/context-files/…` → 200; run opens with the message and file chip | As expected | `new-chat-team-send-*.png` | Pass |

## Desktop Application Validation

- Approach: browser dev-path probe; no desktop-shell code changed.
- Effect on the running desktop app: `None`. The user's app and `~/.autobyteus` were not touched. Unrelated `agent-input-delivery` worktree processes were seen and left alone.
- Not directly proven: packaged Electron (no consequence; server-only change).

## Platform / Runtime Targets

- macOS 26.5.2; Node v22.23.1; Fastify 4.29.1; Nuxt 3.21.1; Chrome 154.0.8037.98 headless; 1440×1000; `en-US`.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Decision: `Not Affected`.
- Existing data:
  - CF-005 reads and deletes drafts across a real backend restart.
  - CF-011/012 read files the server finalized.
  - The migration unit suites run the stricter filename validator over historical fixtures (pass).
- Version-specific branch or fallback: `No`.

## Durable Coverage Changed In The Codebase

- Changed this round: `Yes`

| Path | Change | Requirement / Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Updated (API/E2E): `postUpload`, `contextFileSnapshot`, an agent-final `%00` row, 9 live upload/finalize rejections plus the snapshot assertion in CF-001; new `firstSendFromNewChat` (CF-011, CF-012) with finalize-response capture; `openTeamRunMember` | AC-003/007/008/009, REQ-002, REQ-005/AC-006 | Pass (run-1 + stability) |
| `TESTING.md` (Composer Context-File Removal Regression) | Updated: CF-001 rejection rows; CF-011/CF-012 | — | — |

- The implementer's probe and test changes in `36a444f0e` were reviewed as context and are kept unchanged.
- Paths attached for review: `Yes`.
- My changes are uncommitted in the worktree (no commit requested).

## Other Execution Artifacts

| Path | Purpose | Retained |
| --- | --- | --- |
| `api-e2e-evidence/run-1/` | Authoritative evidence (4.2 MB) | Retained |
| `/tmp/drv-api-e2e/*.log`, `stability-1/`, `dev-*` | Suite logs, stability rerun, development runs | Temporary |

## Temporary Execution Methods / Scaffolding

None.

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| LLM / AGY CLI | Repository scripted CLI | None for this change |
| CF-008 5xx, CF-009 held finalize | `page.route` (one response; timing) | As in the prior ticket |

## Out-Of-Scope Observations

- CND-002 (reviewer note, pre-existing): a user file whose name contains `..` (for example `report..v2.pdf`) still fails upload with 400. It is not exercised here and not counted as a regression; it is a separate-ticket candidate.

## Result Summary

| Result | Case IDs | Summary |
| --- | --- | --- |
| Pass | CF-001, CF-002, CF-003, CF-004, CF-005, CF-006, CF-007, CF-008, CF-009, CF-011, CF-012 | Malformed input → 400 + detail with nothing touched; every real flow unchanged |
| Not Tested | Live runtime turn with a malformed locator; UI uploads under `temp-<ms>-<n>`/`team-draft-<uuid>` | No user-visible boundary or no UI producer (investigation rationale); covered at the repository level |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| Backend/Nuxt process groups, Chrome | Probe-owned | SIGTERM / close | Terminated / closed (run-1, stability, dev runs) |
| Private data roots | Probe-owned | Removed | `dataRootRemoved: true`; none left |
| User's AutoByteus app and data | User | None | Untouched |

## Preliminary Classification

N/A — Pass.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96%
- 95% target met: `Yes`; no category below 90%
- Broader validation: `Required` — executed, Pass
- Critical ACs lacking direct proof: none
- Next recipient: per `get_handoff_rules`
- Notes: CND-002 is pre-existing and out of scope.
