# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-004)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AF-01..AF-26), through the design spec's and the design review's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec Reviewed As Context: `design-spec.md` (SR-004, Ready)
- Supplemental Task Artifacts Reviewed As Context: `semantic-memory-prompt-contract.md` (behavior-defining, SR-004); `follow-ups.md` (FU-001..FU-012)
- Relevant Solution Revision IDs: SR-002 (approval), SR-003 (design), SR-004 (prompt contract)
- Design Review Report Reviewed As Context: `design-review-report.md` (Pass, no findings; notes N-1, N-2)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Implementation complete (IR-001), from the implementation engineer
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E records: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory`, branch `codex/agent-semantic-memory`, `git diff f78b60ddd..7e5f90d7f` (commits `785ff7c95` server, `0fa12575c` web and docs, `7e5f90d7f` web test fixture). Ticket documents at `b5f69b581`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The diff touches agent definitions, personal settings, agent memory, the composer, five runtime backends, Codex/Claude runtime configuration, GraphQL and web (37 changed source files). It changes shared contracts (`agent-config.json`, `personal-settings.json`, GraphQL `AgentDefinition`, `PersonalSetting`) and widens a write-access boundary by one folder. This matches the design's classification.

## Review Scope

- Changed implementation and behavior reviewed: BEH-001..BEH-005 (whole server and web source diff), the docs and glossary diff, and the new and extended unit/component tests.
- Files / areas reviewed: every file under `autobyteus-server-ts/src` and `autobyteus-web` (excluding generated) in the diff. Call sites I checked outside the diff: `agent-run-restore-context-factory.ts` (Claude/Codex restore placeholders are rebuilt by `bootstrapForRestore`), `codex-agent-run-backend.ts:282-291` and `codex-thread-manager.ts:79-90` (the reopen keeps the prepared `appServerConfig`, sandbox object included), `claude-session-query-options.ts:57` (no path gating in `canUseTool`), `personal-setting-record.ts` `toRecord` (drops `undefined`), `agent-definition-service.ts` `updateAgentDefinition`/`patched`, GraphQL `updateAgentDefinition` resolver (generic pass-through), and `file-agent-definition-provider.ts:45` (app-created IDs are slugified).
- Explicit exclusions: real-runtime behavior (AC-001..AC-004, API/E2E), HTTP-level AC-007/AC-008. I did not rerun the recorded checks IMP-01..IMP-09: nothing they exercise changed after they ran, and no finding needs them.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: an optional per-definition `semanticMemoryEnabled` flag. When it is on, the server owns `<memory>/semantic/<encoded id>/`, creates it at run preparation, tells every run the path in the fixed §2 section, and makes the folder writable in Codex (`workspace-write`) and Claude. Agents with the flag off are unchanged byte for byte. Package and built-in agents keep the app's switch as a personal setting.
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: ARCH-REV-001, Pass. N-1 is implemented: `semanticMemoryEnabled` is in `PERSONAL_FIELDS` (`agent-definition-service.ts:64`) and covered by the write-forms tests. N-2 is a Solution Designer document, not code.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None
- Remaining material ambiguity, if any: None

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `carpenter-prompt-sections.ts` `renderSemanticMemorySection` matches contract §2 character for character. `carpenter-prompt-composer.ts:51-56` pushes it after `## Project` and before the native-only sections, and refuses a relative path. `semanticMemoryPath` is a required key. Five prod callers pass it: AutoByteus `:336`, Codex `:257-263` (create and restore through `bootstrapInternal`), Claude `:95-101` (create and restore), ACP `prepare()` `:150`, used by create `:112` and restore `:130`, and AGY `:62` (create only, REQ-009). `semantic-memory-prompt-section.test.ts` asserts §5.1, §5.2, §5.3, §5.4 and §6 verbatim. | — |
| BEH-002 | Confirmed | Config read is `=== true`, written only when true, and the merge drops a stale key (`agent-definition-config.ts`). Both readers map the field. In the service, create sets the field, `patched` handles it, and the field is in `PERSONAL_FIELDS`. Package and built-in agents: `setEdited` keeps the value only when it differs from base, `apply` overrides it, `reset` uses `FIELDS_OF_SETTING.SEMANTIC_MEMORY`, and package-update capture compares installed with on-disk. GraphQL has the fields, the inputs and the enum value. Web has the field component, form wiring (load, payload, reset branch), the detail card, store types and both query and mutation fragments (the reset mutation uses the same fragment). `personal-settings-write-forms.test.ts` covers package, built-in and own agents and create. | — |
| BEH-003 | Confirmed | `AgentMemoryLayout.getAgentSemanticMemoryDirPath` builds `semantic/<encodeURIComponent(id)>` through `resolveSafePath`. `AgentSemanticMemory.folderOf` is pure; `prepareForRun` is `mkdir -p`. No code removes the folder: the only fs call is `mkdir`, and definition delete does not reference it. | — |
| BEH-004 | Confirmed | Every backend keys on the definition it reads by `config.agentDefinitionId`, so a shared member or delegated copy gets the shared definition (AF-17/AF-18, ARCH-REV-001). Team-local and Org-owned IDs are encoded to distinct names (AC-006 test). | — |
| BEH-005 | Confirmed | `buildCodexSandboxWorkspaceWriteConfig` is the only producer of `sandbox_workspace_write` (grep: one hit in `src`), for `workspace-write` only. The integration builder emits `shell_environment_policy` only. The Codex reopen spreads the prepared config, so the writable root survives a tool-list reopen. Claude passes `additionalDirectories` from the bootstrapper through session config and query options to the SDK, only when non-empty. With the flag off, the Codex `appServerConfig` keys are exactly `["mcp_servers"]` (test). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-003 | System | Run of an enabled agent | Know where its knowledge lives | Run create/restore | Normal | Backend reads the definition → `prepareForRun` → composer → runtime start | Section with the absolute path; folder exists | requirements SCN-001; DS-001 | Supported Normal Scenario | Use |
| SCN-002 | BEH-005 | User/System | Agent during work | Keep reusable knowledge | Agent's own file/shell tools | Normal | Codex writable root / Claude additional directory | Write succeeds without a sandbox denial | requirements SCN-002; AF-01/AF-02; IMP-09 | Supported Normal Scenario | Use |
| SCN-003 | BEH-001, BEH-004 | System | Later run in another Project, as team member or delegated copy | Reuse knowledge | Run start | Normal | Same definition ID → same folder | Same path | requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-002 | User | Agent author | Turn it on/off | Package `agent-config.json` or app form | Normal | DS-002 / DS-003 | Own agent: file; package/built-in: personal setting with reset; detail shows state and path | requirements SCN-004; DEC-012 | Supported Normal Scenario | Use |
| SCN-005 | BEH-001, BEH-005 | System | Run of an agent without the setting | Unchanged behavior | Run start | Normal | `folderOf` → null; no mkdir; composer omits the section | Byte-identical prompt; unchanged Codex config | requirements SCN-005 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `encodeURIComponent` leaves `*` unencoded, and `*` is invalid in Windows file names (QR-001) | QR-001 | A definition ID containing `*` | Agent IDs are folder names (package agents) or slugified names (app-created, `file-agent-definition-provider.ts:45`). Team-local and Org IDs join such names with `:`, which is encoded. A `*` ID cannot exist on a Windows node, and the semantic folder lives on the same node as the definition. | Code read | Reject | — | No supported path produces such an ID on Windows |
| C-02 | `folderOf` throws for an enabled definition without an ID; the GraphQL converter calls it on every read | Contract (design: "throws if an enabled definition has no ID") | Read of an enabled definition with no ID | Every stored definition is read with its ID; IDs are required for definitions read from files | Design Interface Boundary Mapping; readers | Reject | — | Designed refusal; not reachable from stored definitions |
| C-03 | ACP `prepare()` creates the folder before `assertAccepting()`, so a cancelled preparation can leave the folder created | REQ-003, REQ-007 | Run preparation cancelled | The folder is the agent's permanent folder and is never deleted (REQ-007); creating it early has no adverse consequence | `acp-agent-run-backend-factory.ts:150-160` | Reject | — | No consequence |
| C-04 | Backends inject `AgentSemanticMemory` in two styles (constructor default vs `deps.semanticMemory ?? getAgentSemanticMemory()`) | Engineering contract (consistency) | — | Each follows its backend's existing dependency style (ACP/AutoByteus options objects; Codex/Claude/AGY constructor defaults) | Diff | Reject | — | Follows local convention; not a defect |
| C-05 | Comment at `codex-agent-run-backend.ts:286-287` ("the run's integration part (shell variables and sandbox network) stays") does not mention the writable root that now rides in the same preserved config | Engineering contract (docs accuracy) | — | Behavior is correct (the whole prepared config is spread); the comment is incomplete, not wrong; the file is not in the diff | Code read | Reject | — | Cosmetic; noted under Residual Risks for whoever touches the file next |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Both refactors the design requires now are done: `agent-definition-edits.ts` extraction and the Codex sandbox builder split. FU-005/FU-006 files received wiring only (+3 and +10 lines). | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | §2 text is exact, §4 placement and §1 presence follow the contract, §5 examples are asserted verbatim | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-004 implemented as designed; each backend calls each mechanism itself in order (read definition → `prepareForRun` → compose → write access) | — |
| Ownership boundary preservation and clarity | Pass | `AgentSemanticMemory` owns the enable rule and mkdir; the layout owns the name; the composer stays pure (no fs/config) | — |
| Off-spine concern clarity | Pass | Folder naming in the layout; sandbox object in its own builder; Claude directories are data only in the client | — |
| Existing capability/subsystem reuse check | Pass | Extends `AgentMemoryLayout`, personal settings, composer and Codex thread config; one new owner where none existed | — |
| Reusable owned structures check | Pass | One path derivation (`folderOf`) serves runs and GraphQL; one `sandbox_workspace_write` builder | — |
| Shared-structure/data-model tightness check | Pass | The path is derived, never stored. The personal record keeps the field only when it differs from base. Config is written only when true. | — |
| Repeated coordination ownership check | Pass | The rule lives in one owner; the five call sites are one line each and do not repeat logic | — |
| Empty indirection check | Pass | `AgentSemanticMemory` owns the rule, the ID check and the mkdir; it is not pass-through | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New files each own one concern | — |
| Ownership-driven dependency check | Pass | Backends → owner (allowed). The layout's semantic path is called only by the owner (grep). The prompt module has no fs import added. | — |
| Authoritative Boundary Rule check | Pass | No caller uses both `AgentSemanticMemory` and `AgentMemoryLayout.getAgentSemanticMemoryDirPath`; no backend reads `semanticMemoryEnabled` itself | — |
| File placement check | Pass | `agent-memory/services/`, `codex/backend/`, `agent-definition/services/`, `components/agents/` as designed | — |
| Flat-vs-over-split layout judgment | Pass | No new folders | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `folderOf`/`prepareForRun(definition)`, `getAgentSemanticMemoryDirPath(agentDefinitionId)`, typed builder input, GraphQL fields and inputs are subject-specific | — |
| Naming quality and naming-to-responsibility alignment (Principle 15) | Pass | `semanticMemoryEnabled` is used in config, domain, personal record, GraphQL and web. `SEMANTIC_MEMORY` is the setting. The glossary entry separates it from `semantic.jsonl` and `SemanticItem` (FU-009). | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Two readers map the field by hand: existing duplication, FU-008 | — |
| Patch-on-patch complexity control | Pass | Initial round; clean additions | — |
| Dead code removed in the touched files and modules | Pass | The integration builder lost its `sandbox` parameter and branch; nothing left unused (typecheck IMP-01 baseline-equal) | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests name their REQ/AC/contract section. Assertions compare exact contract strings, exact config keys and package-file snapshots. | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Extends existing backend/bootstrapper fixtures; temp memory dirs per test | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Integration-builder tests updated to the new one-key shape | — |
| API/E2E readiness for the next workflow stage | Pass | Handoff lists the AC-002 per-runtime cases (data dir outside `/tmp`), AC-003/AC-004 and AC-007/AC-008 over GraphQL | — |

## Source File Size And Structure Audit (If Applicable)

Effective non-empty lines, base `f78b60ddd` → `7e5f90d7f`. Every changed source file is listed for completeness; only the largest are notable.

| Source File | Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/agents/AgentDefinitionForm.vue` | 487 | 495 | Pass | Pass (+10/−1) | Pass (wiring only; logic in `AgentSemanticMemoryField.vue`) | Pass | — | None (FU-006 tracks the split) |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 481 | 484 | Pass | Pass (+3) | Pass (wiring only) | Pass | — | None (FU-005) |
| `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts` | 454 | 431 | Pass | Pass (+9/−35) | Pass (helpers moved to `agent-definition-edits.ts`) | Pass | — | — |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | 401 | 408 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-web/stores/agentDefinitionStore.ts` | 360 | 366 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts` | 341 | 344 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts` | 314 | 325 | Pass | Pass | Pass | Pass | — | — |
| `autobyteus-server-ts/src/personal-settings/services/personal-settings-service.ts` | 243 | 253 | Pass | Pass | Pass | Pass | — | — |
| Remaining 29 changed source files (all ≤ 206 lines; 4 new files 28–36 lines) | — | — | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention in changed scope | Pass | Integration builder no longer emits `sandbox_workspace_write` (clean cut) |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration`: absent field = off; tolerant personal-record reader validates booleans |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | No migration, as designed |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, and done in this change
- Why: new glossary term, memory layout, a fifth personal setting, a prompt section, and Codex/DeepSeek-harness write access
- Files or areas likely affected: `GLOSSARY.md`, `docs/modules/{agent_memory, agent_definition, personal_settings, prompt_engineering, codex_integration, credential_proxy, deepseek_harness_runtime}.md`, `docs/design/collaboration_model.md` §3, `autobyteus-web/docs/agent_management.md`. All are updated in the diff; delivery verifies the final docs sync.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

None. ARCH-REV-001 recorded no material premises. SCN-006 (concurrent writes) remains an approved accepted risk and needs no mechanism.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001..DS-004 are visible in code. Each backend drives its own sequence, and create and restore share one path in Codex, Claude and ACP. | Nothing material | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.6 | One owner holds the rule and mkdir; the layout semantic path has one caller; no backend reads the flag | Nothing material | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Subject-specific signatures; required composer key prevents omission; GraphQL fields exactly as designed | Nothing material | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | New concerns live in new owned files, and the over-limit-risk files get wiring only | Two near-limit files remain (FU-005/FU-006, pre-existing) | Their tracked splits |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | The path is derived and never stored; the personal record holds only differences; config is written only when true | The two config→domain readers still duplicate mapping (FU-008, pre-existing) | FU-008 |
| `6` | `Naming Quality and Local Readability` | 9.5 | One name everywhere; the glossary resolves the old "semantic" meaning; comments are clear | One untouched comment is now incomplete (C-05, cosmetic) | — |
| `7` | `API/E2E Readiness` | 9.3 | Clear per-runtime E2E hints. The CLI sandbox reproduction supports the Codex mechanism. | Codex app-server `writable_roots` and the DeepSeek harness are not yet shown at runtime (owned by API/E2E) | AC-002 evidence |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.5 | Contract text exact; create/restore/reopen paths traced; personal-setting and file write paths tested against real files | Real-runtime confirmation pending (API/E2E) | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.7 | Clean cut of the integration builder's sandbox key; no fallbacks | — | — |
| `10` | `Cleanup Completeness` | 9.5 | Parameter and branch removed with the split; docs updated; no dead code left | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (FU-005, FU-006, FU-008 and FU-009 already cover the pre-existing debt observed).

## Classification

N/A: Pass.

## Recommended Recipient

API/E2E (primary pass rule), then an informational notice to implementation.

## Residual Risks

- Codex app-server honoring the thread-config `writable_roots` is shown only through the Codex CLI sandbox (IMP-09). AC-002 must confirm it with a data dir outside `/tmp` (AF-03). Include both the auto-execute-off case and the case with integration variables (both flags in one object).
- DeepSeek harness (FU-007): with auto-execute off, writes ask a sandbox escalation. Report this as AC-002's alternate outcome, with evidence.
- Claude `additionalDirectories` makes the folder a Claude Code working directory. The design accepts this.
- C-05 (cosmetic): `codex-agent-run-backend.ts:286-287` describes the preserved config as "integration part (shell variables and sandbox network)". It now also carries the semantic memory writable root. Behavior is correct.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E engineer
- Notes: Classification Large/High is preserved. No findings.
