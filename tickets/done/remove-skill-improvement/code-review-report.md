# Code Review Report

Ticket `remove-skill-improvement` (autobyteus-205). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement`, branch `codex/remove-skill-improvement`, design commit `04aac13a77`, head reviewed `e022d9a570` (round 2: merge `5cfccd66c7`, Secret Gate entry `bda3731947`). Round 1 reviewed `1f0ae5ea9c`.

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-004; REQ-001..REQ-006, AC-001..AC-005, DEC-001..DEC-005)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (cited by the design; not re-audited)
- Solution Revision Record Reviewed As Context: via the design spec (SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: `release-notes.md` (delivery's, AC-005); `follow-ups.md` (FU-001, FU-002; FU-003 added by this review)
- Relevant Solution Revision IDs: SR-001..SR-004
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003` (CRR-002 was the separate test-code review)
- Current Review Round: 2
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round 2): IR-002 merges `origin/personal` @ `3b2c86ca9e` (20 commits) and adds one `.gitleaks.toml` entry.
  - **Conflicts, compared with `git diff 3b2c86ca9e 5cfccd66c7`:** each resolved file differs from the base only by this ticket's removals.
    - `schema.ts` loses only `SkillImprovementResolver` and keeps base's `UpdateNotificationResolver`.
    - `server-settings-service.ts` loses only the feature's imports, the 2 predefined settings and the getter, and keeps `UPDATE_CHECKS_SETTING_KEY`.
    - `ServerSettingsBasicsPanel.vue` loses only the Skill Improvement card and keeps `ApplicationsFeatureToggleCard` and base's `UpdateChecksCard`.
    - web `settings.md` loses the feature text, and the capability paragraph is reworded to agree with base's Update checks section.
  - **Base content:** no new app-data migration, so 20261020 stays last. Typecheck, the AC-001 sweep (IMP-21) and the build smoke pass on the merge, so base reintroduces no removed symbol.
  - **`.gitleaks.toml` entry:** checked against RELEASE.md "False positives". Both flagged lines (`skill-improvement-removal-cases.mjs:20` and `api-e2e-coverage-investigation.md:156`) are prose naming the retired setting with a boolean. The entry is `targetRules = ["generic-api-key"]`, `regexTarget = "secret"`, regex `^ENABLE_SKILL_IMPROVEMENT=true$`, with its reason: the narrowest possible, and it cannot hide a provider rule or `env-style-secret`. The Secret Gate passes on `bda3731947` and at the head (IMP-23).
  - **Evidence:** IMP-14..IMP-23 on the merge (typecheck; server unit 6314; integration 421; build and smoke; removal startup e2e 4; web unit 4617; guards; sweep; SIR-001/002 probe 2 Pass; secret gate).
  - Every other check carries forward from round 1.
- Trigger: implementation handoff IR-002 (INT-001 Local Fix requested by delivery in DR-001) from `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: 1 (`CRR-001`, Pass)
- Latest Authoritative Round: 2
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. The change touches 137 files across server and web, removes a public GraphQL API, adds a startup migration that deletes user data on every install, and changes the `send_message_to` router. No correction.

## Review Scope

- **Changed implementation and behavior reviewed:**
  - the new migration `remove-skill-improvement-data-migration.ts` (M1..M6), read in full, and its registration;
  - `retiredSettingNames`;
  - the router's grant removal;
  - `launchPurpose` removal: metadata types, store, provisioning, run service, eligibility;
  - the built-in registry and bootstrapper, including the setting-default mechanism;
  - `server-settings-service.ts` and the GraphQL schema;
  - web: Settings Basics panel, Agent and Team workspace surfaces, stores, the built-in id list;
  - the generated GraphQL trim.
- **Files / areas reviewed:** every non-test source change in `04aac13a77..1f0ae5ea9c` (server: 48 files, +355/-3253; web: 46 files, +22/-1716). Proportionate read of the new migration unit suite (8 cases), the startup e2e (SID-1..3) and the adapted released-migration e2e.
- **Explicit exclusions:**
  - Checks were not rerun. IMP-01..IMP-13 ran on `fc46a7b5fc` or `a71e93a7f2`, and no code they exercise changed afterwards.
  - The sweep (AC-001) was rerun by me as a read-only `git grep` only.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`. The feature and everything only it used are removed, with no shim (REQ-001, REQ-002). Shared code is preserved (REQ-003). Startup is never blocked (REQ-004). The feature's data is deleted once, by the user's decision (REQ-005, DEC-001 C).
- Design-spec behavior map verified against the implementation: `Yes`
- Design review report and round confirmed: ARCH-REV-002, Pass (AR-001..AR-003 and R-1 applied in SR-004)
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Status | Implementation Path And Lifecycle Evidence | Notes |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `ServerSettingsBasicsPanel.vue` loses the card; `SkillImprovementFeatureToggleCard.vue` and its spec are deleted; `FeatureCapabilityToggleCard` stays for Applications | IMP-13 |
| BEH-002 | Confirmed | `AgentWorkspaceSurface.vue` and `TeamWorkspaceSurface.vue` lose the CTA slot fill and `skillTarget`; `AgentEventMonitor`'s `#composerContext` slot stays (`MobileChat.vue` fills it); the remaining `computed` imports are still used | — |
| BEH-003 | Confirmed | `global-agent-run-message-router.ts`: the diff is deletions only (-105). Both grant files are deleted; nothing references them (typecheck IMP-01) | 8 non-grant router cases unchanged (IMP-04) |
| BEH-004 | Confirmed | The registry holds the Daily Assistant only. The bootstrapper loses the setting-default mechanism, whose only user was the improver. The 2 predefined settings and `getSkillImprovementDefaultImproverAgentDefinitionId` are removed, and the 3 keys are added to `retiredSettingNames` | IMP-05 smoke; F-7 |
| BEH-005 | Confirmed | Migration M1..M6, registered last with `memoryDir` and `agentsDir`. The runner catches a thrown `execute()` and records FAILED (`app-data-migration-runner.ts:180-193`), so the next start retries | IMP-04, IMP-06 |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface / Event | Shape | Forward Path / Lifecycle | Expected Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SC-1 | BEH-005, REQ-004/005, AC-003/004 | Operational | App startup | First start of the new build on an install with feature data | Migration runner | Normal | DS-003 | Feature data deleted once; everything else byte-identical; a failure retries | design shape inventory F-1..F-8b; user data F-09 | Supported Normal Scenario | Use |
| SC-2 | BEH-003, REQ-003 | System | An agent run | Send a message to another run | `send_message_to` tool | Normal | DS-001 | Delivery unchanged apart from the grant-only codes | router tests | Supported Normal Scenario | Use |
| SC-3 | BEH-001/002/004 | User | User | Open Settings and the composer; start the server | UI / startup | Normal | DS-002 and web surfaces | No feature UI, built-in or settings | IMP-13, IMP-05 | Supported Normal Scenario | Use |
| C-1 | Core Principle 7; REQ-001/002 | Contract | — | No dead code or remainder in touched files | Code | — | — | — | design-principles §7 | Governing contract | Use |

### Candidate Finding And Mechanism Gate

| Candidate | Observation | Scenario / Contract | Trigger | Path / Consequence | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAND-01 | M3 deletes a run folder only after M2 removed its row (a refinement of the design) | SC-1 | A history-index write failure | Without the refinement, a failed M2 followed by M3 would leave rows for runs nobody can find again; with it, every source stays for the retry | migration lines 136-141; unit "keeps the helper runs and records when the history rows cannot be written" | Reject (as a finding) | — | Correct and safer than the design's text; consistent with its idempotency note |
| CAND-02 | M1 skips run files with a `taskAgent` section (delegated copies) | SC-1 | — | A copy of the improver would need a catalog delegation of a hidden helper; none exists in the user's data. Skipping keeps the coordinating run's link valid | handoff Important Assumptions; fixtures | Reject | — | Conservative; it adds no machinery for an unsupported state |
| CAND-03 | M4 walks all of `memory/` (except `imports/`) without a depth limit; the design said "to depth of run and member folders" | SC-1 | First start | One-time cost. After `SUCCEEDED` the migration never runs again. A session folder is recognized only by its exact state file, and symlinks are never followed | migration lines 259-278 | Reject | — | No supported consequence |
| CAND-04 | Unreadable `run_metadata.json` of an unrelated run is reported as `PRESERVED_UNREADABLE` (status `SUCCEEDED_WITH_WARNINGS`) | SC-1 | A damaged unrelated run file | The run is left untouched, which is correct. The warning text is accurate | migration lines 211-214 | Reject | — | Truthful reporting; nothing to change |
| CAND-05 | `mergeAgentConfigRecord` (`agent-definition-config.ts:73`) still drops `selfEvolution` (the feature's earlier name) and `systemPromptProcessorNames` (spelled as a joined string) on every agent save | C-1 / Principle 8 | Saving an agent definition | A version-specific obsolete-key cleanup in the current runtime path. It is pre-existing (`99976b55ab`), in a file this ticket does not touch, and outside AC-001's pattern | code read | Promote | Follow-up | **FU-003**. Removing it needs a persisted-data decision for existing `agent-config.json` files |
| CAND-06 | `generated/graphql.ts` trimmed (474 deleted lines) instead of fully regenerated, as the design said | REQ-001 | — | A full regeneration brings about 700 lines of unrelated drift. IMP-12 proves that each removed declaration is absent from a fresh regeneration and that the diff is deletions only | IMP-12; FU-002 | Reject (as a finding) | — | Justified deviation; the drift is recorded as FU-002 |
| CAND-07 | AC-001 says "lint pass"; the repository has no lint command | AC-001 | — | Requirement wording does not match the repository | handoff Environment notes | Reject (as a finding) | — | Discrepancy recorded. Typecheck passes; nothing to fix in code |
| CAND-08 | AC-001 sweep hits outside the listed allowed locations: the registry registration, `run_history.md` / `llm_management.md` describing migrations by id, released-migration e2e tests, the config test of `retiredSettingNames`, and the English word "retrospective" in `autobyteus-ts` | AC-001 | — | My rerun matches IMP-11. Each hit is a migration's registration or documentation, a released-migration test, or unrelated text | `git grep` rerun | Reject | — | The intent of AC-001 holds: no current feature code remains |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Cleanup; legacy cleanup trigger; removal only | — |
| Matches approved supplemental artifacts | Pass | `release-notes.md` unchanged (delivery's) | — |
| Data-flow spine clarity and preservation | Pass | DS-001 router path shortened only; DS-002 bootstrap simplified; DS-003 migration follows M1..M6 | — |
| Ownership boundary preservation | Pass | Historical names only in the migration and `retiredSettingNames`; settings retired by the existing owner | — |
| Off-spine concern clarity | Pass | Reuses `retiredSettingNames` | — |
| Existing capability reuse | Pass | Config retirement policy; A-06 and A-07 migration patterns | — |
| Reusable owned structures | Pass | No new shared structure | — |
| Shared-structure tightness | Pass | `AgentRunMetadata` loses `launchPurpose`; `BuiltInAgentDefinition` loses `settingDefault`; the router loses `grantRegistry` | — |
| Repeated coordination ownership | Pass | — | — |
| Empty indirection | Pass | No remaining forwarding layer; the grant registry is removed, not kept empty | — |
| Separation of concerns / file responsibility | Pass | The migration is one file with one concern (308 non-empty lines) | — |
| Ownership-driven dependency | Pass | The migration imports only runner types and `fs`/`path`, and serializes the index as `writeIndex` does without importing the store (R-1) | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | `migrations/` sibling pattern | — |
| Flat-vs-over-split | Pass | — | — |
| Interface clarity | Pass | Constructor takes `agentsDir`, keeping the frozen id out of the registry | — |
| Naming | Pass | — | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch control | Pass | — | — |
| Dead code removed in touched files | Pass | Beyond the plan, the setting-default mechanism, dead tests, probe mocks and imports are removed. No leftover found in the touched files. CAND-05 is in an untouched file (FU-003) | — |
| Test scenarios and assertions clear | Pass | The migration suite names fixtures and ACs and asserts byte-identity, exact index bytes, retries and canonical ids. The e2e covers fresh, old data with a second start, and an injected failure | — |
| Fixtures reusable | Pass | `skill-improvement-data-fixtures.ts` is shared by the unit and e2e suites | — |
| No stale or compatibility-only tests | Pass | Feature tests removed; the released self-evolution migration test moved, not dropped; adapted e2e suites assert stronger or equivalent facts | — |
| API/E2E readiness | Pass | The handoff lists the system-boundary scenarios (upgrade on synthesized data, `send_message_to` journeys, existing-run composers, Memory page) | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `app-data-migrations/migrations/remove-skill-improvement-data-migration.ts` | 0 | 308 | Pass | 338 (new, single concern) | Pass | Pass | — | — |
| `services/server-settings-service.ts` | ~366 | 349 | Pass | 19 | Pass | Pass | — | — |
| `web/stores/serverSettings.ts` | ~390 | 387 | Pass | 5 | Pass | Pass | — | — |
| Other changed source files | — | smaller | Pass | deletions only | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No GraphQL stub, no empty registry, no `launchPurpose` reader. Old values are ignored by the tolerant reader, and the migration deletes their runs |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in touched files | Pass | — |
| Approved persisted-data decision followed | Pass | `Migration Required` (deletion, DEC-001 C); settings through `retiredSettingNames` |
| No version-specific runtime fallback | Pass | Historical names only in migration-owned code |
| Transition mechanics match the reviewed design | Pass | M1..M6 with the M5 guard. Refinements: M3 after M2 (CAND-01), copies skipped (CAND-02), an unreadable index FAILED for retry. All are safer, and none deletes more than the design approved |

## Dead / Obsolete / Legacy Items Requiring Removal

None in this ticket's scope. CAND-05 is recorded as FU-003.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change. The server module docs, overview and architecture and the web docs are updated, and `skill_improvement.md` is removed. `run_history.md` documents the new migration by id (CAND-08).

## Additional Material Premise Validation

None new or reclassified. The design review's premises stand: R-3 (a team containing the improver loses that member) remains accepted.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.45
- Overall score (`/100`): 94.5
- Score calculation note: simple average; the decision follows the findings.

| Priority | Category | Score | Why | Weak / Holding Down | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Three spines, each simpler afterwards | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Historical knowledge confined to the migration and the retired list | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | Clean GraphQL cut; constructors lose dead inputs | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Single-concern migration file, sibling placement | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Optional fields with one writer removed | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | Clear frozen-name block and step comments | — | — |
| 7 | API/E2E Readiness | 9.0 | Strong unit and e2e coverage | Existing-run and Team-member composers not rendered; `send_message_to` not exercised through real runtimes | API/E2E covers the handoff's hints |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Migration ordering and retry are sound; router unchanged apart from grants | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | No shim anywhere in scope | An older obsolete-key filter outside the touched files remains (FU-003) | Follow-up |
| 10 | Cleanup Completeness | 9.5 | Removal went beyond the plan where code became dead | — | — |

## Findings

None for this ticket.

## Follow-ups

Findings outside this ticket go in the ticket's `follow-ups.md`. They do not fail the review, lower the score, or reopen implementation.

- Follow-ups this review added: **FU-003** (the obsolete-key drop list in `mergeAgentConfigRecord`, `agent-definition-config.ts:73`)
- Existing, unchanged: FU-001 (designer), FU-002 (implementation)

## Classification

- None (Pass).

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (pass); informational notification to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- AC-004's last part, the user's check after his backup, is delivery's.
- The web still has no working typecheck command (FU-002), so `.vue` templates are only covered by specs.
- R-3, accepted: a team definition that includes the improver loses that member when M6 deletes the definition.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 2, Targeted Delta Review of the INT-001 merge)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.45 / 10 (94.5 / 100); every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: `CRR-003`, against IR-002 @ `e022d9a570`. The merge resolution keeps base and does not restore the feature, and the Secret Gate entry is confirmed narrow. Product code changed after API-REV-001, so API/E2E revalidates by impact. Round 1: `CRR-001` against IR-001 @ `1f0ae5ea9c`. The classification Large / High is preserved. FU-003 was added to `follow-ups.md`; following the updated skill, it is not sent by this role.
