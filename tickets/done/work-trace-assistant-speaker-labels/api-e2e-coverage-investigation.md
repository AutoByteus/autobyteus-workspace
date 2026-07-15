# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels/tickets/done/work-trace-assistant-speaker-labels/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels/tickets/done/work-trace-assistant-speaker-labels/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels/tickets/done/work-trace-assistant-speaker-labels/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels/tickets/done/work-trace-assistant-speaker-labels/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels/tickets/done/work-trace-assistant-speaker-labels/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-trace-assistant-speaker-labels/tickets/done/work-trace-assistant-speaker-labels/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code-review handoff to API/E2E for ticket `work-trace-assistant-speaker-labels`.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `1`

## Current Requirement And Design Basis

The reviewed package requires generated work traces to be clean current LLM-readable evidence, not backward-compatible generated artifacts. The body must start with exactly `# Work Trace`; render visible user messages as `user:`, visible assistant messages as `assistant:`, tool evidence as `tool:`, and provider/projection notes as `trace_event:`; omit separate reasoning/internal reasoning records from body and summary identity; and keep target identity/display metadata in the returned package and manifest only. The current generation path must not retain `renderContext`, `subjectLabel`, `rendererVersion`, `fingerprint`, old manifest fallback reads, dual body formats, or compatibility aliases for `skill-evolver` / `retrospective-skill-coach`. Skill Improvement / Retrospective Skill Improver flows must identify target runs from package/manifest/task-packet metadata, post path-only evidence packets to the improver, register grant-scoped `send_message_to` permission for one `skill_update`, and keep the broad source/API/persisted `self-evolution` / `autobyteus-skill-evolver` naming deferral explicit.

The implementation handoff's Legacy / Compatibility Removal Check reports no compatibility mechanisms introduced, no old-behavior retention, and removal of obsolete helpers/fields. Static source inspection during this investigation matched that posture: current `agent-work-traces` types and services no longer expose render context or source/render fingerprints, renderer derives labels from replay event kind/role, separate reasoning events return `null`, and store writes schema version 3 manifests with semantic target/file metadata only.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Work-trace Markdown speaker/section labels | Changed | REQ-001 through REQ-004; AC-001 through AC-004; design DS-002 | Durable projection coverage must assert `user`, `assistant`, `tool`, and `trace_event` labels and absence of target-agent body prefixes. |
| Reasoning records in readable evidence | Removed | REQ-009 through REQ-011; AC-002, AC-009 through AC-011 | Durable projection coverage must assert separate reasoning omission, visible assistant rationale preservation, large-reasoning omission, and summary-hash stability. |
| Body header/source bookkeeping | Removed from Markdown body, preserved in manifest/file metadata | REQ-008; AC-008 | Durable coverage must assert `# Work Trace` only in body and metadata in package/manifest files. |
| Target identity metadata | Preserved as semantic metadata only | REQ-005; AC-007A; design DS-003 | Durable coverage must assert `target`, team-member compound identity, and `targetDisplayName` in package/manifest without body-label leakage. |
| Render-context/cache compatibility fields and old generated-file reuse | Removed | Generated Artifact / No Compatibility Rule; REQ-007; AC-006 | Durable coverage and static scans must assert no current output/source/test dependency on `renderContext`, `subjectLabel`, `rendererVersion`, `fingerprint`, or old manifest fallback behavior. |
| Manual Skill Improvement trigger to generated work-trace package | Changed/integration-sensitive | AC-007; implementation handoff downstream coverage hints | Existing service tests prove call ordering with mocked projection; add durable integration coverage with the real projection service generating files before the improver request is posted. |
| Retrospective Skill Improver bootstrap/template package rename | Changed | REQ-013 through REQ-014; AC-013 through AC-017 | Built-in bootstrap coverage must assert template folder/package id/display name sync and absence of old `retrospective-skill-coach` / `skill-evolver` template references. |
| Improver request packet shape | Changed wording/metadata | AC-007, AC-013, AC-014; design DS-001/DS-004 | Durable session/builder coverage must assert path-only work-trace packet, target identity from packet/manifest metadata, and no raw trace/body content in prompt. |
| Grant-scoped `send_message_to` completion | Preserved with new `skill_update` wording | Design DS-004; implementation handoff coverage hints | Existing companion-session and global router tests remain valid; execute them because they cover grant registration, target/message/reference restrictions, delivery, and exhaustion. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Direct projection service coverage for canonical labels, tools, trace events, omitted reasoning, blank display names, team-member metadata, archive/current output, regenerated archive projections, clean metadata, and summary-hash stability. | REQ-001 through REQ-011; AC-001 through AC-012; design DS-002/DS-003 | Still Valid | File inspection lines 50-318 assert body shape, absence of old labels/header/render metadata, team-member identity, archive regeneration, and reasoning-only hash stability. | Retain and execute. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` existing scenarios | Service-level direct-edit flow records minimal provenance, rejects stale target, handles non-completed/error improver runs, and verifies each later click refreshes work traces before posting using a mocked projection package. | AC-007; design DS-001 | Needs Update | Existing refresh test validates ordering and targetDisplayName call shape but the projection service is mocked, so it does not prove a real manual trigger produces files under `<memoryDir>/work_traces`. | Add one durable scenario using `startForAgentRun`, real `AgentWorkTraceProjectionService`, real `SelfEvolutionCompanionSessionService` with a fake active improver run, and real raw trace files. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-companion-session-service.test.ts` | Session reuse/restore/replacement, prompt packet, grant registration, path-only work-trace references, package tree metadata, and allowed vs denied grant reference file roots. | AC-007, AC-013, AC-014; design DS-004 | Still Valid | File inspection shows assertions for work trace manifest/file paths, no raw traces/rules/backend protocol, metadata, `skill_update`, grant allowed for skill root, and reference denied outside skill root. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts` | Direct `send_message_to` delivery and grant enforcement at router boundary, including wrong target, wrong message type, denied reference path, allowed `skill_update`, exhausted one-shot grant, and target inactive usage. | DS-004; implementation handoff grant-scoped coverage hint | Still Valid | Test inspection shows direct router deliver calls through `DirectAgentRunMessageGrantRegistry` and active-run post path with usage summary assertions. | Retain and execute. |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | Built-in app-data sync for Retrospective Skill Improver display name, template folder, private skill package id, settings, stale built-in overwrite, and standalone/package-root preservation. | REQ-013 through REQ-014; AC-016 through AC-017 | Still Valid | File inspection shows expected display name `Retrospective Skill Improver`, template read from `retrospective-skill-improver`, private skill path `retrospective-skill-improver`, and no overwrite of user package roots. | Retain and execute. |
| `autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs` | Build-time executable smoke for built-in bootstrap assets. | AC-016; implementation handoff | Still Valid | Build script invokes this smoke after managed asset copy. | Execute through `pnpm -C autobyteus-server-ts run build`. |
| `autobyteus-server-ts/tests/self-evolution/manual-trigger-strategy.test.ts` | Manual trigger request creation and non-executable scheduled/signal placeholders. | Manual trigger part of AC-007 / DS-001 | Still Valid | Test inspection shows canonical manual request fields and catalog executable status assertions. | Retain and execute in focused self-evolution suite. |
| `autobyteus-server-ts/tests/self-evolution/self-evolution-graphql-resolver.test.ts` | GraphQL API exposes self-evolution boundary fields and disabled capability gate. | API boundary around manual start mutation; out-of-scope naming deferral | Still Valid | Test inspection shows mutation/query boundary shape and capability-gate behavior. It does not need to assert work-trace body shape because that belongs to projection/service coverage. | Retain and execute in focused self-evolution suite. |
| `autobyteus-server-ts/docs/modules/*.md`, `autobyteus-server-ts/docs/ARCHITECTURE.md` | Durable documentation, not executable coverage. | REQ-011 through REQ-014 | Out Of Scope for executable validity, but relevant to delivery docs sync | Code review says docs updated; delivery will recheck after branch refresh. | Static scans only; no test action. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found in current reviewed tree | N/A | Static scan found old strings only inside negative assertions in current projection tests. | Requirements reject old target-agent labels, reasoning sections, and render-context metadata. | Existing negative assertions plus planned integrated manual-trigger coverage. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| APIE2E-ADD-001 | A manual Skill Improvement trigger (`startForAgentRun`) uses the real work-trace projection service to generate `<memoryDir>/work_traces/work_trace_active.md` and `work_traces_manifest.json` before posting the Retrospective Skill Improver request. | AC-007, AC-007A, AC-008, AC-013, design DS-001/DS-003, implementation handoff API/E2E hint for real manual trigger coverage. | Update `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts`. | Current service coverage proves ordering with a mocked projection and current projection coverage proves direct output shape, but no durable scenario ties the manual trigger service path to real generated files and path-only improver packet in one flow. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| APIE2E-UPD-001 | `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts` | Add a new scenario without changing existing assertions: write raw trace records with visible user/assistant and separate reasoning, call `startForAgentRun`, use real projection and real companion-session prompt path with a fake active improver run, then assert generated body/manifest shape and prompt path-only behavior. | AC-001, AC-002, AC-007, AC-007A, AC-008, AC-013, AC-014 | Repository-resident durable coverage will change; route back to `code_reviewer` after execution report. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| APIE2E-PROBE-001 | Static `rg` scan for old render-context/old template-package strings in `src`, `tests`, `docs`, and `scripts`. | Confirms old fields/names are absent from current code/docs except negative assertions. | It is an execution-time evidence check, not a product behavior scenario. |
| APIE2E-PROBE-002 | Focused final command set: run updated work-trace/self-evolution/bootstrap/global-router tests, server build TypeScript check, full server build, and `git diff --check`. | Confirms durable coverage and executable boundaries pass after the coverage update. | Commands are recorded in the execution report; no temporary repository files required. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live LLM/real browser UI manual click execution | The changed contract is server-side projection/session/grant behavior and can be proven deterministically with service/integration tests; launching an actual LLM improver would add nondeterminism and external runtime dependencies without additional format/grant assurance. | Low: service and router boundaries cover generated files, prompt packet, grant registration, and target delivery behavior. | None for this ticket unless product owners specifically require a live-runtime smoke. |
| Full GraphQL mutation with active real AgentRun manager | Existing GraphQL test covers API field/capability boundary; service-level integration will cover real manual trigger-to-projection path. Wiring a real active runtime would be broader than this ticket's changed behavior. | Low: `SelfEvolutionService.startForAgentRun` is the resolver's mutation target; existing resolver coverage verifies GraphQL boundary shape. | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified | N/A | Upstream requirements/design are explicit; implementation static inspection matches no-compatibility posture. | N/A |

## Execution Plan

1. Add APIE2E-ADD-001 / APIE2E-UPD-001 to `autobyteus-server-ts/tests/self-evolution/self-evolution-service.integration.test.ts`.
2. Execute focused updated and existing coverage:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/agent-work-traces/agent-work-trace-projection-service.test.ts tests/self-evolution/self-evolution-service.integration.test.ts tests/self-evolution/self-evolution-companion-session-service.test.ts tests/self-evolution/manual-trigger-strategy.test.ts tests/self-evolution/self-evolution-graphql-resolver.test.ts tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts tests/unit/agent-communication/global-agent-run-message-router.test.ts --no-watch`
   - If necessary, run `pnpm -C autobyteus-server-ts exec vitest run tests/self-evolution --no-watch` to cover adjacent self-evolution lifecycle/config tests.
3. Run static scans for removed/forbidden strings and old template/package names.
4. Run `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`, `pnpm -C autobyteus-server-ts run build`, and `git diff --check`.
5. Write the execution coverage report with scenario results and cleanup/evidence.
6. Because repository-resident durable coverage will be updated after code review, hand the cumulative package back to `code_reviewer` for coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing coverage is mostly valid and current. One durable integration gap remains for the real manual trigger using the real work-trace projection path, so this round will update repository-resident durable coverage and then return through code review.
