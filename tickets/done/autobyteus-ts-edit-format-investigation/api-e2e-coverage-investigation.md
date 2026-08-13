# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/design-spec.md`
- Supplemental Task Artifacts: `edit-file-format-investigation-report.md`; `deepseek-edit-benchmark-report.md`; `cross-provider-context-patch-benchmark-report.md`; the benchmark harness and summary scripts; both experimental patch artifacts; the retained aggregate/JSONL/log evidence; and the two supplied screenshots, all at the absolute paths inventoried in the upstream package.
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: `CRR-002` Pass for `IR-002`, followed by the user's explicit request on 2026-08-02 to rerun the live benchmark during integration validation.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: This file.

## Current Requirement And Design Basis

The approved contract is one provider-neutral `edit_file(path, base_dir?, patch)` path. A canonical hunk begins with an **unprefixed** bare `@@` line. Body lines use exactly one leading space for unchanged context, `-` for removal, or `+` for addition. A conventional unprefixed numeric-decorated header is accepted as syntax noise, but its numbers are neither captured nor used. Each complete unchanged/removal sequence must identify exactly one position in the eligible remainder of the file. All hunks are constructed in memory; malformed, missing, ambiguous, anchorless, empty, no-change, unsupported-envelope, or partially failing patches terminate before the single final write. Exact matching precedes one bounded whitespace-tolerant retry. Path authorization, existing-file validation, CRLF/final-newline behavior, protected-path behavior, and read-then-write orchestration remain authoritative at their existing owners.

The product catalog is intentionally contracted by removing `replace_in_file` and `insert_in_file`, their registrations, dedicated owners/tests, obsolete numeric-diff owner, and orphan utility. The retained file-oriented capabilities are `read_file`, `edit_file`, `write_file`, and `run_bash`; no compatibility alias, numeric positioning engine, provider branch, automatic fallback, or external agent-config rewrite is permitted. Persisted string names are `Directly Usable — No Migration`: generic resolution skips missing names, keeps retained registered names usable, and does not mutate the stored array.

`CRR-002` is the source-review authority. It confirms that `IR-002` resolved `CR-001`: only unprefixed supported header tokens delimit hunks after removing LF/CRLF, while prefixed literal delimiter text remains unchanged context; padded headers remain invalid; the prior noncontiguous wrong-write reproduction now rejects without writing.

Critical validation basis: `REQ-003` through `REQ-012` and `AC-003` through `AC-015`. `AC-001`/`AC-002` remain supported by the retained dated investigation evidence and will receive a fresh dated live-provider comparison because the user explicitly requested a benchmark rerun. Live-provider output is evidence about current schema/runtime integration, not mandatory deterministic CI authority.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `BEH-001` / canonical hunk | Changed | `REQ-003`, `REQ-004`, `AC-003`, `AC-005`, `CRR-002` | Recheck pure semantics, real disk mutation, native tool invocation, and no-write failures. |
| `BEH-002` / model-facing schema | Changed | `REQ-003`, `REQ-008`, `REQ-009`, `AC-009`, `AC-013` | Recheck API schema, XML schema/example, parser/streaming fixtures, and live provider use of the current schema. |
| `BEH-003` / matching and atomicity | Changed with preserved I/O boundary | `REQ-004`, `REQ-007`, `REQ-010`, `AC-005`-`AC-008` | Recheck ambiguity, missing/anchorless/malformed input, multiple hunks, exact-first retry, disk no-write, path, and protection coverage. |
| `BEH-004`, `BEH-006`, `BEH-008` / tool surface | Removed plus preserved retained tools | `REQ-009`, `REQ-012`, `AC-012`, `AC-013` | Recheck registry/schema omission, retained tools, active-source/package cleanup, and absence of automatic fallback. |
| `BEH-005` / provider neutrality | Preserved and clarified | `REQ-001`-`REQ-003`, `REQ-008`, `AC-001`, `AC-002`, `AC-009` | Execute one common current product path across DeepSeek, Gemini, and GPT; do not add provider-specific coverage logic. |
| `BEH-007` / numeric decoration | Changed | `REQ-005`, `REQ-006`, `AC-004` | Recheck wrong-coordinate unique success, plausible-coordinate ambiguity failure, and live schema-only output handling. |
| Persisted configured tool names | Preserved representation; available definitions removed | `REQ-012`, `AC-012`, `Directly Usable — No Migration` decision | Recheck generic stale-name resolution with retained tools and unchanged input array; no migration test is appropriate. |
| `CR-001` delimiter/context distinction | Corrected | `IR-002`, `CRR-002` | Independently rerun prefixed bare/numeric context, CRLF, padded-header rejection, and the noncontiguous disk no-write regression. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Pure context-patch grammar, unique matching, construction, and retry orchestration | Owner unit suite, command unit suite, disk integration | Model-generated arguments arriving through the native runtime | Native-agent live benchmark |
| API / transport / contract | Yes | Tool parameter schema plus API/XML formatter and streaming/parser fixtures | Schema, formatter, streamer, handler, parser tests | Current external providers following and transporting the production schema | API tool-call live benchmark |
| Frontend component / state | No | None | N/A | None | None |
| Browser integration / user journey | No | No browser-owned behavior | N/A | None | None |
| Authentication / session / permissions | No | No user auth/session contract changed | N/A | Provider credentials are setup only, not changed behavior | None |
| Desktop renderer / web-equivalent UI | No | None | N/A | None | None |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | Yes, bounded | Native agent turn, tool-call event, tool execution, result, and cleanup | Approval-flow integration plus runtime benchmark harness | Live provider turn completion and cleanup on current build | Native-agent live benchmark |
| Persisted-data transition | Yes, definition availability only | Existing `toolNames: string[]` remains readable; missing definitions become inert | Server resolver unit boundary | Unknown custom sources beyond the representative scan; no format change | No additional migration/runtime environment; focused resolver evidence is direct |
| Worker / queue / distributed coordination | No | None | N/A | None | None |
| External integration | Yes, validation-only | DeepSeek, Gemini, and GPT native provider calls carry current tool schema/arguments | Retained dated JSONL evidence | Provider behavior/config may have drifted since the retained run | Fresh isolated cross-provider benchmark |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Project type and runtime stack: pnpm 10.28.2 TypeScript monorepo; Node/Vitest 4; `autobyteus-ts` core agent/tool runtime; `autobyteus-server-ts` Fastify/GraphQL server and encrypted provider-secret resolver backed by SQLite/Prisma.
- Conflicting, missing, or unclear project instructions: No `AGENTS.md` applies to `autobyteus-ts`. `autobyteus-server-ts/AGENTS.md` requires non-watch `vitest run`. The historical benchmark harness imports deleted exact-tool build artifacts unconditionally, so it is valid historical evidence but cannot execute the final contracted build unchanged. A current-only temporary harness will preserve its fixtures/scoring/runtime path while importing only retained tools; the original historical harness/evidence will not be rewritten.
- Required environment variables or secrets available: `Yes`. The ignored isolated test database and adjacent root key exist. No value will be printed or attached.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/package.json` | Workspace scripts | `pnpm test:e2e` targets server E2E; live checks and builds are explicit scripts; workspace uses pnpm 10.28.2. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/package.json` | Core build | `pnpm -C autobyteus-ts build` performs clean dist, TypeScript build, and runtime-dependency verification; tests are invoked with `pnpm exec vitest run`. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/vitest.config.ts` | Core test configuration | Node environment, `tests/setup.ts`, 20-second default timeout, ticket/temp directories excluded. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/AGENTS.md` | Closest server instruction | Use `pnpm -C autobyteus-server-ts exec vitest run ... --no-watch`; do not enter watch mode. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/README.md` | Server setup/test authority | Node 18+; `pnpm install`; server build includes shared-package build and Prisma generation; test runtime uses `.env.test`/temporary SQLite; external capabilities must be skipped/reported rather than fabricated. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/package.json` and `vitest.config.ts` | Server build/test configuration | Build prepares shared packages and runs sanitized built-in agent bootstrap; Vitest uses forks, serial files, Prisma test setup, and excludes prompt-engineering directories. |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark/deepseek-edit-benchmark.mjs` | Historical live benchmark method | Native AutoByteus agent/runtime, API tool calls, temperature 0, per-run temp workspace/sentinel, exact-byte scoring, tool events, usage, timeout, teardown; database is explicit and secret values are never logged. |
| Upstream implementation/review artifacts | Task-specific constraints | Preserve the five full-unit and two approval-flow baseline-failure classifications; live benchmarks are dated evidence, not CI; delivery owns remote refresh/integrated-state checks. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` build/test runtime | `.../autobyteus-ts` | `pnpm build`; `pnpm exec vitest run ...` | Existing workspace install; tests own temp files | Command exit/result counts | Vitest exits; owner tests remove or isolate temp data; remove any leftover `tmp-edit-file-*` owned by this run only |
| `autobyteus-server-ts` resolver/build | Worktree root / server package | Non-watch focused Vitest; `pnpm -C autobyteus-server-ts build` | Uses test Prisma setup for tests; build regenerates supported artifacts | Command exit/result counts and sanitized bootstrap | Commands exit; no persistent service started |
| Fresh cross-provider benchmark | Ticket benchmark directory, native runtime imports from built `dist` | Current-only temporary harness with explicit `--database`, models, scenarios, trials, output | Reads ignored isolated test DB/vault; creates per-run OS temp workspace; no secret values logged; provider calls are live | Harness initializes Prisma/vault and reports each run | Harness stops agent/LLM, removes each temp workspace, closes vault/Prisma; temporary harness is removed after evidence capture |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Patch semantics fixtures | Repository test strings/temp files | Deterministic and non-sensitive | Test-owned temp cleanup; no persistent fixture |
| Persisted stale tool name | In-memory `AgentDefinition` with removed-name string plus retained tools | Does not read or write external agent configs | No cleanup needed |
| Live provider registrations | Ignored `autobyteus-server-ts/db/test.db` plus sibling root key | Explicit database path; values never emitted; database/key never attached or committed | Retain ignored owner-provided isolated test setup; close DB/vault after run |
| Live edit corpus | Four fixed scenarios and sentinel from historical harness | Disposable OS temp directories, no user data | Harness recursively removes every owned workspace; retain only non-secret JSONL/log/summary evidence |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: `design-spec.md` “Persisted Data / State Transition Decision”, `BEH-008`, `DS-005`; `implementation-handoff.md` “Persisted Data Transition Check”.
- Representative existing-data setup and required behavior: an `AgentDefinition.toolNames` array contains at least one removed name and retained registered names; normal resolution warns/skips absent definitions, returns every retained tool, and leaves the array identity/content unchanged.
- Evidence planned for the approved direct-use outcome: focused server resolver suite on the current registry and built shared package; active registry/schema test proves removed definitions are unavailable while retained definitions are exposed.
- Migration-specific completion/recovery scenarios, only when `Migration Required`: `N/A`
- Upstream ambiguity or reroute required: None. A migration, alias, or external config mutation would contradict the reviewed decision.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/tools/file/context-patch.test.ts` | 31 cases: canonical/repeated/addition; whitespace strategy; wrong numeric/ambiguous numeric; prefixed bare/numeric context; CRLF; ordered hunks; unsafe/malformed/envelope rejection; newline markers/EOF; 250k stack safety | REQ-003-REQ-007, REQ-009-REQ-011; AC-003-AC-007, AC-013-AC-015; CR-001 | `Still Valid` | Assertions match SR-002/CRR-002, use pure owner directly, and protect every semantic branch without provider dependence | Rerun unchanged |
| `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts` | Public schema, disk mutation, enriched failure, ambiguity/atomicity/no-write, CR-001 noncontiguous no-write, exact-first/whitespace retry, missing/relative/absolute path, read-edit flow | REQ-003, REQ-004, REQ-007, REQ-008, REQ-010; AC-003, AC-005-AC-009 | `Still Valid` | Exercises authoritative I/O/retry/write owner; no obsolete numeric positioning assertion | Rerun unchanged |
| `autobyteus-ts/tests/integration/tools/file/edit-file.test.ts` | Real filesystem edit plus absolute/base-dir path behavior | REQ-010; AC-003, AC-008, AC-010 | `Still Valid` | Direct real disk boundary with current registered tool | Rerun unchanged |
| `autobyteus-ts/tests/integration/tools/file/protected-file-tool-paths.test.ts` | Direct and symlinked protected-path denial for retained file tools | REQ-010; AC-008 | `Still Valid` | Preserves unchanged security boundary and uses canonical patch fixture | Rerun unchanged |
| `autobyteus-ts/tests/unit/tools/file/exact-file-tools-removed.test.ts` | Removed definitions/schemas absent; retained four plus unrelated tool remain | REQ-009, REQ-012; AC-012, AC-013 | `Still Valid` | Tests active registry and schema instead of preserving compatibility behavior | Rerun unchanged |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` | Missing removed name is warned/skipped; retained registered tool resolves; configured array is unchanged | REQ-012; AC-012; Directly Usable decision | `Still Valid` | Direct current runtime resolver boundary, no migration/alias | Rerun unchanged |
| API/XML schema, formatter, streaming handler/streamer/parser tests | Canonical bare grammar is described and the patch string survives provider transports | REQ-001, REQ-003, REQ-008, REQ-011; AC-009, AC-014 | `Still Valid` | Assertions track current canonical grammar and reject old numeric requirement | Rerun unchanged |
| `autobyteus-ts/tests/integration/agent/tool-approval-flow.test.ts` / selected `edit_file` case | Agent approval lifecycle executes canonical patch and mutates expected bytes | REQ-001, REQ-010; AC-003, AC-010 | `Still Valid` | Real agent runtime/tool phase with dummy LLM; two other known file cases have unrelated baseline assertions | Run selected changed case; preserve baseline classification in any broader run |
| `autobyteus-ts/tests/integration/agent/edit-file-benchmark-flow.test.ts` | Env-gated LM Studio scenario suite using canonical bare hunks/current tool names | REQ-002, REQ-011 | `Still Valid` but not the selected external mode | Updated assertions and tool portfolio are current; it depends on a separate local LM Studio environment not required by the project | Leave opt-in; use current registered provider benchmark requested by user |
| `autobyteus-ts/tests/integration/agent/edit-file-diagnostics.test.ts` | Env-gated diagnostic corpus using canonical grammar/current portfolio | REQ-002, REQ-011 | `Still Valid` but not the selected external mode | Valid current diagnostic coverage, but not deterministic/default and not the supplied provider environment | Leave opt-in |
| Deleted diff/exact-tool tests (`diff-utils*`, `replace-in-file*`, `insert-in-file*`) | Numeric positioning/fuzz or removed exact-tool behavior | REQ-009, REQ-012; AC-012, AC-013 | `Stale / Remove` (already removed by implementation) | Reviewed clean-cut removal plan and current git tree | Verify absence only; do not restore or replace compatibility-only assertions |
| Server HTTP/GraphQL/browser/desktop E2E suites | General app APIs/UI unrelated to patch application | None | `Out Of Scope` | Changed code is reached through native core agent/tool runtime, not a new HTTP/UI endpoint | Do not claim them as proof or run them merely for breadth |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Deleted `diff-utils` unit/integration suites | Numeric coordinates/fuzz/git-header semantics | Approved semantic owner and behavior were removed cleanly | REQ-009; AC-013; SR-002 removal plan | `context-patch.test.ts` plus `edit-file.test.ts` | No compatibility coverage is allowed |
| Deleted exact-tool unit/integration suites | `replace_in_file` and `insert_in_file` remain executable | User-approved product catalog contraction | REQ-012; AC-012 | Registry/schema absence, retained-tool, resolver, and context-edit coverage | Restoring dedicated behavior coverage would protect invalid removed capability |

## Durable Coverage To Add

None initially. The reviewed implementation already adds boundary-appropriate durable coverage for the pure semantic owner, command/disk behavior, CR-001, registry/schema contraction, transport presentation, protected paths, large files, approval lifecycle, and persisted-name direct use. The fresh live benchmark is provider-dependent dated evidence and must not become mandatory CI.

## Durable Coverage To Update

None initially. New execution evidence may revise this decision only if it exposes a deterministic uncovered behavior.

## Durable Coverage To Remove

None during API/E2E. Obsolete suites were already removed by `IR-001`; this round verifies their absence.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused Vitest selection covering context owner, edit command/disk/protection, registry/schema, API/XML transport, and formatter boundaries | `.../autobyteus-ts`; `pnpm exec vitest run` with 11 explicit files | REQ-003-REQ-012; AC-003-AC-015; CR-001 | Pass — 11 files / 91 tests | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-focused-tests.log` |
| 2 | `pnpm exec vitest run tests/integration/agent/tool-approval-flow.test.ts -t "executes edit_file after approval"` | `.../autobyteus-ts` | Native agent approval/tool execution lifecycle | Pass — selected edit case passed; 4 non-selected cases skipped | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-approval-flow.log` |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts --no-watch` | Worktree root; server test-owned SQLite setup | Directly Usable — No Migration | Pass — 1 file / 1 test | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-resolver.log` |
| 4 | `pnpm build` | `.../autobyteus-ts` | Clean package build/runtime dependency verification | Pass | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-core-build.log` |
| 5 | `pnpm -C autobyteus-server-ts build` | Worktree root | Shared-package integration, Prisma generation, server compile, sanitized bootstrap | Pass; built-in agents bootstrap and sanitized no-`DATABASE_URL` smoke passed | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-server-build.log` |
| 6 | `pnpm exec vitest run tests/unit` | `.../autobyteus-ts` | Broad core regression signal; compare exact failures with recorded baseline | Expected baseline result — 330 files / 1,804 tests passed; 2 files / 5 tests failed with the exact recorded unrelated event-count and legacy parsing-handler assertions | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-full-unit.log` |
| 7 | `pnpm exec vitest run tests/integration/agent/tool-approval-flow.test.ts` | `.../autobyteus-ts` | Broad approval lifecycle and baseline classification | Expected baseline result — `edit_file` and both `run_bash` cases passed; `write_file`/`read_file` failed only on the exact recorded stale `tool_name`-absence assertions | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-full-approval-flow.log` |
| 8 | Active removal search, clean `dist`, `npm pack --dry-run --json`, one-million-line built probe, and `git diff --check` | Worktree/core package at `bb6657c4016fed1550eb8b899e03457b5e1178db` | AC-010, AC-012, AC-013, AC-015 | Pass — no active/build/package removed artifacts; 2,131 package files; one-million-line exact late edit passed in 135.946 ms; diff check passed. One local summary invocation initially omitted its environment variable and was immediately corrected against the already-generated JSON; product evidence was unaffected. | `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-structural-runtime-checks.log`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-package-dry-run.json` |

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | Direct deterministic evidence covers the canonical grammar, numeric-noise semantics, unsafe-input rejection, atomicity, newlines, paths, schema/transport, removal, persisted names, build, and large files; retained dated live evidence supports AC-001/AC-002 | Fresh current-provider result is not yet known | Fresh provider matrix |
| Changed-boundary execution directness | 98% | Pure owner, public command, real disk, protected path, approval lifecycle, built JavaScript, registry, schema, and resolver boundaries all executed | External-provider initiation remains pending | Fresh provider matrix |
| Cross-boundary integration realism and mock gap | 93% | Agent approval lifecycle, real filesystem, API/XML transport fixtures, shared package/server build, and sanitized bootstrap are direct; only the provider is mocked or absent in repository checks | Current DeepSeek/Gemini/GPT behavior not directly observed yet | Fresh native-agent benchmark |
| Environment, configuration, identity, and fixture fidelity | 94% | Tests use real filesystem and test-owned SQLite; server build/bootstrap is clean; the isolated ignored provider DB/key were verified available without disclosing values | Live provider readiness, rate limits, and current registrations remain unproven | Initialize the isolated vault and execute all three registered models |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | 31-case semantic matrix, command no-write cases, CR-001 regression, path protection, approval lifecycle, and exact baseline reproduction provide direct negative evidence | Live failure/recovery distribution remains current-provider dependent | Inspect the fresh benchmark's first-edit/failure/recovery events |
| User-surface, browser, and desktop-shell confidence | `N/A` | No UI/browser/desktop behavior is affected | None | None |
| Durable regression coverage quality and relevance | 98% | Valid owner/boundary coverage passed unchanged; obsolete numeric/exact-tool suites remain removed; no compatibility-only assertions were restored | Provider behavior cannot be durable deterministic coverage | Keep live evidence outside mandatory CI |

- Overall post-repository confidence: `96.5%`
- Calculation method: Simple average of applicable final category scores; `N/A` excluded.
- Every critical acceptance criterion directly proven: `Yes` for deterministic product behavior; retained dated evidence directly proves the live-provider criterion, with a fresh requested rerun still pending.
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: provider drift; intentionally rejected repetitive context; unknown custom persisted configurations beyond generic resolver invariant; unrelated baseline failures; delivery-stage remote integration.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution status: `Completed — Pass`
- Selected execution mode: `Other` — native AutoByteus agent/runtime live API-tool-call benchmark across DeepSeek V4 Flash, Gemini 3.5 Flash, and GPT-5.6-sol.
- Specific confidence gap or residual risk addressed: Whether the freshly built final product schema, native provider tool-call transport, agent tool invocation lifecycle, and final context matcher still produce correct first-application and exact-final behavior with current external providers.
- Why the selected mode can materially improve confidence: Repository tests directly prove deterministic semantics but cannot prove current provider schema adherence or current live argument transport. The fresh matrix executes the same runtime and real filesystem effect in disposable workspaces.
- Expected confidence after the selected validation: At least 95% overall with no applicable category below 90%, assuming all critical deterministic checks pass, the final file/sentinel evidence is clean, and the explicit common-context cohort meets the approved 19/20-per-provider threshold.
- Browser-specific decision and rationale: Browser validation is not applicable; no web/UI/browser boundary changed, and the actual material integration is native provider tool calls into the core agent/tool runtime.
- If `Not Required`, evidence proving the real changed boundary without broader execution: `N/A`
- If `Blocked`, exact dependency or access that remains unavailable after safe setup/emulation attempts: `N/A`; all three provider registrations executed.

## Broader Validation Results

Two dated 60-run matrices executed the freshly built native AutoByteus agent runtime rather than calling a model as a standalone patch generator. Each run created an `AgentConfig`, started the agent through `AgentFactory`, posted the edit task, let the agent select and invoke the registered `read_file`/`edit_file` tools through API tool calls, captured agent/tool events, verified exact target and sentinel bytes, then stopped the agent and cleaned up its LLM and workspace. Both stages used the same three provider registrations, four scenarios, five trials per model/scenario, temperature 0, thinking/high, and the isolated ignored provider database.

| Stage | Variant And Purpose | Runs | First Edit | Exact Final | Sentinel | Threshold / Interpretation | Evidence |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1 | `context_edit_neutral`; schema-only current behavior | 60 | 57/60 | 60/60 | 60/60 | DeepSeek 19/20, Gemini 18/20, GPT 20/20 first-edit; all three rejected attempts recovered safely. This is a dated provider-drift signal, not a product write-safety failure. | `benchmark-evidence/api-e2e-current-context-live-summary.json`; JSONL and run log |
| 2 | `context_edit`; exact explicit common-context cohort used by the approved AC-002 comparison | 60 | 60/60 | 60/60 | 60/60 | Every provider achieved 20/20 first-edit and exact-final success, exceeding the required 19/20 per provider; all 60 first patches were canonical bare context. | `benchmark-evidence/api-e2e-explicit-context-live-summary.json`; JSONL and run log |

The three schema-only first-attempt failures were one DeepSeek no-change hunk and two Gemini textual headers (`@@ line 38...`). The product rejected all three deterministically under the approved grammar, made no unsafe sentinel mutation, and the same agents retried canonically to the exact final bytes. The explicit retained comparison cohort passed without any tool failure. The combined method, per-provider result, and failure classification are authoritative in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/autobyteus-ts-edit-format-investigation/benchmark-evidence/api-e2e-live-benchmark-comparison.json`.

No deterministic uncovered behavior emerged, so the durable-coverage decision remains unchanged: add/update/remove none during API/E2E. Final validation confidence is `98.3%`; every applicable category is at least 97% and every critical acceptance criterion has direct evidence.

## Desktop Application Validation Decision

Not applicable. No renderer, preload/IPC, window, packaging, or desktop-shell behavior changed.

## Live Environment And Fixture Plan And Completion

- Startup order and commands: built `autobyteus-ts`; built `autobyteus-server-ts`; generated a current-only temporary benchmark harness from the retained method without deleted-tool imports; executed all three current model registrations against the explicit ignored test database.
- Environment choices that materially affect the run: API tool-call format; temperature 0; thinking/high mapping matching the retained benchmark; four scenarios; five trials/model; 240-second per-run timeout. Stage 1 uses `context_edit_neutral` so the product schema alone governs patch syntax. It completed 60/60 exact-final with 57/60 first-application success, but Gemini's 18/20 first-application result included two unsupported textual hunk labels and falls below the explicit cohort's 19/20 threshold if treated as the threshold cohort. Stage 2 therefore reruns the retained explicit common-context condition (`context_edit`) to make the AC-002 comparison like-for-like rather than concealing the schema-only drift.
- Health / readiness checks: explicit database/key existence, Prisma/vault initialization, per-run tool-start/turn completion, 60-line JSONL output per stage, and complete model/scenario/trial keys all passed.
- Seed data / fixtures: fixed `small_exact`, `multiline_config`, `repeated_target`, and `late_insertion` target bytes plus `DO_NOT_EDIT.txt` sentinel.
- Test identities, authentication, permissions, or session state: existing ignored isolated provider registrations; no production DB, user content, or external agent config.
- Requirement-linked journeys or scenarios: `LIVE-001` through `LIVE-004`, each run reading a disposable file, producing an `edit_file` call, applying the current context contract, and validating exact target/sentinel bytes.
- Evidence to capture: run log, per-run non-secret JSONL, generated aggregate, first patch format, first edit result, exact-final bytes, sentinel preservation, failures/recovery, duration, and token usage events.
- Owned processes and temporary state cleanup: every agent and LLM instance was stopped, the secret-vault/Prisma runtime closed, zero benchmark Node processes or `autobyteus-edit-benchmark-*` workspaces remained, and the temporary harness was removed after its SHA-256 was recorded. The ignored test DB/key remain owner-provided and were not attached, copied, or deleted. Evidence: `benchmark-evidence/api-e2e-live-cleanup.log`.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `LIVE-001` | Fresh native provider matrix / `small_exact` | Canonical scalar replacement through current schema/runtime | Provider-dependent, credentialed, and dated |
| `LIVE-002` | Fresh native provider matrix / `multiline_config` | Multiple separated changes with exact-byte preservation | Provider-dependent, credentialed, and dated |
| `LIVE-003` | Fresh native provider matrix / `repeated_target` | Context disambiguates repeated literal and preserves neighbors | Provider-dependent, credentialed, and dated |
| `LIVE-004` | Fresh native provider matrix / `late_insertion` | Late edit/newline preservation and tolerance of provider header decoration | Provider-dependent, credentialed, and dated |
| `LIVE-005` | Targeted explicit common-context 60-run matrix after the schema-only drift signal | Recheck the exact retained AC-002 cohort with current providers and distinguish schema-only drift from parser/runtime failure | Provider-dependent, credentialed, and dated |
| `PROBE-001` | Freshly built one-million-line `applyContextPatch` invocation | Stack-safe late unique edit on shipped JavaScript | The 250k case is already durable; one million lines is a retained local execution probe |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Concurrent external writer between read and write | Explicitly out of scope and unchanged | Existing race remains | None for this task |
| Unknown custom persisted-config sources beyond the representative scan | No format-specific migration is approved; generic resolver behavior is the real invariant | A future resolver regression could affect other sources | Durable generic resolver test is authoritative; delivery preserves no-migration posture |
| Browser/desktop shell | Not an affected boundary | None | None |
| Full SWE-bench | Explicitly out of scope and disproportionate | Bounded corpus does not represent all code edits | Do not overclaim live benchmark breadth |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None before execution | N/A | Complete approved package and `CRR-002` Pass | N/A |

## Investigation Decision

- Proceed To API/E2E Execution: `Completed — Pass`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: `96.5%`
- Broader validation decision: `Required and completed` — two fresh 60-run native cross-provider matrices, including the exact explicit common-context comparison cohort requested by the user
- Final validation confidence: `98.3%`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Deterministic checks executed first. The historical benchmark script remains unchanged; its current-only temporary derivative removed only unconditional imports of product tools deleted by the approved contraction and was itself removed after execution. The completed result advances to `code_reviewer` for a proportional test-code review recorded as `Not Applicable` because API/E2E changed no repository-resident durable test code.
