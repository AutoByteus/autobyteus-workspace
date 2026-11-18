# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: 1, implementation IR-001 complete (direct low-risk route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: the comparison gained an address fallback after the first run. Sidebar Team-copy rows carry the root's team run id, not the copy's, and members of a collapsed sidebar group are not rendered. Fallback matches are counted separately (`MATCH-BY-ADDRESS`).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-delegated-row-display-name/tickets/in-progress/settings-delegated-row-display-name/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `aa4d8b0b6f` (code `5af1a03e11`) | macOS 26.5.2, Node v22.23.1 | `autobyteus-server-ts/dist/app.js` built from this worktree (`prebuild` + `build`, exit 0, `evidence/API-00-server-build.log`); probe-owned Nuxt dev; headless Google Chrome 156 via playwright-core | Probe-owned temp data root, HOME and ports; scripted AGY/Grok CLIs; 1512×952, en-US; temporary name observer in an untracked copy of `tests/e2e/` (patch `API-05-06-name-observer.diff`), removed afterwards |
| ENV-1-base | ENV-1 with `teamExecutionContextFactory.ts`, `teamExecutionTreeSelectors.ts`, `delegatedLaunchRows.ts` from `1138e8fbef`, for API-06 only | same | same (Nuxt dev serves them from source) | Restored by `git checkout` at the end of the same command: `restored; diff lines: 0` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, AC-003 | row builders vs `projectNavigationRows` | Reused: IMP-01, IMP-00 | — | Pass | — | — | Ran on `5af1a03e11`; only ticket files changed since |
| API-02 | AC-003 | related web specs (24 files / 140 tests) | Reused: IMP-02 | — | Pass | — | — | Same reason |
| API-03 | — | web boundary guard; changed-file typecheck | Reused: IMP-03, IMP-04 | — | Pass | — | — | Same reason |
| API-04 | AC-004 | DCR-001 header | Review of `git diff 1138e8fbef 5af1a03e11 -- autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` against the case's steps | — | Pass | — | Header: "the Team context of each copy … holds its own model and the slot's its edit, all named \"worker\""; case lines 99-101 assert exactly that (`teamContext` per copy and slot, `c.name === 'worker'`). The removed claim ("+" prefills its own model) has no step in the case | Review only, per the Task |
| API-05 | AC-005, REQ-001, REQ-002 | real stack: Settings copy rows vs sidebar copy rows vs conversation title, Agent/Team/Org roots | `node tests/.e2e-ab208-observer/delegated-launch-defaults-probe.mjs --output-dir /tmp/ab208e2e/API-05/out --ledger-file /tmp/ab208e2e/API-05/ledger.md --cases DLP-003,DLP-004,DCP-002,DCP-003,DCP-005,DCR-001,DCR-002` (cwd `autobyteus-web`); `python3 -I API-05-06-compare-names.py API-05-name-observer.log` | ENV-1 | Pass | `API-05-probe-names-stdout.log`, `API-05-probe-names-ledger.md`, `API-05-probe-names-evidence.json`, `API-05-name-observer.log`, `API-05-names-comparison.txt`, `API-05-DCR-001-settings-two-copies-1280.png`, `API-05-DCP-003-org-settings-copy-saved-1280.png`, `API-05-DCP-002-settings-team-copy-saved-1280.png`, `API-05-DCR-002-org-settings-four-copies-1280.png` | `Summary: 7 Pass, 0 Fail`; comparison `--- totals {'MATCH': 42, 'NO-SIDEBAR-ROW': 2, 'MATCH-BY-ADDRESS': 19}` (no `MISMATCH`); e.g. `MATCH /scribe_ca32@… settings=['scribe ca32'] initials=['SC'] sidebar=['scribe ca32']`, `MATCH /worker@… settings=['worker']`, `MATCH /writer_0ba6@… settings=['writer 0ba6'] initials=['W0']`, `MATCH-BY-ADDRESS /pair_team_b053@… settings=['pair team b053']`; conversation titles include `writer 0ba6 - 8DB9`, `writer - C11B`; screenshots: Team run "scribe ca32" (SC) and "worker" in Settings and the sidebar; Org run "writer 0ba6" (W0) in both | Team root: catalog copies and catalog Team copies (and their members) by display name, the configured member's copy by basename (`worker`). Org and Agent roots: display names. The two `NO-SIDEBAR-ROW` rows are the Org run's Team copy `/pair`: the observer does not read Org Team group rows, and `pair` is the same under both rules. Initials: two letters for spaced names (`SC`, `W0`, `B3`), the component's existing multi-word rule, consistent with the sidebar avatars |
| API-06 | AC-005 (detection power) | same, base row builders | `git show 1138e8fbef:<file> > <file>` for the three sources, the API-05 command into `/tmp/ab208e2e/API-06`, then `git checkout` | ENV-1-base | Pass (calibration behaved as expected) | `API-06-base-calibration-stdout.log`, `API-06-base-calibration-ledger.md`, `API-06-name-observer.log`, `API-06-names-comparison.txt`, `API-06-base-DCP-003-org-settings-copy-saved-1280.png`, `API-06-base-DCR-001-settings-two-copies-1280.png` | `--- totals {'MISMATCH': 5, 'MATCH': 37, 'NO-SIDEBAR-ROW': 2, 'MATCH-BY-ADDRESS': 10, 'MISMATCH-BY-ADDRESS': 9}`; e.g. `MISMATCH /scribe_a7ea@… settings=['scribe_a7ea'] … sidebar=['scribe a7ea']`, `MISMATCH /writer_e19a@… settings=['writer_e19a']`, `MISMATCH-BY-ADDRESS /pair_team_edf8@… settings=['pair_team_edf8'] sidebar=['pair team edf8']` | The comparison detects the defect on base (14 rows). The base `MATCH` rows are names equal under both rules (members, configured basenames) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-01; fails on base, IMP-00); API-05 Team-root rows on the real stack | Proven | — |
| AC-002 | Yes | API-01; API-05 Org- and Agent-root rows | Proven | — |
| AC-003 | Yes | API-01, API-02 | Proven | — |
| AC-004 | No | API-04 | Proven (review) | — |
| AC-005 | Yes | API-05 (0 mismatches across Agent, Team and Org runs; conversation titles agree), API-06 (the same comparison finds 14 mismatches on base) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | API-01…04; AC-005 on the real stack (API-05, API-06) | Org Team-copy group rows not read by the observer (the name is the same under both rules) | — |
| Changed-boundary execution directness | 85% | 95% | Rendered rows from real backend trees (API-05) | — | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | Unit tests use test-made trees; API-05 uses real ones | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Worktree build, probe-owned data | Browser, not the desktop shell (no shell code involved) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Catalog vs configured copies, Team copies and members, three root kinds, stopped and running copies | — | — |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | DOM names compared per run id; screenshots; initials observed | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | The spec compares the rows with `projectNavigationRows` (the sidebar's own function) and fails on base | — | — |

- Overall post-repository confidence: 85%
- Overall final confidence: 95% (simple average of the seven final scores)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (probe-owned real stack)
- Gap addressed: the rendered Settings rows against the rendered sidebar for real trees (AC-005). Closed.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`; compatibility-only behavior observed: `No`; durable coverage for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round by API/E2E: `No` (the implementation's spec cases were reviewed and kept)

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/.e2e-ab208-observer/` | Yes | `rm -rf` | Removed |
| Base swap of the three sources (API-06) | Yes | `git checkout` in the same command | `git status` shows no tracked change |
| Probe backends, Nuxt dev servers, Chrome, temp data roots (2 runs) | Yes | Probe cleanup | Both evidence JSONs show SIGTERM of their processes and `removed …/delegated-launch-defaults-*`; no process of these runs left |
| `/tmp/ab208e2e/` raw outputs | Yes | Kept outside the repo | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Next recipient from `get_handoff_rules`: Delivery
