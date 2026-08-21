# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/in-progress/codex-luna-agent-run-prepare-failure/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/in-progress/codex-luna-agent-run-prepare-failure/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/in-progress/codex-luna-agent-run-prepare-failure/design-spec.md`
- Supplemental Task Artifacts: `evidence/full-stack-reproduction/experiment-report.md`, `evidence/reported-ui-error.png`
- Solution Revision Record: `solution-revision-record.md`
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md`
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md`
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: clean source review of implementation commit `902bd4d2e`
- Prior Round Reviewed: N/A
- Latest Authoritative Round: `1`

## Investigation And Execution Basis

- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with two evidence-driven additions: the live Codex fixture was brought up to the current required agent-definition contract, and the WebSocket fixture was brought up to the current `resolveCommandReadyAgentRun` service contract.
- Existing coverage decisions revised: the two integration fixtures above moved from `Needs Update` to `Still Valid`; no production change was required.
- Reroute required: `No`
- Notes: the realistic gate used the production Codex bootstrapper, production shared materializer, real Codex app-server process, real filesystem symlinks, and the actual Fastify/WebSocket transport. Browser/Electron launch was deliberately not used because no frontend, preload, IPC, shell, or rendering code changed.

## Compatibility / Legacy Scope Check

- Requirements/design introduce backward compatibility: `No`
- Compatibility-only or legacy-retention behavior observed: `No`
- Approved persisted-data transition followed without unnecessary migration or fallback: `Yes` — stale projections are discarded/rebuilt at activation.
- Durable coverage added only for compatibility behavior: `No`
- Reroute: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance Criteria | Changed Boundary | Execution Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API-SC-001 | BEH-001, BEH-005; AC-001, AC-002, AC-010; PREM-001 | live Codex discovery plus broken canonical projection | real `codex app-server` `skills/list` -> production bootstrapper -> production materializer -> real filesystem; `gpt-5.6-luna` config | Durable + Live | Pass | `evidence/api-e2e/04-live-codex.txt` |
| API-SC-002 | BEH-002; AC-003, AC-009, AC-011 | Claude runtime profile using shared reconciliation owner | production shared class with `.claude/skills` profile and real filesystem | Temporary | Pass | `evidence/api-e2e/06-claude-parity-probe.txt` |
| API-SC-003 | BEH-003; AC-004 | original server diagnostic identity versus generic outward activation error | manager unit plus real Fastify/WebSocket status and ACK | Durable | Pass | `evidence/api-e2e/01-focused-vitest-rerun.txt`, `03-agent-websocket-generic-focused.txt` |
| API-SC-004 | BEH-004; AC-005, AC-006 | unresolved missing/broken binding omission and link-only removal | production materializer against real filesystem in durable unit matrix | Durable | Pass | `evidence/api-e2e/01-focused-vitest-rerun.txt` |
| API-SC-005 | BEH-002; AC-007, AC-008 | live symlink/file/directory collisions fail closed and remain untouched | production materializer matrix | Durable | Pass | `evidence/api-e2e/01-focused-vitest-rerun.txt` |
| API-SC-006 | AC-003, AC-009; PREM-002 | same-source holders; final release/new acquire serialization and rematerialization | deterministic deferred filesystem operations against production class | Durable | Pass | `evidence/api-e2e/01-focused-vitest-rerun.txt` |
| API-SC-007 | PREM-003 | later-binding failure rolls back every earlier occurrence and preserves exact original error identity | production materializer failure/rollback matrix | Durable | Pass | `evidence/api-e2e/01-focused-vitest-rerun.txt` |
| API-SC-008 | AC-011 | imported agent package/shared skill configuration reaches Codex projection | repository E2E through stores/services/bootstrapper and real filesystem | Durable | Pass | `evidence/api-e2e/02-package-skills-e2e-focused.txt` |
| API-SC-009 | production compile graph | changed source compiles under authoritative server config | TypeScript build config | Durable | Pass | `evidence/api-e2e/05-production-tsc.txt` |

## Repository Coverage Execution

| Order | Command / Mode | Working Directory | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm exec vitest run` over the 7 focused files | `autobyteus-server-ts` | shared state/lifecycle matrix, profiles, bootstrappers, bindings, manager diagnostics | Pass — 7 files / 96 tests | `evidence/api-e2e/01-focused-vitest-rerun.txt` |
| 2 | full `agent-package-private-skills.e2e.test.ts` | `autobyteus-server-ts` | broader package/skill E2E | Non-blocking unrelated failure — 3 passed, 1 AutoByteus compaction-runner fixture failed | `evidence/api-e2e/02-package-skills-e2e.txt` |
| 3 | selected Codex materialization scenario from that E2E file | `autobyteus-server-ts` | relevant package-to-projection path | Pass — 1 selected | `evidence/api-e2e/02-package-skills-e2e-focused.txt` |
| 4 | full `agent-websocket.integration.test.ts`, before and after bounded fixture update | `autobyteus-server-ts` | broader WebSocket lifecycle | Non-blocking unrelated failures — improved from 5 failures to 2 inactive-restore/busy assertion failures; selected task case passes | `evidence/api-e2e/03-agent-websocket.txt`, `03-agent-websocket-rerun.txt` |
| 5 | selected generic activation failure WebSocket scenario | `autobyteus-server-ts` | actual outward error status/ACK | Pass — 1 selected | `evidence/api-e2e/03-agent-websocket-generic-focused.txt` |
| 6 | `pnpm exec tsc -p tsconfig.build.json --noEmit` | `autobyteus-server-ts` | authoritative production TypeScript graph | Pass | `evidence/api-e2e/05-production-tsc.txt` |
| 7 | `git diff --check` and cleanup/source-diff verification | worktree root | hygiene and temporary cleanup | Pass | `evidence/api-e2e/07-hygiene-cleanup.txt` |
| 8 | final selected execution of both changed integration cases with `RUN_CODEX_E2E=1` | `autobyteus-server-ts` | final durable-test state | Pass — 2 files / 2 selected tests | `evidence/api-e2e/08-final-changed-tests.txt` |

The full-file failures are retained as evidence rather than hidden. They do not exercise or contradict workspace-skill reconciliation: one is an AutoByteus automatic-compaction test double returning no runner; the other two concern offline restore projection and busy ACK timing in a broader WebSocket fixture. The directly relevant scenarios pass, production source was not altered by API/E2E, and these failures were not introduced by commit `902bd4d2e`.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Change | Final Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 98% | +3 | real critical stale-link topology plus every matrix/diagnostic/lifecycle path passed | no delivered-app rerun on fixed binary |
| Changed-boundary execution directness | 95% | 98% | +3 | production bootstrapper/materializer and real link operations executed | AgentRunManager was not wrapped around the real Codex case in the same process |
| Cross-boundary integration realism and mock gap | 90% | 96% | +6 | real app-server discovery, package E2E, real WebSocket, real filesystem | Claude provider process was unnecessary and not started |
| Environment, configuration, identity, and fixture fidelity | 90% | 96% | +6 | macOS arm64, Codex CLI 0.149.0, generated unique skills, `gpt-5.6-luna`, temp workspaces, production profiles | branch refresh against five remote-base commits is delivery-owned |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | 98% | 0 | collisions, guarded link identity, unresolved paths, overlapping release/acquire, rollback/error identity all direct | no multi-process registry coordination is claimed |
| User-surface, browser, and desktop-shell confidence | 94% | 95% | +1 | real WebSocket generic failure excludes private cause; UI contract unchanged and prior screenshot exists | pixels were not rerendered because no frontend/shell code changed |
| Durable regression coverage quality and relevance | 96% | 95% | -1 | critical real Codex topology is now durable; generic cause exclusion is durable | broader E2E/WebSocket files retain unrelated fixture debt |

- Overall post-repository confidence: `94.0%`
- Overall final confidence: `96.6%` (reported as `97%`)
- Calculation: simple average of seven applicable categories.
- Broader-validation gain: `+2.6 percentage points`
- Every critical acceptance criterion directly proven: `Yes`
- Final applicable category below 90%: `No`
- Default final 95% target met: `Yes`
- Confidence-limiting residuals: no post-fix packaged Electron journey; no live Claude provider session because the changed Claude boundary is credential-independent pre-session filesystem projection; delivery still must refresh the branch; unrelated broader fixture failures remain recorded.

## Broader Validation Decision And Execution

- Decision/mode: `Required`; Live API + lifecycle + real Codex child process.
- Deviation: none material. A temporary Vitest probe was used instead of `tsx` for Claude because the package has no `tsx` binary; the production class and real filesystem boundary remained the same.
- Addressed gap: proved that live Codex discovery does not filter away the configured binding when the canonical expected link is broken.
- Startup/readiness: `codex --version` returned `codex-cli 0.149.0`; each test started a manager-owned `codex app-server`; `skills/list` returned the generated logical name.
- Environment: isolated OS temp workspaces and unique skill names; no inference/model turn; no user workspace or running app touched. Codex reported project-local config disabled for untrusted temp projects but explicitly continued to load skills, which is the required boundary.
- Fixture identity: runtime `CODEX_APP_SERVER`; model `gpt-5.6-luna`; valid current `SKILL.md`; broken canonical symlink to a nonexistent old target; separately discoverable repo skill of the same logical name.

| Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| list skills before repair | same logical name is discoverable despite broken canonical path | real `skills/list` returned enabled repo skill | live test assertion/process log | Pass |
| bootstrap with Luna | bootstrap completes and model stays `gpt-5.6-luna` | returned run context has exact model | live test assertion | Pass |
| repair stale link | canonical path becomes symlink to current configured source and warning says `repaired` | exact target/readlink and warning matched | live test assertion | Pass |
| preserve sources | configured source and separately discoverable source remain intact | both `SKILL.md` files stat successfully | live test assertion | Pass |
| cleanup | remove only owned canonical projection | canonical lstat is ENOENT; both sources remain | live test assertion | Pass |
| missing discoverable name | configured skill is projected and visible to subsequent live discovery | existing live integration case passed | `04-live-codex.txt` | Pass |
| Claude parity | same stale-link repair/cleanup under `.claude/skills` | production shared owner/profile passed against real filesystem | `06-claude-parity-probe.txt` | Pass |

## Desktop Application Validation

- Approach: no browser or desktop launch. This backend preparation change has no renderer, preload, IPC, shell, routing, or visual delta.
- Web-equivalent evidence: actual Fastify/WebSocket status and ACK carry the generic preparation failure and exclude the private cause.
- Shell-specific behavior: N/A.
- Effect on running desktop application: `None`.
- Unproven behavior: post-fix pixel rendering; bounded negligible uncertainty because the pre-fix screenshot establishes the existing projection and no frontend code changed.

## Platform / Runtime Targets

- OS: macOS 26.5.2, arm64
- Node: v22.23.1
- pnpm: 10.28.2
- Vitest: 4.0.18
- Codex: codex-cli 0.149.0
- Implementation commit: `902bd4d2e79e7719aca6cad473760b0f86589393`
- Artifact HEAD during validation: `72086b52c071273dbff49ce0a31f7ab94b4e96d3` plus uncommitted API/E2E durable tests/artifacts
- Browser/device: N/A

## Lifecycle / Persisted-Data Checks

- Decision: `Discard or Rebuild`
- Existing data: broken workspace symlinks to deleted old skill sources.
- Result: verified stale link identity is discarded and rebuilt to current source; unresolved broken projection is discarded and skipped; cleanup removes only the projection; current sources remain intact.
- Migration: N/A.
- Version-specific runtime branch, dual read/write, or compatibility fallback: `No`.
- Residual persisted-data risk: none material; workspace links are explicitly transient.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | Added + Updated | API-SC-001 / PREM-001 / AC-001,002,010 | Pass — full live file 3/3 | Added live discoverable-name/broken-canonical-link repair with Luna and cleanup; supplied current required fixture name. |
| `autobyteus-server-ts/tests/integration/agent/agent-websocket.integration.test.ts` | Updated | API-SC-003 / AC-004 | Pass — selected case | Current service-double method added; generic `AgentCreationError` asserted in status/ACK; private cause excluded. |

## Tests Removed

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed: `Yes`
- Updated paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/autobyteus-server-ts/tests/integration/agent/agent-websocket.integration.test.ts`
- Removed paths: none
- Attach for proportional review: `Yes`

## Other Execution Artifacts

All retained raw logs are under `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure/tickets/in-progress/codex-luna-agent-run-prepare-failure/evidence/api-e2e/`. Failed intermediate runs are intentionally retained with the passing reruns.

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| temporary `tests/.tmp/api-e2e-claude-stale-link-probe.test.ts` | one-time independent composition proof under actual Claude profile | Pass 1/1 | file and temp root removed; verified by `07-hygiene-cleanup.txt` |
| real Codex app-server children | live discovery premise could not be proven by mocks | Pass 3/3 | client manager closed each process; temp roots removed by `afterEach` |

## Dependencies Mocked Or Emulated

| Dependency | Method | Reason | Limitation |
| --- | --- | --- | --- |
| Claude provider session | not started; only production pre-session filesystem profile executed | provider credentials/model inference are outside the changed boundary | does not prove an unrelated Claude inference turn |
| AgentRunService internals in WebSocket suite | current-contract service double | isolate actual transport/coordinator projection | manager logging is proven separately by production manager unit test |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | API-SC-001 through API-SC-009 | Every ticket-critical behavior and acceptance criterion passed on the relevant repository and realistic boundary. |
| Out Of Scope / non-blocking repository debt | broader package E2E compaction fixture; two broader WebSocket lifecycle assertions | retained raw evidence; neither contradicts or executes the workspace-skill change. |

## Cleanup Performed

| Resource | Ownership | Cleanup | Result |
| --- | --- | --- | --- |
| Codex app-server processes | validation-owned | `clientManager.close()` in `afterEach` | Pass |
| generated skill/workspace roots | validation-owned OS temp paths | recursive removal in test/probe cleanup | Pass |
| temporary Claude probe file | validation-owned | removed after run | Pass |
| user app/process/workspaces | not owned | not touched | Pass |

## Preliminary Classification

- Ticket implementation: `Pass`; no rework classification required.
- Broader package E2E failure: `Local Fix` in unrelated AutoByteus test fixture.
- Remaining broader WebSocket failures: `Local Fix` in unrelated lifecycle fixture/assertions.
- These non-ticket failures are recorded for follow-up and do not change the workspace-reconciliation result.

## Recommended Recipient

`/code_reviewer` for proportional review of the two changed durable test files.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `97%` (`96.6%` calculated)
- Default 95% target met: `Yes`
- Any category below 90%: `No`
- Broader validation: `Required`, completed successfully
- Critical acceptance criteria lacking direct proof: none
- Required next recipient: `/code_reviewer`
- Notes: production source was not changed during API/E2E. The branch remains five commits behind `origin/personal`; delivery owns refresh after test-code review.
