# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-020`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 20, on CRR-060 (code review passed IR-040), a confirming rerun. Code under test `ac4a39498a` (HEAD `bf6fae4792`, docs only since). Server `dist` and the phone bundle rebuilt at the start; web from source; the desktop app built from this worktree.
- Scope, in CRR-060's order:
  1. F-90 (CR-461-114) live on the CLI runtimes, including a copy's copy in a Team tree;
  2. the Org-tree header (CR-461-115);
  3. F-91 (CR-461-116): RSW-01 and the desktop switch, with one notice live and its position recorded;
  4. a regression pass over what the round touched: the agent stream (OST), the live suite, the desktop journeys, and the areas judged affected.
- Server scope: a representative set rather than the full folder, agreed with the user. The three fixes reach the agent stream and the runtime switch, and tool exposure and delegation; round 19 ran the full folder on `2b20fd0898`.
- Prior round reviewed: API-REV-019 (`Fail`: F-90; F-91 by the CRR-059 addendum).
- Deviations: Grok not run (it fails on base too, round 19).
- Evidence: `evidence/api-e2e/API-r20-runs.txt`; raw logs, recordings and screenshots under `/tmp/api461/r20`.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`.
- Result route: `Pass` → Code Reviewer, proportional test-code review.
- Proportional test-code review decision: `Required` (`dc00f57d64`, `2ecdb8b356`, `8df4a7ee41` and this round's commit).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `ac4a39498a` | macOS 26.5.2 (Darwin 25.5.0), arm64 | Server E2E (representative set), scripted AGY | Clean env per run |
| ENV-1L | `ac4a39498a` | as ENV-1 | Live: DeepSeek (test vault); Codex, Claude, Antigravity (the user's logins, approved) | Each server has its own temporary data root |
| ENV-2 | `ac4a39498a` | as ENV-1 | Probe-owned stacks: built server, Nuxt dev, headless Chrome | Never the user's app or `~/.autobyteus` |
| ENV-3 | as ENV-2 | as ENV-1 | Phone shell probe, bundle rebuilt | |
| ENV-6 | `ac4a39498a` | as ENV-1 | Isolated Electron instance of this worktree, driven like a user | Its own ports and temporary data root; stopped and removed afterwards |

## Cases

| Case ID | Criteria | Env | Result | Notes |
| --- | --- | --- | --- | --- |
| F-90 recheck (CR-461-114) | Scope: no change to what an agent reads | ENV-1L | Resolved | LE-T1 Pass on DeepSeek, Codex, Claude and Antigravity, including a copy's copy in a Team tree; the full live suite is 5/5 on each (Claude 5/6: LE-F1's stale model is back in the catalog, not 461) |
| CR-461-115 recheck | SR-091 | ENV-2, ENV-6 | Resolved | DCR-001/002 assert the header equals the slot name. On the desktop, the Org copy's header reads "worker" |
| F-91 recheck (CR-461-116) | — | ENV-1, ENV-2, ENV-6 | Resolved | RSW-01: 1 notice live and 1 after a reload, both after the previous reply. RSM: 1 live. Desktop J1: 1, and J4 after a restart: 1 |
| Server, representative | stream, switch, delegation | ENV-1 | Pass | 117 passed, 1 failed. RS-01 was stale against CR-461-116 (it expected the removed live echo); reworked to "shown once", 9/9 alone. Own-run startup 3/3 |
| Web and phone | all | ENV-2/3 | Pass | DLD 26/29 (SIR-001/002, DLP-006 not 461); RSM 7/7; phone 53/55 (MSP-50/51 not 461); run title 2/2 alone after one RRT-05 timing failure (the known ~100 ms window, F-72) |
| Desktop J1 … J4 and the Org journey | rule 2, REQ-001, D-IMP-3, SR-091, CR-461-108, closure, persistence | ENV-6 | Pass | Hub (Codex) → worker (Claude); a Team copy (Antigravity); closure by the delegator; an Org copy; a restart |

### Findings

- **Resolved:** F-90, F-91, CR-461-115.
- **No open findings.**
- **Surface note (CRR-060):** the live notice now sits after the previous reply, where a reload shows it. Base's live echo was at the reply turn.
- **Not 461:** SIR-001/002, DLP-006, MSP-50/51, PLN-04, Claude LE-F1's precondition, Grok (base too). Base's desktop build doesn't start here (a base packaging issue, round 19 addendum).
- **FU-030:** no new wording-only refusal difference.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-016 (peers) | Yes | RC-31 … 46 (two-server suite this round) | Proven |
| AC-017 (statuses by run ID) | Yes | desktop J1/J2/J4, RSM, round 19's probes | Proven |
| REQ-001 | Yes | live LE-A2/A3, desktop J1/J4 | Proven |
| Rule 2 (opens by its own path) | Yes | live, desktop J1/J2/J4/Org, DLD | Proven |
| REQ-014 / SR-091 (one tree, one name) | Yes | DCR-001/002, desktop rows, headers, Task cards | Proven |
| D-IMP-3 (a saved copy's card) | Yes | desktop J1, round 19's AFS-001 | Proven |
| Scope: no change to what an agent reads | Yes | live LE-T1 on four runtimes | Proven |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Final Score | Residual Uncertainty |
| --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | — |
| Changed-boundary execution directness | 95% | — |
| Cross-boundary integration realism and mock gap | 94% | Grok not usable on this machine |
| Environment, configuration, identity, and fixture fidelity | 94% | base desktop not available for comparison |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | — |
| User-surface, browser, and desktop-shell confidence | 95% | — |
| Durable regression coverage quality and relevance | 92% | the full server folder not rerun this round (representative set) |

- Overall final confidence: 94% (simple average). Every critical acceptance criterion directly proven: `Yes`. Target 95% met: `No` (94%).

## Broader Validation Decision (Mandatory)

- Decision: `Required` and executed: the representative server set, web, phone, live models on four runtimes, and the desktop app.

## Desktop Application Validation

- An isolated Electron instance of this worktree build, driven like a user: J1 … J4 and an Org journey (above).
- Effect on any already-running desktop application: `None`. Separate ports and data root; stopped (forced after the graceful timeout), data root removed, none of mine listed.

## Persisted-Data Transition Checks

- `Migration Required` (DS-10): the own-run startup migration suite passes 3/3. A desktop restart (J4) restores the runs, names and conversation.

## Compatibility / Legacy Scope Check

- Compatibility-only behavior observed or covered: `No`.

## Durable Coverage Changed In The Codebase

- `Yes`:
  - `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs`: the header equals the slot name (CR-461-115);
  - `autobyteus-web/tests/e2e/runtime-switch-probe.mjs`: one live notice, and its position live and after a reload (CR-461-116); the stale hint check also accepts the save bar;
  - `autobyteus-web/tests/e2e/runtime-switch-members-probe.mjs`: the live notice count recorded;
  - `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts`: RS-01 asserts the marker is shown once (CR-461-116).
- Added or updated paths attached for proportional test-code review: `Yes`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Most scripted runs' models | Scripted AGY CLI, LM Studio stand-in | Deterministic (TESTING.md) | Covered by the live and desktop runs |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Probe stacks, data roots, homes | Yes | The probes' `finally`; homes removed by the runner scripts | Removed |
| The stopped full server run (switched to the representative set) | Yes | Its vitest, workers and test server stopped | Removed |
| Isolated Electron instance `iso-51859-6808` | Yes | `isolated-app stop` | Stopped, data root removed |
| `/tmp/api461/r20` logs, recordings, screenshots | Yes | Kept; extract committed | Kept |

## Latest Authoritative Result

- Result: `Pass`
- New findings: none.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (proportional test-code review), then delivery.
