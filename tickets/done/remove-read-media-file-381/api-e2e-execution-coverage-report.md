# API/E2E Execution Coverage Report — autobyteus-381 (remove the last traces of read_media_file)

## Round

- Coverage investigation: `tickets/in-progress/remove-read-media-file-381/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; implementation_engineer handoff (IR-001, HEAD `67ed4d9e03`)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - API-07: its first run asserted that a direct `ensureCurrent` leaves the whole journal folder unchanged, which is stronger than the design. The open file is rendered on every call by design (`work-journal-service.ts` `renderFile`: "it is rendered again on every call"). Run 2 (authoritative) added the real catch-up trigger, memory search's `makeJournalsCurrent` with the stored fingerprint, and kept the strict check as a documented expected failure.
  - API-08: run 1 failed on a cause in the test (below). Per TESTING.md Rule 9 the test got a labelled baseline fix (`0e5e2f3029`), and run 2 passed. API-09 was added for the fix.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-read-media-file-381/tickets/in-progress/remove-read-media-file-381/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `67ed4d9e03` | macOS 26.5.2 arm64 | Node v22.23.1, pnpm workspace, `autobyteus-ts/dist` built at `b04138c777` (no `autobyteus-ts/src` change since; dist contains `readMediaAsContextFile`) | `env -i PATH HOME=<fresh temp> TMPDIR`; synthetic data only |
| ENV-2 | `67ed4d9e03` with the base `autobyteus-translation.ts` (`fe351591f2`) checked out for one phase, then restored | as ENV-1 | as ENV-1 | The only server `src` difference between base and HEAD is that file (`git diff --name-only fe351591f2 HEAD`); restore checked (`git status` clean for the file) |
| ENV-3 | `67ed4d9e03` + baseline fix (committed as `0e5e2f3029`) | as ENV-1 | In-process studio server (test-owned temp data dir); LM Studio `qwen/qwen3.6-35b-a3b` at localhost:1234 | No model was loaded before; unloaded after each run |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | read_file media branch | Reused: IMP-01 | — | Pass | — | — | Ran at `b04138c777`; later commits change no `autobyteus-ts/src` file. API-06 adds the full core unit suite at HEAD |
| API-02 | AC-002, AC-003 | journal rendering, golden | Reused: IMP-02, IMP-03 | — | Pass | — | — | Ran at `bba6ab3edd`; later commits touch no journal file. I checked the golden diff myself (`git diff fe351591f2 7cd914394d -- …/unchanged-groups-before.json`): only the `[06:00:29] Command: cat /work/shipping/images/parcel.png → ok` entry and its marker line are removed |
| API-03 | AC-004 | resolver | Reused: IMP-04 | — | Pass | — | — | Ran at `7cd914394d`; HEAD adds only ticket files. The resolver file also passed inside API-06 |
| API-04 | AC-006 | type gates | Reused: IMP-06 | — | Pass | — | — | Ran at `7cd914394d`; HEAD adds only ticket files. Server gate rerun with the baseline fix in API-09 |
| API-05 | AC-005 | whole tree | `git grep -i -n -I "read_media_file\|readMediaFile"` at HEAD, hits grouped by folder; binary-file hits listed separately | ENV-1 | Pass | `API-05-grep-at-head.txt` | "non-historical text hits: 1 (.github/release-notes/release-notes.md …)"; "binary hits: 71, outside tickets/ and test-results/: 0"; "RESULT: PASS" | Every other hit is under `tickets/` (root or package-level) or `test-results/`, the historical records of DEC-003 |
| API-06 | AC-002, REQ-005 | server unit + journal; core unit | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts test:unit`; `… pnpm -C autobyteus-ts exec vitest run tests/unit` | ENV-1 | Pass | `API-06-server-unit-and-core-unit.log` | "Test Files  925 passed \| 5 skipped (930)", "Tests  7879 passed \| 9 skipped (7888)", exit=0; core "Test Files  311 passed (311)", exit=0; "failing files …: 0" | The first server attempt was stopped by my own 10-minute background limit before any result, not a test outcome. The complete run is the one logged |
| API-07 | AC-003, DEC-001, persisted data `Not Affected` | `WorkJournalService.ensureCurrent` and memory search's `makeJournalsCurrent` on a real temp run folder | Temporary probe `tests/agent-work-journal/zz-api07-probe.test.ts` (copy in evidence), phases run separately, Run 2: **base** (ENV-2) builds an AutoByteus run recorded before v1.5.11: closed segment 000001 and an open file, each with a `read_media_file` call; renders the journal with the base renderer and stores memory search's fingerprint → **memsearch** (HEAD) catch-up with that stored fingerprint → **reuse-strict** (expected fail, documents the open-file rule) → **reuse** → **grow** (a new turn) → **rebuild** (`regenerate: true`) | ENV-2 | Pass | `API-07-cross-version-journal-probe.log`, `API-07-probe-source.test.ts.txt` | Run 2 "memsearch … identical to base" for all three files and "memsearch kept: []"; "reuse/grow work_journal_000001.md identical to base"; rebuild diff `+[06:00:02] Tool: read_media_file file_path="/work/shipping/images/parcel.png" → ok` | Proves the user's "do not touch existing data" in real use: memory search does not reopen an indexed old run on the new build, and a closed file is never rewritten without Rebuild. Observation: an open file is rendered on every `ensureCurrent` (existing design), so an old run's open file reads generically once that run continues, or on Rebuild. That is "rendered again for another reason" (DEC-001). The generic line also prints the recorded result JSON on its second line |
| API-08 | AC-002 (oracle consumer), SCN-A3 | live AutoByteus run through the in-process studio server, WebSocket, raw traces, journal | `env -i PATH HOME=<temp> TMPDIR RUN_LMSTUDIO_E2E=1 WORK_JOURNAL_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts --no-watch` | ENV-3 | Pass (run 2) | `API-08-live-journal-autobyteus-lmstudio.log` (run 2), `API-08-run1-relative-path-failure.log` (run 1) | Run 2: "✓ AutoByteus (native, LMSTUDIO): raw records on disk at TURN_COMPLETED; journal current", "Tests  1 passed \| 3 skipped (4)", exit=0; journal entries "Command: ls → exit 0", "Command: cat -n …/notes.txt → ok", "Write file: …/out.txt (1 lines) → ok", "Edit file: …/out.txt (+1 −1) → ok" | Run 1 failed with "Error executing tool 'read_file' …: Relative file paths require an explicit absolute 'base_dir'". Cause, in the test: its task said "read the file notes.txt", but AutoByteus file tools have refused relative paths since `4cb3167a26` (2026-07-30, an ancestor of base), and the test fails on the first runtime ERROR. Path resolution runs before the media branch and is unchanged here, so the failure does not come from this ticket. Baseline fix `0e5e2f3029`: the task names both files by absolute path. Claude, Codex and Antigravity were not run (gates off; their oracle entries are unchanged and their runs spend the user's credits) |
| API-09 | AC-006 | server type gate | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts typecheck` with the baseline fix | ENV-3 code | Pass | `API-09-server-typecheck-after-baseline-fix.log` | "production errors: 0; test-file errors: 1184 in 366 files (baseline 1184 in 366 files)", "[typecheck] PASS" | The web gate does not include server e2e files; IMP-06 still holds for it |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-01), API-06 | Proven | — |
| AC-002 | Yes | API-02 (IMP-02), API-06, API-08 | Proven | — |
| AC-003 | Yes | API-02 (IMP-03), API-07 (through the real service on Rebuild) | Proven | — |
| AC-004 | Yes | API-03 (IMP-04), API-06 | Proven | — |
| AC-005 | Yes | API-05 | Proven | — |
| AC-006 | Yes | API-04 (IMP-06), API-09 | Proven | — |
| Persisted data `Not Affected` (DEC-001) | Yes | API-07 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | API-01..API-09 | None material | — |
| Changed-boundary execution directness | 95% | 97% | API-06 runs the real renderer and tables; API-07 runs the real service and memory-search step across the old and new renderers | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | API-08: a live run through the server, runtime, recorder and journal; API-07: real files across versions | Other runtimes not run live (their entries are unchanged) | Paid live runs; not justified for this change |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | Clean env; synthetic run folders shaped like the recorders' output; local model | The probe's run folder is hand-built, not a real pre-v1.5.11 run | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 96% | API-07: closed, open, continued and Rebuild paths; reuse across versions | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI change; journal viewing never renders (`readWorkJournalView` only reads) | — | — |
| Durable regression coverage quality and relevance | 95% | 96% | Implementation's updated tests; the live e2e is runnable again on a local model after the baseline fix | The cross-version reuse stays a probe (it needs the base renderer) | — |

- Overall post-repository confidence: 93.3%
- Overall final confidence: 96.0%
- Calculation method: simple average of the six applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the open-file observation in API-07 (by design, within DEC-001); the baseline fix not exercised on the paid runtimes.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (and executed)
- Execution mode: `Live API` (API-08) and `Lifecycle` (API-07, cross-version)
- Confidence gap or residual risk it addresses, and the expected gain: whether existing journals stay untouched on the new build (the user's data constraint) and whether the edited oracle still holds in a live run. Both are now proven.
- Browser validation needed, and why or why not: No. Backend-local change; no UI, and viewing a journal never renders it.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: a hand-built AutoByteus run folder, with a closed segment, an open file and `read_media_file` calls. The base renderer wrote its revision-2 journal, and memory search's fingerprint was stored.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-07
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: None material. An old run's open file reads generically once the run continues, as accepted in DEC-001.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts` | Updated (baseline fix `0e5e2f3029`: the task names `notes.txt` and `out.txt` by absolute path) | API-08, API-09 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: the implementation's removals are in `bba6ab3edd` and `7cd914394d`, checked in the investigation

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A real pre-v1.5.11 run folder | Hand-built, shaped like the recorders' output | Never use the user's data (TESTING.md Rule 2) | Small; the records follow the recorder's snake_case shape used by the repository fixtures |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe `tests/agent-work-journal/zz-api07-probe.test.ts` | Yes | Deleted; copy kept as evidence | Done; not committed |
| Base `autobyteus-translation.ts` checked out for the base phase | Yes | `git checkout --` the file | Done; `git status` clean for it |
| Temp dirs `/tmp/api07*`, `/tmp/api06*`, `/tmp/api08*`, `/tmp/api09*` and raw logs | Yes | Removed | Done |
| LM Studio `qwen/qwen3.6-35b-a3b` load | Yes (none loaded before) | `lms unload --all` after each run | Done; "No models are currently loaded." |
| Untracked SDK `dist/` folders | No (implementation's prepare step) | Left alone; not committed | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: delivery_engineer (direct low-risk route)
- Notes: one labelled baseline fix to a live e2e test (`0e5e2f3029`), outside the ticket's change.
