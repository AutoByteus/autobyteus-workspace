# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/tickets/in-progress/compaction-response-robustness/design-spec.md`
- Supplemental basis: prompt/output/planning/failure/memory analyses; `compaction-unicode-safety-analysis.md`; `DR-004`; the delivery compatibility probe; exact captured Unicode evidence and fixture
- Solution / architecture / implementation / source-review revisions: `SR-006`; `ARCH-REV-006` Pass; `IR-004` at `aa12df0a3`; `CRR-007` Pass at 96.4/100
- Historical API/E2E context: `API-REV-001`–`API-REV-003` are historical only and were not used as IR-004 acceptance evidence
- Current revision / round: `API-REV-004` / round 4
- Trigger: fresh validation of provider-safe derived Unicode, typed pre-launch invariant failure, safe accepted projection, and the integrated effective zero-tool correction while preserving ordinary native defaults and cumulative runtime behavior
- Investigation sequencing: the pre-execution baseline was written before API-REV-004 durable coverage edits or execution; this document now records the completed investigation and evidence
- Current status: `Completed — Pass`

## Current Requirement And Design Basis

Current scope is cumulative `REQ-001`–`REQ-016` / `AC-001`–`AC-026`. IR-004 materially implements `BEH-011` and restores `BEH-005` after latest-base integration:

1. raw traces, tool payloads, archives, canonical memory, snapshots, and lineage remain immutable;
2. only derived provider-facing compaction text is normalized; valid Unicode is retained, malformed UTF-16/control hazards are normalized, and LF/TAB remain valid;
3. middle/end clamps never split a surrogate pair and use adjusted boundaries for omission accounting;
4. complete initial and one correction task are finalized provider-safe before child launch without a whole-task character clamp;
5. final invariant failure is typed `input_construction_failure`, occurs before runner/parser/correction, retains pending state, stops target dispatch, and commits no canonical state;
6. accepted episode/fact text uses the safe end clamp before later projection; and
7. the exact built-in Memory Compactor reaches final native `AgentConfig` with zero tools, while ordinary agents retain native/configured/team exposure.

Persisted data remains `Directly Usable — No Migration`; derived normalization requires no rewrite.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected | Required Evidence | Final Evidence |
| --- | --- | --- | --- |
| memory presentation | Yes | exact shield, safe boundaries, source immutability | 41-file memory unit group plus live exact-source assertion |
| complete prompt | Yes | initial/correction safety, exact large-prompt no clamp | prompt-builder units and runtime initial/correction assertions |
| child launch / failure lifecycle | Yes | safe launch; typed pre-launch fail closed | core runtime integration and managed DeepSeek child |
| accepted response / later projection | Yes | safe clamp and next request | parser units and runtime projection assertion |
| server runtime tool exposure | Yes | resolver and final `AgentConfig=[]` | exposure unit, new factory integration, live child reports zero tools |
| ordinary native defaults / team tools | Regression-sensitive | retain four defaults/configured/team tools | exposure unit and existing factory integration |
| external provider | Yes | exact shield pressure accepted by current DeepSeek | `LIVE-DEEPSEEK-003` Pass |
| cumulative lifecycle/lineage | Regression-sensitive | planning, observation, retry, origin, persistence, v3 | focused units/integrations/API E2E/live lineage |
| frontend/browser/desktop | No | N/A | no web/renderer/shell owner changed |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness`
- Stack: pnpm TypeScript workspace, Vitest, AutoByteus runtime, Fastify/Prisma/SQLite server, managed live-provider harness.
- Instructions: `autobyteus-server-ts/AGENTS.md`; root and server READMEs; root `package.json` scripts. Server tests use `vitest run ... --no-watch`; real-provider scripts are `test:e2e:real:preflight` and `test:e2e:real`.
- Builds: `pnpm build` in `autobyteus-ts` and `autobyteus-server-ts`; server build includes shared packages, Prisma, managed assets, and sanitized built-in bootstrap smoke.
- Live environment: owner-authorized `/Users/normy/.autobyteus/server-data/.env` imported only into the absolute worktree-local `autobyteus-server-ts/db/test.db` after dry-run and direct TTY confirmation. No value was logged; the DB, adjacent key, test DB, and runtime root were removed afterward.
- Browser/desktop: not selected because the incident and changed owners are provider serialization, core runtime, and server runtime tool exposure.

## Existing Coverage Inventory And Final Decisions

| Coverage | Decision | Final Action / Evidence |
| --- | --- | --- |
| `unicode-safe-text.test.ts` | `Still Valid` | rerun in 223-test memory/observation group |
| `working-context-compaction-prompt-builder.test.ts` | `Still Valid` | exact shield, source immutability, correction normalization, 540,727-unit no-clamp, typed invariant rerun |
| `agent-compaction-summarizer.test.ts` | `Still Valid` | runner/parser short-circuit rerun |
| `pending-compaction-executor.test.ts` | `Still Valid` | typed failure/pending/atomicity rerun |
| `compaction-response-parser.test.ts` | `Still Valid` | safe accepted clamp rerun |
| `agent-runtime-compaction.test.ts` | `Needs Update` -> `Updated / Pass` | initial/correction safety, boundary-clamped projection, actual-runtime pre-launch failure and USER retry gate |
| tool lifecycle/snapshot/runtime integrations | `Still Valid` | 5 files / 8 tests pass |
| `autobyteus-runtime-tool-exposure.test.ts` | `Still Valid` | exact compactor zero plus ordinary/mixed exposure pass |
| AutoByteus backend factory integration | `Needs Update` -> `Updated / Pass` | final exact built-in compactor `AgentConfig.tools=[]`; ordinary factory remains four tools |
| built-in template/launch/server runner coverage | `Still Valid` | focused server group pass |
| existing live compaction harness | `Needs Update` -> `Updated / Pass` | exact captured serialized tool-result pressure, raw-source equality, prompt safety, actual effective zero tools, DeepSeek acceptance |
| `API-REV-003` live result | `Historical Only` | fresh `LIVE-DEEPSEEK-003` executed |

No durable coverage was stale or removed. No compatibility-only assertion was added.

## Durable Coverage Changes

| Scenario | Absolute Path | Change | Result |
| --- | --- | --- | --- |
| `API-E2E-008` | `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/autobyteus-ts/tests/integration/agent/runtime/agent-runtime-compaction.test.ts` | provider-safe initial/correction prompts; supplementary-boundary accepted projection; actual-runtime typed invariant failure with zero runner/dispatch/mutation and retained USER gate | Pass, 4/4 and affected group |
| `API-E2E-009` | `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts` | final built-in compactor `AgentConfig.tools=[]`, persisted definition unchanged; ordinary four defaults preserved | Pass, 5/5 and focused group |
| `LIVE-DEEPSEEK-003` | `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/test-support/live-e2e/live-e2e-harness.ts` | exact 2,649-unit captured tool-result read, raw equality/valid shield, safe child omission pressure, safe projection, effective tool list | Pass after bounded assertion correction |
| `LIVE-DEEPSEEK-003` | `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-response-robustness/autobyteus-server-ts/tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | public assertions for four native tools, Unicode/source booleans, and empty effective compactor tools | compile/skip and live 2/2 pass |

## Executed Evidence Summary

- Core: 41 files / 223 unit tests; 5 files / 8 integrations; core build — all pass.
- Server: 6 files / 29 focused unit/integration tests; 10 GraphQL API E2E tests; server build/bootstrap smoke — all pass.
- Live gate: compile/import skip pass; managed-provider preflight 18/18 with DeepSeek READY.
- Real provider: DeepSeek `deepseek-v4-flash`, 2/2 tests pass, exact one compaction, prompt contract `[3]`, four parent native tools, child runtime zero tools, provider-safe exact-shield omission pressure, exact raw source retained, valid projected memory/current user, and exact continuation artifact.
- Cleanup/value safety/diff: owned files/processes absent; nine secret assignments scanned across evidence with zero exact-value matches; `git diff --check` pass.
- Two initial assertion-fixture failures were API/E2E-local and corrected: the invariant spy originally failed too early in value rendering; the live raw-source assertion originally read the intentionally empty trace `content` field instead of authoritative `toolResult`. Corrected reruns passed; production source was not implicated.

## Confidence And Broader-Validation Decision

| Category | Post-Repository | Final | Evidence / Residual |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | 99% | direct mapping across exact fixture, runtime, server config, and live provider |
| Changed-boundary execution directness | 99% | 99% | actual core runtime, final server factory config, and canonical child |
| Cross-boundary integration realism and mock gap | 94% | 99% | managed DeepSeek -> server -> parent tools -> compactor -> persistence; invariant failure remains deterministic by design |
| Environment/configuration/identity/fixture fidelity | 93% | 98% | isolated owner-authorized vault and exact captured serialized result; external availability remains variable |
| Failure/edge/lifecycle/recovery evidence | 99% | 99% | typed pre-launch failure, correction, exhaustion, USER retry, null/zero lifecycle, atomicity |
| User-surface/browser/desktop-shell confidence | N/A | N/A | no UI or shell surface changed |
| Durable regression coverage quality/relevance | 98% | 98% | four bounded durable paths; proportional review pending |

- Overall post-repository confidence: `96.8%`
- Overall final confidence: `98.7%` (simple mean of six applicable categories)
- Critical behavior directly proven: `Yes`
- Any applicable category below 90%: `No`
- Broader-validation decision: `Required — Live API; Completed`
- Final result: `Pass`
- Residual risks: probabilistic factual quality of otherwise schema-valid live summaries; external provider availability/accounting variance; deterministic rather than provider-induced local invariant failure. None blocks current acceptance.
- Next gate: `code_reviewer` proportional review of the four changed durable coverage paths before delivery re-entry.
