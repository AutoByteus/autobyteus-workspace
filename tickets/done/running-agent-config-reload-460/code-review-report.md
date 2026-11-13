# Code Review Report — autobyteus-460

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited rows only, through the design spec)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-002 … SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts Reviewed As Context: `evidence/claude-skill-hot-reload-probe*`, `evidence/live/IMP-07…09, IMP-13`, `evidence/IMP-11-mutation-check.log`, `follow-ups.md`
- Relevant Solution Revision IDs: SR-002, SR-003, SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (round 3, ARCH-REV-003 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001 (baseline), IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation complete (IR-002), `Large` / `High`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. Three subsystems change (skill notices, five runtime backends plus the backend contract, the credential proxy). A new lifecycle path acquires shared workspace links while the run is active, racing its release. No correction.

## Review Scope

- Changed implementation and behavior reviewed: `git diff 7b8bcf932f..c7685b20c6 -- autobyteus-server-ts` (source, tests, module docs).
- Files and areas reviewed:
  - `backends/shared/run-workspace-skills.ts`, read against `workspace-skill-materializer.ts` (rollback, `releasedHolders`, the acquiring, transferring and releasing phases);
  - the Claude factory, bootstrapper (SR-004 folder), context, cleanup, manager and query options;
  - the Codex factory, bootstrapper, context, thread manager, and the new `codex-workspace-skill-request-planner.ts`;
  - the ACP factory, backend and launcher;
  - the AGY backend, factory and `agy-run-capsule.ts`;
  - the native backend;
  - `AgentRun`, `AgentRunBackend`, `ProviderPreparationGuard`, the restore context factory, the provider factory builder;
  - `skill-update-notices/` (service, tracker, diff, builder, types, composition);
  - the credential proxy (`integration-run-access.ts`, `run-pass-registry.ts`, the host);
  - the compositions and both hosts;
  - the new tests: holder, per-runtime mid-run, `AgentRun`, AGY capsule.
- Explicit exclusions:
  - the materializer internals (unchanged by design);
  - the web card (unchanged header and sender);
  - live runs on Codex, Grok, DeepSeek and AGY (U-001, left to API/E2E).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001 … REQ-008, AC-001 … AC-012, DEC-001 (notice plus setup on add), DEC-002 (resume rule), DEC-004 (integration access at restart), DEC-007 (removal is a message only).
- Design-spec behavior map verified against the implementation: Yes. The DS-001 … DS-004 spines match the code.
- Design review report and round confirmed: round 3, ARCH-REV-003 `Pass` (SR-004).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `skill-update-notices.ts` subscribes to `definitionChanges` → `SkillUpdateNoticeService.onDefinitionsChanged` (coalesced `passRunning` / `passRequested`) → `tracker.trackedRuns()` (waits for tracking in progress) → `applyToRun`: `getAgentDefinitionById` → `tracker.applyDefinition` → `run.applyDefinitionSkills` (awaited, failure logged) → dirty + `syncWatchSet` → `deliverIfBusy` / `takePreface` → `computeNotice` (`diffSkillVersion` → `added`, description, integration names) → builder `describeAddedSkill` | — |
| BEH-002 | Confirmed | Same pass; `applyDefinition` sets the folder to null → `diffSkillVersion(seen, null)` → `removed`; `recordSeen(removedNames)`; nothing is unlinked (DEC-007) | — |
| BEH-005 | Confirmed | `computeNotice` → `integrationsStartingOnRestart` only for `addedWhileActive` names → `DefaultIntegrationRunAccess`: `grantsForAgent` minus `passes.grantedIntegrationIds(runId)` → `catalog.describe` names. This is a read only; nothing is issued. | — |
| BEH-008 | Confirmed | `RunSkillTracker.loadRun`: `seen = stored ?? current` (seeding removed); `runPublished` marks every `skillDirs` key dirty for a restored run → the first input waits on `restoring` → `added`, `removed`, `updated` in one notice | — |
| BEH-003/004/006 | Confirmed (preserved) | Tool list updates untouched (composition passes the same inputs); folder watcher and content diff unchanged for seen skills; `allowsCall` unchanged | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001; REQ-001, 002, 004, 008 | User | User | Give a running agent a new skill | Agents page / package `agent-config.json` | Normal | DS-001 + DS-003 | Link held, then one "now available" notice | 2026-11-13 reflection incident (requirements) | Supported Normal Scenario | Use |
| SCN-002 | BEH-002; REQ-003 | User | User | Take a skill away | Same | Normal | DS-001 | One "no longer available" notice | Task | Supported Normal Scenario | Use |
| SCN-003 | BEH-005; REQ-005 | User | User | Give a running agent GitHub | Same | Normal | DS-001 + DS-004 | Access-at-restart sentence; no grant | 2026-11-10 incident | Supported Normal Scenario | Use |
| SCN-005 | BEH-008; REQ-006 | User | User | Resume a stopped run after changing its skills | Message to a stopped run | Normal | DS-002 | Changes announced once | PM restore 2026-11-12 | Supported Normal Scenario | Use |
| CT-001 | AR-001 (design DS-003) | Contract | Run end (terminate, stop, failed preparation) racing a definition save | A run ends while its add is in flight | Claude cleanup `skills` stage, Codex `releasePreparation`, ACP `releaseResources` | Explicit Edge | `release()` closes, awaits `adding`, then releases `held` | No link and no holder left | Design escalation trigger; ARCH-REV-002 AR-001 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Release ordering on four runtimes: does any release path read a held list without closing first, or let an in-flight add publish a holder after release? | CT-001 | Terminate during a save | `release()` sets `closed` synchronously, then awaits `this.adding` (which never rejects: `addNow` catches everything), then `cleanupMaterializedWorkspaceSkills([...held])`. The add's `assertAccepting` → `assertOpen` throws after the in-flight request. The materializer rolls back its receipts (`releasedHolders`), so cleanup skips them. Every release path calls `release()`: Claude cleanup stage and factory; Codex `releasePreparation` and factory; ACP `releaseResources`. Grep shows no other reader of a held list. | `run-workspace-skills.ts:113-124, 126-167`; `claude-session-cleanup.ts:25`; `codex-thread-manager.ts:126`; ACP factory `:110`; tests `mid-run-workspace-skills.test.ts:154, 222, 272`; `run-workspace-skills.test.ts:164, 189`; IMP-11 mutation | Reject (no defect) | — | Sound as designed |
| C-02 | Codex planner's `catch` also swallows the "released" error during `skills/list` and logs "falling back" | CT-001 | Release during planning | The planner returns exposed requests. `addNow` then checks `closed` before each request and returns, so nothing is linked. The only consequence is one warning line, the same as at preparation today. | `codex-workspace-skill-request-planner.ts:782-786`; `run-workspace-skills.ts:136`; test `run-workspace-skills.test.ts:247` | Reject | — | No behavioral consequence |
| C-03 | `requireWorkspaceSkills()` throws on a context with `workspaceSkills: null`. Could the Claude cleanup or query options hit an unprepared restore binding? | Engineering contract | — | The restore binding (`agent-run-restore-context-factory.ts`) is only the factory's input. Both bootstrappers build a new runtime context with `guard.workspaceSkills` before a session or thread exists. | `claude-session-bootstrapper.ts:124`; `codex-thread-bootstrapper.ts:257` | Reject (not reachable) | — | A loud failure is correct if it ever happened (Principle 16) |
| C-04 | A new run's preparation reads the definition before the tracker reads it. A save landing between the two would be recorded as "seen" without a link or notice. | none | Requires a save within the seconds a run is being prepared | Two individually supported actions; no product goal for the overlap. This is pre-existing: the tracker read the definition at tracking before this change too. | `run-skill-tracker.ts` `loadRun`; `trackedRuns()` awaits only published runs | Reject (Technically Possible but Unsupported/Contrived — artificial timing) | — | No machinery required |
| C-05 | AGY: an add in flight at stop, then an immediate resume, could race the manifest read | none | Stop and resume within one add | The manifest rewrite is atomic (temp file + rename), so a resume reads a whole manifest. At worst a later add hits `EEXIST`, which is logged, and the notice still gives the path. The design accepted this (DS-003 narrative). | `agy-run-capsule.ts` `rewriteAgyCapsuleManifest` | Reject (artificial timing) | — | — |
| C-06 | `agent-run.ts` was already over 500 raw lines at base (531 → 539) | Source-size rule | — | The team measures effective non-empty lines (prior ruling, `tickets/done/active-run-skill-update-notice/code-review-report.md` C-03): 484 → 491, under 500 | Line counts at base and head | Reject | — | Within the limit |
| C-07 | Deviation: `RunWorkspaceSkills.acquire` returns `void`, not the result the design named | Design interface table | — | No caller reads the result. Returning it would be unused surface (Principle 7). | Grep of callers | Reject (deviation recorded, reason holds) | — | — |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Feature; Codex planner extracted; one holder per run (both "refactor now" items done) | — |
| Matches approved behavior-defining supplemental artifacts | Pass | SR-004 folder: `ensureWorkspaceSkillsFolder` on every preparation (new and restore), before the session; failure logged, never fatal; live IMP-13 | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001 … DS-004 trace one to one in code (table above) | — |
| Ownership boundary preservation and clarity | Pass | Service owns the sequence (apply → dirty → deliver); backends only set up; `RunWorkspaceSkills` is the only holder and release owner; the tracker is still the only seen writer | — |
| Off-spine concern clarity | Pass | Planner, materializer, capsule linker and integration read each serve one owner | — |
| Existing capability/subsystem reuse | Pass | `AgentDefinitionChangeSignal`, the tools pass pattern, the materializer unchanged, the existing notice and card | — |
| Reusable owned structures | Pass | `exposedWorkspaceSkillRequests` replaces three inline copies (Claude, ACP, Codex fallback); the planner is extracted, not duplicated | — |
| Shared-structure / data-model tightness | Pass | `SkillVersionChange` (diff fact) vs `SkillChange` (notice with description and integration names); `ResolvedSkill.description` | — |
| Repeated coordination ownership | Pass | The add policy is in one owner for four runtimes; AGY differs for a recorded reason (per-run capsule) | — |
| Empty indirection check | Pass | `AgentRun.applyDefinitionSkills` holds the active check (as `applyDefinitionTools` does); the holder owns state and policy; the planner type is a question the owner asks | — |
| Separation of concerns and file responsibility | Pass | New files hold one concern each; the bootstrapper is smaller (408 → 302) | — |
| Ownership-driven dependency check | Pass | `skill-update-notices → agent-execution, credential-proxy (type)`; nothing in `agent-execution` imports notices; architecture guards green (IMP-03) | — |
| Visible dependencies (Principle 16) | Pass | Holder collaborators are passed in by the factories; `integrationRunAccess` is passed explicitly (studio host's proxy, standalone `null`, not a lookup); existing `get…Materializer()` and `SkillService.getInstance()` are only used. The removed `CodexThreadCleanup` singleton reduces lookups. | — |
| Authoritative Boundary Rule | Pass | The notice service uses only `AgentRun` and `IntegrationRunAccess`; no service → backend or registry bypass | — |
| File placement | Pass | `backends/shared/run-workspace-skills.ts` beside its materializer; the planner beside the Codex materializer | — |
| Flat vs over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | `applyDefinitionSkills(definition)`, `applyDefinition(runId, definition)`, `integrationsStartingOnRestart({runId, agentDefinitionId}, names)` | — |
| Naming quality (Principle 15) | Pass — deviation recorded, reason holds | The "skill update notices" folder now also drives setup. Recorded in the design spec, as the tool list subsystem does both. | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | SR-004 is one function in the bootstrapper, not layered on the holder | — |
| Dead code removed in touched files | Pass | `CodexThreadCleanup` (file, barrel, parameters), `ownSkill`, `owner.skills`, `materializedConfiguredSkills`, `configuredSkills`, the session-manager materializer parameter, an unused import | — |
| Test scenarios clear and requirement-aligned | Pass | Tests are named by AC/AR and enter through the real backend, cleanup and factory paths with a gated real materializer | — |
| Test fixtures reusable, structure coherent | Pass | `tests/fixtures/run-workspace-skills-fixtures.ts`; about 40 tests moved onto the holder | — |
| No stale or compatibility-only tests | Pass | The "read once" and restore-seeding tests were rewritten to the new rule | — |
| API/E2E readiness | Pass | Gated live test `live-skill-definition-changes.e2e.test.ts` is ready to extend per runtime | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-execution/domain/agent-run.ts` | 484 | 491 | Pass | Pass | Pass | Pass | Pass | — |
| `skill-update-notices/services/skill-update-notice-service.ts` | 241 | 345 | Pass | Pass (+104) | Pass | Pass | Pass | — |
| `skill-update-notices/services/run-skill-tracker.ts` | 233 | 276 | Pass | Pass | Pass | Pass | Pass | — |
| `backends/shared/run-workspace-skills.ts` (new) | 0 | 158 | Pass | Pass | Pass | Pass | Pass | — |
| `backends/codex/codex-workspace-skill-request-planner.ts` (new) | 0 | 106 | Pass | Pass (moved) | Pass | Pass | Pass | — |
| `codex/backend/codex-thread-bootstrapper.ts` | 408 | 302 | Pass | Pass | Pass | Pass | Pass | — |
| `antigravity/capsule/agy-run-capsule.ts` | 109 | 156 | Pass | Pass | Pass | Pass | Pass | — |
| `antigravity/backend/agy-agent-run-backend.ts` | 216 | 244 | Pass | Pass | Pass | Pass | Pass | — |
| `claude/backend/claude-session-bootstrapper.ts` | 126 | 147 | Pass | Pass | Pass | Pass | Pass | — |
| `compositions/build-studio-server.ts` | 480 | 481 | Pass | Pass | Pass | Pass | Pass | — |

The numbers are effective non-empty lines. Every other changed source file changes by fewer than 30 lines and stays well under 500.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention | Pass | `RunUsedSkillsResolver` / `RunSkillSource` and the restore seeding are removed |
| Dead code removed in touched files | Pass | See the structural table |
| Persisted-data decision followed | Pass | `Directly Usable — No Migration`: same `seen_skill_versions.json` shape, reader and writer |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change.
- Why: a new backend method, the holder, and the definition-change pass.
- Files: `docs/modules/skill_update_notices.md`, `agent_execution.md`, `tool_list_updates.md`, `codex_integration.md`, `grok_build_runtime.md`, `deepseek_harness_runtime.md`, `antigravity_cli_runtime.md`, `credential_proxy.md`.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| AR-001 (release vs in-flight add) | Confirmed | C-01 |
| AR-002 (one colliding name must not roll back others) | Confirmed | `addOne` per name; test `run-workspace-skills.test.ts:140` |
| AR-003 (zero-skills Claude `allowedTools`) | Confirmed | `hasSkills()` is read per process generation; the approval prompt without auto-execute is left to API/E2E |
| DI-001 / SR-004 (folder must exist at CLI start) | Confirmed | `ensureWorkspaceSkillsFolder`; IMP-13 |

No new premises: C-04 and C-05 are rejected above.

## Review Scorecard (Mandatory)

- Overall score: 9.5 / 10 (simple average, for summary only)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001 … DS-004 trace one to one; the pass mirrors the tools pass | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | One holder per run from preparation to release; every release path goes through it; the service never reaches a backend | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Explicit identities; read-only integration query | `acquire` takes `assertPreparing` while add uses an internal guard (two guard shapes) | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Planner extracted; bootstrapper shrank | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | `SkillVersionChange` vs `SkillChange` split cleanly | `descriptions` map keeps entries for removed names (harmless) | — |
| 6 | Naming Quality and Local Readability | 9.3 | Clear names and doc comments | Subsystem name now broader than "notices" (deviation recorded, reason holds; no deduction for it) | — |
| 7 | API/E2E Readiness | 9.4 | Live harness gated and extensible; per-runtime unit races in place | Non-Claude live runs not yet executed (U-001, planned for API/E2E) | API/E2E: per-runtime live checks |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Release ordering verified against materializer rollback; AC-004 walk-through holds; mutation check proves the managed-path test | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.7 | Old binding and seeding removed cleanly | — | — |
| 10 | Cleanup Completeness | 9.6 | `CodexThreadCleanup`, `ownSkill`, `owner.skills`, the context lists and `configuredSkills` removed | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E (the primary pass rule); implementation is notified for information.

## Residual Risks

- Carried forward from the handoff; no new risk:
  - U-001: whether Codex, Grok, DeepSeek and AGY list a folder linked mid-run is unproven. The notice gives the path either way.
  - AR-003: a Claude run without auto-execute may ask for approval on its first `Skill` call until the next process generation.
- A name that fails to link is retried only at the next pass that adds a name for that run (accepted in the design review).
- A Codex release during `skills/list` logs one misleading "falling back to workspace materialization" warning (C-02). It is cosmetic.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5 / 10; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: For API/E2E:
  - live AC-012 per runtime (Codex, Grok, DeepSeek, AGY with stop and resume);
  - AC-006 end to end;
  - AC-009 (team member and delegated copy);
  - the Claude approval case without auto-execute.
