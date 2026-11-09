# Code Review Report — package-personal-settings, stage 1 (autobyteus-95)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (F-01..F-10, AF-01..AF-11), as cited by the design
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-006, Ready)
- Supplemental Task Artifacts Reviewed As Context: `personal-settings-file-contract.md` (approved, Q1–Q5); `follow-ups.md` (FU-002, FU-003); project `DESIGN.md`, `GLOSSARY.md`
- Relevant Solution Revision IDs: SR-006
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass; notes R-1..R-7)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation engineer's handoff of IR-001, 2026-11-09. Code `f9b3e27297`, `2c4ba2c51e`; baseline test fix `48f4443fe6`; ticket `4e7c74b274`; base `origin/personal` `a85bf4f38d`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E / Delivery records: N/A (implementation review)
- Failing Scenario IDs / Commands / Evidence: N/A
- Shared guidance applied: `design-principles.md` as updated (Principle 15 One Vocabulary; clean-pass bar 9.2 per category)

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. Confirmed against the diff (78 files): new persisted user data, every definition read passes the new projection, the update pipeline gains a download and user-data writes, new GraphQL fields and mutations.

## Review Scope

- Changed implementation and behavior reviewed: `024c052947..2c4ba2c51e` (server, web, docs) along DS-001..DS-005; `48f4443fe6` (a test-only baseline fix, its cause stated in the handoff).
- Files / areas reviewed:
  - Server: `personal-settings/{domain,stores,services}`; the agent, Team and Org services and file providers (`rendersDifferently`); `agent-packages/services/{package-edit-capture,github-agent-package-updates,agent-package-service}.ts`, `installers/github-agent-package-installer.ts` (`downloadRevision`); GraphQL types, converters and `personal-settings.ts`; `create-bundle-backed-definition-services.ts`, `host-definition-services.ts`, `agent-package-definition-feed-composition.ts`, `build-studio-server.ts`.
  - Web: `AgentDefinitionForm.vue`, `AgentTeamDefinitionForm.vue`, `AgentOrgExperience.vue` + `AgentOrgPersonalSettings.vue`, `DefinitionLaunchPreferencesSection.vue`, `PersonalSettingMark.vue`, `PersonalSettingsNote.vue`, `usePersonalSettingReset.ts`, the three stores, en strings (`personalSettings.ts`, REQ-007 keys).
  - A search for definition-store readers outside the three services (none) and for `toolNames` consumers (tool-list updates read through `AgentDefinitionService` and are notified by the shared announce).
- Explicit exclusions: rendered fidelity beyond IMP-09a/b; a real GitHub update with edited files (API/E2E). Recorded checks were not rerun: they ran on the reviewed commit `2c4ba2c51e`.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes — tools, skills, avatar and runtime/model of package (GitHub and local) definitions and built-in agents are personal settings in one node file, applied on every read; saves split; reset per setting; GitHub updates download the installed revision, back up changed files and capture edits; REQ-007 texts.
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: ARCH-REV-002 Pass; AR-001..AR-005 resolutions and notes R-4..R-7 are in the code.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None. One design-document inaccuracy (not behavior): the Derived Consumers row says `listAdmissionEntries` is "not affected", but the Team/Org GraphQL lists and run starts read through it; the implementation applies personal settings there, as REQ-002 and the Ownership Map require.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-002..004 (reads), DS-001 | Confirmed | Agent: `readBaseDefinition` (store entry + `sourceClass`) → `effective()` = strip → `PersonalSettingsService.apply`; used by `getAgentDefinitionById`, `getAllAgentDefinitions`, team-local lists. Team and Org: `getDefinitionById`, `getAllDefinitions`, `listAdmissionEntries`. Application-owned definitions pass `sourceClass = null` (no apply) | — |
| BEH-002..004 (saves), DS-002 | Confirmed | Base read → (not applicable: as before) → candidate with personal fields at base → `fileStore.rendersDifferently` → validate + write + reload only when different → `setEdited` → return the effective read. Reset: `resetPersonalSetting` → `PersonalSettingsService.reset`. GraphQL fields and three reset mutations | — |
| BEH-001, DS-003 | Confirmed | `updatePackage` (after the up-to-date early return) → `PackageEditCapture.captureAndBackUp`: unknown revision → stop; `downloadRevision` into `agent-packages/.staging/capture-*`; folder readers on both trees (same IDs); changed files byte-compared; backup to `backups/<installKey>/<UTC>[-n]`, prune to 5; `captureFromPackageEdits`; temp removed → staging as before | — |
| DS-004 | Confirmed | One `announce` in the feed composition, set on the reloader and `PersonalSettingsService`, cleared on close; it broadcasts the changed lists and notifies `AgentDefinitionChangeSignal` (tool-list updates) | — |
| BEH-001 texts | Confirmed | en/zh-CN `settings.notifications.auto.confirm.replace.agent_package`, `…explain.agent_package`, `…explainOn.agent_package` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001..UC-005 (AC-001..AC-008) | BEH-001..004; contract §2–§8 | as in the requirements | User; GitHub update (click or automatic pass); server start (built-ins) | as in the requirements | Editors; Settings → Agent Packages / Notification Center; restart | Normal (AC-004, AC-007 explicit edges) | DS-001..DS-005 | as in the requirements | requirements-doc, contract, ARCH-REV-002 | Supported (as classified upstream) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The Team service keeps the files' text when the editor's trimmed text equals it up to surrounding whitespace (`keptText`, fix `2c4ba2c51e`) | AC-001 (no file write for a personal-only save), Team avatar save | The Team editor trims name, category, description, instructions (`AgentTeamDefinitionForm.vue:480-483`) | Without it a Team avatar-only save rewrote `team.md`/`team-config.json` (IMP-09a DEFECT 2) | IMP-09a, IMP-09b step 4 `package git status: []`; unit test | Reject as a finding | — | Bounded, documented, applied only to personal-capable Teams; a whitespace-only intended edit of those fields is not a supported workflow. Org editor trims only frontmatter fields that the YAML read already trims; rendered Org save was clean (IMP-09b step 6) |
| C-02 | The editors skip a refill when the loaded values are unchanged or the editor's own reset is applying (fix `2c4ba2c51e`) | AC-005 (reset) with unsaved edits | Reset while another field has an unsaved edit; the announced list reload follows | Before the fix the reload discarded unsaved edits (IMP-09a DEFECT 1) | IMP-09b step 3 `"descriptionAfter": "Designs software (unsaved edit)"` | Reject | — | Correct; a real change of the definition still refills |
| C-03 | `getPersonalSettingsView` derives the source class through `folderOf`/`folderLocation`, while reads use `getEntry(...).location.sourceClass` | Principle 11 (one derivation per fact) | — | Both read the same folder location from the store; no supported definition gets different answers | `agent-definition-service.ts`, Team and Org services | Reject | — | Same data, two accessors; noted for a later tidy-up, no consequence |
| C-04 | `PersonalSettingsService.getInstance()` builds an unbound fallback instance (own cache) when no host bound one | AR-004 | — | Production binds the host instance in `createHostDefinitionServices` before any service uses it; the services receive it explicitly; capture resolves it lazily at update time | `host-definition-services.ts`, `agent-package-service.ts:107` | Reject | — | Not reachable in production; the fallback serves tests and the read-only validator (R-6) |
| C-05 | A non-ENOENT read error of `personal-settings.json` (permissions) throws from every definition read | Contract §2 "unreadable" | Filesystem permission fault | Infrastructure failure, not a product action | `personal-settings-store.ts:74-78` | Reject | — | Outside scope by default (Principle 6); AC-007's unreadable/wrongly shaped content is handled |
| C-06 | Capture of edits in a shadowed duplicate package (same IDs installed twice) would write records that apply to the definition in use | Contract V-A note | Editing files of the unused copy | Contrived | contract §9 V-A | Reject | — | No coherent workflow |
| C-07 | A package with an unknown installed revision still offers Update, which now always stops | REQ-006, design Risk R-2 | User presses Update on a legacy record | Refused with the remedy text; nothing changes | FU-003; E2E "stops the update of a legacy managed GitHub record" | Follow-up (already FU-003) | Follow-up | The ticket's behavior is correct (REQ-006); the row's action wording belongs to 210's update-state contract |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | One shared announce; split logic in `PersonalSettingsService`; no service passes 500 lines | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Contract §3 shape and key (split at first `:`), §4 tolerant read (invalid entries kept on rewrite, unreadable copied aside), §5 apply, §6 delta, §7.2 merge, §7.3 backup and keep 5, §8 scope (registered packages; built-in IDs in `server_data`) | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-005 map to code in call order | — |
| Ownership boundary preservation and clarity | Pass | Only `PersonalSettingsStore` touches the file; only the three services read definitions for callers; write forms start from the base read; the feed composition alone creates the announce function | — |
| Off-spine concern clarity | Pass | Store, pruning, folder readers serve their owners | — |
| Existing capability/subsystem reuse check | Pass | Folder readers, installer helpers, `writeAtomicJsonSync`, the feed's publish reused | — |
| Reusable owned structures check | Pass | One record/key/validator domain file; one web `PersonalSettingsFields`, mark, note and reset composable shared by three editors | — |
| Shared-structure/data-model tightness check | Pass | Record holds only the contract's fields | — |
| Repeated coordination ownership check | Pass | Delta and merge rules live once in `PersonalSettingsService` | — |
| Empty indirection check | Pass | — | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | `AgentOrgPersonalSettings.vue` split out to keep the Org editor under 500 | — |
| Ownership-driven dependency check | Pass | Services and `agent-packages` → `personal-settings`; `personal-settings` → definition domain types and the reloader's `listsAffectedBy` | — |
| Authoritative Boundary Rule check | Pass | No caller reads `personal-settings.json` or the package store beside the services | — |
| File placement check | Pass | As mapped | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Kind + ID everywhere; one reset mutation per kind | — |
| Naming quality and naming-to-responsibility alignment; one word, one meaning (Principle 15) | Pass | "personal setting" and "base value" in `GLOSSARY.md`, used the same way in code, GraphQL (`personalSettingsBase`), UI and docs. Nit: in `agent-team-definition-service.ts` the `BaseRead` doc comment ended up above `keptText`'s comment (orphaned) | Optional tidy-up |
| No unjustified duplication of code / repeated structures | Pass | C-03 noted | — |
| Patch-on-patch complexity control | Pass | The two rendered-check fixes are local and tested | — |
| Dead code removed in the touched files and modules | Pass | `readStoredDefinition` replaced by `readBaseDefinition`; FU-002 records an unused file outside the touched files | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Contract cases (record, store, service), write forms per kind on package fixtures (incl. the Org editor payload, built-in, own agent, Org-owned R-7), every Capture Failure Rules row, store reset actions, form specs | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained | Pass | Old-behavior tests changed to the approved behavior (handoff table) | — |
| API/E2E readiness for the next workflow stage | Pass | Coverage hints for AC-002..AC-004, AC-006..AC-008 | — |

## Source File Size And Structure Audit

| Source File | Effective Lines Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `compositions/build-studio-server.ts` | 500 | 497 | Pass (shrunk) | Pass | Pass | Pass | — | None |
| `agent-definition/services/agent-definition-service.ts` | — | 454 | Pass | Pass (≈150) | Pass | Pass | — | None |
| `components/agentTeams/AgentTeamDefinitionForm.vue` | — | 494 | Pass | Pass | Pass | Pass | — | None; near the limit |
| `components/agentOrgs/AgentOrgExperience.vue` | — | 491 | Pass | Pass | Pass | Pass | — | None; near the limit |
| `components/agents/AgentDefinitionForm.vue` | — | 487 | Pass | Pass | Pass | Pass | — | None; near the limit |
| New files (`personal-settings-service.ts` 272, `package-edit-capture.ts` 213, store, record) | new | ≤ 272 total | Pass | Pass | Pass | Pass | — | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`; new file and backups |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None in the touched files.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new capability, update capture and backups, editor marks.
- Files or areas likely affected: updated in `f9b3e27297` (`GLOSSARY.md`, `personal_settings.md` + index, `agent_packages.md`, `agent_definition.md`, web `agent_management.md`, `agent_teams.md`, `agent_orgs.md`). The design spec's Derived Consumers row on `listAdmissionEntries` is inaccurate (see the basis confirmation); a Solution Designer document fix, not a code change.

## Additional Material Premise Validation

None new or reclassified. MP-001..MP-003 of ARCH-REV-002 hold in the code (write forms start from the base read; personal-only saves write no file, checked per kind; an unreadable definition is backed up and not captured).

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.3
- Score calculation note: simple average; the decision follows the findings. Clean-pass bar 9.2 per category.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.4 | Read, save, reset, capture and announce follow the designed spines in call order | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.3 | One file owner; base reads feed every write form; services remain the only definition readers | Unbound fallback instance exists for tests (C-04) | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | Kind + ID identity; one reset per kind; enum fields | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Delta/merge rules in the service; capture in its own file; Org personal UI split out | Three editors sit just under 500 lines | Keep further editor growth in owned components |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Contract-exact record; shared web fields and components | The source class is read through two store accessors (C-03) | Use one accessor when next touched |
| `6` | `Naming Quality and Local Readability` | 9.3 | One vocabulary ("personal setting", "base value") across code, GraphQL, UI, docs and glossary | An orphaned doc comment in the Team service | Optional tidy-up |
| `7` | `API/E2E Readiness` | 9.3 | Hooks and hints for AC-002..AC-008 | A real update with edited files is not exercised yet (API/E2E) | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.3 | Contract rules, scope rule, split saves, capture failure rules and the shared announce are correct; the two rendered-check defects are fixed with tests | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean; old-behavior tests changed to the approved behavior | — | — |
| `10` | `Cleanup Completeness` | 9.3 | Renamed base read; dead file outside scope recorded (FU-002) | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-002 and FU-003 (implementation) are correctly placed.

## Classification

- None (Pass).

## Recommended Recipient

- API/E2E engineer, `/software_engineering_team/api_e2e_engineer`; then the informational pass notice to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- Not yet exercised: a real GitHub update with edited package files (AC-003), the automatic pass with capture and its failure (AC-004), personal tools reaching a running agent and delegated copies (AC-006), the runtime/model mark and reset rendered, zh-CN REQ-007 texts rendered (AC-008).
- Design R-1..R-3 stand (no Org runtime/model editor; legacy packages stop updating, FU-003; a removed tool a built-in agent needs breaks it until Reset).
- The design spec's Derived Consumers row on `listAdmissionEntries` should read "affected: applies personal settings" (Solution Designer's document).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10; every category ≥ 9.2
- Failure Origin (when applicable): N/A
- Recommended Recipient (when applicable): `/software_engineering_team/api_e2e_engineer`
- Notes: stage 1 matches the approved requirements, the contract and the SR-006 design; reviewed head `2c4ba2c51e` (ticket `4e7c74b274`).
