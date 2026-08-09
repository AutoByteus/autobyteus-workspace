# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/bible-study-trace-probe.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Investigation Round: `4`
- Trigger: Proportional durable test/config review `CRR-007` returned `TCR-001` and `TCR-002` as bounded API/E2E-owned local fixes while preserving the execution and source passes.
- Prior Investigation Reviewed: Round 3 / `API-REV-003`
- Latest Authoritative Investigation: Round 4 pre-edit and final rerun updates at the end of this document; earlier round sections remain historical context.

## Current Requirement And Design Basis

The reviewed implementation must prove five approved behavior groups: every native tool invocation receives exactly one truthful terminal result; provider/transport/media failures do not poison the logical agent; `generate_image` has the explicit -> server-setting -> default media-only bound with cancellation propagation and no universal watchdog; publication is lease-gated, staged, atomic, serialized per final path, and suppresses stale/late completions; and restart/recovery repairs orphaned calls before strict v5 validation, persists raw terminal error facts before the derived snapshot, converges idempotently, and restores ready/idle follow-up dispatchability. The accepted persisted-data decision is `Directly Usable — No Migration`: current v5 readers/writers must consume representative existing data, while orphaned native calls are repaired through the current raw-first protocol rather than a versioned compatibility reader.

The implementation-source package is authoritative at `ARCH-REV-006`, `IR-004`, and the passing `CRR-006`; `CRR-007` is the subsequent proportional durable-test/config review that triggered this round. No design or implementation-source finding remains. Provider SDK cancellation remains best effort, while raw-first convergence, partial-tail handling, late publication suppression, cleanup settlement, and ready/idle follow-up are covered by the downstream evidence recorded below.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / native tool lifecycle | Changed | Requirements AC-001/002/009; design DS-001/DS-003; IR-003 | Existing tool-phase and continuation tests remain useful; persisted orphan restore must assert one raw terminal error result and strict-valid repaired snapshot. |
| BEH-002 / recoverable turn and runtime lifecycle | Changed | Requirements AC-003/004/008; design ARCH-DES-004; IR-002/003 | Existing runner/status/runtime lifecycle tests are relevant; broad runtime continuation should be rerun where collection permits. |
| BEH-003 / media API/tool contract and operation boundary | Changed | Requirements AC-001/005/006/007; design DS-002/DS-004; IR-003 | Existing server-owned media registry E2E proves contract and output files, but its provider mocks do not prove parent abort, timeout precedence, staging, or late publication suppression. Add a focused durable cancellation/publication scenario at the server media E2E boundary. |
| BEH-004 / truthful terminal errors | Changed | Requirements AC-002/006; design DS-001/DS-002/DS-003 | Existing tool error and repair tests are relevant; stale repair assertions must be updated to `tool_result: null` plus non-empty `tool_error`. |
| BEH-005 / persisted recovery and dispatchability | Changed | Requirements AC-003/008/009; design DS-003/DS-004; IR-003 | Existing resume-recovery integration test is stale because it expects strict rejection and no mutation; update it to exercise repair before strict validation and verify raw/snapshot convergence. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Memory repair, turn/status recovery, media generation service and lease/publication | autobyteus-ts unit/integration tests; server media unit/E2E tests | The earlier Prisma collection blocker and cancellation/publication coverage gap were resolved in rounds 2-3; only provider-specific SDK behavior remains outside deterministic local proof | Focused executable probes and targeted suites |
| API / transport / contract | Yes | Media tool registry/manifest/options and provider/download option propagation | server-owned media registry E2E; client/download integration tests | Mocked providers do not prove real SDK cancellation or HTTP stream abort | Temporary local emulation; live API only if credentials are safely available |
| Frontend component / state | No | No frontend files or user renderer behavior changed | N/A | None | None |
| Browser integration / user journey | No | Change is backend/runtime/media and persisted memory, not UI | N/A | None | None |
| Authentication / session / permissions | No | No auth/session/permission logic changed | N/A | None | None |
| Desktop renderer / web-equivalent UI | No | No renderer path changed | N/A | None | None |
| Desktop shell / Electron-specific integration | No | No shell/preload/IPC path changed | N/A | None | None |
| Process / lifecycle | Yes | Agent turn/worker recovery, child cancellation, late provider settlement | autobyteus-ts runtime and LLM phase integration tests; media operation code | Server suites now collect; provider-specific SDK cancellation and a real process restart are not claimed | Lifecycle-focused executable checks; no browser |
| Persisted-data transition | Yes | Existing v5 snapshot/raw trace repair without schema migration | memory unit/integration tests and file stores | Existing stale integration test asserts old strict rejection; must be replaced with current direct-use repair proof | Repository integration test; temporary file-store probe if suite blocked |
| Worker / queue / distributed coordination | Partly | In-process worker/turn settlement and per-path publication lock | runner/status tests; source review | No multi-process distributed media coordination is in scope; no universal watcher/watchdog is intended | Lifecycle probe only |
| External integration | Yes | Provider/client/download cancellation option forwarding | client unit/integration tests and mocked server E2E | No safe provider credential/live service assumed; SDK cancellation behavior remains best effort | Temporary emulated provider or live API only if configured |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang`
- Project type and runtime stack: pnpm monorepo, TypeScript packages (`autobyteus-ts`, `autobyteus-server-ts`), Vitest, GraphQL server boundary, Node filesystem/media adapters, optional Electron frontend (not affected).
- Conflicting, missing, or unclear project instructions: No conflict found. Server instructions require `vitest run`/`--no-watch`; web instructions require `--run`, but web is out of scope. The earlier server Prisma generated-client/CommonJS collection blocker is resolved by the bounded canonical Vitest dependency transform recorded in rounds 2-4.
- Required environment variables or secrets available: `N/A` for mocked repository checks; no provider credentials are assumed for live validation.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-server-ts/AGENTS.md` | Server testing instructions | `pnpm -C autobyteus-server-ts exec vitest`; integration subset with `vitest run ... --no-watch`; single-file invocation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-web/AGENTS.md` | Web testing guidance | `pnpm test:nuxt --run`, `pnpm test:electron`; not applicable because no web files changed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/package.json` | Root execution path | `pnpm test:e2e` delegates to server Vitest E2E; `test:e2e:real` requires built server and live harness. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/package.json` | Core build path | `pnpm -C autobyteus-ts build`; no package-wide test script. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/vitest.config.ts` | Core test configuration | Node environment, setup file, `--run`/Vitest direct execution; ticket paths excluded. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-server-ts/vitest.config.ts` | Server test configuration | Fork pool, serial file execution, Prisma setup/global setup, `tests/**/*.test.ts` inclusion. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Core TypeScript | worktree root | `pnpm -C autobyteus-ts build` | Compiles shared runtime; no service process | command exit and build output | none |
| Core focused Vitest | `autobyteus-ts` | `pnpm -C autobyteus-ts exec vitest run <paths> --run` | Uses temporary filesystem fixtures | Vitest result | tests remove temp dirs |
| Server focused Vitest | worktree root | `pnpm -C autobyteus-server-ts exec vitest run <paths> --no-watch` | Prisma setup may fail before tests execute | Vitest collection/readiness output | tests remove temp dirs; no long-lived server |
| Real live E2E harness | worktree root | `pnpm test:e2e:real:preflight` / `pnpm test:e2e:real` only if prerequisites are available | Requires documented live environment/secrets; not assumed | preflight result | harness cleanup per project script |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Orphan native call | Existing file-store and snapshot-store temp directories in `incomplete-tool-call-resume-recovery.test.ts` | isolated OS temp dir, no secrets | test finally removes temp dir |
| Media output/staging | Existing server media E2E temp workspace/output directories | isolated OS temp dirs and `.server-owned-media-output-*` paths | `afterEach` removes all created dirs |
| Live provider identity | None required for repository evidence | no credentials assumed or fabricated | N/A |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design persisted-data section/DS-003 and implementation handoff behavior BEH-005; no schema migration or legacy reader is allowed.
- Representative existing-data setup and required behavior: strict v5 snapshot containing an assistant native `generate_image` call with no following tool result, plus raw `tool_call` evidence. Bootstrap must accept the safe envelope, repair the orphan with a canonical raw `tool_result` (`tool_result: null`, non-empty `tool_error`, original call args), persist the derived snapshot, and then pass strict validation.
- Evidence planned: update the resume-recovery API/E2E integration test to assert repaired native tool history, one terminal raw result, preserved args/identity, strict-valid snapshot, idempotence on a second repair/bootstrap, and next-message provider dispatchability.
- Migration-specific completion/recovery scenarios: `N/A` — no migration required.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/unit/agent/loop/agent-turn-runner.test.ts` | Post-LLM/post-tool interruption fences and continuation-ready event ordering | BEH-001/004; AC-001/002; DS-001/DS-004 | Still Valid | Assertions remain about interruption boundary and no terminal success after accepted interrupt; source review confirms lifecycle owner | Run focused |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/unit/agent/status/status-deriver.test.ts` | Recovered/terminal status derivation | BEH-002/005; AC-003/004/008 | Still Valid | Implementation handoff reports focused status tests pass; no obsolete expectation found in relevant cases | Run focused |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/unit/agent/loop/llm-phase-tool-protocol-recovery.test.ts` | Runtime interruption and incomplete native tool-call continuation rendering | BEH-001/004/005; AC-001/003/008/009 | Still Valid | Resume test already expects terminal error content and provider-safe native tool result; it exercises in-memory recovery path | Run focused |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/unit/memory/working-context-tool-protocol-repairer.test.ts` first scenario | Synthetic interruption repair and idempotence | BEH-001/004; AC-001/002/009 | Needs Update | Assertion expects marker/content in `toolResult` and `toolError: null`; current design explicitly removes marker-only completion and requires `tool_result: null` plus `tool_error` | Update assertions and retain scenario |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/unit/memory/working-context-tool-protocol-repairer.test.ts` partial-batch scenario | Preserve raw completed fact and synthesize remaining call | BEH-001/004/009 | Needs Update | Scenario remains valid, but synthetic result assertion still encodes marker-only content and no error | Update assertions; preserve raw fact/compound identity checks |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/integration/agent/incomplete-tool-call-resume-recovery.test.ts` | Strict restore rejects incomplete v5 snapshot, with no raw/snapshot mutation | BEH-005; AC-008/009 | Stale / Remove | Current approved DS-003 requires safe-envelope -> repair -> strict validation and raw-first convergence; CRR-003/IR-003 confirm this is obsolete | Replace with current persisted repair/restore journey in same path |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/unit/memory/working-context-snapshot-bootstrapper.test.ts` | Current-only strict v5 restore, no old-schema reader, lineage checks | Persisted-data decision and DS-003 | Still Valid | These assertions enforce current-only/no-legacy policy and do not assert orphan behavior | Run focused |
| `/Users/normy/autobyteus_org/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/unit/memory/tool-interaction-builder.test.ts` | Pending vs terminal interaction classification | BEH-001/004; AC-001/002/009 | Still Valid | Current terminal error classification is directly relevant and assertions match current model | Run focused (path typo corrected below) |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-server-ts/tests/unit/agent-tools/media/media-generation-service.test.ts` | Service owner calls provider, writes output, cleans client | BEH-003/004; AC-005/006 | Needs Update | Directly relevant but current assertions omit operation options, timeout precedence, cancellation, staging/publication; collection is known blocked by generated Prisma/CommonJS imports | Add focused option/cancellation/publication assertions if test can collect; otherwise retain and use executable probe |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Local registry -> media service -> mocked provider -> output files; schema/settings/path GraphQL boundary | BEH-003; AC-005/006/007 | Needs Update | Real registry/service/path/GraphQL boundary is exercised, but mocks ignore options and no late publication scenario exists | Add parent-cancel/stale-publication scenario and option-aware mock recording |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-server-ts/tests/integration/utils/download-utils.integration.test.ts` | Download utility filesystem/URL behavior | BEH-003/004; AC-006 | Still Valid | Relevant transfer boundary; no changed assertion found | Run focused where environment permits |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/integration/clients/autobyteus-client-media-staging.test.ts` | AutoByteus client media staging/transfer contract | BEH-003; AC-005/006 | Still Valid | Direct client transport/staging contract | Run focused |
| Other web/Electron tests | Unrelated UI/shell behavior | No changed requirement | Out Of Scope | No frontend files changed and design has no user-surface impact | Do not execute |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/agent/incomplete-tool-call-resume-recovery.test.ts` | Invalid v5 snapshot must throw and neither raw evidence nor snapshot may change | Contradicts approved raw-first repair before strict validation | design DS-003, persisted-data decision, IR-003, CRR-003 | Same file updated to construct a strict-v5 envelope with orphan call, bootstrap successfully, assert one canonical terminal raw error and provider-safe repaired snapshot, then continue the LLM path | N/A |
| First/partial synthetic assertions in `autobyteus-ts/tests/unit/memory/working-context-tool-protocol-repairer.test.ts` | Synthetic marker text is stored as `toolResult` and `toolError` is null | Marker-only recovery was removed; result must be null and error must be explicit/truthful | design legacy removal policy and ARCH-DES-002/DS-003 | Same unit scenarios updated to assert `SYNTHETIC_TOOL_RESULT_ERROR`, null result, args, and idempotence | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | Persisted orphan repair and current v5 restore | BEH-001/005; AC-001/003/008/009; DS-003 | Update `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-ts/tests/integration/agent/incomplete-tool-call-resume-recovery.test.ts` | Critical persisted-data and recovery acceptance criterion; old test is directly contradictory and must be replaced rather than retained. |
| API-002 | Parent cancellation, lease revocation, late completion suppression, and final-path preservation | BEH-003/004; AC-005/006/007; DS-002/DS-004; IR-003 | Update `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Critical media publication race is not represented in existing durable coverage; source review explicitly routes it downstream. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-003 | `working-context-tool-protocol-repairer.test.ts` synthetic repair cases | Update expected shape to explicit terminal error and preserve args/identity | BEH-001/004; AC-001/002/009; DS-003 | No behavior change to test intent; only obsolete result/error encoding is removed. |
| API-004 | `server-owned-media-tools.e2e.test.ts` mock provider signatures | Accept/record `MediaOperationOptions`, and add abort-aware deferred provider scenario | BEH-003; AC-005/006/007 | Keep real registry/path/publication boundary; use deterministic local mock, not external credential. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None as a whole-file removal | The stale assertions are replaced in place to preserve scenario coverage and avoid deleting valid test setup. | DS-003 and no-backward-compatibility policy | In-place replacement with API-001/API-003; no obsolete assertion remains. |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 0 | `git diff --check` | worktree root | Coverage edits/report formatting | Planned | `/tmp/article-writing-image-generation-hang-diff-check.txt` |
| 1 | `pnpm -C autobyteus-ts exec vitest run tests/unit/memory/working-context-tool-protocol-repairer.test.ts tests/integration/agent/incomplete-tool-call-resume-recovery.test.ts tests/unit/agent/loop/agent-turn-runner.test.ts tests/unit/agent/status/status-deriver.test.ts tests/integration/agent/working-context-snapshot-restore-flow.test.ts --run` | worktree root | Memory protocol, lifecycle, persisted restore | Planned | `/tmp/article-writing-image-generation-hang-core-focused.txt` |
| 2 | `pnpm -C autobyteus-ts exec vitest run tests/integration/clients/autobyteus-client-media-staging.test.ts --run` | worktree root | Client media staging/options transport | Planned | `/tmp/article-writing-image-generation-hang-client-media.txt` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/media/server-owned-media-tools.e2e.test.ts --no-watch` | worktree root | Server media registry/service/path/GraphQL | Planned | `/tmp/article-writing-image-generation-hang-server-media-e2e.txt` |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/media/media-generation-service.test.ts tests/integration/utils/download-utils.integration.test.ts --no-watch` | worktree root | Service/transfer implementation checks | Planned; known potential Prisma/CommonJS collection block | `/tmp/article-writing-image-generation-hang-server-media-unit.txt` |
| 5 | `pnpm -C autobyteus-ts build` | worktree root | Core build/typecheck after durable coverage edits | Planned | `/tmp/article-writing-image-generation-hang-core-build.txt` |
| 6 | `pnpm -C autobyteus-server-ts typecheck` | worktree root | Server typecheck | Planned; known unrelated generated Prisma block | `/tmp/article-writing-image-generation-hang-server-typecheck.txt` |
| 7 | `pnpm test:e2e:real:preflight` | worktree root | Real harness prerequisite check, only if local setup is safe | Planned / may be blocked | `/tmp/article-writing-image-generation-hang-live-preflight.txt` |

## Post-Repository Confidence Scorecard (Mandatory)

To be completed after the commands above; no confidence is inferred before execution.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | Pending | No final execution yet | Critical persisted repair and parent-cancel publication still unexecuted | Execute API-001/API-002 and focused lifecycle suites |
| Changed-boundary execution directness | Pending | Planned tests reach real memory/service owners | Collection status unknown; media unit blocked in prior round | Run focused suites and temporary probes if collection blocks |
| Cross-boundary integration realism and mock gap | Pending | Registry/path/raw snapshot tests are mostly local and deterministic | Providers and external downloads are mocked/emulated | Execute local deferred provider and client transport tests; assess live preflight |
| Environment, configuration, identity, and fixture fidelity | Pending | Existing temp fixtures and project Vitest setup are deterministic | Live provider credentials and full server generated artifacts may be unavailable | Use documented setup; record blockers rather than fabricate live proof |
| Failure, edge-case, lifecycle, and recovery evidence | Pending | Existing runner/status and stale recovery scenarios target edge paths | Parent abort after provider completion and partial-tail convergence need direct proof | Execute API-001/API-002 and lifecycle checks |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend, browser, renderer, or shell boundary changed | None for approved scope | None |
| Durable regression coverage quality and relevance | Pending | Existing tests are requirement-linked but two contain obsolete assertions | Updated tests must collect and pass, including deterministic abort race | Code reviewer proportional test review after pass |

- Overall post-repository confidence: Pending
- Calculation method: Average of applicable categories after execution; user-surface category is N/A.
- Every critical acceptance criterion directly proven: Pending
- Any applicable category below 90%: Pending
- Default clean-confidence target of 95% met: Pending
- Material residual risks: provider SDK cancellation remains best effort; server generated Prisma/CommonJS blocker may prevent media collection; no real external provider run is assumed.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Lifecycle` / `Other` temporary deterministic local executable probe if repository media suite remains blocked; no browser.
- Specific confidence gap or residual risk addressed: The changed media boundary crosses parent cancellation, provider late settlement, staging, atomic publication, and cleanup; a passing mocked synchronous provider test alone does not prove the race. Persisted restore also requires current raw/snapshot convergence and follow-up dispatchability.
- Why selected mode can materially improve confidence: A deferred local provider and isolated temp files can exercise the actual service/registry path without external credentials, while the persisted integration test can assert raw-first repair and next-turn readiness.
- Expected confidence after selected validation: At least 95% if API-001/API-002 and focused lifecycle checks pass and no category remains below 90%; otherwise record the bounded gap or reroute.
- Browser-specific decision and rationale: Not applicable; no browser/user-surface change.
- If Not Required: N/A at investigation stage.
- If Blocked: record exact dependency only after safe setup, focused probe, and emulation attempts.

## Desktop Application Validation Decision (When Applicable)

- Desktop framework / shell: Electron exists in repository but is out of scope.
- Relevant README or development instructions: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/autobyteus-web/AGENTS.md` (not applicable).
- Web-equivalent behavior: None changed.
- Shell-specific or lifecycle behavior: None changed.
- Chosen validation approach and why it fits the project: No desktop/browser execution.
- Server/frontend setup when browser validation is used: N/A.
- Effect on any already-running desktop application: None.
- Behavior not directly proven and confidence consequence: None within approved changed scope.

## Live Environment And Fixture Plan (Required When Broader Validation Runs)

- Startup order and commands: Prefer repository Vitest; if a broader local probe is necessary, run it with isolated temp directories and an in-process deferred provider. Do not start shared server/data services unless project preflight proves they are needed.
- Environment choices that materially affect the run: Node test environment, pnpm-managed dependencies, isolated OS temp directories, no provider credentials.
- Health / readiness checks: Vitest collection and exit status; deferred promise settlement; final output bytes and absence of stale publication.
- Seed data / fixtures: One orphan native tool call/v5 snapshot; one existing final media output plus deferred replacement.
- Test identities, authentication, permissions, or session state: Synthetic agent/run/turn/invocation IDs; no auth.
- Requirement-linked journeys or scenarios: API-001 persisted restart repair; API-002 parent abort after provider completion / late settlement; existing API-003 runner/status and API-004 client staging paths.
- DOM, screenshot, log, API, process, or other evidence to capture: Vitest stdout, raw trace list, serialized snapshot validity, provider options signal state, final output bytes, temp directory listing, and command logs.
- Owned processes and temporary state to clean up: Test processes only; tests remove temp dirs; no shared processes.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PROBE-001 | If server media E2E cannot collect, run a one-off TypeScript/Node probe using the service's injected resolver/client dependencies, a deferred provider, parent AbortController, and isolated filesystem paths. | Lease revocation and stale late publication suppression at actual service owner. | Only an environment workaround for generated Prisma collection failure; durable regression belongs in server E2E if test infrastructure is restored. |
| PROBE-002 | If persisted integration collection fails, run a one-off core module probe against temp `FileMemoryStore`/`WorkingContextSnapshotStore` with the same orphan payload. | Raw-first repair and strict-valid v5 convergence. | Durable scenario is appropriate in existing integration test; probe only supplies interim evidence. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real external provider cancellation guarantees | No safe provider credential/runtime is assumed; SDK behavior is provider-specific and source review already labels it best effort | Provider may continue work after abort despite local suppression | Keep local late-settlement evidence; delivery should retain residual-risk note unless a configured live environment is explicitly provided |
| Browser/Electron shell | No changed surface | None for scope | None |
| Multi-process/distributed publication | Design uses in-process per-path lock and no universal watchdog; not required acceptance boundary | Cross-process race remains outside approved scope | Do not expand scope without design review |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time | N/A | CRR-003 states no source-review ambiguity; stale tests are decisively contradicted by current design | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Post-repository confidence: Pending until execution
- Broader validation decision: `Required` (targeted lifecycle/local executable evidence; browser not applicable)
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: This investigation intentionally precedes all durable test edits and final execution. The two stale memory assertions are updated in place, not deleted without replacement. If durable media coverage is added/updated, the completed package must return through `code_reviewer` before `delivery_engineer`.

## Investigation Round 1 Execution Update (Authoritative)

The planned execution is complete to the extent the assigned environment permits. This section supersedes the pre-execution `Planned`/`Pending` values above.

- `git diff --check`: Pass.
- Core focused Vitest: Pass, 5 files / 13 tests, including API-001 persisted repair, API-003 explicit terminal error repair, API-004 lifecycle/status/recovery.
- Core build: Pass (`pnpm -C autobyteus-ts build`).
- Server media E2E: Blocked before test collection by `SyntaxError: Named export 'Prisma' not found` from CommonJS `@prisma/client` in `src/secret-management/persistence/secret-vault-repository.ts`.
- Server media unit/integration: Same Prisma/CommonJS collection blocker; download integration was skipped.
- Core client media staging integration: Blocked by missing explicit API-key authentication.
- Server typecheck: Blocked by existing `TS6059` test/rootDir configuration errors after shared preparation.
- Temporary direct `MediaGenerationService` probe: Pass; parent abort rejected the operation and a deferred late provider completion did not overwrite the existing final output. Temporary source was removed and temp data cleaned.
- Updated durable coverage: stale restore test replaced with current raw-first convergence assertions; marker-only/omitted-error repair assertions updated; media E2E cancellation scenario added. These durable paths require proportional `code_reviewer` review after the environment blocker is resolved.

### Final Scorecard

| Confidence Category | Score | Basis | Remaining Gap |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Core persisted/lifecycle and direct media-owner invariants pass | Server registry/GraphQL media contract unexecuted |
| Changed-boundary execution directness | 90% | Direct core tests and service-owner probe | Durable server boundary blocked |
| Cross-boundary integration realism and mock gap | 80% | Deferred provider and filesystem probe | External provider and GraphQL/Prisma path unavailable |
| Environment/configuration/fixture fidelity | 80% | Isolated deterministic fixtures | Prisma interop and API-key setup unavailable |
| Failure/edge/lifecycle/recovery evidence | 95% | Raw-first idempotence, interruption/status, late completion pass | Provider-specific cancellation still best effort |
| User-surface/browser/desktop-shell | N/A | No UI/shell change | None |
| Durable regression coverage quality/relevance | 85% | Core updated tests pass; media scenario cannot collect | Proportional test review pending |

- Overall applicable confidence: 86.7% (87% rounded; simple average excluding N/A).
- Broader validation: Required and partially completed via passing temporary local probe; final result remains `Blocked` because the server API/E2E boundary cannot be exercised.
- Critical acceptance criteria directly proven: `No`; server registry/GraphQL and live client/provider transport remain unproven.
- Reroute: `Yes`, to the user for the generated Prisma ESM/CommonJS-compatible test dependency. No implementation/design reroute is indicated.

## Investigation Round 2 Rework Update (Pre-Edit, Authoritative)

- Current investigation round: `2`.
- Trigger: `CRR-004` failure-origin review (`CR-006`, `CR-007`, `CR-008`) returned the prior blocked result as an API/E2E-owned `Local Fix`; the `CRR-003` implementation-source pass remains intact.
- Prior result / confidence: `Blocked` / 87% rounded applicable-category average (`API-REV-001`).
- Recheck order: resolve and rerun prior failures `API-005`, `API-002`, and `API-006` before reassessing broader scope.
- Environment update: the user authorized credential-backed commands, when materially needed, to load `/Users/normy/.autobyteus/server-data/.env` into only the invoked pnpm test process. Secret values must not be printed or persisted. The required deterministic local scenarios below do not require user credentials.

### Round 2 Existing-Coverage Validity Decisions

| Scenario / Path | Round 1 Status | Round 2 Validity Decision | CRR-004 Evidence | Required Round 2 Action |
| --- | --- | --- | --- | --- |
| `API-005` / `autobyteus-ts/tests/integration/clients/autobyteus-client-media-staging.test.ts` | Valid scenario but blocked as missing authentication | `Needs Update` — supported transport scenario, stale constructor fixture | `CR-006`: the test sets a synthetic key but omits the constructor's explicit `apiKey` argument | Pass the same synthetic key to `new AutobyteusClient(serverUrl, apiKey)` and rerun; do not use a user secret for this local fixture. |
| `API-002` / `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Updated durable cancellation scenario; zero tests collected | `Still Valid` coverage, `Needs Update` runner environment | `CR-007`: direct Node ESM import succeeds, while Vitest stops in `repository_prisma` / `@prisma/client` interop before media code | Select the smallest bounded Vitest dependency-transform configuration that collects the existing suite without implementation-source changes, record the config path, and rerun. |
| `API-006` service / `autobyteus-server-ts/tests/unit/agent-tools/media/media-generation-service.test.ts` | Relevant success coverage; zero tests collected | `Needs Update` | `CR-007` and `CR-008`: runner interop blocks collection and current service scenarios do not prove returned-media transfer non-resolution/failure | Use the compatible bounded Vitest setup and add deterministic injected-transfer non-resolution/failure coverage at `MediaGenerationService`, including media-bound terminal settlement. |
| `API-006` live transfer / `autobyteus-server-ts/tests/integration/utils/download-utils.integration.test.ts` | Skipped without live URL | `Still Valid` only as optional live smoke; insufficient for AC-007 | `CR-008`: absence of a live URL is not a blocker for deterministic required coverage | Do not remove the optional live smoke. Replace its role in AC-007 proof with deterministic local service/transfer coverage; execute the live smoke only if it materially improves residual confidence. |
| `API-001`, `API-003`, `API-004` core repair/lifecycle durable coverage | Passed | `Still Valid` | `CRR-004` did not reopen implementation or core-test findings | Recheck after local fixes as the broader regression set; no further durable edit planned unless new evidence contradicts an assertion. |

### Round 2 Durable-Coverage And Environment Plan

- Durable tests to update: `autobyteus-ts/tests/integration/clients/autobyteus-client-media-staging.test.ts`; `autobyteus-server-ts/tests/unit/agent-tools/media/media-generation-service.test.ts`.
- Durable test already updated and awaiting successful execution: `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts`.
- Test-runner configuration candidate: `autobyteus-server-ts/vitest.config.ts`, limited to dependency transformation/interoperability for `repository_prisma` / `@prisma/client`; no ticket implementation source change is authorized for the runner failure.
- Durable paths removed: none.
- Deterministic transfer fixture: an injected `writeGeneratedMediaFromUrl` promise that does not resolve (plus rejection if needed), controlled by fake time / the explicit internal media timeout. Expected outcome is a truthful media timeout/transfer error, cleanup settlement, and no fabricated `{ file_path }`.
- Credential-backed live validation gate: use the user-authorized env file through a pnpm-launched process only if deterministic repository and local cross-boundary evidence still leaves a material provider-specific confidence gap. Do not use it to repair `API-005`, `API-002`, or required `API-006` coverage.
- Planned result routing: after all affected scenarios pass, update both canonical reports and append `API-REV-002`, then return the cumulative package and every durable changed path to `code_reviewer` for proportional test-code review.

### Round 2 Execution Update (Authoritative)

- `CR-006` / `API-005`: Resolved. The explicit-auth fixture passes the synthetic `test-key` to `AutobyteusClient`; the local HTTP staging/send journey passes without a user credential.
- `CR-007` / `API-002` and service `API-006`: Resolved as an environment/runner issue. Adding bounded Vitest transformation for `repository_prisma` in `autobyteus-server-ts/vitest.config.ts` allows the server media E2E and media service suites to collect. The server registry/GraphQL/media E2E now passes 6 tests, including parent cancellation and late-publication suppression.
- `CR-008` / transfer `API-006`: Deterministic durable provider/transfer timeout, transfer rejection, cleanup-bound, success/publication, and timeout-precedence coverage was added to `media-generation-service.test.ts`; the optional live download smoke remains unchanged and is no longer treated as required AC-007 evidence.
- New directly observed implementation failure: at the configured media deadline, the timeout callback aborts the child signal before its timeout rejection wins `Promise.race`. Provider non-resolution, returned-media transfer non-resolution, and invalid-explicit/valid-server timeout scenarios therefore reject with `Media operation was cancelled.` instead of the required truthful timeout diagnostic `Media operation timed out after 10000ms.`. The same owning-boundary behavior reproduces in all three deterministic cases.
- Acceptance impact: media promises do settle at the configured bound and no success file is fabricated, but the timeout cause is misclassified as cancellation. This fails the timeout-specific semantics/diagnostics required by REQ-001 and REQ-006 and the terminal media timeout evidence required by AC-001/AC-007.
- Preliminary origin classification: implementation-source timing/order defect in `MediaGenerationService.runBoundedMediaOperation`, not a stale test, fixture, environment, requirement, or design issue. API/E2E must not change that source without failure-origin routing.
- Round 2 result: `Fail`; route the cumulative failure package to `code_reviewer` for focused failure-origin review. No live credential-backed run can correct or disprove this deterministic owner-boundary failure, so the user-authorized env file was not loaded.

## Investigation Round 3 Rework Update (Pre-Execution, Authoritative)

- Current investigation round: `3`.
- Trigger: `CRR-006` implementation source re-review passed after `IR-004` / commit `8d31a2590` resolved `CR-009`; the deadline cause is recorded before child abort, timeout remains authoritative at the publication gate, and explicit parent/user abort remains cancellation.
- Prior result / confidence: `Fail` / 87% rounded applicable-category average (`API-REV-002`).
- Prior unresolved scenarios to recheck first: `API-006A` provider non-resolution, `API-006B` transfer non-resolution, and `API-006C` invalid-explicit -> valid-server-timeout precedence. Expected result remains the unchanged timeout-specific assertion; tests must not be weakened to accept cancellation.
- Relevant regression scenarios: `API-006` success, transfer rejection, cleanup bound, and unbounded edit/speech/video behavior; `API-002` explicit parent cancellation/late publication suppression and registry/GraphQL contract; `API-005` explicit-auth client transport; `API-001`/`API-003`/`API-004` persisted repair and lifecycle/status recovery.
- Existing durable coverage validity: all six accumulated durable test/config paths remain `Still Valid`. `CRR-006` reports no test or runner change in IR-004 and no new requirement/design ambiguity. No durable test addition, update, removal, or runner-config edit is planned for this rerun.
- Planned execution order: focused 9-test media service suite; server media E2E; client media staging; core repair/lifecycle suite; core build; server build typecheck; `git diff --check`.
- Broader-validation gate: the deterministic repository suites directly exercise the changed owner, registry/GraphQL, local HTTP, filesystem publication, persisted repair, and lifecycle boundaries. If all pass, no live provider run is required because provider-specific cancellation remains explicitly best effort and a credential-backed call cannot deterministically reproduce deadline/late-settlement cases better than the controlled fakes.
- User-authorized env path: `/Users/normy/.autobyteus/server-data/.env` remains available for pnpm-scoped credential-backed validation if a new material external-provider gap appears. Do not load it merely to repeat deterministic local coverage.
- Planned routing on success: update the canonical reports, append `API-REV-003`, and return the cumulative package plus every durable test/config path to `code_reviewer` for proportional review before delivery.

### Round 3 Coverage-Validity Update During Execution

The planned critical and focused regressions passed, but the broader recovery recheck found five assertions in two previously inventoried files that still encode the removed pre-`ARCH-REV-006` result representation. This is new test-validity evidence and is recorded before editing either durable file.

| Path / Scenario | Observed Assertion | Validity Decision | Upstream Basis | Required Update |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/memory/memory-manager.test.ts` ordinary and denied result cases | Terminal raw results must omit `tool_args` | `Stale / Replace Assertion` | IR-001 explicitly identified omission-of-result-arguments expectations as stale; current terminal results preserve the invocation/prepared arguments needed for truthful evidence | Assert the current `tool_args` values rather than absence. |
| Same file crash-recovery case | Synthetic recovery stores interruption prose in `toolResult` and requires a separate recovery-marker trace | `Stale / Replace Assertion` | ARCH-DES-002/DS-003 and API-003 require `toolResult: null` plus deterministic non-empty `toolError`; the raw terminal result is the sole durable authority and a marker is supplemental, not mandatory | Assert `SYNTHETIC_TOOL_RESULT_ERROR`, null result, preserved args, and exactly one idempotent terminal raw result without requiring a second marker representation. |
| Same file prepared-failure case | Failure result omits prepared arguments | `Stale / Replace Assertion` | Current reviewed raw result contract persists terminal arguments while retaining the original model-issued call separately | Assert original arguments remain on the call and prepared arguments are present on the failure result. |
| `autobyteus-ts/tests/unit/agent/loop/llm-phase-tool-protocol-recovery.test.ts` resume case | Provider rendering contains obsolete runtime-shutdown prose | `Stale / Replace Assertion` | REQ-003/REQ-009 and the implemented deterministic repairer produce `Tool 'generate_image' failed: operation did not complete...` | Assert the shared deterministic synthetic error while retaining direct proof that the next user prompt reaches the LLM with provider-safe tool history. |

- Durable coverage paths newly updated in round 3: the two files above.
- Durable coverage removed: none; only obsolete assertions are replaced in place.
- Preliminary failure classification: stale durable coverage, API/E2E-owned local correction. The passing direct follow-up/provider-rendering scenario remains important for AC-003/AC-008/AC-009 and must not be removed.

### Round 3 Final Execution Update (Authoritative)

- `API-006A`, `API-006B` non-resolution, and `API-006C`: Resolved and independently passed with unchanged timeout-specific expectations after IR-004. The complete media service suite passes 9/9, including success/staging publication, provider timeout, transfer timeout/rejection, hanging-cleanup bound, configuration precedence, edit/speech/video regressions, and no fabricated output.
- `API-002`: Pass, 6/6. Explicit parent/user abort remains cancellation; late provider completion does not replace the existing file; registry/GraphQL/schema/path behavior remains intact.
- `API-005`: Pass, 1/1 with the supported explicit synthetic-auth constructor contract and local HTTP staging/send boundary.
- `API-001`/`API-003`/`API-004` plus broader recovery assertions: Pass, 7 files / 38 tests after replacing the newly discovered stale result-argument, marker-only, and recovery-prose assertions. The direct LLM-phase resume scenario proves that repaired provider-safe tool history accepts an additional user prompt and reaches the LLM.
- Build/static checks: `autobyteus-ts` build/runtime-dependency verification passes; server build typecheck passes; final `git diff --check` is required after report updates.
- Repository-resident durable coverage/config paths changed cumulatively: eight added/updated paths; none removed. The two round-3 additions are `autobyteus-ts/tests/unit/memory/memory-manager.test.ts` and `autobyteus-ts/tests/unit/agent/loop/llm-phase-tool-protocol-recovery.test.ts`.
- Final confidence scorecard: requirement proof 95%; changed-boundary directness 95%; cross-boundary realism/mock gap 95%; environment/configuration/fixture fidelity 95%; failure/edge/lifecycle/recovery 95%; user-surface N/A; durable regression quality/relevance 95%. Overall 95% (simple average of six applicable categories).
- Every critical acceptance criterion directly proven: `Yes` for the approved deterministic scope. Provider-specific transport cancellation remains best effort where an SDK lacks per-call cancellation, but late-settlement lease/publication suppression and truthful terminal outcomes are directly proven.
- Broader validation decision: `Not Required` beyond the completed repository/local integration execution. These suites directly exercise the service owner, provider/transfer control, filesystem publication, server registry/GraphQL, client HTTP, raw/snapshot persistence, LLM rendering/follow-up, and lifecycle/status boundaries. A live provider call would add non-determinism and cannot improve the deadline/late-settlement evidence.
- Final result: `Pass`. Return the cumulative package and all eight durable test/config paths to `code_reviewer` for proportional review before delivery.

## Investigation Round 4 Test-Review Rework Update (Pre-Edit, Authoritative)

- Current investigation round: `4`.
- Trigger: proportional durable test/config review `CRR-007` / `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/api-e2e-test-review-report.md` returned `Fail / Local Fix` with `TCR-001` and `TCR-002`.
- Preserved results: the `CRR-006` implementation-source pass and `API-REV-003` execution pass at 95% remain intact; no production-source, design, requirement, confidence, or broader-validation finding is reopened.

| Finding | Path / Scenario | Validity Decision | Approved Evidence That Must Be Preserved | Test-Only Correction |
| --- | --- | --- | --- | --- |
| `TCR-001` | `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` / explicit cancellation and late provider | `Needs Update` | Explicit parent abort rejects as cancellation; after the detached provider/transfer path completes, the existing final bytes remain unchanged | Replace the arbitrary 50 ms sleep with a promise resolved from the mock client cleanup boundary, which occurs after provider release and staging transfer; await it before asserting final bytes. |
| `TCR-002` | `autobyteus-server-ts/tests/unit/agent-tools/media/media-generation-service.test.ts` / explicit 10,000 ms timeout vs 20,000 ms server value | `Needs Update` | Timeout occurs at the explicit bound, operation signal is aborted, and no output is published | Remove the incidental `getServerTimeout` call-count assertion; outcome precedence is already directly observable and must remain unchanged. |

- Durable paths updated this round: the two existing server test files above; cumulative durable test/config package remains the same eight paths.
- Durable paths removed: none.
- Planned execution: rerun the affected 9-test media service suite and 6-test server media E2E suite, then `git diff --check` after artifact updates.
- Planned result/routing: preserve `Pass` / 95% if affected commands remain green, append `API-REV-004`, update canonical execution evidence, and return the same eight-path package plus `api-e2e-test-review-report.md` to `code_reviewer` for proportional re-review.

### Round 4 Final Rerun Update (Authoritative)

- `TCR-001`: Resolved. The late-provider E2E now resolves `lateClientCleanupCompleted` from the mock cleanup boundary, which is reached only after provider release and returned-media staging. The test awaits that signal instead of sleeping, then proves the pre-existing final bytes remain unchanged.
- `TCR-002`: Resolved. The incidental server-timeout getter spy/call-count assertion was removed. The test continues to prove the requirement-observable result: explicit 10,000 ms beats the 20,000 ms server value, returns timeout, aborts the operation signal, and publishes no output.
- Affected commands: media service suite passes 9/9; server media E2E passes 6/6.
- Cumulative durable test/config package: unchanged eight paths; no path added or removed in round 4.
- Execution result/confidence: `Pass` / 95% remains authoritative; the corrections improve test determinism and avoid constraining incidental implementation evaluation without changing requirement coverage.
- Broader validation decision: remains `Not Required` beyond the completed deterministic repository/local integration evidence.
- Next routing: return `API-REV-004`, the canonical reports, `api-e2e-test-review-report.md`, both affected rerun logs, and all eight durable paths to `code_reviewer` for proportional re-review.
