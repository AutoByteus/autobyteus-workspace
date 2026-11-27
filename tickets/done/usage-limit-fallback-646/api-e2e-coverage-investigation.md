# API/E2E Coverage Investigation — usage-limit-fallback-646 (autobyteus-646)

## Investigation Meta

- Requirements Doc: `requirements-doc.md`; Design Spec: `design-spec.md` (SR-011); architecture review files present (not mine to commit)
- Implementation Handoff: `implementation-handoff.md` (IR-002); Code Review: `code-review-report.md` (CRR-002 Pass, round 2, 9.4/10)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current Revision ID: `API-REV-001`
- Round 1; Trigger: CRR-002 Pass (code `1bc523124e`, documents to `5dba382563`)
- Testing guideline: `TESTING.md` (root): built-server suites in `env -i`; runtimes without a model (scripted AGY; this ticket's scripted Codex app-server); gated live suites only when the change needs real-provider proof; fresh-start build for changed build inputs (the contract package's `dist` changed); browser probes.
- Release condition (not a validation item): R-6 (the router template's switch section) waits for the founder; until then, with Model Routing on, the router's turn ends without a decision and history decides after up to 40 s (UL-03). DEC-008 waits for the founder (90 days applied).

## Current Requirement And Design Basis

A run whose runtime reaches its usage limit is switched to another runtime: the Model Router chooses, else this agent's history, else the node fallback (the node's most-used usable launch over 30 days, else the first usable runtime and model), else no fallback, with one notice pointing to the run's Settings (R-17, R-18). The switched run's launch records who chose it (R-19). A delegation skips a default remembered as exhausted; in a delegation the node fallback comes only when the inherited launch can't run. Codex signals the limit; runtimes without a signal classify by their limits read (R-13, R-16). The switch waits for the run to be quiet (a not-quiet switch retries at the next idle status). Persisted data: new logs only.

## Supported Scenarios And Real Usage

- UC (requirements): a run's first turn or a later one fails on the limit; a delegation to an agent whose default is exhausted; every candidate exhausted.
- Added from real use: RU-1, a delegator that itself runs on an exhausted model (its inherited launch can't run) delegating to an agent with no history; RU-2, a Team member with no history; RU-3, Codex's turn still ending when the switch arrives (Codex sends `error` before the turn ends); RU-4, a run another node starts, which has no inherited launch.

## Changed Surface And Boundary Classification

| Surface | Affected | Repository evidence | Not exercised by it | Broader mode |
| --- | --- | --- | --- | --- |
| Runtime event flow (detector → hub → listener → switch) | Yes | unit; built-server UL-01 … UL-09 | the not-quiet retry; the node fallback in a delegation and for a Team member | UL-10, UL-11, UL-12 |
| Delegation launch resolution | Yes | unit; UL-06 (history) | node fallback with an exhausted inherited launch; on a peer (no inherited launch) | UL-11, ULP-02 |
| Peer collaboration | Yes | ULP-01 (history) | the node fallback on a peer | ULP-02 |
| Browser (the Settings switch) | Yes | IMP-10 probe | — | probe rerun |
| Real runtimes at a real limit | Yes | recorded payloads (unit) | a live exhausted account | Not Tested (below) |
| Build inputs (contract package `dist`) | Yes | — | a fresh clone | fresh start |

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| `tests/e2e/run-events/usage-limit-switch-built-server.e2e.test.ts` (UL-01 … UL-09) | Still Valid | add UL-10, UL-11, UL-12 |
| `tests/e2e/run-events/usage-limit-switch-peer-run.e2e.test.ts` (ULP-01) | Still Valid | add ULP-02 |
| `tests/fixtures/codex-usage-limit-app-server.mjs` | Needs Update | an optional end delay after `error` (UL-10) |
| `tests/fixtures/agy-failure-cli.mjs` (`runtime_error`) | Needs Update | a `CALL_TOOL` message is served as an ordinary turn (UL-11's delegator); no other suite sends one in this case |
| `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs` MRD-04 | Stale before this ticket (FU-646-04) | out of scope |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Command |
| --- | --- | --- | --- | --- |
| API-01 | AC-001 … AC-004, R-17 … R-19 | built server, scripted Codex/AGY/AutoByteus | Existing + Durable (UL-10/11/12 new) | `RUN_USAGE_LIMIT_SWITCH_E2E=1 … usage-limit-switch-built-server.e2e.test.ts` |
| API-02 | AC-002, R-11, R-17 | two built servers | Existing + Durable (ULP-02 new) | `RUN_USAGE_LIMIT_PEER_E2E=1 … usage-limit-switch-peer-run.e2e.test.ts` |
| API-03 | — | whole ungated server E2E | Existing Test | `env -i … pnpm test:e2e` |
| API-04 | the Settings switch | browser | Existing Test | `pnpm -C autobyteus-web test:e2e:model-routing-decisions` |
| API-05 | — | fresh clone (contract `dist`) | Existing Test | clone, frozen install, both typechecks |
| API-06 | — | typecheck; tracked imports | Existing Test | — |
| Reused | AC-001 (recorded payloads), AC-004 | unit, integration, web, contracts | Reused | IMP-11, IMP-12, IMP-13 (code unchanged since) |

## Not Tested / Infeasible / Deferred (planned)

| Behavior | Reason | Risk |
| --- | --- | --- |
| A real runtime at a real usage limit (AC-001's gated live case "when an account is exhausted"); Claude's own SDK signal | No account is exhausted now (the Codex login's limit reset this morning); exhausting one would spend the user's credits. AC-001's other method (unit with recorded payloads) and the scripted app-server, which sends Codex's documented three errors, cover it | Codex's payload shape could drift; Claude classifies by its limits read (R-13) |

## Investigation Decision

- Proceed: `Yes`. Durable coverage added: `Yes`. Reroute: `No`.
