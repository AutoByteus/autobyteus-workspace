# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-access-mode-analysis/tickets/in-progress/skill-access-mode-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review pass handoff requested API/E2E coverage investigation and execution for Skill Access / `GLOBAL_DISCOVERY` removal.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

Current approved behavior is a clean removal of `GLOBAL_DISCOVERY` / "All installed skills" from execution and normal launch flows. Agent definitions' configured `skillNames` are the authoritative skill allowlist. Normal single-agent launch, team launch, and external channel setup must not expose a Skill Access selector. Shared/runtime/API/frontend/app SDK enum surfaces must not include `GLOBAL_DISCOVERY`. Missing or zero configured skills must resolve to configured-only/no managed skills, never all installed skills. Runtime skill tools must list/read/load only configured skills and must deny non-configured or arbitrary path access. Persisted old run, team/member-tree, and external channel binding records containing `GLOBAL_DISCOVERY` must be migrated to `PRELOADED_ONLY` rather than accepted through compatibility fallbacks. Explicit API/client requests containing `GLOBAL_DISCOVERY` must be rejected. Codex and Claude materialization must remain configured-skill-only and `NONE` must suppress materialization.

The implementation handoff's Legacy / Compatibility Removal Check is clean: no compatibility branches introduced, legacy global behavior not retained, and remaining `GLOBAL_DISCOVERY` strings should be limited to migration/rejection evidence.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `GLOBAL_DISCOVERY` enum/API/SDK/frontend value | Removed | Requirements REQ-SAM-006, REQ-SAM-011; design Legacy Removal Policy; implementation handoff What Changed | Existing source/unit rejection coverage is valid, but durable API/E2E GraphQL enum/input rejection coverage is missing and should be added. |
| Single-agent/team/channel launch Skill Access UI controls | Removed | AC-SAM-001 through AC-SAM-004; design DS-001/DS-002/DS-005 | Existing AgentRunConfigForm and TeamRunConfigForm tests assert removed selectors; ChannelBindingSetupCard source no longer has a skill selector and existing setup tests remain valid. No durable API/E2E edit required for channel UI. |
| Missing mode / zero configured skills | Changed | REQ-SAM-007/008; AC-SAM-006/008; implementation handoff | Existing `AgentConfig` and `AvailableSkillsProcessor` unit coverage is still valid; runtime skill list unit coverage covers empty configured list. Execute as part of final validation. |
| AutoByteus prompt all-registry catalog branch and load guidance | Removed | AC-SAM-009; design Removal Plan | Existing `AvailableSkillsProcessor` unit coverage is still valid and should be executed. |
| Runtime `get_available_skills`, `get_skill_content`, and `load_skill` allowlist enforcement | Changed | REQ-SAM-009; AC-SAM-010; design DS-003 | Existing unit coverage is still valid and covers list filtering, empty list, read denial, path denial, non-configured load denial, and `NONE` load denial. Execute as final validation. |
| Persisted run/team/channel `GLOBAL_DISCOVERY` records | Changed through migration | REQ-SAM-010; AC-SAM-012; design DS-004 | Existing migration unit test is still valid for representative run metadata, team member tree, and channel bindings. Execute as final validation. |
| Codex/Claude configured-only materialization and `NONE` suppression | Preserved/tightened | REQ-SAM-012; AC-SAM-011; implementation handoff downstream hints | Existing Codex and Claude materializer unit coverage is still valid. Agent-runtime live LLM E2E coverage is env-gated; run lightweight durable materializer tests locally and record live E2E as not executed unless env is explicitly enabled. |
| Legacy string cleanup | Changed/removed | NFR-SAM-002; implementation/code review cleanup search | Repeat `rg` search as final evidence; remaining matches should be migration/rejection evidence only. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/agent/context/agent-config.test.ts` | Defaults to `PRELOADED_ONLY` with configured or zero skills; respects `NONE`; rejects unsupported `GLOBAL_DISCOVERY`. | REQ-SAM-006/007/008/011; AC-SAM-005/006/008 | Still Valid | Inspected lines 84-103; directly covers resolver/default/rejection behavior. | Execute. |
| `autobyteus-ts/tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts` | No registry injection when no skills are configured; configured-only prompt catalog; no `load_skill` guidance; `NONE` skips skills. | REQ-SAM-007/008/009; AC-SAM-008/009/010 | Still Valid | Inspected lines 47-119 and 121-160; assertions match current configured-only behavior. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/get-available-skills.test.ts` | Lists configured skills only; returns empty list when no configured skills; propagates lookup failures. | REQ-SAM-008/009; AC-SAM-008/010 | Still Valid | Inspected full file; uses `getSkill` per configured name and no full registry list. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/get-skill-content.test.ts` | Returns configured skill content/file tree; rejects non-configured skill before lookup; handles missing skill and tree errors. | REQ-SAM-009; AC-SAM-010 | Still Valid | Inspected full file; non-configured assertion prevents read bypass. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-tools/skills/load-skill.test.ts` | Loads configured skill by name; rejects path-like input, unmanaged paths, non-configured skills, and `NONE`. | REQ-SAM-009; AC-SAM-010; NFR-SAM-002 | Still Valid | Inspected full file; assertions match removal of arbitrary path/global load. | Execute. |
| `autobyteus-server-ts/tests/unit/app-data-migrations/remove-global-skill-discovery-mode-migration.test.ts` | Rewrites `GLOBAL_DISCOVERY` to `PRELOADED_ONLY` in agent run metadata, team member tree, and channel bindings; preserves `NONE`; skips on second run. | REQ-SAM-010; AC-SAM-012; NFR-SAM-003 | Still Valid | Inspected full file; representative app data coverage matches handoff residual risk. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | Materializes only configured Codex skills; preserves symlink behavior; `NONE` creates no `.codex/skills`. | REQ-SAM-012; AC-SAM-011 | Still Valid | Inspected materialization and `NONE` assertions. | Execute. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | Materializes only configured Claude skills; `NONE` creates no `.claude/skills`. | REQ-SAM-012; AC-SAM-011 | Still Valid | Inspected materialization and disabled-mode assertions. | Execute. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Live runtime GraphQL/websocket tests; for Codex/Claude env-gated suites include configured skill use/materialization scenarios. | REQ-SAM-004/012; AC-SAM-007/011 | Still Valid but env-gated | Inspected lines 2040-2210; suites run only when `RUN_CODEX_E2E=1`/`RUN_CLAUDE_E2E=1` and binaries are available. Cosmetic duplicate helper union noted by code review is not behavioral. | Do not edit for cosmetic issue in API/E2E; rely on durable unit materializer tests and record live LLM E2E as not executed unless env is enabled. |
| `autobyteus-server-ts/tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts` | External channel setup GraphQL accepts supported `PRELOADED_ONLY` launch/team presets and returns persisted presets. | REQ-SAM-003/006/010; AC-SAM-003/004/012 | Still Valid | Inspected top fixture and positive single/team preset paths. It does not cover legacy enum rejection. | Execute positive e2e; supplement rejection with new dedicated API/E2E test. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Agent launch form keeps operational fields and no `select#skill-access-mode` in read-only path. | REQ-SAM-001; AC-SAM-001 | Still Valid | Inspected line 521 assertion. | Execute targeted web test. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Team launch form keeps operational fields and no `select#team-skill-access-mode` in read-only path. | REQ-SAM-002; AC-SAM-002 | Still Valid | Inspected line 469 assertion. | Execute targeted web test. |
| `autobyteus-web/components/settings/messaging/__tests__/ChannelBindingSetupCard.spec.ts` | Channel binding setup still renders provider/target/launch preset flow with `PRELOADED_ONLY` preset summaries. | REQ-SAM-003; AC-SAM-003 | Still Valid | Inspected existing tests and source grep; component has no skill-access selector references. | Execute targeted web test; no durable edit. |
| `autobyteus-web/generated/graphql.ts` enum output plus localization files | Generated frontend enum excludes global; localization no longer contains old labels. | REQ-SAM-006; AC-SAM-004 | Still Valid | Static inspection/grep shows `SkillAccessModeEnum` has only `NONE` and `PRELOADED_ONLY`; no old UI strings outside migration/rejection evidence. | Include legacy cleanup search in final execution. |
| Dedicated durable API/E2E rejection test for `GLOBAL_DISCOVERY` GraphQL inputs | Needed to prove GraphQL enum/input rejection across run/team/channel API boundaries. | REQ-SAM-011; design Legacy Removal Policy; code review residual risk | Needs Update (missing scenario) | Search found `GLOBAL_DISCOVERY` only in `AgentConfig` unit and migration unit tests; no current GraphQL/API E2E rejection coverage. | Add focused repository-resident E2E test file before final execution. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale durable coverage requiring removal was found during investigation. Existing `GLOBAL_DISCOVERY` references are migration/rejection evidence, not old-behavior preservation. | Requirements NFR-SAM-002 and code review cleanup search. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| SAM-API-001 | GraphQL schema/API rejects explicit legacy `GLOBAL_DISCOVERY` for single-agent run inputs, team member inputs, and external channel launch presets; shared enum introspection exposes only supported values. | REQ-SAM-011; AC-SAM-004/005; design Legacy Removal Policy lines requiring client requests using `GLOBAL_DISCOVERY` to fail enum/validation checks; code review residual risk. | `autobyteus-server-ts/tests/e2e/runtime/skill-access-mode-graphql.e2e.test.ts` | Existing durable coverage rejects legacy mode at shared runtime config and migration levels, but not at the public GraphQL API boundary. A narrow schema-level E2E prevents accidental re-registration of the legacy `SkillAccessModeEnum` value or silent acceptance by launch/channel API inputs. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No existing durable coverage requires mutation. | N/A | The cosmetic duplicate `PRELOADED_ONLY` literal in `agent-runtime-graphql.e2e.test.ts` is non-behavioral and not needed for coverage. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable coverage requiring removal was found. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| SAM-STATIC-001 | `rg -n "GLOBAL_DISCOVERY|GlobalDiscovery|All installed skills|Skill Access" -S --glob '!tickets/**' --glob '!**/tickets/**' --glob '!**/node_modules/**' --glob '!**/.nuxt/**' --glob '!**/coverage/**' .` | Confirms old enum/UI labels are not retained outside migration/rejection evidence. | Static cleanup evidence is execution-report evidence, not a repo test. |
| SAM-ENV-001 | Inspect/run env-gated `agent-runtime-graphql.e2e.test.ts` only if `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, or `RUN_LMSTUDIO_E2E` are enabled. | Records whether live LLM/browser runtime API scenarios were executed or skipped by local environment. | Live external-runtime execution is environment-gated and not introduced as a new durable test. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live Codex/Claude/AutoByteus LLM websocket turn proving configured skills in actual model responses | Existing e2e file is env-gated by binaries and `RUN_*_E2E` flags; local API/E2E stage will not force external LLM services unless already enabled. | Medium: materialization/tool policy is covered by unit/API schema checks, but model-use turn itself may be skipped locally. | Record env status in execution report; no reroute if durable materializer and API/schema coverage pass. |
| Full deletion of retained `skillAccessMode` plumbing | Explicitly deferred by reviewed design. | Low residual cleanup risk. | Delivery/docs can mention follow-up; not API/E2E scope. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | Investigation found no ambiguous requirement/design issue and no retained compatibility wrapper. | N/A |

## Execution Plan

1. Add focused durable GraphQL API/E2E coverage in `autobyteus-server-ts/tests/e2e/runtime/skill-access-mode-graphql.e2e.test.ts` for shared `SkillAccessModeEnum` introspection and legacy `GLOBAL_DISCOVERY` input rejection on single-agent, team, and external-channel launch preset inputs.
2. Execute the new API/E2E test.
3. Execute existing valid coverage for runtime defaults/prompt behavior, runtime skill tools, migration, Codex/Claude materializers, external channel setup GraphQL positive paths, and targeted frontend launch/channel UI tests.
4. Run static legacy cleanup search.
5. Write the API/E2E execution coverage report.
6. Because repository-resident durable coverage will be added after the initial code review, route the cumulative package back to `code_reviewer` for narrow coverage-code review instead of directly to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is mostly valid. The only required durable coverage gap is public GraphQL/API rejection of legacy `GLOBAL_DISCOVERY`; adding that test triggers return to `code_reviewer` after execution.
