# Handoff Summary — usage-limit-fallback-646 (autobyteus-646)

## Summary Meta

- Ticket: `usage-limit-fallback-646` (Project Task `autobyteus-646`): when a run's runtime reaches its usage limit, the run continues on another usable runtime.
- Date: `2026-11-27`
- Classification: `task_size: Large`, `architectural_risk: High`.
- Route: architecture review (ARCH-REV-001 … 005, Pass at the 9-point bar) → implementation (IR-001, IR-002, IR-003) → source review (CRR-001 Fail, CRR-002 Pass 9.4/10, CRR-004 Pass for the base refresh) → API/E2E (API-REV-001 Pass 94%) → test-code review (CRR-003 Pass) → delivery (DR-001, after one rerouted attempt).
- Current Status: `Verified from evidence / finalized on personal; no release` (the commits are in `release-deployment-report.md`). **The release is held** by the Solution Designer until the founder approves R-6 and decides DEC-008 (below).
- Branch: `codex/usage-limit-fallback-646`, base `origin/personal` @ `bc4351cad7`; merged with `origin/personal` @ `85174411168c` (125 commits) as `3a541e3d45` by the implementation engineer after delivery routed the one import conflict. Code `1bc523124e` (IR-002) and the earlier implementation commits; tests `b5e56fcc50`.

## Delivery Summary

- **A usage limit no longer stops a run.** A turn that fails on its runtime's usage limit is recognized (Codex: structured `usageLimitExceeded`; Antigravity, Grok and Claude: the live limits read after the error, `ERROR_CLASSIFIED`) and published as a **run event** (`usage_limit_reached`, with the runtime, the model, the models blocked by the same limit and the reset time) on a new node-wide hub. Two listeners act on it.
- **Exhaustion memory.** Each exhausted runtime and model is remembered until its reset (or for an hour when no reset is reported); a delegated or peer-started run does not start on a remembered-exhausted default (it starts on the fallback with a launch note).
- **The switch.** The run's agent stops quietly, and the run switches through the existing runtime switch and hand-over (the new runtime gets the earlier work through the work journal). The failed input is not sent again; the new runtime receives a short labelled continue notice. The conversation shows one notice row: the limit, its reset and who chose the new runtime. A switch waits for a running turn to end, then switches once.
- **Who chooses the fallback (DEC-001, DEC-004):** the Model Router, when Model Routing is on and answers within 40 s; else the agent's most-used usable runtime and model of the last 30 days; else the node's most-used usable runtime and model (all agents, 30 days); else the first usable runtime in the node's list (SR-011 R-17). The launch records who chose (`model_router`, `agent_history`, `node_fallback`; R-19). Each runtime is tried at most once per turn; an exhausted fallback is skipped; nothing loops.
- **No fallback:** the run stays in Error with a notice that names each exhausted runtime and its reset and points to the run's Settings (R-18).
- **Which runs (DEC-003):** every run: ones a person started (their explicit runtime choice is overridden, and the notice says so), delegated runs, Team members, and a peer's copy on its own node.
- **Setting (DEC-002):** `AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED`, on by default, "Switch runtime when a usage limit is reached" in Settings → Model Routing; it works whether or not Model Routing is on.
- **Records:** switch records are kept 90 days (`switches_*.jsonl`, DEC-008's default); run events 31 days.
- Docs: `run_events.md` (new), `model_routing.md`, `agent_runtimes.md`, `agent_tools.md`, `agent_tools_mcp_server.md`, `collaboration_model.md` CM-12, `README.md`, web `settings.md` from the code commits (verified); at delivery `GLOSSARY.md` ("automatic runtime switch") (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence by delivery. No user check is needed: every acceptance criterion (AC-001 … AC-004) is directly proven by its stated method.
- Key evidence (under `evidence/API/` unless named):
  - `API-01-built-server.log`, `API-01-ul-receipt.json`: the built-server suite `Tests 12 passed (12)`. UL-01 (first-turn switch), UL-02 (mid-work), UL-03 (Model Routing on: the router's turn ends without a decision, so history decides, R-6 pending), UL-04 (a Team member switched while the Team runs and after a restart), UL-05 (nothing usable: Error with the Settings pointer), UL-06/UL-11 (delegation: skipped default, node fallback noted and recorded), UL-07 (setting off), UL-08 (Antigravity: the late classification, one error row), UL-09, UL-10 (a second message still running: the switch waits, then switches once and hands both over), UL-12 (a Team member by the node fallback).
  - `API-02-peer.log`, `ULP-01.json`, `ULP-02.json`: two paired built servers, `Tests 2 passed (2)`: a delegated copy fails on the peer's Codex and switches there; a worker with no history there starts on the peer's node fallback.
  - `API-03-e2e.log`: whole ungated `pnpm test:e2e` `Tests 575 passed` (one teardown race in an untouched file, FU-646-05, passes alone ×3). `API-04-probe.log`: the Model Routing browser probe, MRD-01 Pass (the switch), MRD-04 failed on a stale address (FU-646-04, before this ticket).
  - Reused: whole unit, integration, web and contracts suites (IMP-11 … IMP-13).
- Integrated state (`evidence/DEL-post-integration/`, merged state `3a541e3d45` at HEAD `78df7abb81`): `pnpm install --frozen-lockfile`, `codegen:check` ("generated/graphql.ts is current"), both typechecks at baseline (server 972/299, web 85/35), the server rebuilt, the built-server UL-01 … UL-12 `Tests 12 passed (12)` and ULP-01/02 `Tests 2 passed (2)`, and 3828 unit tests of the touched areas (446 files, plus `tests/architecture`) pass.
- Final confidence 94%, no category below 92%. The team's 95% default is missed by one point, for the reason API/E2E gives: a real runtime at a real usage limit cannot be produced without exhausting an account and spending its credits.
- Secret Gate PASS; artifact hygiene and licensing PASS.

## Residual Risks For The User

- **R-6 is not in the code (release condition, the founder).** The Model Router's built-in template has no "Switch requests" section and does not list `submit_runtime_switch`. With Model Routing on, the router receives the request, its turn ends without a decision, and history decides after up to 40 s (UL-03 asserts exactly that). **Merging to `personal` puts this on the branch every release is cut from**: a release made before R-6 lands ships the router without it.
- **DEC-008 is the founder's:** switch records are kept 90 days (the default) until he decides. The routing decision log is never deleted (FU-646-03).
- **A real runtime at a real usage limit is Not Tested.** No account is exhausted (the host's Codex limit reset on 2026-11-27), and exhausting one would spend credits. AC-001's stated other method (unit tests with recorded payloads) and the scripted Codex app-server cover it; no `DEC-*` accepts it as a risk.
- **Claude's own usage-limit signal is unrecorded**, so Claude is classified by its limits read. Codex's recorded payload could drift.
- **An automatic switch overrides a person's explicit runtime choice (DEC-003 (a))**; the notice says what changed and the run's Settings switches it back.
- **Files at the 500-line limit:** `standalone-agent-run-lifecycle-service.ts` at 499 and `root-team-run.ts` at 498 non-empty lines.

## Follow-ups

`follow-ups.md`: FU-646-01 (a token-cost budget as the hub's second listener, the founder's idea), FU-646-02 (after a switch to AutoByteus the reloaded conversation shows the hand-over preface as a second row), FU-646-04 (the Model Routing probe MRD-04 looks for a stale address), FU-646-05 (an E2E teardown race under load in an untouched file); the Solution Designer sends them. FU-646-03 (the routing decision log's retention) is a founder decision. Docs sync found none.

## Release

- No release. Not asked for, RELEASE.md's default is no release, and the Solution Designer holds it until R-6 and DEC-008 are settled. `release-notes.md` describes the current behavior, including that the router cannot answer a switch request yet; **it must be revisited when R-6 lands.**
