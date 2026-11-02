# API/E2E Execution Coverage Report

## Round

- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order/api-e2e-coverage-investigation.md
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; the implementation engineer's direct-route handoff (code commit `aa93bdcdfb`, IR-001)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: `None`
- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/clean-runner-build-order/tickets/in-progress/clean-runner-build-order/evidence/api-e2e/

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `b0e11cd4df` (branch tip; code identical to `aa93bdcdfb`, only `DESIGN.md` and ticket documents differ) | macOS arm64 (Darwin 25.5) | Node v22.23.1, pnpm 10.28.2; fresh clone in `/tmp/api-crb-fix`, no node_modules or build output before the run | `pnpm install --frozen-lockfile` only |
| ENV-2 | `b05dc78c08` (the base, `aa93bdcdfb^`) | same | same; fresh clone in `/tmp/api-crb-base` | same |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, REQ-001 | clean clone, web gate | `git clone --branch codex/clean-runner-build-order <worktree> /tmp/api-crb-fix`; `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-01-clean-clone-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`, `web typecheck exit 0`; no `TS2307` | the prepare step builds autobyteus-ts, application-sdk-contracts, application-backend-sdk and generates the Prisma client (`Generated Prisma Client (v5.22.0)`) |
| API-02 | AC-002, REQ-002 | same clone, server gate | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-02-clean-clone-server-typecheck.log` | `production errors: 0; test-file errors: 1185 in 366 files (baseline 1185 in 366 files)`, `PASS`, `server typecheck exit 0` | |
| API-03 | AC-003 | built machine | same clone after API-01/02: `pnpm -C autobyteus-web typecheck`; `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-03-built-machine-web-typecheck-and-server-build.log` | web `PASS` with the same counts; `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.`; `build exit 0` | no tracked file modified (`git status`: only the two untracked `dist/` folders that every build creates) |
| API-04 | AC-001, AC-002 (fail-first) | base commit, clean clone | the same steps at `aa93bdcdfb^` | ENV-2 | Fail (expected) | `API-04-base-fails-clean-clone.log` | `production errors: 392` (web), `325` lines with `TS2307` (`Cannot find module 'autobyteus-ts/…'`), Prisma `has no exported member 'Prisma'`; server gate `production errors: 70`, `FAIL` | shows the clean-clone steps can fail: the original incident, removed by the change |
| API-05 | AC-005, REQ-003 | documents | source check of `DESIGN.md` (rule 12 at line 118, checklist item, anti-pattern), `TESTING.md` line 110, `RELEASE.md` lines 166 and 331, `docs/design-cases.md` lines 217-221 | ENV-1 | Pass | none (read in the clone) | rule 12 "A release build starts from `pnpm install` alone."; the other three files point to it | the Solution Designer's documents; not changed by the implementation |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-04 | Proven | |
| AC-002 | No | API-02, API-04 | Proven | |
| AC-003 | Yes | API-03 | Proven | |
| AC-004 | Yes | not run by me | Not Proven by me; assigned to delivery by the design and the requirements (the build-only release run on the pushed branch) | It needs the pushed branch and GitHub runners; `pnpm release:test` is delivery's step before the merge. It is not a user-only check |
| AC-005 | No | API-05 | Proven | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 93% | 93% | API-01..05 | AC-004 pending with delivery | the release run |
| Changed-boundary execution directness | 96% | 96% | API-01, API-02 run the changed scripts through the real gates | | |
| Cross-boundary integration realism and mock gap | 90% | 90% | fresh clone, the real install and gates | one OS (macOS arm64); the five runners' OS and `prisma generate` there | AC-004 |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | no node_modules or build output at start | a runner's own Node and pnpm versions | AC-004 |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | API-04 fails at the base; API-03 built machine unchanged | | |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no user surface changed | | |
| Durable regression coverage quality and relevance | 90% | 90% | the gate itself is the permanent check on every build chain; no new test is warranted for package scripts | no workflow type-checks from a clean runner on push (follow-up FU-1) | FU-1 |

- Overall post-repository confidence: 92%
- Overall final confidence: 92%
- Calculation method: simple average of the six applicable categories ((93+96+90+90+95+90)/6 = 92.3%); broader validation did not add a surface, so the post-repository score is repeated
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` — AC-004 is not mine to run (delivery's, by design)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (92%)
- Confidence-limiting residual risks: the five release runners (other operating systems, `prisma generate` and the longer prepare there), shown only by AC-004.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `CLI` / `Lifecycle` (clean clones)
- Confidence gap or residual risk it addresses, and the expected gain: the change is scripts only, so the real proof is a clean install plus the real gates; the clean clones (API-01..04) are that proof. The remaining gap (five runners) can only be closed by AC-004.
- Browser validation needed, and why or why not: no; nothing rendered changed.
- If `Blocked`: N/A

## Persisted-Data Transition Checks

Not applicable (no persisted data).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| None | | | |

- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

None

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/api-crb-fix`, `/tmp/api-crb-base` clones and their installs | Yes | removed after the evidence was saved | removed |
| `/tmp/api-crb-*.log`, `/tmp/api-crb-run.sh` | Yes | removed; the evidence folder holds the committed copies | removed |

## Preliminary Classification (On `Fail`)

Not applicable (result is `Pass`). The only failing run, API-04, is the expected base failure.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): AC-004 (the build-only release run, delivery's); no user-only parts
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `delivery_engineer`
- Notes: observation FU-3 (a stale header comment in `autobyteus-web/scripts/typecheck.mjs`) was added to `follow-ups.md`; it does not affect the result. The release run (AC-004) will also show the longer prepare time (ASM-001).
