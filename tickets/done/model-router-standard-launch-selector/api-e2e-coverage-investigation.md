# API/E2E Coverage Investigation — autobyteus-313 (Model Router: standard launch selector)

The plan. Results, scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved); no behavior-defining supplement (the autobyteus-32 UI/UX specification stays normative for what this ticket does not change)
- Investigation Notes: `investigation-notes.md` (B-01…B-15)
- Solution Revision Record: `solution-revision-record.md` (SR-001)
- Design Spec: `design-spec.md` (SR-001)
- Design Review Report: N/A (Medium/Low, direct route; no independent architecture review)
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001)
- Code Review: N/A (direct low-risk route; the implementation's lightweight self-review is in the handoff)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Round: 1. Trigger: the implementation engineer's direct handoff (IR-001). Prior investigation: none.

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/model-router-standard-launch-selector`, branch `codex/model-router-standard-launch-selector`, base `origin/personal` `1c54ffec6a`; code `09f99eed32`, `f9c58612e5`, `1357063994`; docs `e9c25f3801`.

**Task Done-when (carried):** "The Configuration tab uses the standard selector; the router starts with the stored launch configuration, including the thinking level; the names match the rest of the app on all four tabs; covered by tests; merged to personal." Constraints: the user's router configuration must not be lost (DESIGN.md rule 10); prove from a clean clone (delivery); no release unless asked.

## Current Requirement And Design Basis

- The router's launch = runtime, model, `llmConfig`: three server settings, with the new `AUTOBYTEUS_MODEL_ROUTER_LLM_CONFIG` (absent means none, no migration).
- A save is checked by `RunModelSelectionService.validate` in the router's workspace and refused with its message.
- The router run is created with the launch and reused only while all three are equal; `model-router-agent.json` records them. A state without `llmConfig` (beta.11) reads as "no settings".
- Configuration uses the app's `ChatModelMenu`, `ChatThinkingControl` and `ChatModelOptionControl`; a model choice makes its settings explicit.
- Names: `runtimeKindToLabel` for runtimes and the model menu's labels on all four tabs and in the problem line.

## Supported Scenarios And Real Usage

- SCN-1: the owner picks the router's model and thinking level on Configuration (AC-001, AC-002).
- SCN-2: routings use that launch; a change of the thinking level gives the router a new run; the knowledge is kept (AC-003).
- SCN-3: the owner updates from a released build (beta.11/12) with a router already set and a router run recorded (AC-005).
- SCN-4: the owner reads Decisions, Overview, Runtimes and the problem line (AC-004).
- Added: SCN-A1, a launch saved through the API with settings the model does not accept (AC-002, "refused with the check's message").
- Contrived: none.

## Changed Surface And Boundary Classification

| Surface | Affected? | Changed Boundary | Repository Evidence | Not Exercised | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | Yes | stored launch, validation, run reuse rule | IMP-01 (unit), IMP-03 (scripted E2E) | a real runtime receiving the settings | Live API |
| API / transport | Yes | `setModelRouterLaunch(…, llmConfig)`, `modelRoutingStatus.routerLaunch.llmConfig` | IMP-04 (codegen), IMP-05 | refusal through GraphQL on a built server | Live API |
| Frontend | Yes | Configuration controls; names on four tabs | IMP-05 (rendered), IMP-06 (specs), IMP-07/08 (probes) | — | Reuse |
| Persisted data | Yes | new setting; `model-router-agent.json` with `llmConfig` | unit (beta.11 shape) | data written by a released build | Upgrade on a released build's data |
| Process / lifecycle | Yes | a new router run on a settings change | unit | real runs | Live |
| Distributed | Indirect | the peer's router (same code) | — | two nodes | Two-server E2E |

## Project Execution Discovery

- `TESTING.md` (root); `README` local full-stack development. The handoff's environment note: `pnpm dev` inherits `AUTOBYTEUS_*` (FU-003), so start dev stacks without them.
- Live checks: real CLIs with the real HOME (sign-ins only), a throwaway `CODEX_HOME`; keys only from the test vault; one heavy run at a time.
- Upgrade data: a released build writes it. The installed `/Applications/AutoByteus.app` is v1.5.9-beta.12 (isolated-launch support), started with `pnpm --silent isolated-app start --app … --data-root <owned dir> --keep`. Its model-routing code equals beta.11's (`git diff v1.5.9-beta.11 v1.5.9-beta.12 -- autobyteus-server-ts/src/model-routing` is empty; the settings service change is an unrelated memory-search setting), so its data has the beta.11 shape.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Decision | Action |
| --- | --- | --- | --- |
| unit `model-routing-settings.test.ts` (new), `model-router-agent.test.ts` | stored launch, validation call, reuse rule, beta.11 state | Still Valid | Reuse (IMP-01) |
| `tests/e2e/model-routing/model-routing-delegation.e2e.test.ts` (autobyteus-32) | routing end to end | Still Valid | Reuse (IMP-03, on the server of HEAD) |
| web specs, guards | page, controls, names | Still Valid | Reuse (IMP-06) |
| `model-routing-settings-probe.mjs`, `model-routing-decisions-probe.mjs` | Runtimes tab; Configuration + Decisions + Overview + Settings rows | Still Valid (updated by IR-001) | Reuse (IMP-07, IMP-08) |
| `remote-delegation-two-server.e2e.test.ts` RC-39…41 | the peer's router | Still Valid | Rerun (router launch code changed) |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | AC-001, 002 (unit), 003 (unit), 004, 005 (unit) | unit, web, scripted E2E, probes | Reused | IMP-01, IMP-03, IMP-05, IMP-06, IMP-07, IMP-08 | the code they exercise is HEAD's |
| API-01 | AC-002 | GraphQL on a built server, real catalogs | Temporary Probe | valid launch with thinking stored and read back; invalid settings value refused with the check's message, the stored launch kept; a model not offered refused | the refusal path through the API |
| API-02 | AC-003 | live router (Claude) | Temporary Probe | set Claude / sonnet with thinking on and an effort; route a delegation (live delegator); route again with no change → same run; change only the effort → a new run with it; `knowledge.md` unchanged; the router's CLI was started with the level | the router starts with the stored thinking level |
| API-03 | AC-005 | released beta.12 data → this build | Temporary Probe | an isolated beta.12 desktop instance (owned data root) sets the router (runtime + model), opens its run and routes once; stop; start this branch's server on that data → status, Configuration read, routing works, the same run is reused, `llmConfig` null, no migration | the user's configuration is kept |
| API-04 | autobyteus-32 regression (peer router) | two built servers | Existing Test | `remote-delegation-two-server.e2e.test.ts` | the router launch code changed |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Only The User Can Check? |
| --- | --- | --- |
| A model option control (Codex Fast mode) rendered with a real router | covered by the page spec (IMP-06); a live Codex router with Fast mode is optional | No |
| "Prove from a clean clone" | delivery's finalization step | No |
| The desktop app check | the user's | Yes |

## Investigation Decision

- Proceed: `Yes`. Durable coverage added/updated: `No` planned (the implementation added the unit tests and updated both probes). Reroute: `No`.
