# API/E2E Execution Coverage Report

## Round

- Coverage investigation: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/api-e2e-coverage-investigation.md
- API/E2E revision record and current revision ID: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/api-e2e-revision-record.md, `API-REV-001`
- Test progress log: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/api-e2e-test-progress.md
- Round and trigger: Round 1, implementation handoff IR-001 (direct route)
- Prior round reviewed: N/A
- Deviations from the plan: None
- Evidence folder: /Users/normy/autobyteus-org/autobyteus-task-worktrees/web-typecheck-gate/tickets/in-progress/web-typecheck-gate/evidence (the handoff message gives the commit)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | 25aa717ba57dadd4c1f4ca3fd5bf22948d077bee (fresh `git clone --no-local`, no build output) | macOS arm64 (Darwin 25.6.0) | Node 22.23.3, pnpm 10.28.2; build produced `AutoByteus_personal_macos-arm64-1.5.13-beta.6.dmg` | `AUTOBYTEUS_BUILD_FLAVOR=personal`, `CSC_IDENTITY_AUTO_DISCOVERY=false` (unsigned), no secrets |
| ENV-2 | 25aa717ba in the worktree | same host | same | worktree with earlier build outputs (implementation's environment) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 (Reused) | AC-001 | Web typecheck | Implementation check IMP-01 | per handoff | Pass (reused) | implementation handoff row | `[typecheck] PASS` | Ran at 47d21e36a; test file unchanged since (`git diff 47d21e36a 25aa717ba -- autobyteus-web` is empty). Reproduced on the head inside API-01 |
| IMP-02 (Reused) | AC-003 | The changed test | Implementation check IMP-02 | per handoff | Pass (reused) | implementation handoff row | `Tests  2 passed (2)` | Ran at afaeb9ed5; only tickets/ files changed since |
| IMP-03 (Reused) | AC-004 | Server typecheck | Implementation check IMP-03 | per handoff | Pass (reused) | implementation handoff row | `test-file errors: 1180 in 364 files (baseline 1180 in 364 files)` | Same commit reasoning as IMP-02; no server file changed |
| IMP-04 (Reused) | AC-004 | Web guards | Implementation check IMP-04 | per handoff | Pass (reused) | implementation handoff row | three `exit 0` | Same; the guards also ran in API-01 |
| API-01 | AC-001, AC-004 (guards), AC-006 | Desktop release build from a fresh clone | `git clone --no-local <worktree> /tmp/wtg-fresh/clone`, checkout 25aa717ba; `pnpm install --frozen-lockfile`; then in `autobyteus-web`: `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64` | ENV-1 | Pass | evidence/API-01-fresh-start-build-excerpt.log (full: API-01-fresh-start-build.log) | `[typecheck] cross-package tests (tsconfig.cross-package-tests.json): 0 errors, exit 0, 19.4s`; `[typecheck] production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)`; `[typecheck] PASS`; `install exit 0`; `build exit 0` | The build ran guards, typecheck, prepare-server, generate, transpile and packaging and wrote the dmg and zip. The fixture import needed no extra build output; the count equals the baseline, so the design's escalation trigger did not fire. `git status` in the clone shows only untracked `dist/` build outputs, no baseline change |
| API-02 | AC-006 | Release job's verify steps | The workflow's "Verify bundled Prisma ARM64 engine target" and "Verify packaged terminal runtime ARM64" commands from the clone root, incl. the `--spawn-probe` via the packaged app's Electron-as-Node | ENV-1 | Pass | evidence/API-02-fresh-start-verify-steps.log | `schema-engine OK`, `query engine OK`, `[terminal-runtime] ok: node-pty spawn probe`, all exit 0 | The signing-policy verify needs a signed bundle: Not Tested (runner secrets) |
| API-03 | AC-002, AC-005 | Diff and TESTING.md | Diff review, grep, read against design "Concrete Examples" | ENV-2 | Pass | evidence/API-03-diff-and-testing-md-review.log | `+import { createTestRunWorkspaceSkills } from '../../../autobyteus-server-ts/tests/fixtures/run-workspace-skills-fixtures.js';` and `+      workspaceSkills: createTestRunWorkspaceSkills({ runId }),`; cast grep `none`; baseline/tsconfig/scripts changes `0` | Row 37, new "Both typechecks" paragraph after the table, and step 5 match the design wording exactly. The paragraph states the reason (the web typecheck compiles server source and fixtures; the desktop build runs it) and names both commands. The anchor `#choosing-the-path` matches line 68. Commit B changes only TESTING.md and has the required `docs(testing):` subject. The `runId` is the harness's own const |
| API-04 | AC-007 | Merge | `git fetch origin personal`; `git merge-tree --write-tree HEAD origin/personal` | ENV-2 | Pass | evidence/API-04-merge-check.log | `merge-tree exit 0`; merge base equals `origin/personal` 742de88c2 (fast-forward); `tags on head: 0` | No tag, no release. The root-cause and escape statement is in investigation-notes.md lines 154-156, read and consistent with 460's evidence rows |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, IMP-01 | Proven | N/A |
| AC-002 | Yes | API-03 | Proven | N/A |
| AC-003 | Yes | IMP-02 | Proven | N/A |
| AC-004 | Yes | IMP-03, IMP-04, API-01 (guards) | Proven | N/A |
| AC-005 | Yes | API-03 | Proven | N/A |
| AC-006 | Yes | API-01, API-02 | Proven (signing, notarization, other OSes not tested: need the runner) | N/A |
| AC-007 | Yes | API-04 and investigation-notes.md:154-156 | Proven | N/A |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 95% | 97% | All seven criteria, API-01..04, IMP-01..04 | none material | n/a |
| Changed-boundary execution directness | 95% | 97% | The gate itself ran as the release job runs it (API-01) | none | n/a |
| Cross-boundary integration realism and mock gap | 95% | 95% | No mocks. Real fresh install and build | CI runner differs from this host (OS, secrets) | The next release run |
| Environment, configuration, identity, fixture fidelity | 90% | 93% | Fresh clone, frozen lockfile, workflow's env; unsigned | Signing and notarization, other OSes not run | The runner |
| Failure, edge-case, lifecycle, recovery | 90% | 92% | The one failure (missing property) is turned to PASS by a gate that fails on any new error; the baseline guards it | The "documented, not enforced" rule (RSK-001) is a process risk outside this check | A CI check (user decision) |
| User-surface, browser, desktop-shell | N/A | N/A | No user-facing change; the packaged app's terminal runtime probe passed (API-02) | n/a | n/a |
| Durable regression coverage quality | 95% | 95% | The gate (web typecheck with baseline) plus TESTING.md rule is the durable coverage | Rule not machine-enforced | n/a |

- Overall post-repository confidence: 93%
- Overall final confidence: 95%
- Calculation method: simple average of the six applicable final scores (97, 97, 95, 93, 92, 95 = 94.8, rounded to 95)
- Every critical acceptance criterion directly proven, apart from user-only parts: Yes
- Any final applicable category below 90%: No
- Default final confidence target of 95% met: Yes (95% overall; no category below 90%)
- Confidence-limiting residual risks: runner-only steps (signing, notarization, Intel and other OSes); RSK-001

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` (API-01 and API-02 are themselves the broader, realistic-system validation)
- Execution mode: `Lifecycle` (fresh-start release build, run within the repository cases)
- Confidence gap it addresses: runner differences; closed as far as the host allows
- Browser validation needed: No. No rendered or UI change
- If `Not Required`: API-01 exercises the real changed boundary (the desktop build's type gate); no browser, live-integration or shell-specific risk exists

## Persisted-Data Transition Checks

Not applicable: the design decision is `Not Affected`.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: No
- Compatibility-only or legacy-retention behavior observed in implementation: No
- Durable coverage added or retained only for compatibility-only behavior: No

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: No (API/E2E changed none; the implementation's commit A updated the existing test's setup)

None added, updated or removed by this role. Added or updated paths attached for test-code review: Not Applicable.

## Dependencies Mocked Or Emulated

None.

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| /tmp/wtg-fresh (clone, install, logs, dmg, the wrapper script) | Yes | `rm -rf /tmp/wtg-fresh` after the evidence was copied | Done at hand-off (see below) |
| Processes | Yes | none left (the script exited) | Done |

## Preliminary Classification (On `Fail`)

Not applicable.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: None
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: delivery (to be sent)
- Notes: Not run: signing-policy verify, signing, notarization, Intel x64, Linux, Windows, Android: they need the runner. No TESTING.md change by API/E2E: the documented Fresh-start command and verify steps worked as written. FU-001 stays with the Solution Designer. No release.
