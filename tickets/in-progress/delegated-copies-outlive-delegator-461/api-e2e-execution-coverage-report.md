# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-021`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 21, on CRR-062 (the base merge reviewed, Pass). Code under test is `339602ff36`, the merge of `origin/personal` `1e8b6e5d0a`; HEAD `ed33e2452c` has only doc commits since. The server `dist` and the phone bundle are as the Implementation Engineer rebuilt them from the merged tree; web from source.
- Scope, by the user's decision (2026-11-16) and CRR-062:
  1. the full server E2E folder, once, on the merged code;
  2. the RRT-05 base comparison, 5 runs each at the current base `1e8b6e5d0a` and on the branch, plus `827f1e68dc`;
  3. the merged areas: the composer probe (CF-013, CF-014) and the base's phone size-limit cases.
- Earlier rounds stand for what this round did not rerun:
  - API-REV-020 for the live suite (four runtimes), the desktop journeys and the web probes;
  - API-REV-019 for the full web set.
  - The merge changed none of 461's paths beyond the five conflict files (CRR-062).
- Prior round reviewed: API-REV-020 (`Pass`).
- Deviations: none. Grok is a follow-up (FU-035, the user's decision).
- Evidence: `evidence/api-e2e/API-r21-runs.txt`; raw logs `/tmp/api461/r21`.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`.
- Result route: `Pass` → Code Reviewer, proportional test-code review, then delivery (a beta, the user's decision).
- Proportional test-code review decision: `Required` (`dc00f57d64`, `2ecdb8b356`, `8df4a7ee41`, `67d8ea56bc` and this round's commit).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `339602ff36` | macOS 26.5.2 (Darwin 25.5.0), arm64 | Server E2E folder, scripted AGY | Clean env per run |
| ENV-2 | `339602ff36` | as ENV-1 | Probe-owned stacks: built server, Nuxt dev, headless Chrome | Never the user's app or `~/.autobyteus` |
| ENV-2b | base `1e8b6e5d0a`, base `827f1e68dc` | as ENV-1 | Each base's own worktree, install and build | The `1e8b6e5d0a` worktree was created for this round and removed afterwards |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe, the merged phone bundle | |

## Cases

| Case ID | Criteria | Env | Result | Notes |
| --- | --- | --- | --- | --- |
| Full server E2E | all | ENV-1 | Pass | 886 passed, 0 failed (193 files; 343 live-gated skips) |
| RRT-05 base comparison | REQ-014 (titles) | ENV-2, 2b | Not a finding | 15/15 Pass. The peer Team row's first text is its title within 2–18 ms on all three trees; the task message never shows |
| Composer probe | context files, rule 2 | ENV-2 | Pass | 12/12, including the base's CF-013 and CF-014 |
| Phone MSP-53 … 58 | the base's size limits; AC-007 stopped delegators | ENV-3 | Pass | 6/6 alone, after one environmental AGY discovery timeout in setup. The merge's ID clash was fixed (below) |
| Type gates | — | — | Pass | Server production 0 (tests at baseline); web production 0 (tests at baseline), cross-package 0 |

### Findings

- **No open findings.**
- **Test-side, fixed this round (from the merge):**
  - the base's phone size-limit cases and 461's stopped-delegator cases both used MSP-53 … 55, and the probe skips a second case with a used ID;
  - 461's cases are renumbered MSP-56 … 58;
  - the probe's start-up duplicate check now also reads `journey('ID'`, so such a clash stops the probe before any stack starts.
- **A collision, recorded:** my first start of this round (before the reviewer's hold reached me) ran a server build that removed `dist`. The Implementation Engineer rebuilt it from the merged tree.
- **Not 461:** SIR-001/002, DLP-006, MSP-50/51, PLN-04, Claude LE-F1's precondition; Grok (FU-035).

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result |
| --- | --- | --- | --- |
| Every 461 criterion | Yes | API-REV-019 / 020 (live, desktop, web, phone), with this round's full server run on the merged code | Proven |
| The merge keeps 461 intact | Yes | Full server E2E 886/886, composer 12/12, phone MSP-53 … 58 | Proven |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Final Score | Residual Uncertainty |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | — |
| Changed-boundary execution directness | 95% | — |
| Cross-boundary integration realism and mock gap | 95% | — |
| Environment, configuration, identity, and fixture fidelity | 94% | base desktop not available for comparison |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | — |
| User-surface, browser, and desktop-shell confidence | 96% | — |
| Durable regression coverage quality and relevance | 95% | — |

- Overall final confidence: 95% (simple average). Every critical acceptance criterion directly proven: `Yes`. Target 95% met: `Yes`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` and executed. This round: the full server folder, the base comparisons and the merged areas. Earlier rounds: live models on four runtimes and the desktop journeys (API-REV-020).

## Desktop Application Validation

- Not rerun this round. API-REV-020's isolated-instance journeys stand: the merge changed no desktop path of 461.
- Effect on any already-running desktop application: `None`.

## Persisted-Data Transition Checks

- `Migration Required` (DS-10): the migration suites pass in the full run.

## Compatibility / Legacy Scope Check

- Compatibility-only behavior observed or covered: `No`.

## Durable Coverage Changed In The Codebase

- `Yes`:
  - `autobyteus-web/tests/e2e/mobile-stopped-delegator-cases.mjs`: 461's phone cases renumbered MSP-56 … 58;
  - `autobyteus-web/tests/e2e/mobile-shell-probe.mjs`: the start-up duplicate check also reads `journey('ID'`; the case comment updated.
- Added or updated paths attached for proportional test-code review: `Yes`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Run models in these suites | Scripted AGY CLI | Deterministic (TESTING.md) | Live models covered in API-REV-020 |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| Base worktree at `1e8b6e5d0a` | Yes | `git worktree remove` | Removed |
| `/tmp/api461/r21` logs | Yes | Kept; extract committed | Kept |

## Latest Authoritative Result

- Result: `Pass`
- New findings: none.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review), then delivery.
