# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-spec.md`
- Supplemental artifacts: `memory-compactor-prompt-spec.md`, `prompt-confusion-root-cause.md`, `compaction-output-contract-decision.md`, `repeated-compaction-runtime-analysis.md`, `compactor-runner-failure-analysis.md`, `compaction-runtime-behavior-examples.md`, `compaction-memory-shape-reassessment.md`, and the retained incident evidence set
- Solution / architecture / implementation / source-review revisions: `SR-004`; `ARCH-REV-004` Pass; `IR-003` at `915c938da`; `CRR-005` Pass
- Historical API/E2E context: `API-REV-001` and `API-REV-002` are prior-baseline evidence only; neither was accepted as validation of `IR-003`
- Current revision / round: `API-REV-003` / round 3
- Trigger: fresh cumulative validation after `CR-IMPL-001` was resolved, specifically a missing provider prompt observation between an accepted compaction and the next numeric provider observation
- Investigation sequencing: the pre-execution version of this artifact was written before API-REV-003 durable coverage edits or final execution
- Latest status: `Complete — Pass / 98.3%`

## Current Requirement And Design Basis

The current scope is cumulative. `BEH-001`–`BEH-006`, `REQ-001`–`REQ-010`, and `AC-001`–`AC-013` preserve the exact prompt, six-array response, tool-free compactor, validate-all correction lifecycle, atomic accepted mutation boundary, and direct lineage 1/2/3 reads with v3 writes. `BEH-007`–`BEH-010`, `REQ-011`–`REQ-015`, and `AC-014`–`AC-023` add:

1. a trigger-aligned complete-prompt target with headroom;
2. one compaction operation per threshold episode, an accepted-success wait for a fresh numeric observation, one inadequate-reduction suppression, and rearm only below threshold or on budget-key change;
3. a typed child runner/provider/ingestion failure distinct from a usable invalid response, with no parser or correction call for the former;
4. fail-closed canonical memory, a retained pending operation, target-dispatch stop, and one later retry authorized only by a distinct USER-origin turn;
5. retained AGENT/SYSTEM turn starts while the earliest eligible USER passes, followed by relative-FIFO resumption; and
6. `input_tokens:null` as a missing observation: emit `missing_prompt_tokens` with quality flags, perform no threshold evaluation, and preserve both `awaiting_below_observation` and `inadequate_reduction_suppressed`. Numeric zero remains a real below-threshold observation.

Persisted data remains `Directly Usable — No Migration`; the new episode/gate/origin state is runtime-only.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected | Evidence Required And Obtained |
| --- | --- | --- |
| Planning/domain | Yes | arithmetic, low ratio, headroom, protected suffix, unattainable/no-prefix/oversize failure; focused units and runtime integration passed |
| Provider observation adapter | Yes | null versus zero and accepted -> missing -> numeric-above -> numeric-below sequence; direct units plus real runtime integration passed |
| Process/lifecycle | Yes | invalid-response correction versus typed runner failure, failure retention, USER retry, one operation; units/integration/live passed |
| Queue/admission | Yes | origin stamping, USER bypass, retained direct/AGENT/SYSTEM FIFO; units and combined runtime integration passed |
| API/event transport | Yes | `isError` -> stream converter -> collector/runner and closed error metadata; core/server units and parent integration passed |
| Persistence | Behavior-preserving | failure atomicity, accepted commit, mixed lineage direct read/new v3; integrations and preserved contract units passed |
| External provider | Yes | canonical server live runner, native source-tool tail, tool-free compactor, current planner, exactly one completion; DeepSeek passed |
| Frontend/browser/desktop | No | no renderer, browser API, or shell owner changed; N/A |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness`
- Stack: pnpm TypeScript workspace; Vitest; AutoByteus runtime; Fastify/Prisma/SQLite server; managed live-provider harness.
- Instructions: `autobyteus-server-ts/AGENTS.md` requires `vitest run ... --no-watch`; root scripts define `test:e2e:real:preflight`, `test:e2e:real`, and the explicit-target value-safe secret importer.
- Builds: `pnpm build` in both packages. The server build includes shared builds, Prisma generation, asset copy, and sanitized built-in bootstrap smoke.
- Live environment: the user explicitly authorized importing `/Users/normy/.autobyteus/server-data/.env`. The run used only the absolute worktree vault `autobyteus-server-ts/db/test.db`, previewed before a TTY-confirmed apply, emitted secret IDs/status only, and removed the DB, adjacent key, runtime, and test DB afterward.
- Browser/desktop: not selected because all changed owners are backend/runtime/provider boundaries.

## Coverage Validity Decisions

| Coverage | Decision For IR-003 | Final Evidence |
| --- | --- | --- |
| `API-REV-001` / `API-REV-002` reports | `Historical Only` | retained only as revision history |
| `llm-phase-compaction`, normalizer, planning/policy/gate/coordinator/recovery units | `Still Valid, Rerun` | 7 files / 31 tests and 7 files / 46 tests passed |
| summarizer/pending/output/window/registry units | `Still Valid, Rerun` | included in the 46-test planning/runner group |
| inbox/store/scheduler/notifier/stream/input/request units | `Still Valid, Rerun` | 8 files / 42 tests passed |
| server converter/collector/runner | `Still Valid, Rerun` | 3 files / 44 tests passed |
| runtime compaction integration | `Needs Update` | updated for missing-observation sequence and combined typed-failure/USER-retry/origin FIFO; 3/3 passed |
| core tool/snapshot/recovery integrations | `Still Valid, Rerun` | affected integration group 5 files / 7 tests passed |
| server parent fallback integration | `Still Valid, Rerun` | 5/5 passed |
| prompt/parser/lineage/template/input coverage | `Still Valid, Rerun` | core 27/27 and server combined 25/25 units passed; source-drift probe passed |
| server-settings GraphQL E2E | `Still Valid, Rerun` | 10/10 passed |
| live harness / provider E2E | `Needs Update` | exact-one completion assertion added; compile/skip gate and live DeepSeek passed |
| optional LM Studio journey | `Out Of Required Scope` | no current rerun; managed DeepSeek was the selected real-provider boundary |

No coverage was stale/removed and no compatibility-only assertion was added.

## Durable Coverage Changes

| Scenario | Path | Change | Requirement / Result |
| --- | --- | --- | --- |
| `API-E2E-006` | `autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts` | accepted success -> null prompt -> numeric above/suppression -> numeric below/reset; target below trigger; one operation | REQ-011/012, AC-014–017; Pass |
| `API-E2E-007` | same path | typed runner failure, no correction/dispatch/mutation, retained direct/AGENT/SYSTEM starts, one USER retry, USER-first then relative FIFO | REQ-013–015, AC-018–023; Pass |
| `LIVE-DEEPSEEK-002` | `test-support/live-e2e/live-e2e-harness.ts`; `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | require exactly one completed operation and expose the result type as literal `1` | REQ-011/012, preserved AC-001–013; Pass |

An initial execution of `API-E2E-006` exposed an API/E2E-owned fixture issue: a 5,000-token active context with ratio `0.2` made the expected post-compaction target unattainable. The fixture was corrected to a 15,000-token active context while retaining the 20% low-ratio scenario. The rerun and the final affected integration group both passed. This did not implicate production source.

## Current Execution Evidence

| Evidence Group | Result | Artifact |
| --- | --- | --- |
| core observation/lifecycle units | 7 files / 31 tests passed | `api-e2e-evidence/api-rev-003-core-observation-lifecycle-units.log` |
| core planning/runner units | 7 files / 46 tests passed | `api-e2e-evidence/api-rev-003-core-planning-runner-units.log` |
| core origin/event units | 8 files / 42 tests passed | `api-e2e-evidence/api-rev-003-core-origin-event-units.log` |
| changed runtime integration | initial fixture fail; corrected 3/3 pass | `api-rev-003-changed-runtime-integration*.log` |
| affected core integrations | 5 files / 7 tests passed | `api-rev-003-core-affected-integrations.log` |
| server compaction units | 3 files / 44 tests passed | `api-rev-003-server-compaction-units.log` |
| server parent/preserved | 5 files / 30 tests passed, including 5 parent integration tests | `api-rev-003-server-parent-preserved.log` |
| preserved core contracts | 3 files / 27 tests passed | `api-rev-003-core-preserved-contract-units.log` |
| server settings API E2E | 1 file / 10 tests passed | `api-rev-003-server-settings-e2e.log` |
| package builds | both passed; server sanitized bootstrap passed | `api-rev-003-core-build.log`; `api-rev-003-server-build.log` |
| prompt/parser/tool/version drift | no diff from the reviewed prompt baseline | `api-rev-003-contract-drift-probe.log` |
| live compile/skip | transformed/imported; intentionally skipped without live flag | `api-rev-003-live-e2e-compile-skip.log` |
| live preflight | 18/18; DeepSeek compaction READY | `api-rev-003-live-provider-preflight.log` |
| live DeepSeek | 2/2; exactly one compaction, v3, tool-free, canonical tail/framing, exact continuation | `api-rev-003-live-deepseek-compaction-e2e.log` |
| hygiene | cleanup, exact secret-value/pattern scan, and `git diff --check` passed | `api-rev-003-cleanup.log`; `api-rev-003-value-safety-scan.log`; `api-rev-003-git-diff-check.log` |

The broad deterministic server E2E suite was not rerun: its historical unrelated debt was already known, while the current round freshly executed every changed owner, both package builds, the relevant server-settings API E2E, and the real managed-provider boundary. A broad rerun would not materially improve current confidence.

## Post-Repository Confidence And Broader-Validation Gate

| Category | Post-Repository | Final After Live | Basis / Residual |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | 99% | direct cumulative deterministic mapping plus live preserved-contract proof; provider output remains probabilistic |
| Changed-boundary execution directness | 98% | 99% | real runtime/queue/memory/server owners and current live runner exercised |
| Cross-boundary integration realism and mock gap | 92% | 98% | live DeepSeek closed provider/server/native-tool/child/persistence gap; typed failure remains deterministically injected |
| Environment/configuration/identity/fixture fidelity | 92% | 98% | isolated real vault, managed resolver, loopback server, generated corpus, exact cleanup |
| Failure/edge/lifecycle/recovery evidence | 99% | 99% | invalid response, exhaustion, typed runner failure, null/zero, suppression/reset, USER retry, retained FIFO |
| User-surface/browser/desktop-shell confidence | N/A | N/A | no such boundary changed |
| Durable regression coverage quality/relevance | 97% | 97% | three narrow updated paths; proportional review remains the next gate |

- Overall post-repository confidence: `96.0%`
- Broader-validation decision: `Required — Live API`
- Selected mode: managed DeepSeek through the canonical server live-E2E runner
- Overall final confidence: `98.3%` (simple mean of six applicable final categories)
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below 90%: `No`
- Final result: `Pass`
- Residual risks: provider summary quality is probabilistic; typed external runner failure is forced deterministically rather than induced against the live provider; unrelated broad-suite debt is historical and out of this change's owner set.
- Required next action: proportional review of the three updated durable coverage paths by `code_reviewer` before delivery.
