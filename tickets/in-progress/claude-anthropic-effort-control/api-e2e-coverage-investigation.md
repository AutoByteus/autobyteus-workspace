# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/claude-anthropic-effort-control/requirements-doc.md` (SR-002, approved by the User 2026-10-29)
- Investigation Notes: `.../investigation-notes.md`
- Solution Revision Record: `.../solution-revision-record.md` (SR-001, SR-002)
- Design Spec (required on every route): `.../design-spec.md` (SR-002; classification Medium / Low)
- Supplemental Task Artifacts: `evidence/SD-PRB-003-omitted-thinking-round-trip.log` (designer probe)
- Design Review Report: `N/A — not applicable` (architecture review not selected)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `.../implementation-handoff.md` (IR-001)
- Implementation Revision Record: `.../implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct Medium / Low route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `.../api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Implementation Complete IR-001 (implementation commit `574aa0bd7`, handoff commit `a2a5d0e47`), direct low-risk route.
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

All paths are relative to the worktree `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control` (branch `codex/claude-anthropic-effort-control`).

## Current Requirement And Design Basis

- Every AutoByteus Claude row exposes `reasoning_effort` [low..max] with the API default (medium: Opus 5.5, Haiku 5.5; high: others) (REQ-001/002, AC-001).
- `AnthropicLLM` sends `output_config.effort` when effort is configured and thinking is not off; sends none while thinking is off whatever is stored; never sends `thinking.display`; reads only `thinking_enabled` and `reasoning_effort` from the run config (owned-key projection) (REQ-003/005/010/011, AC-002/003/004/010/011).
- Web: switch rows show one list Off · Low · Medium · High · Xhigh · Max; Opus 5.5 / Fable 5.1 show the levels only; no display control; Claude Agent SDK presentation unchanged (REQ-004/006/009/010, AC-005/006).
- Gen-4 Claude rows and fixed-budget machinery removed; saved configs naming a removed model fall into the existing unavailable-model state (REQ-007, AC-007).
- Persisted data: `Directly Usable — No Migration`; saved runs, definitions and launch configs whose `llmConfig` still holds `thinking_display` keep loading, resuming and running; the key is never sent; no stored data is rewritten (REQ-011, AC-011).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-005-T (team run): a saved AutoByteus team run whose `team_run_execution_tree.json` holds `thinking_display` in `defaultLaunchConfiguration` and member `launchConfiguration.llmConfig` (shape read-only from user data SRC-019) is reopened and messaged. Trigger: team run history → open → send.
  - SCN-005-O (Org run): the same for an AgentOrg run (`agent_org_run_execution_tree.json`). Trigger: Org run history → open → send. No real Org run holds the key (SRC-019 grep), but REQ-011 covers saved runs generally and the design names Org trees as stored subjects.
  - SCN-005-E (edit an old stopped run): the user opens Run settings of a stopped run whose stored config holds `thinking_display`, changes Thinking, and Saves. Trigger: run settings Edit → Save (`updateStoppedAgentRunModelConfig` / `updateStoppedTeamRunModelConfigs` / `updateStoppedAgentOrgRunConfig`). Server revalidation is strict (SRC-011: unknown key → "Setting is not supported…"); the web edit surface keeps unsupported values as residuals (`RuntimeModelConfigFields` passes `preserve-invalid-draft`; `docs/settings.md` L1652-1658). Whether Save succeeds decides whether an old run's settings stay editable.
  - SCN-004-R (saved config on a removed model): a saved run / definition naming `claude-opus-4-7` (etc.) is opened. Trigger: run history open; definition edit.
  - SCN-002-A (Agent Configuration / definition editing): edit an agent definition's default launch model to Opus 5.5 / Sonnet 5.5 and use the Thinking control (AC-005/006 on that surface).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none. (SCN-003's "Saved off+max config via API" alternate is superseded by REQ-005: it is now sent as Off without effort, covered by IMP-11.)

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Opus 5.5 effort list | Added | REQ-001/002/006, AC-001/006 | catalog unit (IMP-01), rendered (IMP-12), definition surface (API-06) |
| BEH-002 switch rows one list | Changed | REQ-004, AC-005 | web specs (IMP-03), rendered (IMP-12), definition surface (API-06) |
| BEH-003 `output_config.effort` | Added | REQ-003, AC-002/009 | adapter unit (IMP-01), live (IMP-05/11), live agent loop (API-07) |
| BEH-004 off + stored effort | Changed | REQ-005, AC-003/004 | adapter unit, live (IMP-11), app (IMP-14) |
| BEH-005 gen-4 removal | Removed | REQ-007, AC-007 | catalog unit, grep audit (API-08), unavailable-model state (API-05) |
| BEH-006 Claude SDK menu | Preserved | REQ-009 | web specs (IMP-03) |
| BEH-007 no display; stale keys inert | Changed/Removed | REQ-010/011, AC-010/011 | adapter unit, server resume test single runs (IMP-06/13), team + Org (API-02/03), edits (API-04), live tool cycles without display (API-07) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `AnthropicLLM` request shaping, catalog, policy | IMP-01, IMP-08 | none material | — |
| API / transport / contract | Yes | GraphQL `configSchema`; server strict validation of stored configs; Anthropic Messages API | IMP-06, IMP-13 (single runs) | team/Org restore; stopped-run edit validation of stale keys | server e2e (in-process) |
| Frontend component / state | Yes | thinking adapter/menu/control | IMP-03 | definition-editing surface | browser |
| Browser integration / user journey | Yes | composer, run settings, Agent Configuration | IMP-12, IMP-14 | definition editing; old-run edit; removed-model state | browser (real backend + Nuxt dev) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (web-equivalent) | same renderer | as above | — | browser |
| Desktop shell / Electron-specific integration | No | no shell code changed | — | — | — |
| Process / lifecycle | Yes | stop → restore of runs with stale stored keys | IMP-13 (single) | team / Org | server e2e |
| Persisted-data transition | Yes | stored `llmConfig` keys no longer declared | IMP-13, IMP-14 | team/Org trees; stopped-run edit | server e2e + browser |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Anthropic API: effort, no display, omitted thinking in tool cycles | IMP-05, IMP-11, IMP-13 | agent tool cycles with omitted thinking (Sonnet 5.5 formerly `summarized`), preserved-thinking strict check | gated live suites |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control`
- Project type and runtime stack: pnpm monorepo; `autobyteus-ts` (core, Vitest), `autobyteus-server-ts` (Fastify/GraphQL, Vitest e2e), `autobyteus-web` (Nuxt 3, Vitest, Electron wrapper).
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md` under the changed packages.
- Conflicting, missing, or unclear project instructions: `pnpm` resolves only as `corepack pnpm` here (handoff); scripts that call `pnpm` need a PATH shim. Electron cannot run as root in this container; this change has no shell-specific behavior, so the browser surface (web-equivalent renderer) is the chosen surface (TESTING "Choosing the path": renderer UI → web unit tests + browser probe).
- Required environment variables or secrets available: `Yes` — Anthropic key in the test vault `/root/.autobyteus-test/vault` (not printed).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | global testing strategy | layer commands; clean env (`env -i PATH HOME=<temp> TMPDIR`) for e2e/live; gates; test vault; one heavy run at a time; never touch the user's running app/data; rerun by impact |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts` header | AC-011 suite | default synthetic vault + canned Anthropic; live gate `RUN_ANTHROPIC_STORED_CONFIG_LIVE=1` |
| live suite headers (`autobyteus-claude-5-5-live`, `-anthropic-prompt-caching-live`, `-compaction-cache-reuse-live`) | gated live suites | gates `RUN_CLAUDE_5_5_E2E=1`, etc.; credit cost noted per file |
| implementation-handoff "Environment Or Dependency Notes" | local env facts | `corepack pnpm`; build contracts before web suite; rebuild `autobyteus-ts` dist before `dist/app.js` probes |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process studio server (e2e) | `autobyteus-server-ts` | via vitest (`startStudioE2eRuntimeServer`) | temp data dir per suite | suite beforeAll | suite afterAll removes data dir |
| Backend for browser | repo root | `node autobyteus-server-ts/dist/app.js` on owned temp data root, free port, sanitized env, throwaway HOME | must rebuild `autobyteus-ts` and server dist from this worktree first | GraphQL responds | kill owned PID; remove temp root |
| Nuxt dev for browser | `autobyteus-web` | `corepack pnpm -C autobyteus-web dev` pointed at the owned backend, free port | warm up before asserting | page loads | kill owned PID |
| Headless browser | — | agent browser tools | — | — | close tabs |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| stored configs holding `thinking_display` | create runs through GraphQL, stop, then add the key to the test-owned stored JSON (shape copied from user data read-only, values only) | user data read-only; never copied | temp data root removed |
| saved run/definition naming a removed model | create through GraphQL on a current model, stop, rewrite the model id in the test-owned stored JSON (released structure) | test-owned data only | removed |
| Anthropic key | test vault, read-only | never logged | n/a |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: run metadata, team execution tree (root default + members), Org execution tree holding `thinking_display: "omitted"`; resume and send must work, the request must not carry the key, and no stored data is rewritten; editing an old stopped run must not be blocked by the stale key.
- Evidence planned: API-02 (team), API-03 (Org), API-04 (edits), plus reused IMP-13/IMP-14 (single runs).
- Migration-specific scenarios: N/A.
- Upstream ambiguity or reroute required: depends on API-04/API-06 results (stopped-run edit with strict server validation; design escalation trigger (a)).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts`, `anthropic-llm-claude-5-5.test.ts`, `anthropic-model-request-policy.test.ts`, `supported-model-definitions.test.ts` (+ other LLM unit tests updated) | request shapes, effort mapping, stale keys not sent, removed rows, exact policy lookup | AC-001..004, 007, 008, 010, 011 | Still Valid | IMP-01, IMP-08 | reuse |
| `autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts` (live) | effort per model; Off + stored max; stored display | AC-002..004, 009, 011 | Still Valid | IMP-05, IMP-11 | reuse |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts` | single-run restore with stale key | AC-011 | Still Valid; Needs Update (team / Org cases missing) | IMP-06, IMP-13 | extend (API-02, API-03) |
| `autobyteus-server-ts/tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts` | stopped-run edit lifecycle on a non-Claude model | — (adjacent) | Out Of Scope (no Claude / stale-key case) | read | none |
| web specs: `llmThinkingConfigAdapter.spec.ts`, `chatThinkingMenu.spec.ts`, `ChatThinkingControl.spec.ts`, `ModelConfigSection.spec.ts`, `llmConfigSchema.spec.ts`, `chatDraftStore.spec.ts` | one list, effort-only list, no display, Claude SDK menu | AC-005/006, REQ-009/010 | Still Valid | IMP-03 | reuse |
| gated live `autobyteus-claude-5-5-live` | Sonnet/Haiku 5.5 agent tool cycles, thinking on/off shapes, no display | AC-003/004/009/010 (agent loop) | Still Valid (updated by implementation, not run) | — | run (API-07) |
| gated live `autobyteus-anthropic-prompt-caching-live` | Opus 5.5 caching with preserved thinking, strict prefix check; now with omitted display | REQ-008 (caching preserved), REQ-010 | Still Valid (updated, not run) | — | run (API-07b) |
| gated live `autobyteus-compaction-cache-reuse-live` | compaction summary reuse | REQ-008 | Still Valid (one config key removed) | — | not run: TESTING.md says live compaction is not required proof; only `thinking_display: "summarized"` was dropped from its config, and API-07b exercises the same omitted-thinking continuation |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..004, 006..011 (parts) | catalog, adapter, web, server single-run | Reused | IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06, IMP-08, IMP-11, IMP-12, IMP-13, IMP-14 | `git diff --name-only 574aa0bd7 a2a5d0e47` outside `tickets/` is only the AC-011 test file (live mode added; IMP-13 ran it); no production code changed since |
| API-02 | AC-011 (team), REQ-011 | server GraphQL + team WebSocket + `AnthropicLLM` | Durable | extend the AC-011 e2e file: team run on Opus 5.5 (and a switch-row member), send, stop, add stale key to every stored `llmConfig` in the team tree, restore, send, assert request body | user data holds a team run with the key (SRC-019) |
| API-03 | AC-011 (Org), REQ-011 | server GraphQL + Org stream + `AnthropicLLM` | Durable | same for an AgentOrg run | REQ-011 covers saved runs; Org trees are named stored subjects |
| API-04 | REQ-011 (edit), AC-011 | server strict validation on stopped-run edits | Temporary Probe (expected behavior undecided; durable coverage belongs with the fix) | stopped agent / team / Org run with stale key: Save a Thinking change with the payload the web sends; observe outcome | SCN-005-E |
| API-05 | AC-007 alternate | server restore + web unavailable state | Journey + API | saved run naming `claude-opus-4-7`: open in app, observe unavailable-model state, no crash; definition naming it in definition editor | existing unavailable-model handling is claimed, not shown |
| API-06 | AC-005, AC-006, REQ-010 | Agent Configuration (definition editing), run settings edit of old run | Journey | browser: real backend + Nuxt dev; edit agent definition default model to Opus 5.5 / Sonnet 5.5; Thinking control; run settings edit of a stale-key run | definition surface not rendered in IMP-12 |
| API-07 | AC-003/004/009/010, REQ-008 | live agent tool cycles (Sonnet/Haiku 5.5) | Existing Test (gated live) | `RUN_CLAUDE_5_5_E2E=1` live suite | request shape changed in real agent loops (Sonnet 5.5 summarized → omitted) |
| API-07b | REQ-008/010 | live Opus 5.5 caching with omitted preserved thinking (strict binding) | Existing Test (gated live) | `autobyteus-anthropic-prompt-caching-live` with its gate | omitted thinking blocks under strict prefix binding not yet proven live |
| API-08 | AC-007, AC-010 | repository | Temporary Probe | grep audit for removed IDs / keys outside `tickets/` | independent recheck of the handoff's audit |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02, API-03 | `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts` (new cases) | team/Org restore with stale stored keys is a REQ-011 promise on real data shapes; the existing file is the natural owner |
| API-04 | same file, when the behavior is approved | protects edit of old runs |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-02/03 | AC-011 e2e file | header lists the new cases | — |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order: rebuild `autobyteus-ts` and `autobyteus-server-ts` dist from this worktree; start backend (`dist/app.js`, owned temp data root, free port, sanitized env, throwaway HOME, `AUTOBYTEUS_TEST_VAULT` only for cases needing real replies); start Nuxt dev against it; warm up; drive headless Chrome.
- Health / readiness: GraphQL query answers; page renders.
- Seed data: created via GraphQL/UI; stale keys / removed model IDs written into test-owned stored JSON after stop.
- Evidence: DOM text/state captured by scripts, screenshots, GraphQL responses, stored JSON before/after, backend log excerpts.
- Owned processes and temporary state to clean up: backend, Nuxt dev, browser tabs, temp data roots.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Electron shell | no shell code changed; Electron cannot run as root here; web-equivalent renderer covered | Low | No | — |
| `autobyteus-compaction-cache-reuse-live` | TESTING.md: live compaction not required proof; only a removed display key in its config | Low | No | — |
| `test-support/live-e2e` scenarios | only the model name changed (Haiku 5.5); same requests as API-07 | Low | No | — |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| Saving Run settings of a stopped agent/team run whose stored config holds `thinking_display` is refused (`VALIDATION_FAILED`, `llmConfig.thinking_display` not supported): the stopped-run edit surface keeps the key (`RuntimeModelConfigFields` `preserve-invalid-draft`), contrary to the design's "edit surfaces drop them on save" | `Design Impact` (execution failure; routed through code-reviewer failure-origin review) | API-04, API-06 evidence; design-spec Change Scope / Persisted Data | Solution Designer (after failure-origin review) |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added cases in the AC-011 e2e file)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: API-04/API-06 failed (see execution report); durable coverage of the edit path is deferred to the fix round because its expected behavior is a design decision.
