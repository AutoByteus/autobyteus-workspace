# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/analyse-self-evolvement-backend/tickets/analyse-self-evolvement-backend/code-review-report.md`
- Current Investigation Round: 5
- Trigger: Code-review pass for the self-evolution companion/work-trace redesign, with downstream coverage hints.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 5

## Current Requirement And Design Basis

The approved implementation must replace the previous one-shot inline self-evolution evidence path with an activated companion subsystem. A manual Self Improve click must resolve current global self-evolution settings at click time, validate the live target and writable skill roots, backfill/catch up self-evolution work trace files from raw trace storage, create or reuse a live self-evolver companion, and send a small path-based trigger message. The self-evolver-facing work trace format must preserve semantically relevant messages/tool arguments/results/errors/timestamps while hiding backend-only trace protocol fields. Later clicks must reuse a still-active companion and refresh work traces before triggering. If a stored companion is unavailable, the backend must record replacement continuity. Agent/team launch inputs and run metadata must no longer carry manual self-evolution launch overrides or `selfEvolutionEffective` snapshots, and a required app-data migration must remove stale persisted metadata fields. Runtime companion failures must be recorded as `failed`, distinct from actual timeouts.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Work trace projection from active and archived raw traces into readable files and manifest | Added | REQ-001 through REQ-005, AC-001 through AC-004; design DS-002; implementation handoff lines 14-16 and 58 | Durable coverage must prove active + archive backfill/catch-up, manifest publication, merged tool rendering, timestamps, and hidden backend fields. |
| Trigger message to companion contains paths/edit scope instead of inline work trace body/raw JSONL | Changed | REQ-002, AC-005; design DS-001/DS-003 and message example; handoff line 14 | Durable coverage must inspect companion trigger content/metadata to prevent regression to inline evidence. |
| First/later click companion lifecycle | Changed | REQ-006/REQ-007, AC-002/AC-006; design DS-003; handoff lines 16, 58-60 | Existing session tests cover reuse and dead replacement; service-level sequencing needs coverage that each click calls `ensureCurrent()` before companion trigger. |
| Runtime failure vs timeout classification | Changed | Code-review CR-001 and handoff CR-001 section | Existing watcher/service integration coverage is valid and should be executed. |
| Manual launch overrides and `selfEvolutionEffective` metadata | Removed | REQ-011 through REQ-013, AC-008 through AC-010; design metadata removal section; handoff lines 18-19 | GraphQL schema, click-time config resolver, metadata store, and migration coverage must be executed. |
| Future `agent_team` evolver strategy placeholder | Preserved as non-executable placeholder | REQ-010; GraphQL strategy catalog design | Existing GraphQL/catalog test is valid. |
| Previous inline evidence builder, bounded work-history projector, one-shot strategy | Removed | Design removal notes; implementation handoff Legacy / Compatibility Removal Check; code-review legacy verdict | Removed tests for old behavior are stale/removal is valid. No durable compatibility coverage should be retained. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` | Projects active raw trace into readable work trace; merges tool call/result; hides backend fields | REQ-001..REQ-005, AC-001, AC-003, AC-004, DS-002 | Needs Update | Current test covers active-only projection but not archived + active raw trace corpus, numbered archive files, manifest containing both sources, or archive reuse on later catch-up. | Add archive+active/catch-up assertions while retaining current semantic rendering assertions. |
| `tests/self-evolution/self-evolution-companion-session-service.test.ts` | Persists companion state, reuses active companion, replaces unavailable companion and retains continuity fields | REQ-006, REQ-007, AC-002, AC-006, DS-003 | Still Valid | Direct unit coverage matches lifecycle policy and dead companion replacement hint. | Execute as part of self-evolution suite. |
| `tests/self-evolution/self-evolution-service.integration.test.ts` | Service records completed, stale target rejected, timeout finalized, runtime companion error recorded as failed | REQ-005, REQ-006, REQ-009, CR-001 failure distinction | Needs Update | Valid scenarios remain, but there is no direct service-level assertion that first and later requests each refresh work traces before posting the companion request and reuse the companion session. | Add first/later click sequencing coverage with mocked projection/session services. |
| `tests/self-evolution/companion-run-completion-watcher.test.ts` | Pending waiter rejects immediately on `ERROR` event or `statusHint: ERROR` | CR-001; runtime failure/timeout distinction | Still Valid | Code re-review passed this exact fix and tests. | Execute focused and suite tests. |
| `tests/self-evolution/self-evolution-graphql-resolver.test.ts` | GraphQL exposes self-evolution APIs, removes launch override fields, returns strategy placeholders, disabled gate short-circuits before target lookup | REQ-010..REQ-012, AC-008, AC-009 | Still Valid | Schema introspection checks `CreateAgentRunInput`, `CreateAgentTeamRunInput`, `TeamMemberConfigInput`, start inputs, definition inputs, and catalog. | Execute; no update needed unless broader schema check fails. |
| `tests/self-evolution/self-evolution-effective-config-resolver.test.ts` | Manual self-evolution settings resolve from current global capability/settings | REQ-011, AC-008 | Still Valid | Test asserts click-time current settings source trace rather than metadata snapshots. | Execute. |
| `tests/self-evolution/remove-self-evolution-run-metadata-migration.test.ts` | Migration removes standalone and recursive team member `selfEvolutionEffective` fields | REQ-013, AC-010 | Needs Update | Valid core behavior, but AC-010 also requires backup evidence and reporting counts; current test only checks migrated count and field removal. | Add backup path/count assertions and skipped-count coverage if practical. |
| `tests/unit/run-history/store/agent-run-metadata-store.test.ts` | Metadata store ignores unrelated legacy durable status fields and round-trips current V2 metadata | REQ-012, REQ-013 adjacent | Still Valid | Confirms no durable status legacy fields; not specific to self-evolution but relevant metadata health. | Execute focused unit test. |
| Removed `tests/self-evolution/self-evolution-graphql-converters.test.ts` | Old GraphQL converter expectations for self-evolution DTOs | Removed launch/inline model | Stale / Remove | Implementation handoff and code review report show obsolete converter/launch override paths removed. | No replacement beyond current GraphQL schema and service tests. |
| Removed `tests/self-evolution/self-evolution-work-history-projector.test.ts` | Old bounded prompt digest projector | Removed inline evidence behavior | Stale / Remove | Requirements/design reject prompt-inlined bounded digest as authoritative self-evolver data. | Replacement is work trace projection test updates. |
| Removed `tests/self-evolution/single-agent-evolver-strategy.test.ts` | Old one-shot helper strategy | Removed one-shot lifecycle | Stale / Remove | Requirements/design require persistent companion reuse; old strategy removed. | Replacement is companion session and service sequencing coverage. |
| Existing `tests/e2e/runtime/*` GraphQL/runtime suites | Runtime run creation/messaging/capability boundaries | Adjacent runtime infrastructure | Out Of Scope | No self-evolution-specific e2e fixture currently exists; direct GraphQL/schema and service integration cover changed boundary without standing up external model runtimes. | Do not broaden unless focused tests fail. |
| `tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` and run-history projection unit tests | Existing raw trace tool-call projection behavior | Work trace renderer reuses `buildHistoricalReplayEvents` | Still Valid / Out Of Scope mix | Reuse is important, but self-evolution work trace tests should assert merged output directly; full e2e run-history not required for this stage. | Rely on self-evolution projection test plus existing run-history transformer tests if needed. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `tests/self-evolution/self-evolution-work-history-projector.test.ts` | Bounded inline digest is the self-evolver-facing work history | New requirement makes durable work trace files the self-evolver-facing format and rejects raw/inline prompt delivery as authoritative. | REQ-001..REQ-005, AC-001..AC-005, design rejected alternatives, implementation handoff legacy removal check | `tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` update | N/A |
| `tests/self-evolution/single-agent-evolver-strategy.test.ts` | Each click creates/terminates a one-shot helper strategy | New lifecycle requires active companion reuse/replacement. | REQ-006/REQ-007, AC-002/AC-006, design DS-003, implementation handoff legacy removal check | `self-evolution-companion-session-service.test.ts` and service sequencing update | N/A |
| `tests/self-evolution/self-evolution-graphql-converters.test.ts` | Converter/DTO behavior for removed launch override state | Manual self-evolution launch overrides and target metadata snapshots are removed. | REQ-011..REQ-013, AC-008..AC-010 | `self-evolution-graphql-resolver.test.ts`, metadata store, migration tests | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-001 | Archive + active raw trace backfill/catch-up produces manifest entries and stable archive file reuse while active trace updates | REQ-001, REQ-005, AC-001, AC-002, design DS-002 | Update `autobyteus-server-ts/tests/self-evolution/self-evolution-work-trace-projection-service.test.ts` | Current active-only coverage misses a core first-click requirement from archived + active raw trace corpus. |
| COV-002 | Companion trigger message contains manifest/root/file paths and edit scope metadata but not full work trace content or raw JSONL body | REQ-002, REQ-004, AC-005, design DS-003 | Add direct assertions in `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` or a focused builder test | Prevents regression to prompt-inlined work trace/raw trace delivery. |
| COV-003 | First and later service requests each call `ensureCurrent()` before posting and later request reuses companion session | REQ-005, REQ-006, AC-002, design line requiring every click to call `ensureCurrent()` | Update `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` | Existing lifecycle tests are lower-level; service sequencing is the actual click boundary. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| COV-004 | `tests/self-evolution/remove-self-evolution-run-metadata-migration.test.ts` | Assert backup paths exist and report counts include migrated/skipped/failed as expected | AC-010, design migration framework notes, implementation handoff line 19 | Keeps migration executable coverage aligned with backup/reporting acceptance criterion. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None in this API/E2E round | Obsolete tests were already removed by implementation and accepted by code review. | Code-review legacy verdict passed. | No additional removal planned. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` | Current changed source and tests remain type-valid under build config | Existing repository root `typecheck` mismatch is known; build config check is implementation handoff's valid source typecheck. |
| TEMP-002 | `pnpm -C autobyteus-server-ts build` | Build packaging still succeeds after coverage edits | Build output is generated; command evidence is sufficient. |
| TEMP-003 | `git diff --check` | No whitespace patch errors | Command evidence only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real LLM companion reads generated files and edits a skill package end-to-end | Would require live provider/model credentials and non-deterministic skill edits; current design permits mocked companion runtime for deterministic backend validation. | Remaining risk that prompt quality needs refinement after real-world runs. | Delivery/user can run a manual live smoke if desired; no reroute. |
| Background automatic work trace update worker | Implementation handoff states optional background worker was not implemented; on-trigger `ensureCurrent()` is authoritative for this pass. | Work traces are current at clicks, not continuously between clicks. | No issue; explicit accepted implementation note. |
| Future `agent_team` evolver execution | Catalog marks `agent_team` not implemented. | Future feature not covered. | None for this change. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently identified | N/A | Upstream package and code review specify behavior sufficiently for coverage work. | N/A |

## Execution Plan

1. Add/update repository-resident durable coverage for COV-001 through COV-004.
2. Run focused self-evolution coverage commands for changed/updated tests.
3. Run the full `tests/self-evolution` suite plus related metadata store test.
4. Run build-config typecheck, build, and `git diff --check` as broader executable checks.
5. Record results in the execution coverage report.
6. Because durable coverage is being added/updated after the earlier code review, route the cumulative package back to `code_reviewer` for a narrow coverage-code re-review if validation passes.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing stale coverage removals are valid and no compatibility-only behavior was found in the inspected changed scope. Durable coverage additions/updates are required before final execution.

---

## Additional Live Browser Coverage Investigation Addendum — 2026-06-23

### Trigger

User requested a live browser E2E validation after the deterministic backend API/E2E round: read startup docs, start backend and frontend, seed a self-improvement-capable agent, use Codex GPT-5.5, define a goal, and exercise the self-improvement flow through the browser.

### Live Environment Scope Decision

| Item | Decision | Evidence |
| --- | --- | --- |
| Backend startup | Use temporary data dir and README-documented `node dist/app.js --data-dir ... --host 127.0.0.1 --port 18080` flow | `autobyteus-server-ts/README.md`; live server started against `/tmp/autobyteus-self-evo-live-browser-e2e-20260623-203124` |
| Frontend startup | Use `pnpm -C autobyteus-web dev --host 127.0.0.1 --port 13000` with backend REST/GraphQL/WebSocket env overrides | `autobyteus-web/README.md` plus `nuxt.config.ts` required `BACKEND_*` WebSocket overrides for local port 18080 |
| Seed data | Temporary agent `e2e-live-worker`, skill `e2e-live-improvement`, temp workspace, self-evolution server setting enabled | Seed files under `/tmp/autobyteus-self-evo-live-browser-e2e-20260623-203124` |
| Model | Use Codex App Server runtime with model `gpt-5.5` | Live GraphQL model catalog returned `gpt-5.5`; seeded agent default launch config is `codex_app_server` / `gpt-5.5`; browser config showed `OpenAI / GPT-5.5` |
| Browser scenario | Launch seeded agent, enable self-evolution eligibility, send seed message, then click Self Improve if launch succeeds | Required to prove live UI-to-backend path before companion self-improvement can be exercised |

### New Evidence Found Before Self Improve Click

The live browser launch path is stale relative to the backend schema-removal requirement. The browser run failed before the agent could start:

- Browser-visible error after sending the first message: `Response not successful: Received status code 400`.
- Expanded details showed `ApolloError: Response not successful: Received status code 400`.
- Backend schema introspection for `CreateAgentRunInput` lists only `agentDefinitionId`, `workspaceRootPath`, `workspaceId`, `llmModelIdentifier`, `autoExecuteTools`, `llmConfig`, `skillAccessMode`, `runtimeKind`, and `initialSummary`; it does not define `selfEvolution`.
- Direct GraphQL reproduction with the frontend-shaped payload fails with: `Field "selfEvolution" is not defined by type "CreateAgentRunInput"`.
- Direct GraphQL preparation without `selfEvolution` succeeds and was cancelled immediately, isolating the failure to the stale frontend launch payload.
- Frontend source evidence: `autobyteus-web/stores/agentRunStore.ts` still sends `selfEvolution: config.selfEvolution ?? null` in `PrepareAgentRun` variables.

### Investigation Decision Update

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Browser launch for the seeded Codex GPT-5.5 agent is blocked because the frontend still sends removed `selfEvolution` launch input to the backend GraphQL schema | Local Fix | Backend schema removal is intentional and already covered by durable backend tests; frontend `agentRunStore.ts` remains stale and live browser GraphQL POST returns HTTP 400 before runtime launch | `implementation_engineer` |

### Impact On Coverage Plan

The requested live browser self-improvement E2E cannot reach the Self Improve click until the frontend stops sending the removed launch override field and the launch/config UI is aligned with the backend's click-time self-evolution capability model. No durable coverage changes were made in this addendum; the result is a reroute-blocking live E2E finding.

---

## Live Browser Local-Fix Recheck Investigation Addendum — 2026-06-23

### Trigger

Code review passed the frontend local fix that removed stale launch-time self-evolution fields, controls, materialization, localization, and generated GraphQL input types. API/E2E resumes to re-run the live browser scenario that previously failed before target runtime launch.

### Scope Decision

| Item | Decision | Evidence |
| --- | --- | --- |
| Re-run stale launch payload reproduction | Use live backend + frontend browser path with seeded Codex GPT-5.5 agent | Prior failure was browser-visible HTTP 400 caused by frontend `CreateAgentRunInput.selfEvolution`; code review Round 4 says launch variables and UI controls were removed. |
| Standalone launch UI | Inspect browser run config and confirm no launch-time self-evolution eligibility control is present | REQ-011/REQ-012 require click-time/global self-evolution policy, not launch snapshots. |
| Team/member launch UI | Inspect team/member config screens or source-backed live UI where practical, ensuring removed launch-time self-evolution controls are absent | Code review requested confirmation for standalone/team/member config screens. |
| Global settings/click-time CTA | Confirm global self-evolution capability remains available and click-time Self Improve CTA remains the intended path when a valid run exists | Remaining self-evolution references should be global capability/settings/CTA/start flow. |
| Durable coverage changes | No new durable test edits planned unless the live recheck exposes another repository-resident coverage gap | Focused frontend tests already passed in implementation/code-review; this recheck is temporary executable browser validation. |

### Planned Execution

1. Start backend with a fresh temporary data dir and self-evolution enabled.
2. Start frontend against that backend with REST/GraphQL/WebSocket env overrides.
3. Seed a temporary agent using Codex App Server / GPT-5.5 and a writable skill.
4. Use browser to verify launch config no longer exposes launch-time self-evolution eligibility.
5. Send the first message and verify the previous HTTP 400 does not recur.
6. If a usable target run is available, verify the click-time Self Improve CTA path; if runtime/provider blocks completion, record the precise blocker separately from the fixed launch payload.

### Investigation Decision

- Proceed To Recheck Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` unless new evidence changes this.
- Reroute Required Before Recheck Execution: `No`


### Recheck Execution Decision Update

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Prior live browser launch failure from stale `CreateAgentRunInput.selfEvolution` payload | Resolved | Fresh live browser recheck launched seeded `E2E Live Worker` with Codex App Server / GPT-5.5 without HTTP 400; backend `CreateAgentRunInput` still has no `selfEvolution`; browser launch UI no longer exposes launch-time self-evolution eligibility. | N/A |
| Click-time Self Improve path after local fix | Pass | Browser showed the run-level `Self improve` CTA after the target run completed; clicking it launched a `Skill Self-Evolver` companion, produced path-only work-trace trigger evidence, completed self-evolution record `60f68b80-11b0-49db-b93f-dd4e1f670a57`, and edited only the temporary seeded skill. | `delivery_engineer` |

### Coverage Plan Update

No additional repository-resident durable coverage changes were made during this recheck. The live browser evidence validates the local frontend cleanup and the click-time self-improvement path against a real backend/frontend pair; temporary seed data remains under `/tmp/autobyteus-self-evo-live-recheck-20260623-205818` for short-term evidence only.


---

## Flat Work-Trace Layout Recheck Investigation Addendum — 2026-06-23

### Trigger

Code review passed the architecture-approved design-impact rework that removes the over-nested `self_evolution/targets/<targetKey>/...` storage layout. API/E2E resumes to refresh live path evidence because prior live artifacts intentionally show the old historical path.

### Scope Decision

| Item | Decision | Evidence |
| --- | --- | --- |
| Flat work-trace path | Re-run focused tests and live self-evolution against a fresh backend/frontend pair; assert generated manifest and trace files use `<memoryDir>/self_evolution/work_traces/`. | Design-impact artifact and code review Round 5 require current path evidence. |
| Flat companion state path | Assert live companion state is written to `<memoryDir>/self_evolution/companion.json`. | Design-impact artifact and code review Round 5. |
| Old path absence | Assert no generated live self-evolution state appears under `self_evolution/targets/` and no generated live memory contains `targetKey`/`safeKey`. | No-legacy/no-compatibility rule; code review confirmed no old-path fallback. |
| Trigger message path evidence | Inspect live companion raw trace and assert manifest/root/file paths in the trigger use the flat layout and do not contain `/self_evolution/targets/`. | Companion trigger must deliver path-only current work trace locations. |
| Durable coverage changes by API/E2E | No new repository-resident durable coverage edits planned; implementation rework and tests already passed code review. | API/E2E only needs refreshed executable/live evidence before delivery. |

### Planned Execution

1. Run focused flat-layout self-evolution tests and production build.
2. Start backend from the built server with fresh seeded data and self-evolution enabled.
3. Start frontend against that backend.
4. Launch a seeded `E2E Flat Worker` using Codex App Server / `gpt-5.5`, send a validation message, and click `Self improve`.
5. Inspect generated memory, manifest, companion state, trigger raw trace, and work-trace Markdown.
6. Update the execution coverage report with current flat path evidence.

### Investigation Decision

- Proceed To Recheck Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed By API/E2E: `No`
- Reroute Required Before Recheck Execution: `No`


---

## Round 7 Local-Fix Recheck Investigation Addendum — 2026-06-24

### Trigger

Code review Round 7 passed the CR-002/CR-003 local fix and asked API/E2E to resume live server/browser validation after the implementation/storage/session rework.

### Scope Decision

| Item | Decision | Evidence |
| --- | --- | --- |
| CR-002 obsolete evidence model cleanup | Verify through focused tests/source grep and live generated memory that old inline/digest-era fields are absent. | Code review Round 7 removed `SelfEvolutionEvidencePackage`, `anonymizedWorkHistory`, `feedbackSignals`, and `privacyWarnings`. |
| CR-003 launch-source cleanup | Verify focused effective-config coverage and live record `sourceTrace` uses only `source: default` with current field names. | Code review Round 7 tightened `SelfEvolutionConfigSource` and field filtering. |
| Session/storage current path | Refresh live evidence for current storage/session names after rework: `self_evolution/work_traces/` and `self_evolution/evolver_session.json`. | Code review notes `companion.json` and old companion-run state names have been removed from product source. |
| Browser path | Use a live backend/frontend browser path to launch the seeded target agent, click `Self improve`, and inspect generated artifacts. | Prior live validation must be refreshed after source/session changes. |
| Durable coverage changes by API/E2E | No new repository-resident durable coverage edits planned unless live validation exposes a coverage gap. | Implementation/tests already passed code review; API/E2E is validating current behavior. |

### Planned Execution

1. Run build-config TypeScript check, focused self-evolution tests, and production build.
2. Start a fresh live backend with self-evolution enabled and a temporary seeded Codex App Server / `gpt-5.5` agent and writable skill.
3. Start frontend against the fresh backend and launch the seeded agent through the browser.
4. Send a target message that creates live raw trace/work-trace evidence, click `Self improve`, and wait for completion.
5. Inspect manifest, work-trace Markdown, `evolver_session.json`, self-evolution record, companion trigger raw trace, and generated memory grep for old path/model/source strings.

### Investigation Decision

- Proceed To Recheck Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed By API/E2E: `No`
- Reroute Required Before Recheck Execution: `No`
