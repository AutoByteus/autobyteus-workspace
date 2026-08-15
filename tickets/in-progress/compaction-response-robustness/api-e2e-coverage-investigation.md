# API/E2E Coverage Investigation

## Investigation Meta

- Requirements / investigation / design: `requirements.md`; `investigation-notes.md`; `design-spec.md`
- Supplemental basis: approved prompt/output/planning/failure/runtime/memory/Unicode analyses; `recursive-compaction-root-cause.md`; exact recursive UI/log/JSON evidence
- Implementation baseline: `SR-008`; `ARCH-REV-007` Pass; `IR-005` at `204fcf0c1fae683b4cbae892d2c9b7425c5764b9`; implementation source review `CRR-009` Pass at 95.5/100
- Triggering test review: `CRR-010` / `api-e2e-test-review-report.md`, with API/E2E-owned Local Fix findings `CR-TEST-002` and `CR-TEST-003`
- Historical only: `API-REV-001`–`005` and `DR-001`–`005`; API-REV-005 execution remained Pass, but CRR-010 gated delivery on corrected durable proof
- Current revision / round: `API-REV-006` / round 6
- Investigation timing: the CRR-010 re-entry classification and correction plan were written here before either durable edit or rerun
- Current status: `Complete — Pass; proportional re-review required`

## Requirement And Changed-Boundary Basis

IR-005 implements `REQ-017`, `BEH-012`, `DS-008`, and `AC-027`–`AC-029` while preserving cumulative `BEH-001`–`BEH-011` and `AC-001`–`AC-026`.

1. The canonical Memory Compactor receives disabled automatic compaction on create and restore, retains provider request capacity/token reporting, and cannot evaluate policy, create strategy/executor work, enter pending/lifecycle state, or launch a descendant—even above the proactive trigger or at/above the input hard cap.
2. A usable-invalid initial response may launch one correction child. Initial and correction are disabled siblings of one parent compaction operation, not a recursive parent/child pair.
3. Completion metadata retains only the accepted/final attempt run ID. Live filesystem proof must therefore admit one initial plus at most one correction sibling, require the accepted ID, inspect every new run, and count only runs outside that bounded set as descendants.
4. Every admitted sibling must contain exactly one initial-task wrapper, use the approved initial or correction framing, remain provider-safe, and have no child lineage or archive.
5. Enabled-parent planning, repair, accepted commit, suppression/reset, prompt v3, Unicode safety, zero effective child tools, ordinary-agent native defaults, persistence, and v1/v2/v3 lineage reads remain cumulative regression boundaries.

Persisted data remains `Directly Usable — No Migration`; historical recursive archives remain historical evidence and are not rewritten.

## Changed Surface Classification

| Surface | Affected | Boundary | Required Evidence |
| --- | --- | --- | --- |
| core LLM phase | Yes | disabled configuration under proactive and hard-cap observations | direct durable unit with original response, capacity event, and zero-work spies/state |
| live topology classifier | Yes | filesystem runs versus accepted final metadata | pure deterministic classifier plus actual run inspection |
| managed-provider API/E2E | Yes | DeepSeek -> server -> core -> child persistence -> parent continuation | compile/skip and isolated real-provider rerun |
| server/core sibling lifecycle | Regression-sensitive | initial plus usable-invalid correction | existing actual server/core integration rerun |
| production source | No | CRR-009 remains closed | no production edit or reroute |
| frontend/browser/desktop | No | no renderer or shell owner changed | N/A; browser adds no causal evidence |

## Project And Environment Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness`
- Server instruction authority: `autobyteus-server-ts/AGENTS.md` requires `vitest run ... --no-watch`.
- Root scripts provide `secrets:import`, `test:e2e:real:preflight`, and `test:e2e:real`.
- `test-support/live-e2e/run-live-e2e.mjs` and `test-runtime-bootstrap.mjs` own isolated runtime, DB, scenario filtering, evidence scanning, and cleanup boundaries.
- User authorized importing `/Users/normy/.autobyteus/server-data/.env` into the isolated worktree vault only. Secret values were never printed.

## Coverage Validity Decisions

| Path / Scenario | CRR-010 Decision | Correction / Current Decision |
| --- | --- | --- |
| `autobyteus-ts/tests/unit/agent/loop/llm-phase-memory-compaction-configuration.test.ts` | Needs Update (`CR-TEST-002`) | retained 176,655 proactive case under `B=615,744`, renamed accurately, and added prompt=`615,744` hard-cap case; both prove capacity/token reporting and zero policy/evaluator, strategy/executor attempt, episodic/semantic, pending/gate, lifecycle, or descendant capability |
| `test-support/live-e2e/live-e2e-harness.ts` | Needs Update (`CR-TEST-003`) | every new run is inspected; task inspection classifies initial/correction, requires one wrapper, and checks no lineage/archive; bounded topology requires accepted run, one initial, at most one correction, and zero outside runs |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Needs Update (`CR-TEST-003`) | replaced one-run equality with initial=operation, correction<=operation, total siblings 1–2 per operation, total=siblings+descendants, descendants=0 |
| `autobyteus-server-ts/tests/unit/secret-management/live-e2e-harness.test.ts` | Add Durable Coverage | added direct pure-classifier proof for accepted correction sibling and exact outside-bound descendant counting |
| `recursive-memory-compactor-leaf.integration.test.ts` | Still Valid | rerun; actual initial/correction disabled siblings pass with zero descendants |
| other API-REV-005 durable paths | Still Valid | no CRR-010 change; prior focused/current IR-005 evidence remains applicable |
| package-wide test-inclusive `tsc` commands | Auxiliary / non-authoritative | core focused changed file typechecked; project-wide test configs retain unrelated legacy errors and server rootDir/dist-source duplication, so authoritative Vitest transform plus package builds/live build remain the valid gates |

No durable coverage was removed, no compatibility alias was restored, and no production source was changed.

## Coverage Implemented In API-REV-006

| Scenario | Durable Path | Proof | Result |
| --- | --- | --- | --- |
| `API-E2E-011A-PROACTIVE` | core disabled LLM-phase unit | 176,655 >= 123,148 and < 615,744; original response and zero automatic work | Pass |
| `API-E2E-011A-HARD-CAP` | core disabled LLM-phase unit | 615,744 >= input budget; same capacity/token report and zero automatic work | Pass |
| `LIVE-TOPOLOGY-001` | server live-harness unit | accepted correction is a legal second sibling | Pass |
| `LIVE-TOPOLOGY-002` | server live-harness unit | extra correction/uninspectable run is outside the bounded set and counted as descendant | Pass |
| `API-E2E-011B` | actual server/core integration | deterministic initial plus correction siblings with zero descendant | Pass |
| `LIVE-DEEPSEEK-004` | live harness plus public E2E | actual managed provider one-initial outcome under correction-aware topology | Pass, 2/2 |

## Repository And Real-System Evidence

| Scope | Result | Evidence |
| --- | --- | --- |
| focused disabled pressure/hard-cap unit | 2/2 passed, including final explicit policy-classification spy | `api-rev-006-final-core-unit.log`; final affected gate |
| correction-aware topology unit | 19/19 live-harness unit file passed, including two new topology cases | `api-rev-006-topology-unit.log` |
| actual correction sibling integration | 1/1 passed | `api-rev-006-affected-deterministic-gate.log`; final affected gate |
| live file compile/expected skip | transformed/imported; expected skip | `api-rev-006-live-topology-compile-skip.log` |
| final affected deterministic gate | core 2/2; server 20/20 plus expected live skip | `api-rev-006-final-affected-gate.log` |
| package production builds | passed repeatedly through secret import, preflight, and real command, including Prisma/bootstrap smoke | import/preflight/live logs |
| isolated live preflight | 18/18 passed; DeepSeek scenario READY | `api-rev-006-live-provider-preflight.log` |
| managed DeepSeek | 2/2 passed; one initial sibling, zero correction in this natural run, zero descendants | live full and selected-result logs |
| cleanup / value safety / diff | owned DB/key/runtime/test DB absent; no process; zero exact secret-value matches; diff check passed | API-REV-006 cleanup/value-safety/diff logs |

The first combined deterministic attempt used obsolete test-only property `inputBudgetTokens`; both new unit cases failed before product execution. It was an API/E2E-local assertion typo, corrected to current `inputBudget`, and the complete affected gate then passed. The initial failure is preserved in `api-rev-006-affected-deterministic-gate-initial-failure.log`.

## Broader Validation Decision

- Decision: `Required — Live API`
- Reason: CR-TEST-003 modifies the actual managed-provider topology acceptance boundary. Deterministic classifier and sibling integration directly prove the correction branch, while a real managed provider verifies that the updated harness still observes actual server/core/persistence behavior.
- Setup: owner-authorized dry run and TTY-confirmed import into isolated `autobyteus-server-ts/db/test.db`; 18/18 preflight passed.
- Execution: `pnpm test:e2e:real -- --scenarios=deepseek.compaction-agent-flow`.
- Result: managed `deepseek-v4-flash` passed 2/2 with one completed v3 operation, one inspected initial sibling, zero corrections in the natural response, zero descendants, no self lineage/archive, zero effective child tools, provider-safe prompt/source evidence, and exact retained continuation artifact.
- Directness limit: the live model did not need correction in this run; the approved two-sibling branch is proven deterministically by `LIVE-TOPOLOGY-001` and `API-E2E-011B`, not overclaimed as a live observation.
- Browser/desktop: not required because no UI or shell boundary changed.

## Confidence Scorecard

| Category | Post-Repository | Final | Basis / Residual |
| --- | ---: | ---: | --- |
| requirement and acceptance-criteria proof | 99% | 99% | proactive and true hard-cap disabled branches plus correction-aware topology are direct |
| changed-boundary execution directness | 99% | 99% | core LLM phase, pure classifier, actual server child, and live harness executed |
| cross-boundary integration realism and mock gap | 97% | 99% | actual managed provider/server/core/persistence; invalid-first remains deterministic |
| environment/configuration/identity/fixture fidelity | 96% | 98% | exact numeric fixtures plus isolated managed identity; provider accounting varies |
| failure/edge/lifecycle/recovery evidence | 99% | 99% | hard cap, correction, excess-run rejection, zero work, and cumulative recovery |
| user-surface/browser/desktop-shell confidence | N/A | N/A | no applicable owner changed |
| durable regression coverage quality/relevance | 99% | 99% | four bounded corrections, direct classifier tests, clear one/two-sibling assertions |

- Overall post-repository confidence: `98.2%`
- Overall final confidence: `98.8%`
- Calculation: simple mean of six applicable categories
- Any applicable category below 90%: `No`
- Critical acceptance criterion lacking direct proof: none
- Residual risks: external provider wording/accounting variability; usable-invalid correction is deterministic rather than naturally observed in this live rerun; three unrelated historical broad E2E debts remain outside the changed-owner set.

## Investigation Decision

- Result: `Pass`
- CRR-010 findings resolved: `CR-TEST-002`, `CR-TEST-003`
- API-REV-006 durable changes: `four updated, none added, none removed`
- Cumulative IR-005 durable state: `one added, eight updated, none removed`
- Broader validation: `Required — Completed; managed DeepSeek Pass`
- Cleanup: complete; isolated owned artifacts absent and no owned process remained
- Required next recipient: `code_reviewer` for proportional re-review of the four API-REV-006 corrected durable paths
