# API/E2E Coverage Investigation

## Investigation Meta

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
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: clean implementation review for commit `902bd4d2e`; realistic API/E2E validation requested
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The approved behavior is a safe workspace-skill reconciliation policy shared by Codex and Claude. A verified broken expected workspace link is removed and, when the configured source still contains a valid `SKILL.md`, recreated to that source; otherwise it is removed and skipped with an actionable warning. A missing link for an unresolved binding is skipped, while live different symlinks and non-symlink collisions fail closed and remain untouched. Codex discovery annotates reconciliation intent rather than filtering a configured binding out. Shared acquisitions remain held until every occurrence releases; a new acquisition waits for final cleanup; a failed later binding rolls back all earlier occurrences and rethrows the original error object. Agent-run preparation logs the original unexpected error server-side, while the command/user surface remains generic. Runtime selection and `gpt-5.6-luna` must pass through unchanged. The persisted-data outcome is `Discard or Rebuild`: workspace links are transient projections, with no database migration, history rewrite, or compatibility path.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / AC-001, AC-002: stale Codex workspace link repair | Changed | requirements, design, implementation handoff | Prove real filesystem repair, source preservation, and successful Codex bootstrap. |
| BEH-002 / AC-003, AC-007-010: shared Codex/Claude policy and lifecycle | Changed | requirements and PREM-002 | Prove both runtime placements, occurrence ownership, final release/acquire serialization, and live collision safety. |
| BEH-003 / AC-004: diagnostics and generic user-safe failure | Changed/Preserved | requirements; manager implementation | Prove original server diagnostic identity and unchanged generic outer error/command failure. |
| BEH-004 / AC-005, AC-006: unresolved missing/broken omission | Added | requirements and design | Prove warning/skip and link-only removal without target deletion. |
| BEH-005 / AC-010: runtime/model selection | Preserved | requirements and handoff | Prove `CODEX_APP_SERVER` and `gpt-5.6-luna` are unchanged. |
| PREM-001: discovery is intent, not binding removal | Changed | design review and code review | A live Codex `skills/list` case with discoverable logical name plus broken expected path is needed. |
| PREM-003: failed-batch rollback/error identity | Changed | design review and code review | Prove duplicate occurrences roll back and exact original failure is rethrown. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | binding resolution, request planning, filesystem state machine | focused unit matrix | mocks do not prove real Codex discovery | live integration |
| API / transport / contract | Preserved | existing activation failure envelope | manager and WebSocket integration suites | correlation between new filesystem failure and generic envelope | temporary executable probe |
| Frontend component / state | No | no frontend source changed | prior screenshot and unchanged contract | none material | none |
| Browser integration / user journey | No | backend-only preparation before provider thread | N/A | none material | none |
| Authentication / session / permissions | No | unchanged | N/A | none | none |
| Desktop renderer / web-equivalent UI | No | unchanged generic error rendering | prior delivered-app reproduction | new implementation has no renderer change | none |
| Desktop shell / Electron-specific integration | No | no IPC/window/package change | N/A | none | none |
| Process / lifecycle | Yes | shared acquisition/release/rollback registry | deterministic concurrent unit scenarios | provider subprocess discovery is mocked in unit tests | real Codex app-server integration |
| Persisted-data transition | Yes, transient only | stale link is discarded/rebuilt | filesystem matrix | realistic stale workspace placement | live/temp filesystem journey |
| Worker / queue / distributed coordination | No | in-process registry only | N/A | multi-process ownership is not claimed | none |
| External integration | Yes | Codex `app-server` `skills/list`; Claude placement policy | environment-gated Codex integration and provider profile tests | no live Claude credential-independent discovery API equivalent | live Codex plus real filesystem Claude probe |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-luna-agent-run-prepare-failure`
- Project/runtime: pnpm TypeScript monorepo; server uses Vitest, Fastify/WebSocket integration harnesses, Codex app-server client, and filesystem-backed skill projections.
- Conflicts/limitations: generic `tsconfig.json` is not an authoritative gate because existing `rootDir: src` conflicts with included tests. Use `tsconfig.build.json`. The branch is five base commits behind; refresh is delivery-owned. The shared materializer is at the 500 effective-line ceiling, so coverage work must not expand production source.
- Required secrets: none for filesystem and app-server discovery. Live Codex requires an installed working `codex` binary and `RUN_CODEX_E2E=1`; model inference is not required.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | closest server instruction | `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; use integration paths similarly. |
| `autobyteus-server-ts/package.json` | scripts/build authority | production typecheck is `pnpm exec tsc -p tsconfig.build.json --noEmit`; server tests use Vitest. |
| `implementation-handoff.md` | prepared environment and known limits | dependencies, shared package, and Prisma client are prepared; full build passed; live Codex tests require explicit env flag. |
| `tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | live provider boundary | starts owned `codex app-server` clients in isolated temp workspaces and closes/removes them in `afterEach`. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| focused repository checks | `autobyteus-server-ts` | `pnpm exec vitest run ... --no-watch` | no shared service | Vitest exit 0 | automatic |
| live Codex app-server tests | `autobyteus-server-ts` | `RUN_CODEX_E2E=1 pnpm exec vitest run tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts --no-watch` | random temp roots; manager-owned child | `codex --version` and test discovery response | client manager close + temp-root removal |
| temporary filesystem/transport probes | `autobyteus-server-ts` | temporary TS/Vitest harness outside repository-resident suite | only owned temp paths/processes | explicit assertions and JSON evidence | remove temp roots and probe file |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| configured skill source | temp root with valid `SKILL.md` | no user skill mutation | remove temp root |
| stale workspace link | symlink inside temp workspace to deleted temp target | verify identity before removal; never touch source target | remove temp workspace |
| live collision | temp file/directory/different symlink | owned fixture only | remove temp workspace |
| app-server discovery | generated unique skill names | no model turn or credentials needed | close client and remove fixture |

## Persisted Data Transition Coverage Basis

- Approved decision: `Discard or Rebuild`
- References: design-spec persisted-data section; implementation-handoff persisted-data transition check.
- Representative setup: a stale workspace symlink whose old target no longer exists.
- Planned evidence: activation-time link-only discard and current-source recreation; cleanup removes the projection only; unresolved broken links are discarded without creating a replacement.
- Migration scenarios: N/A; no persistent schema/data transition is approved.
- Ambiguity/reroute: none.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts` | complete real-filesystem state/lifecycle matrix: broken repair, missing/unresolved, live collision, guarded replacement, shared holders, releasing/acquire, rollback/error identity | BEH-001-004; AC-001-009; PREM-002/003 | Still Valid | assertions match approved safety and ownership policy | execute |
| Codex/Claude materializer profile unit tests | singleton shared owner with `.codex/skills` and `.claude/skills` placement | AC-003, AC-011 | Still Valid | exact runtime profiles | execute |
| Codex/Claude bootstrapper unit tests | binding-to-request intent planning, Codex discovery, Claude parity, model pass-through | PREM-001, BEH-002, BEH-005 | Still Valid | direct request and config assertions | execute |
| `tests/unit/skills/services/skill-service.test.ts` | safe unresolved bindings retained in configured order; unsafe names omitted | AC-005/006 | Still Valid | current binding union assertions | execute |
| `tests/unit/agent-execution/agent-run-manager.test.ts` | original unexpected error object is logged and generic `AgentCreationError` with cause is returned | AC-004 | Still Valid | source/test diff explicitly asserts both surfaces | execute |
| `tests/integration/agent/agent-websocket.integration.test.ts` activation failure scenario | command failure becomes `ACTIVATION_FAILED` status/ACK | AC-004 preserved transport | Needs Update, then Still Valid | first execution exposed a stale service double lacking `resolveCommandReadyAgentRun`; the focused scenario was updated to use the current service contract and assert generic outward text excludes the private cause | execute focused scenario |
| `tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | package/private/shared skill configuration reaches runtime bootstrap and materializes a valid link | AC-011 cross-boundary placement | Still Valid | GraphQL/store/service/bootstrap path with real filesystem | execute |
| `tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` existing two cases | real `codex app-server` discovers logical names and materializes absent names | PREM-001 and placement | Needs Update, then Still Valid | first live execution exposed a stale agent-definition fixture missing the now-required name; fixture was corrected without production changes | execute with env enabled |

## Stale Or Obsolete Coverage Decisions

None. The implementation intentionally consolidated obsolete provider-specific algorithm matrices into one shared matrix; no remaining assertion conflicts with approved behavior.

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-SC-001 | live Codex discovery reports configured logical name while its canonical expected link is broken; bootstrap repairs link to current source | BEH-001, AC-001/002, PREM-001 | `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | This is the production failure topology and is not directly covered by either existing live case. It belongs beside the env-gated real app-server discovery coverage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-SC-004 | `tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` shared live fixture | supply required agent definition name | current production bootstrap contract; PREM-001 | Local fixture correction found by first live run. |
| API-SC-005 | `tests/integration/agent/agent-websocket.integration.test.ts` activation failure fixture/scenario | implement current `resolveCommandReadyAgentRun` service double and assert generic error excludes private cause | AC-004 | The targeted scenario now crosses real Fastify/WebSocket transport with the current coordinator contract. |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | focused 7-file Vitest bundle | `autobyteus-server-ts` | shared matrix, profiles, planning, bindings, manager diagnostics | Pass — 7 files / 96 tests | `evidence/api-e2e/01-focused-vitest-rerun.txt` |
| 2 | full package/private-skill E2E file | `autobyteus-server-ts` | package/GraphQL-to-bootstrap/filesystem boundary | Fail — 3 pass, 1 unrelated AutoByteus compaction-runner fixture failure | `evidence/api-e2e/02-package-skills-e2e.txt` |
| 3 | focused package/private-skill Codex materialization scenario | `autobyteus-server-ts` | directly relevant package-to-Codex bootstrap projection | Pass — 1 selected scenario | `evidence/api-e2e/02-package-skills-e2e-focused.txt` |
| 4 | full agent WebSocket integration file before/after fixture correction | `autobyteus-server-ts` | activation command transport | Fail — initially 5 fixture failures, then 2 unrelated lifecycle-assertion failures; relevant failure case passes | `evidence/api-e2e/03-agent-websocket.txt`, `03-agent-websocket-rerun.txt` |
| 5 | focused generic activation failure WebSocket scenario | `autobyteus-server-ts` | `ACTIVATION_FAILED` and generic user-safe text | Pass — 1 selected scenario | `evidence/api-e2e/03-agent-websocket-generic-focused.txt` |
| 6 | live Codex integration with `RUN_CODEX_E2E=1` including API-SC-001 | `autobyteus-server-ts`; Codex CLI 0.149.0 | real app-server discovery, stale-link repair, missing-name materialization | Pass — 3/3 | `evidence/api-e2e/04-live-codex.txt` |
| 7 | `pnpm exec tsc -p tsconfig.build.json --noEmit` | `autobyteus-server-ts` | production TypeScript graph | Pass | `evidence/api-e2e/05-production-tsc.txt` |
| 8 | temporary Claude profile stale-link probe | isolated temp filesystem | shared production class under `.claude/skills` | Pass — 1/1 | `evidence/api-e2e/06-claude-parity-probe.txt` |
| 9 | final selected run of both changed durable integration cases | `autobyteus-server-ts`; `RUN_CODEX_E2E=1` | critical live repair plus generic WebSocket projection on final test state | Pass — 2 files / 2 selected tests | `evidence/api-e2e/08-final-changed-tests.txt` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | focused matrix and boundary tests cover every BEH/AC and all three premises | live discovery/stale-link combination not yet counted in repository-only score | real Codex app-server run |
| Changed-boundary execution directness | 95% | production materializer runs against real filesystem; bootstrapper and manager code execute | provider discovery is mocked outside env-gated suite | live Codex suite |
| Cross-boundary integration realism and mock gap | 90% | relevant package E2E and real WebSocket error projection pass | provider subprocess and Claude profile composition remain pending | live Codex and Claude probes |
| Environment, configuration, identity, and fixture fidelity | 90% | real temp filesystem, Prisma reset, Fastify/WebSocket, current service contract | original provider child process not yet run at this checkpoint | live Codex CLI |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | deterministic tests cover every path state, collision, release/acquire race, rollback occurrence, and original error identity | multi-process coordination is not claimed | none material |
| User-surface, browser, and desktop-shell confidence | 94% | real WebSocket status/ACK carries generic text and excludes private cause; unchanged UI contract/screenshot | no new delivered-app shell run | no material gain expected from browser/shell |
| Durable regression coverage quality and relevance | 96% | shared matrix is comprehensive and targeted boundary assertions are durable | two broader files contain unrelated stale fixture/assertion debt | proportional test review and separate maintenance |

- Overall post-repository confidence: `94.0%`
- Calculation: simple average of seven applicable categories.
- Every critical acceptance criterion directly proven: `No` at this checkpoint — live PREM-001 topology pending.
- Any category below 90%: `No`
- Default 95% target met: `No`
- Material residual risk: repository-only evidence did not yet run the real Codex discovery process against the broken canonical link.

## Broader Validation Decision

- Decision: `Required` — completed successfully
- Selected mode: `Live API` / `Lifecycle` / real Codex child process
- Gap: the original failure occurred only when production preparation combined live Codex discovery with a stale canonical link. Unit and mocked bootstrap tests cannot prove the live discovery premise.
- Actual gain: real `skills/list` plus bootstrap repair passed for the discoverable-name/broken-link topology; real missing-name materialization and repo discovery passed; the Claude profile probe passed. Final confidence is recorded in the execution report.
- Browser decision: browser validation is not required. No renderer/client code changed, and the UI is a projection of the existing WebSocket error contract. The real changed boundary is backend preparation and filesystem/process lifecycle.

## Desktop Application Validation Decision

- Framework: Electron/web-wrapped delivered app, but this change has no renderer, preload, IPC, window, or packaging surface.
- Web-equivalent behavior: existing generic activation status/ACK contract.
- Chosen approach: server WebSocket integration plus live provider/filesystem execution; more direct than launching the desktop shell.
- Effect on running app: none; only isolated owned processes and temp directories will be used.
- Not directly proven: pixel rendering of the unchanged generic error; no material confidence penalty because the screenshot and pre-fix delivered-app evidence already establish that projection and no frontend code changed.

## Live Environment And Fixture Plan

- Executed the repository's env-gated Codex bootstrap integration with `codex-cli 0.149.0` and its owned `codex app-server` children.
- Use generated unique skill names and OS temp workspaces only.
- API-SC-001 executed as planned: live discovery, repaired symlink identity, source preservation, unchanged `gpt-5.6-luna`, warning disposition, and link-only cleanup all passed.
- Use the real Fastify/WebSocket integration test for `ACTIVATION_FAILED` transport and a temporary manager/coordinator probe only if the current durable assertions do not correlate the exact generic outer error and original cause sufficiently.
- Every Codex client was closed and all validation-owned temp roots were removed by test/probe cleanup.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Setup | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| API-SC-002 | isolated shared materializer probe using Claude profile and temp filesystem | production class repairs `.claude/skills` stale link and cleanup preserves source | shared durable matrix plus profile tests already protect the algorithm; this is one-time cross-profile composition evidence |
| API-SC-003 | no separate temporary probe needed after durable manager plus updated WebSocket assertions | original error is logged by identity while outward preparation/command message stays generic and excludes private cause | durable repository tests now provide the correlation at the appropriate boundaries |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| authenticated model generation for Claude | reconciliation is credential-independent and runs before provider session; no Claude API behavior changed | negligible | none unless provider session source changes |
| latest-remote-base integration | explicitly delivery-owned; branch is five commits behind | bounded integration risk | delivery refreshes before docs/finalization |
| generic root `tsconfig.json` | pre-existing rootDir/include misconfiguration | no change-specific risk because production config is authoritative | repository maintenance outside ticket |
| full package/private-skill E2E file | unrelated AutoByteus automatic-compaction runner fixture returns no runner | none for Codex/Claude reconciliation; selected relevant Codex scenario passes | separate fixture maintenance |
| full agent WebSocket integration file | two unrelated inactive-restore/busy lifecycle assertions remain stale after current service-double correction | none for the focused generic failure projection, which passes | separate integration-test maintenance |

## Ambiguities Or Reroute Triggers

None identified before execution.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` — add API-SC-001 only
- Post-repository confidence: `94.0%`
- Broader validation decision: `Required`, executed successfully
- Reroute Required Before Validation Execution: `No`
- Notes: API-SC-001 and two bounded fixture/transport coverage updates were made. No production source was changed. Final result and confidence are authoritative in `api-e2e-execution-coverage-report.md`.
