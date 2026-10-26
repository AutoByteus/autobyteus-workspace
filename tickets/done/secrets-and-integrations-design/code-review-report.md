# Code Review Report — MCP server secrets in the vault (autobyteus-244)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/secrets-and-integrations-design/requirements-doc.md` (MREQ-001…008 and MDEC-001…005 approved at SR-005; MDEC-006 and MDEC-007 added at SR-008 by the Solution Designer under the user's standing direction)
- Investigation Notes Reviewed As Context: `…/investigation-notes.md` (cited sections only, through the design spec)
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (SR-008 current)
- Design Spec Reviewed As Context: `…/design-spec.md` (SR-008, including "SR-008 Revision")
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-006); `tickets/done/mcp-bulk-import-errors/requirements-doc.md` (autobyteus-190 SCN-002); `DESIGN.md`
- Relevant Solution Revision IDs: SR-005, SR-007, SR-008
- Design Review Report Reviewed As Context: `…/design-review-report.md` (ARCH-REV-003, Pass; AR-015; AR-016 adopted into MDEC-007)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003
- Implementation Handoff Reviewed As Context: `…/implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `Full Re-Audit`
- Review Scope Evidence (round >1): round 2 changes a shared data shape, `DraftValue` (adds `missingSecret`). It also changes a GraphQL contract (`ImportMcpServerConfigsResult.needsSecret`) and the provider's `update` behavior, and adds a new owner, `mcpSecretReviewState.ts`. So every structural check and the full scorecard were rerun. `git diff dba930bb54..4aa2543f9d` touches only the files below; evidence for files round 2 did not touch is carried forward from CRR-001.
- Trigger: IR-002 (rework for CRR-001 CR-001…CR-004, implementing SR-008 with AR-015/AR-016)
- Prior Review Round Reviewed: `1` (CRR-001, Fail)
- Latest Authoritative Round: `2`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design`, branch `codex/secrets-and-integrations-design`. Reviewed at `4aa2543f9d`: round 2 = `4505158d77` (server), `fc6032999e` (web), `98eeac9f31` (docs), `4aa2543f9d` (artifacts). Base `a2faf424d6`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. Round 2 is bounded (one draft kind, one result field, one provider branch removed, one web preference module) and does not change the classification.

## Review Scope

- Changed implementation and behavior reviewed in round 2:
  - server: `mcp-server-draft.ts` (`missingSecret`); `mcp-server-secret-fields.ts` (`missingReference`, store and preview handling); `mcp-config-service.ts` (import `keep` / `missingSecret`, `needs_secret`); `file-provider.ts` (update backup removed); GraphQL `ImportMcpServerConfigsResult.needsSecret` and resolver mapping;
  - web: `utils/mcp/mcpSecretReviewState.ts` (new); `mcpConfigRows.ts` (`offersMove`, `unlockedSuggestions`, `rowsToInput`); `McpConfigRows.vue`, `McpSecretMoveBanner.vue`, `McpServerFormModal.vue`, `McpBulkImportView.vue`; import mutation; generated hunks; en and zh-CN locales;
  - tests: the changed server unit, integration and e2e cases (including the AR-016 integration case) and the web specs;
  - docs: `mcp_server_management.md`, `tools_and_mcp.md`;
  - removals: the three `*.test.js` twins.
- Carried forward from CRR-001, untouched in round 2: core, server vault and resolver wiring, converter and input mapper, move and delete sequences, the live check.
- Checks: none rerun. IMP-16…IMP-22 ran on the round-2 commits. IMP-01, IMP-02 and IMP-06…IMP-10 are reused validly, because round 2 does not touch the code they exercise.
- Explicit exclusions: rendered screenshots (IMP-16) taken as evidence.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes, including MDEC-006 (reviewed-once banner) and MDEC-007 with AR-016 (import of references).
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-003 Pass. AR-015 is applied: the key is `windowNodeContextStore.entryId`, `embedded-local` for the embedded node (`windowNodeContextStore.ts` L48, L67). AR-016 is applied: import keeps when the saved server holds any reference at that field.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none beyond SR-008.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 (store) / DS-001 | Confirmed | Unchanged sequence. `file-provider.ts` `update` (L199-212) writes no backup; `writeBackup` is called only from `replaceWithReferences` | — |
| Form path to the vault (SR-008 CR-001) | Confirmed | `offersMove` (`mcpConfigRows.ts` L99-101): an unchanged saved plain row shows "Move to vault" in place of the lock (`McpConfigRows.vue`) and is always sent plain by `rowsToInput`. A changed value gets the lock back; saving it locked sends `newSecret`. The per-row move shows `move_done` with the backup path | — |
| BEH-001 (use), BEH-005, Preview, Delete, Live check | Confirmed (carried) | Unchanged since CRR-001. Preview maps `missingSecret` to an unresolvable fresh reference; it is only reachable from import | — |
| UC-006 move / DS-004 + MDEC-006 | Confirmed | Banner `candidates` = store candidates minus `mcpSecretReviewState.read(entryId)`. Reviewed by: "Keep as they are" (marks the shown candidates); dialog confirm (marks the unticked ones; with none ticked, closes without a move); form save (`unlockedSuggestions` → `markReviewed` after a successful configure) | — |
| Import (MREQ-006, MDEC-004, MDEC-007/AR-016) | Confirmed | `importedDraftValue` (`mcp-config-service.ts`): a reference becomes `keep` if `saved` holds a reference at that field, else `missingSecret`. `store` gives `missingSecret` a fresh `mcp.<uuid>` with no entry (MISSING). Result `needs_secret` → GraphQL `needsSecret` → import view list and toast | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CRS-001 | SR-008 CR-001, MDEC-001/002, R-4 | User | User editing a saved server | Protect a stored plain value | Form row "Move to vault" | Normal | `offersMove` → `move-to-vault` → `moveFieldToVault` → `moveMcpSecretsToVault` → backup + `move_done` notice | Moved, and the user is told the backup path | design SR-008; specs; IMP-16-02/03 | Supported Normal Scenario | Use — resolved |
| CRS-002 | MDEC-006 | User | User with a false hit (`TOKEN_LIMIT=4096`) | Leave it plain and not be asked again | Banner, dialog, form | Normal | `markReviewed(entryId, …)` → localStorage → the banner filters it out after a reload | Banner shows only unreviewed candidates | MDEC-006; spec cases; IMP-16 "banner after reload: (no banner)" | Supported Normal Scenario | Use — resolved |
| CRS-003 | MDEC-007, AR-016, 190 SCN-002 | User | User re-importing own or another node's `mcps.json` | All entries import | Bulk Import | Normal | `importedDraft(parsed, provider.getByServerId)` → `configureMcpServer` | Own: keeps the working secret; foreign: MISSING plus `needsSecret` | integration "AR-016" case; IMP-19 e2e | Supported Normal Scenario | Use — resolved |
| CRS-007 | Assumption 3 | User | An import and a form save on the same server at the same moment | — | Two windows | — | The import's `keep` decision is read before the lock; the store's keep check refuses if the field vanished | — | Two individually supported actions; no product goal for running them concurrently | Technically Possible but Unsupported/Contrived | Reject |
| CRS-008 | MDEC-006 | User | Review marks dropped when `getMcpServers` is empty at write time | — | — | — | The banner shows only when candidates exist, and candidates are fetched after `mcpServers` in `fetchMcpServers` | — | Store order | Not Reachable | Reject |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-12 | The import's keep decision reads the saved server outside the write lock (handoff Assumption 3) | CRS-007 | Concurrent import and save | Worst case: `keep` with nothing stored → that entry fails with a value-free reason; no sharing, no loss | `mcp-config-service.ts` import loop; `storedOrPlain` keep check | Reject | — | Contrived concurrency (Principle 6); the existing guard is sufficient |
| C-13 | Re-import where the local field is now plain and the file carries a reference → `missingSecret` replaces the plain value | Import overwrite semantics | Import | The value is listed in `needsSecret`; import already overwrites every value of an existing server | MDEC-007 | Reject | — | Intended import overwrite; the user is told |
| C-14 | `offersMove` replaces the lock on every unchanged saved plain setting, including ones the rule does not match | SR-008 CR-001 | — | Locking an existing plain setting goes through the move with its backup | design SR-008 bullet | Reject | — | Exactly as designed |
| C-15 | Empty-servers drop in `markReviewed` | CRS-008 | — | — | — | Reject | — | Not reachable |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Unchanged; round 2 removes a branch instead of adding machinery | — |
| Implementation matches approved behavior-defining artifacts | Pass | SR-008, MDEC-006, MDEC-007/AR-016, AR-015 | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001 import step now branches on the saved field; DS-004 is the only backup writer | — |
| Ownership boundary preservation and clarity | Pass | Only `McpServerSecretFields` creates references (`missingReference` reused by `save`); `mcpSecretReviewState` is the single owner of the preference | — |
| Off-spine concern clarity | Pass | Review state stays web-only, off the server | — |
| Existing capability reuse | Pass | Reuses `windowNodeContextStore.entryId` and the localStorage pattern of `chatLastModelPreference.ts` | — |
| Reusable owned structures | Pass | `reviewKeyOf` shared by the banner and the state; `draftFieldsOfKind` replaces the single-purpose helper | — |
| Shared-structure tightness | Pass | `missingSecret` carries no payload; GraphQL input cannot express it | — |
| Repeated coordination ownership | Pass | — | — |
| Empty indirection | Pass | — | — |
| Separation of concerns and file responsibility | Pass | — | — |
| Ownership-driven dependency direction | Pass | — | — |
| Authoritative Boundary Rule | Pass | The import reads saved config through the service's own provider boundary | — |
| File placement | Pass | `utils/mcp/mcpSecretReviewState.ts` beside the row model | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | `needsSecret` mirrors `storedSecrets`; `storedOrPlain` now takes `Extract<…"plain"\|"keep">` | — |
| Naming quality; one vocabulary | Pass | `missingSecret`, `needsSecret` and "reviewed" match the glossary and design words | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | CR-001 fixed by removing the update backup, not by adding a notice path | — |
| Dead code removed in touched files and modules | Pass | Three JS twins deleted; `replacesPlainValue`, the unused provider info logger and the round-1 refusal text removed (no references remain) | — |
| Test scenarios and assertions clear and requirement-aligned | Pass | "writes no backup when a form save locks…"; AR-016 case asserts the working ID, its value and `CONFIGURED`; banner, form and review-state specs | — |
| Test fixtures/helpers reusable, structure coherent | Pass | — | — |
| No stale, duplicated, compatibility-only tests in changed scope | Pass | The round-1 refusal assertions were replaced | — |
| API/E2E readiness | Pass | — | — |

## Source File Size And Structure Audit

| Source File | Before (base) | After (round 2) | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/tools/McpServerFormModal.vue` | 500 | 450 | Pass | split in round 1 | Pass | Pass | Pass | — |
| `autobyteus-web/stores/toolManagementStore.ts` | 408 | 479 | Pass | 111 | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` | 140 | 337 | Pass | the designed sequence owner | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` | 138 | 222 | Pass | < 220 | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-server-secret-fields.ts` | new | 197 | Pass | < 220 | Pass | Pass | Pass | — |
| `autobyteus-web/utils/mcp/mcpConfigRows.ts` | new | 203 | Pass | < 220 | Pass | Pass | Pass | — |
| `autobyteus-web/utils/mcp/mcpSecretReviewState.ts` | new | 54 | Pass | — | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files and modules | Pass | CR-004 resolved |
| Approved persisted-data transition followed | Pass | `mcps.json` unchanged decision. New browser key `autobyteus.mcp.secretReview.<entryId>`: absent = nothing reviewed, no migration (SR-008) |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the reviewed design | Pass | Only the move writes backups |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining in the touched files and modules. Other `*.test.js` twins: FU-006.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in `98eeac9f31`. `mcp_server_management.md` says "A save writes no backup: only the move does" and describes the MDEC-007 import. `tools_and_mcp.md` covers the move in place of the lock, the review state and `needsSecret`.

## Additional Material Premise Validation

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001…P-003 | Confirmed | Unchanged |

New premises: none beyond C-12 and C-15, which the gate rejected.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | One plain-to-vault path (the move); import branches clearly on the saved field | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Single writers for file, backup, references and review state | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.3 | `needsSecret` parallels `storedSecrets`; `missingSecret` cannot be sent by clients | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.4 | Review state in its own small owner | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | Payload-free `missingSecret`; `missingReference` reused by `save` | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Consistent vocabulary | — | — |
| `7` | `API/E2E Readiness` | 9.4 | Integration, e2e, specs and rendered evidence for every round-2 behavior | Desktop (Electron) and Linux permissions remain for API/E2E | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.3 | CR-001…CR-003 resolved as SR-008 decides; AR-016 proven | Review state is per device (accepted by MDEC-006) | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | — | — | — |
| `10` | `Cleanup Completeness` | 9.4 | Twins, the update backup branch and the unused logger removed | — | — |

## Findings

No open findings. CR-001…CR-004 are resolved (see CRR-002's Prior Finding Resolution).

## Follow-ups

- Follow-ups this review added: None (FU-006 was added in CRR-001).

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E Engineer, `/software_engineering_team/api_e2e_engineer` (primary pass rule); then an informational notice to the Implementation Engineer.

## Residual Risks

- R-3 (stdio env readable by a same-user process) and R-5 (live token expires 2026-11-25) are unchanged.
- The banner's review state is per device and per node entry; another device shows the banner once (MDEC-006).
- Hints for API/E2E: on a real desktop instance, check that the review state survives a restart and a port change; run the import of a file from another node; check the backup's permissions on Linux.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer
- Notes: round 2 is a Full Re-Audit (a shared draft type and the import contract changed). Handoff Assumption 3 was reviewed and rejected as a contrived concurrency premise (C-12).
