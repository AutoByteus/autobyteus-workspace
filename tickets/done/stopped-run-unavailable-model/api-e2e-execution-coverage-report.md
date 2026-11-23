# API/E2E Execution and Coverage Report — stopped-run-unavailable-model (autobyteus-53)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: API-001; CRR-002 pass from `/code_reviewer`
- Prior round reviewed: `N/A`
- Deviations from the plan: MH-02 uses a custom OpenAI-compatible endpoint's models instead of LM Studio's, because LM Studio models have no verified capacity in the real catalog (FU-001, MH-05). MH-06 was added after the first scorecard (restart and failed first start). Three stale Org-member switch suites were repaired as baseline fixes (AC007).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-unavailable-model/tickets/in-progress/stopped-run-unavailable-model/api-e2e-evidence/` (committed with this report)

## Routing Classification

- Task size: `Medium`; Architectural risk: `High`; Input route: `Reviewed`
- Successful-output route: `Code Review` (reviewed route, `High` risk: proportional test-code review of the changed durable tests)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `e6380c2acf` (source identical to code-review commit `0c58796856`; only tests and ticket files differ; `dist` built from `22bc2b3415`'s source) | macOS (Darwin 25.5) | built server `dist/app.js` as a child process (`test-support/live-e2e` `startBuiltTestServer`), Node/pnpm workspace | `env -i` clean environment, resolved temp HOME, test-owned data root and database, `LMSTUDIO_HOSTS` → scripted loopback endpoint, scripted AGY CLI. No vault, no real provider |
| ENV-2 | `e6380c2acf` | macOS | unit (vitest), typecheck, web vitest | default test isolation |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MH-01 | AC-001, AC-002, AC-010, REQ-006 | Built server: GraphQL options and save, WebSocket chat, run files, provider requests | Native run on LM Studio `mh-gone-solo`, one turn, stop; the model is removed from the endpoint and the catalog reloaded; options; Save `mh-small`; send a message; second message; reopen chat. `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/native-model-handover-built-server.e2e.test.ts --no-watch` (env in the file header) | ENV-1 | Pass | `api-e2e-evidence/MH-final.log` | `✓ MH-01` and `Tests  6 passed (6)`. Assertions in the file: `currentModel: null` and the menu lists the offered LM Studio models; Save message "Model saved. Your next message starts a fresh session on the new model, which continues from the work journal."; segment holds exactly the earlier record IDs; first record `Model changed from <gone> to <small>.`; the request's `model` is `mh-small`, the user input holds `[System: runtime hand-over]` before the user's text and none of "NATIVE-TURN-ONE"; no notice with the second input; the reopened chat shows the earlier message and the marker | A native session's ID is the run's own ID, so "fresh session" is shown by the request body, not by a new ID |
| MH-02 | AC-003, AC-004, AC-006 (a)-(d) | same, models of a custom OpenAI-compatible endpoint (advertised `context_window` = verified `live`) | Run on `ce-big`; save `ce-mid` (equal) → same session; `ce-small` → pending from `ce-mid`; (b) `ce-tiny` → still pending, the same switch; (d) another runtime (Antigravity) → pending from `ce-mid`; (c) `ce-big` (equal to `ce-mid`) → first session back, nothing pending; then pending from `ce-big`, (a) `ce-big` again → undo; a message → plain, no marker, no notice, no segment | ENV-1 | Pass | `MH-final.log` | `✓ MH-02` | Saves wrote no raw trace and no segment |
| MH-03 | AC-008 | Team: `teamRunModelOptions`, `updateStoppedTeamRunSelections`, Team tree file | Team of two members on `mh-gone-team`, a turn each, stop, model removed; options of every scope; save the Team default row (CONFIGURED_TEAM) with `mh-small`; save the worker; message the worker | ENV-1 | Pass | `MH-final.log` | `✓ MH-03` | The default row: UPDATED, default launch carries the new model, no member pending. The worker only: pending, then marker, segment = its earlier records, request to `mh-small`; the lead's file byte-identical |
| MH-04 | AC-008, CRR-001 CR-001, CRR-002 second fix | Org: `agentOrgRunModelOptions`, one `updateStoppedAgentOrgRunConfig` of a direct Agent and a mounted Team's Agent, member records on disk | Org run (direct + Team of lead/worker) on `mh-gone-org`, a turn each, stop, model removed; one save of `/direct` and `/crew/worker` to `mh-small`; message each | ENV-1 | Pass | `MH-final.log`, `MH-mutation-checks.log` (M1) | `✓ MH-04`; M1 mutation: `"outcome":"PERSISTENCE_INDETERMINATE"` | Save is `UPDATED` (not `INTERNAL_ERROR`); each member's record holds the new model, `platformAgentRunId: null` and the pending switch from the gone model; each hands over by its own first message; the lead is untouched |
| MH-05 | AC-005 | Built server, LM Studio models | Run on LM Studio `mh-big` (window 65536), save `mh-mid` (65536) → pending; save `mh-big` → undo | ENV-1 | Pass | `MH-final.log` | `✓ MH-05` | Shows FU-001 |
| MH-06 | REQ-003 lifecycle | restart, failed first start, retry | pending hand-over; server restart; a folder takes the segment's name; first message fails; folder removed; retry | ENV-1 | Pass | `MH-final.log` | `✓ MH-06`; "EISDIR" in the ack | Pending survives; the previous file is byte-identical after the failure; one marker, one segment, one notice after the retry |
| MH-MUT | test validity | `dist` edits, restored afterwards | M1: `container-config-trees.js` without `platformAgentRunId: node.platformAgentRunId`; M2: `target >= current` → `true` | ENV-1 | Pass | `MH-mutation-checks.log` | M1: `× MH-04`; M2: `× MH-02` | The other cases pass each time; `dist` restored (diff empty) |
| AC007-1 | AC-007 | the existing built-server suites | `runtime-switch-native`, `runtime-switch-members`, `...-extended`, `agy-switch-back`, `lost-session-renewal`, `stopped-run-edit-root`, `stopped-run-model-config-graphql`, `delegated-copy-model-change`, `agent-org-runs/*`, `autobyteus-anthropic-stored-config-edit-launch` on the rebuilt `dist` | ENV-1 | Fail → repaired | `AC007-existing-switch-suites-before-baseline-fix.log` | `Tests  3 failed \| 67 passed (70)`; `TypeError: Cannot read properties of undefined (reading 'flatMap')` | The 3 failures (EX-01, MS-04, SB-01) died reading the Org file before any save |
| AC007-2 | AC-007 | the 3 repaired suites | same files, full | ENV-1 | Pass | `AC007-org-switch-suites-after-baseline-fix.log` | `Tests  13 passed (13)` | Baseline fix `cef4f79481`, cause in the test (Rule 9): the Org's own file holds `units`, not `members` |
| IMP-02 / IMP-03 / IMP-04 / IMP-06 | AC-003..006, AC-009, AC-010 (server) | Reused | see the implementation handoff | — | Pass (reused) | the handoff's `evidence/IMP-0*.log` | as in its Look For | still valid: `git diff --name-only 0c58796856 HEAD -- autobyteus-server-ts/src autobyteus-web autobyteus-ts` is empty. The one unit test I edited (`agent-org-run-manager-model-selection-save`) passes 3/3 |
| TC | compile gates | server and web typecheck | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | ENV-2 | Pass | `API-server-typecheck.log`, `API-web-typecheck.log` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)` / `86 in 36 files (baseline 86 in 36 files)` | |
| WEB-01 / WEB-02 | AC-010 (help texts), the editor's options and save logic | web vitest | `NUXT_TEST=true pnpm exec vitest run <files>` | ENV-2 | Pass | `WEB-01-run-settings-texts.log`, `WEB-02-stopped-run-editor.log` | `Tests  8 passed (8)`; `Tests  71 passed (71)` | These do not render the new help text; the Settings view is proven only by the user check |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | MH-01, MH-03, MH-04 (server options + Save); IMP-02 (unit); WEB-02 | Proven (the rendered Settings menu: only the user can check, see AC-011) | The isolated desktop instance cannot show the case: its embedded server takes no `LMSTUDIO_HOSTS`, and the default host is the user's own LM Studio |
| AC-002 | Yes | MH-01, MH-06 | Proven | |
| AC-003 | Yes | MH-02 | Proven (verified capacities from a custom endpoint; LM Studio never reaches it, FU-001) | |
| AC-004 | Yes | MH-02 (smaller) | Proven | |
| AC-005 | Yes | MH-05, MH-01 (gone model) | Proven | |
| AC-006 | Yes | MH-02 (a)-(d) | Proven | |
| AC-007 | Yes | AC007-1, AC007-2, IMP-02 | Proven | |
| AC-008 | Yes | MH-03 (Team member, Team default row), MH-04 (Org members); delegated copy: `delegated-copy-model-change` DCM-004/005/008 (AC007-1) and IMP-02 | Proven (a delegated copy's native hand-over: unit and the existing copy suites only) | |
| AC-009 | No | IMP-02 (unit) | Proven (unit only) | A peer-started run needs two nodes |
| AC-010 | No | MH-01 (Save message), IMP-05, WEB-01 | Proven for the Save message; the help text is checked only by compile and localization gates | |
| AC-011 | — | — | Only The User Can Check | Their own LM Studio and beta |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 96% | MH-01..MH-06, AC007 | A delegated copy's native hand-over is proven only by the unit and existing copy suites | one more case on a delegated copy |
| Changed-boundary execution directness | 95% | 97% | built server, real native agent, real files, provider request bodies | | |
| Cross-boundary integration realism and mock gap | 92% | 95% | scripted LM Studio and OpenAI-compatible endpoints; real server, runtime and stores | no real LM Studio; capacities come from a script | user check on a beta |
| Environment, configuration, identity, and fixture fidelity | 92% | 94% | clean env, test-owned root and DB; the fixture's capacities checked against the catalog in `beforeAll` | LM Studio capacity quirk (FU-001) found by this run, not designed for | FU-001 |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | MH-06 (restart, failed start, retry), MH-02 re-edits, MH-05 | no live-model overflow of a long history on a small window (UNK-001 of the investigation) | a live small-window run |
| User-surface, browser, and desktop-shell confidence | 90% | 94% | Save message and marker through GraphQL and chat frames; WEB-01/02 | the rendered Settings menu and help text are not driven (above) | AC-011 |
| Durable regression coverage quality and relevance | 93% | 96% | MH-MUT (both mutations fail the right case), three stale suites repaired | | |

- Overall post-repository confidence: 92% (average)
- Overall final confidence: 95.3% (simple average of the final scores)
- Every critical acceptance criterion directly proven, apart from the part only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes` (95.3%)
- Confidence-limiting residual risks: the rendered Settings view; LM Studio models never keep the session (FU-001); no live-model check of a long history on a small window.

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`
- Execution mode: `None`
- Confidence gap it addresses: the isolated desktop instance would add the rendered Settings menu. It cannot take the scripted endpoint (above), and its default LM Studio host is the user's own, which could not be made to lose a model.
- Browser validation needed: No: the web code did not change beyond two texts; its options and save logic ran in WEB-02.
- The cases that already exercise the real changed boundary: MH-01..MH-06 on the built server.

## Persisted-Data Transition Checks

- Approved decision: `Directly Usable — No Migration`
- Representative existing data used: a same-runtime `pendingRuntimeSwitch` written by the product itself and read by it across a restart (MH-06); the Org member's record after the Org save (MH-04)
- Followed without a migration: `Yes`
- Version-specific branch or fallback observed: `No`

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`; compatibility-only behavior in the implementation: `No`; durable coverage kept only for compatibility: `No`

## Durable Coverage Changed In The Codebase

- Added, updated or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/native-model-handover-built-server.e2e.test.ts` | Added | MH-01..MH-06 | |
| `autobyteus-server-ts/tests/e2e/helpers/org-run-tree.ts` | Added | AC007 repair, shared by the three suites | |
| `.../runtime/runtime-switch-members-built-server.e2e.test.ts` (MS-04), `.../runtime-switch-members-extended-built-server.e2e.test.ts` (EX-01), `.../agy-switch-back-built-server.e2e.test.ts` (SB-01) | Updated (baseline fix, commit `cef4f79481`) | AC007-2 | |
| `autobyteus-server-ts/tests/unit/agent-org-execution/agent-org-run-manager-model-selection-save.test.ts` | Updated | the code review's note | |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| LM Studio | loopback HTTP server: `GET` model list (a model can be removed), streamed chat completions | a real model cannot be deleted on demand; no inference cost | its `max_context_length` and loaded contexts are scripted; the real catalog gives these models no verified capacity (FU-001) |
| A custom OpenAI-compatible provider | the same server under `/v1` (`/v1/models` with `context_window`) | to have native models with a verified (`live`) capacity | |
| Antigravity | the repository's scripted CLI | only a settings save names it (MH-02 (d)) | no AGY start in these cases |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Test data roots under `autobyteus-server-ts/tests/.tmp/native-model-handover-*` and temp HOMEs | Yes | removed by the suite (`removeOwnedTestRuntime`) | clean |
| `dist` mutations | Yes | restored from copies; diff empty | clean |
| A throw-away unit probe of the LM Studio catalog and a base-commit clone | Yes | deleted; the clone's run was stopped, because the failure's cause was in the test (Rule 9) | clean |
| Built `dist/` (`22bc2b3415` source) | Yes | stays with the worktree (gitignored) | |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: AC-011 (user check on a beta; the rendered Settings menu)
- Evidence decisions requested: `None`
- Next recipient from `get_handoff_rules`: `/code_reviewer` (reviewed route; proportional test-code review)
- Notes: follow-up FU-001 (LM Studio capacity) is in `follow-ups.md`; the Solution Designer sends it when the ticket leaves the team.
