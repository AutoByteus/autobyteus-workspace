# Code Review Report — MCP server secrets in the vault (autobyteus-244)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/secrets-and-integrations-design/requirements-doc.md` (approved SR-005; "MCP Secrets In The Vault", MREQ-001…008, MDEC-001…005)
- Investigation Notes Reviewed As Context: `…/investigation-notes.md` (cited sections only, through the design spec)
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (SR-007 current)
- Design Spec Reviewed As Context: `…/design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001…FU-005); `tickets/done/mcp-bulk-import-errors/requirements-doc.md` (autobyteus-190 UC-002, AC-002, SCN-002) for CR-003; `DESIGN.md`
- Relevant Solution Revision IDs: SR-005, SR-007
- Design Review Report Reviewed As Context: `…/design-review-report.md` (ARCH-REV-002, Pass, AR-011…AR-014)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `…/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: IR-001 implementation handoff (Large/High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design`, branch `codex/secrets-and-integrations-design`, reviewed at `90c21a7cdb` (base `a2faf424d6`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. Three packages, a GraphQL clean cut, a persisted-shape change and a user-data rewrite with backup; the implementation matches.

## Review Scope

- Changed implementation and behavior reviewed: all 78 changed non-ticket files (`git diff a2faf424d6..HEAD`), with the source traced end to end per spine:
  - core: `types.ts`, `mcp-secret-resolver.ts`, managed servers, `server-instance-manager.ts`, `index.ts`;
  - server vault: catalog, `secret-id.ts`, source reader and alias registry, `test-vault-commands.ts`, `resolution/mcp-secret-resolver.ts`, `server-runtime.ts`; read `secret-management-service.ts` and `secret-vault-runtime.ts` for the error paths;
  - server MCP: draft, view, config fields, rule, `McpServerSecretFields`, `McpConfigService`, the three providers;
  - GraphQL: types, resolver, input mapper, converter;
  - web: `McpConfigRows.vue`, `McpSecretMoveBanner.vue`, `McpServerFormModal.vue`, card, list, bulk import view, `utils/mcp/*`, `types/mcpServer.ts`, store, queries, mutations, generated hunks, locales;
  - test support: `live-test-secret.ts`, the shared vector file;
  - tests: case lists and the changed e2e/runtime suites in full (live check, bulk import, HTTP auth, the two in-process runtime suites);
  - docs: spot-checked for agreement with the code.
- Checks: none rerun. The handoff's Checks Run (IMP-01…IMP-15) exercised the reviewed commits and no finding depends on a new check. One read-only check was run: vitest's `include` (`tests/**/*.test.ts`), for CR-004.
- Explicit exclusions: the rendered screenshots (IMP-14) were taken as evidence and not re-rendered; the non-MCP drift in `generated/graphql.ts` was not committed and not reviewed.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (MREQ-001…008, MDEC-001…005; Preserved Behavior Boundary; Scope Guardrail).
- Design-spec behavior map verified against the implementation: Yes, row by row below.
- Design review report and round confirmed: ARCH-REV-002 Pass; AR-011…AR-014 applied as the handoff states (verified: built-server live and dummy e2e; `isKnownSecretId` not widened; no discovery on configure, lock released before re-registration; value-free skip warning at `file-provider.ts` L162-168).
- Behavior-basis status: `Contradicted` for one row (UC-006 banner, CR-002); `Confirmed` for the others.
- Changed or newly discovered behavior: the import refusal of entries holding a reference changes autobyteus-190 SCN-002 for those entries (CR-003).
- Remaining material ambiguity: what "one-time" means for the banner (CR-002).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 (store) / DS-001 | Confirmed (CR-001 on the backup notice) | `mcp-server.ts` configure → `McpServerInputMapper.toDraft` → `McpConfigService.configureMcpServer` L180-207 (lock; `store` → `provider.update/create` → remove `obsolete`, or `created` on failure) → `McpServerSecretFields.store` L59-75 → `file-provider.ts` `update` L204-222 (backup when plain → reference) | The form-lock backup is logged only (CR-001) |
| BEH-001 (use) / DS-002, DS-007 | Confirmed | `stdio/http-managed-mcp-server.ts` `createClientSession` → `resolveMcpValues` / `resolveMcpValue` → `SecretManagementMcpSecretResolver` → `resolveForUse({kind:"mcpServer"})`; installed in `server-runtime.ts` L183-184, after vault init, before listen. No resolver → `VAULT_UNAVAILABLE`; no plain fallback | — |
| BEH-005 / DS-003 | Confirmed | `listMcpServerViews` → `statesOf` (`ACCESS_DENIED`→MISSING, other vault errors → VAULT_UNAVAILABLE; never throws for vault state) → `McpServerConverter.toGraphql` (sync; `value` only for PLAIN and not always-secret) | — |
| Preview / DS-006 | Confirmed | `previewMcpServerTools` → `toPreviewConfig` (new values in memory; kept refs stay refs) → `listRemoteTools`; nothing stored | — |
| UC-006 move / DS-004 | Contradicted (banner only) | `moveSecretsToVault` L278-322: lock → `storePlainAsSecret` → `replaceWithReferences` (still-plain check, backup, atomic rewrite; backup removed on failure) → compensation → after the lock `addConfig` + `registerServer`; per-row move in the form | Banner is permanent while any candidate exists; the approved banner is "one-time" (CR-002) |
| Import (MREQ-006, MDEC-004) | Confirmed for plain values; newly discovered change for references | `importMcpServerConfigs` → core parse → `importedDraft` → `configureMcpServer` → `storedSecrets` | Entries holding a reference now fail (CR-003) |
| Delete | Confirmed | `deleteMcpServer` L241-265: lock → unregister → provider delete → remove referenced entries | — |
| Live check / DS-005 | Confirmed | `mcp-github-remote-live.e2e.test.ts` on `startBuiltTestServer` without `testVaultSetting`; `readLiveTestSecret` in the test process; IMP-09 strict pass | — |
| Test-only ID and alias | Confirmed | `TEST_ONLY_SECRET_IDS`; `catalog.resolve` never returns it; alias only with `aliasScope: "testVault"` | — |
| Header rows (AR-007) | Confirmed | `McpConfigRows.vue` shared by env and header rows | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CRS-001 | BEH-001 store, MDEC-001, MREQ-005, design "Plain → reference via the form", R-4 | User | User editing a saved server | Protect a value that is stored plain by locking its row | MCP form: lock toggle on a stored plain row, Save | Normal | form `rowsToInput` (locked row with its returned value → `secret:true,value`) → `toDraft` (`newSecret`) → `configureMcpServer` → `provider.update` → `replacesPlainValue` → `writeBackup` (0600, full plain copy of `mcps.json`) → log line; `configureMcpServer` returns the view only; form toast "saved successfully" | Value in vault; backup written; user told the backup path and that it holds plain values (R-4) | MDEC-001 ("a lock toggle per row"); design Decisions and Persisted Data "Backup"; integration case "writes the backup when a form save locks a stored plain value" | Supported Normal Scenario | Use (CR-001) |
| CRS-002 | UC-006, MDEC-001, MDEC-002 | User | User with a false hit such as `TOKEN_LIMIT=4096` | Review the banner, untick the false hit, move the rest, and be done | Banner → Review → untick → Move | Normal | `McpSecretMoveBanner.vue` → `moveMcpSecretsToVault` → store `fetchMcpServers` → `fetchMcpSecretMoveCandidates` → the unticked value is still a candidate → banner shows again (`v-if="candidates.length > 0"`, no dismissal) | The approved banner is "one-time"; false hits "are corrected by hand" | requirements MDEC-001/002 approval note "the one-time 'Review and move to vault' banner"; MDEC-001 names `TOKEN_LIMIT=4096` | Supported Normal Scenario | Use (CR-002) |
| CRS-003 | Import, autobyteus-190 UC-002 / AC-002 / SCN-002 | User | User moving the app's `mcps.json` to another install | Paste the file into Bulk Import | Bulk Import view | Normal | `importMcpServerConfigs` → `importedDraftValue` throws for a reference → the entry is reported failed | 190: "All entries import"; this design's tradeoff: a copied `mcps.json` "shows as needs secret, which is intended" | `tickets/done/mcp-bulk-import-errors/requirements-doc.md` L43, L84, L95; design "Key Tradeoffs" | Supported Normal Scenario | Use (CR-003) |
| CRS-004 | Core Principle 7 | Contract | — | Dead tests in touched modules are removed | — | — | vitest `include: ["tests/**/*.test.ts"]` never runs `*.test.js` | — | `vitest.config.ts` L18 | Contract | Use (CR-004) |
| CRS-005 | MREQ-003 | System | Two configure saves for the same server in the same millisecond collide on the backup name (`wx`) | — | — | — | — | — | Requires artificial timing | Technically Possible but Unsupported/Contrived | Reject |
| CRS-006 | Import | User | Blank `Authorization` value in imported JSON fails as "always secret" | — | — | — | — | — | No coherent goal (a blank credential) | Technically Possible but Unsupported/Contrived | Reject |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Form-lock backup written but not reported | CRS-001 | Lock toggle + Save | Each such save leaves a new full plain copy of `mcps.json` the user never learns about | `file-provider.ts` L214-217 (log only); `mcp-config-service.ts` L180-207 returns `McpServerView`; `McpServerFormModal.vue` L441-442 (generic toast) | Promote | This ticket | CR-001 (Design Impact) |
| C-02 | Banner is permanent, not one-time | CRS-002 | Banner review with an unticked false hit | Banner reappears after every load while that value stays plain | `McpSecretMoveBanner.vue` L2; store `fetchMcpServers` → `fetchMcpSecretMoveCandidates`; `moveCandidates` derives from the rule only | Promote | This ticket | CR-002 (Design Impact; "one-time" needs defining) |
| C-03 | Import refuses entries holding a reference | CRS-003 | Paste own `mcps.json` | Entry with a secret is not imported at all | `mcp-config-service.ts` L47-54; handoff Assumption 3 | Promote | Requirement Gap | CR-003 (decision for the Solution Designer) |
| C-04 | JS twins of touched MCP tests, never run, calling a removed method | CRS-004 | — | Misleading dead tests in the touched module | `tests/unit/mcp-server-management/services/mcp-config-service.test.js` L62 calls `importConfigsFromJson` (renamed in this change); `tests/integration/mcp-server-management/mcp-config-service.integration.test.js`; `tests/unit/mcp-server-management/cached-provider.test.js`; vitest include L18 | Promote | This ticket | CR-004 (Local Fix) |
| C-05 | 62 other tracked `*.test.js` twins across `autobyteus-server-ts/tests` | CRS-004 | — | Dead outside the touched modules | `git ls-files 'tests/**/*.test.js'` = 65 | Promote | Follow-up | FU-006 |
| C-06 | Two in-process suites open the run DB vault and call `installRuntimeMcpSecretResolver()` (Decision 1) | AR-011 | — | Production startup function, no test-only resolver; in-process harness never runs `server-runtime.ts` | runtime suite diffs; `server-runtime.ts` L183-184 | Reject | — | Sound: one production install function, called by startup and by those two harnesses |
| C-07 | `replaceWithReferences` returns `{backupPath, configs}` (Decision 4) | Design interface | — | Cache and re-registration need the saved configs | `cached-provider.ts` L76-84; service L294-310 | Reject | — | Justified; fewer re-reads |
| C-08 | Generated file carries only MCP hunks plus the 190 mis-merge fix (Decision 5) | Codegen | — | — | IMP-13 | Reject | — | The fix is in the changed import types |
| C-09 | Size split of form and store (Decision 6) | `>500` rule | — | Form 500→438, store 408→479; new modules own one concern each | line counts below | Reject | — | Pass |
| C-10 | `requestHeaders(resolved)` no longer reads `this` | Naming | — | — | `types.ts` L205-211 (`requestHeaders` L209) | Reject | — | Works and reads clearly in its one caller; preference only |
| C-11 | CRS-005, CRS-006 | — | — | — | — | Reject | — | Contrived |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Value type, one draft (`createDomainConfigFromInput` removed), batch write, write lock, dead workspace code removed | — |
| Implementation matches approved behavior-defining artifacts | Fail | CR-002 (one-time banner), CR-003 (import of references not approved) | See findings |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-007 match the code order; resolution only in `createClientSession` | — |
| Ownership boundary preservation and clarity | Pass | Only `McpServerSecretFields` writes and reads status for `mcpServer`; only the provider writes `mcps.json` and its backup | — |
| Off-spine concern clarity | Pass | Rule, config fields, view and draft each own one concern | — |
| Existing capability reuse | Pass | Vault service, `updateJsonFile` lock, resolver pattern of `runtime-provider-api-key-resolvers.ts`, `startBuiltTestServer` | — |
| Reusable owned structures | Pass | `mcp-config-fields.ts` shared by fields owner and provider; shared vector file for server and web rule | — |
| Shared-structure tightness | Pass | Draft stdio/HTTP variants; `DraftValue` three kinds; view separate | — |
| Repeated coordination ownership | Pass | One lock owner; one compensation shape per sequence | — |
| Empty indirection | Pass | `McpServerPersistenceProvider.replaceWithReferences` forwards as its siblings already do (existing pattern) | — |
| Separation of concerns and file responsibility | Pass | `mcp-config-service.ts` 319 lines, the designed sequence owner | — |
| Ownership-driven dependency direction | Pass | Core imports no server code (`types.ts` type-only `SecretId`, 3ed397318d) | — |
| Authoritative Boundary Rule | Pass | GraphQL → service only; service → cached provider only; no caller reaches `FileMcpServerConfigProvider` or the vault store directly | — |
| File placement | Pass | `secret-management/resolution/mcp-secret-resolver.ts` next to the provider-key resolvers | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | Explicit `field` shape; `McpTokenInput` both/neither refused; selection parsed by `toFields` | CR-001 needs the configure result to carry the backup signal (design decision) |
| Naming quality; one vocabulary | Pass | Glossary words used as defined (secret reference, field, draft, keep marker, state) | — |
| No unjustified duplication | Pass | The rule's matching exists on server and web by design, locked by the shared vectors | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in touched files and modules | Fail | CR-004 | Remove the three JS twins |
| Test scenarios and assertions clear and requirement-aligned | Pass | No-value assertions on results, logs, server output and files; compensation and backup cases | — |
| Test fixtures/helpers reusable, structure coherent | Pass | `readLiveTestSecret`; built-server bootstrap reused | — |
| No stale, duplicated, compatibility-only tests in changed scope | Fail | CR-004 | — |
| API/E2E readiness | Pass | Behavior is executable and well covered; the findings change small, bounded surfaces | — |

## Source File Size And Structure Audit

Effective non-empty lines, base `a2faf424d6` → HEAD. Only files near a threshold are listed; every other changed source file is ≤ 260 lines with a delta ≤ 210.

| Source File | Before | After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/tools/McpServerFormModal.vue` | 500 | 438 | Pass (split into `utils/mcp/mcpServerFormState.ts`) | 362 (mostly moved out) | Pass | Pass | Pass | — |
| `autobyteus-web/stores/toolManagementStore.ts` | 408 | 479 | Pass (type moved to `types/mcpServer.ts`) | 111 | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-config-service.ts` | 140 | 319 | Pass | 265 — the designed owner of configure/import/delete/preview/list/move | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/api/graphql/types/mcp-server-config.ts` | 138 | 257 | Pass | 174 | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts` | 138 | 231 | Pass | 136 | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/mcp-server-management/services/mcp-server-secret-fields.ts` | new | 193 | Pass | 210 | Pass | Pass | Pass | — |
| `autobyteus-web/utils/mcp/mcpConfigRows.ts` | new | 182 | Pass | 209 | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | GraphQL `GraphQLJSON` maps and `token: String` removed as a clean cut |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files and modules | Fail | CR-004 |
| Approved persisted-data transition followed | Pass | `Directly Usable — No Migration`; plain strings stay a current shape; no startup migration |
| No version-specific dual reads/writes | Pass | One value parser in core `types.ts` |
| Transition mechanics match the reviewed design | Pass | Move: saves first, one locked provider write (check, backup, rewrite), compensation, cache after commit |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/mcp-server-management/services/mcp-config-service.test.js` | UnusedTest | Never collected (`vitest.config.ts` L18 `include: ["tests/**/*.test.ts"]`); calls `importConfigsFromJson`, which this change renamed to `importMcpServerConfigs` | Stale twin of a test file this change edits | Delete |
| `autobyteus-server-ts/tests/integration/mcp-server-management/mcp-config-service.integration.test.js` | UnusedTest | Never collected; twin of the edited `.ts` integration test | Same | Delete |
| `autobyteus-server-ts/tests/unit/mcp-server-management/cached-provider.test.js` | UnusedTest | Never collected; twin of `cached-provider.test.ts`, in the touched module, for a provider this change extends | Same (the handoff noted it and left it) | Delete |

## Docs-Impact Verdict

- Docs impact: `Yes`, already done (`mcp_server_management.md`, `secret_management.md`, `tools_and_mcp.md`, `GLOSSARY.md`, `TESTING.md`, `docs/design-cases.md`).
- Why: new stored shape, GraphQL contract, UI and test-vault alias.
- Files or areas likely affected by the fixes: `mcp_server_management.md` and `tools_and_mcp.md` (backup notice on a form lock, banner behavior, import of references).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 | Confirmed | Resolver installed at `server-runtime.ts` L184, before listen |
| P-002 | Confirmed | Compensation implemented in configure and move |
| P-003 | Confirmed | Non-string scalar now a parse error for that server only, with the AR-014 warning |

No new or reclassified premises; the scenario gate above holds the review's scenarios.

## Review Scorecard (Mandatory)

- Overall score: `9.2/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | Every spine runs in the designed order with one driver; resolution only at connect | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Single writers for the file, backup and MCP vault entries; no boundary bypass | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | Explicit field identity, tight inputs, clear move result | The configure result has no way to say a backup was written (CR-001) | Carry the backup signal on configure, as the design decides |
| `4` | `Separation of Concerns and File Placement` | 9.4 | Small owned files; the size splits leave each file one concern | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | Draft, view and field location types are tight; shared vectors keep the two rule copies equal | — | — |
| `6` | `Naming Quality and Local Readability` | 9.3 | Glossary vocabulary used consistently | — | — |
| `7` | `API/E2E Readiness` | 9.2 | Strong executable evidence, including a strict live check | Banner and import behavior may change after the decisions | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.5 | Store, resolve, states, move and compensation are correct | CR-001 (unreported plain backups), CR-002 (banner not one-time), CR-003 (unapproved import change) | Resolve the three decisions and implement them |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | Clean GraphQL cut; no fallback to plain | — | — |
| `10` | `Cleanup Completeness` | 8.8 | Workspace code, `createDomainConfigFromInput`, `asRecordStringString`, old locale keys removed | Three dead JS test twins left in the touched module (CR-004) | Delete them |

## Findings

### CR-001 — A form save that locks a stored plain value leaves a plain backup the user is never told about

- Type: Design Impact. Severity: Medium (security residual). Scope: this ticket (introduced by this change).
- Candidate: C-01 / CRS-001.
- Evidence:
  - `file-provider.ts` L214-217: `update` writes `mcps.json.backup-before-vault-move-<timestamp>` (0600), a full copy of the file with every plain value, and only logs its path.
  - `mcp-config-service.ts` L180-207 returns a `McpServerView`; `ConfigureMcpServerResult` has no backup field; the form's toast is "Server '…' saved successfully." (`McpServerFormModal.vue` L441-442).
  - The design ties the backup's acceptability to telling the user: Persisted Data "Backup … The move result and the dialog tell the user its path and that it contains the plain values, so the user can delete it"; R-4 "the user is told its path and contents". Its Decisions section gives the form lock "the same backup as the move", while its interface table defines configure as returning the view only. The design is inconsistent here, and the implementation followed the interface (handoff Assumption 6).
- Consequence: the user locks a row to protect a secret, and a plain copy of it (and of every other plain value) stays on disk with no notice. Each further lock-save adds another copy.
- Required action (Solution Designer): decide how the form path tells the user, then revise the interface. Options: return the backup path on `configureMcpServer` and show it like `move_done`; or send the form's lock of a stored plain value through the move.

### CR-002 — The "Review and move to vault" banner is permanent, not one-time

- Type: Design Impact (the approved wording is not carried into the design; its meaning may need the user). Severity: Low–Medium (UX against approved behavior). Scope: this ticket.
- Candidate: C-02 / CRS-002.
- Evidence:
  - Requirements MDEC-001/MDEC-002 approval: "the one-time 'Review and move to vault' banner". MDEC-001: false hits such as `TOKEN_LIMIT=4096` "are corrected by hand".
  - `McpSecretMoveBanner.vue` L2: shown whenever `candidates.length > 0`; no dismissal. Candidates come from the rule alone (`McpServerSecretFields.moveCandidates` L102-109), and the store refetches them on every list load.
  - So a value the user unticks in the dialog stays a candidate, and the banner returns for good. The design spec never says "one-time", and it defines no state for "reviewed" or "left plain".
- Required action (Solution Designer): define "one-time" (for example: shown until reviewed once; or values the user leaves plain stop being candidates). Settle where that state lives (persisted data needs a transition decision), and get the user's confirmation if the meaning is not clear from the approval.

### CR-003 — Bulk import refuses entries that hold a secret reference

- Type: Requirement Gap (behavior not approved). Severity: Low. Scope: Requirement Gap.
- Candidate: C-03 / CRS-003.
- Evidence:
  - `mcp-config-service.ts` L47-54 throws "import takes values, not secret references" (handoff Assumption 3; e2e and docs assert it).
  - autobyteus-190 approved UC-002 / AC-002 / SCN-002: "Move the app's `mcps.json` to another install → paste into Bulk Import → all entries import" (`tickets/done/mcp-bulk-import-errors/requirements-doc.md` L43, L84, L95).
  - This design's tradeoff for a copied `mcps.json` is "needs secret, which is intended", not "not imported". Neither the requirements nor the design decide what import does with a reference.
- Assessment: the implementation's reason is sound (a shared reference would let one server's delete or replace remove another's entry). But the decision changes a previously approved supported scenario, so its owner should make it.
- Required action (Solution Designer): confirm the refusal and record it, or choose another outcome. For example: an entry for the same server whose field already holds the same reference keeps it; any other reference is imported as a missing value ("needs secret").

### CR-004 — Dead JS twins of the touched MCP tests remain

- Type: Local Fix (implementation). Severity: Low. Scope: this ticket (Core Principle 7, touched module).
- Candidate: C-04.
- Evidence: see "Dead / Obsolete / Legacy Items". `vitest.config.ts` L18 collects only `*.test.ts`, so these files never run. `mcp-config-service.test.js` still calls the method this change renamed.
- Required action: delete the three files.

## Follow-ups

- Follow-ups this review added: FU-006 (the other 62 tracked `*.test.js` twins under `autobyteus-server-ts/tests`).

## Classification

- `Design Impact` (CR-001, CR-002) and `Requirement Gap` (CR-003), owned by the Solution Designer.
- `Local Fix` (CR-004), owned by implementation, bounded. It can be done in the same rework round the Solution Designer starts.

## Recommended Recipient

- Solution Designer, `/software_engineering_team/solution_designer` (rule: "review identifies a Design Impact, Requirement Gap, or Unclear issue").

Routing note: after the revised design and the fixes, implementation returns through code review and then API/E2E.

## Residual Risks

- R-3 (stdio env readable by a same-user process) and R-5 (live token expires 2026-11-25) are unchanged and documented.
- The two in-process runtime suites depend on the shared test database's vault root key (handoff Known Risks). Accepted.
- FU-005 (dead `i-heroicons-*` classes) is outside this ticket. The new rows use inline SVG.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (CRS-001…CRS-004 supported; CRS-005/006 rejected)
- Material-Premise Gate: `Pass`
- Score Summary: 9.2 average; below 9.2 in Behavioral Fidelity (8.5) and Cleanup Completeness (8.8)
- Failure Origin: N/A
- Recommended Recipient: Solution Designer
- Notes: the six decisions the implementation engineer flagged were each reviewed. Decisions 1, 4, 5 and 6 are sound (C-06…C-09). Decision 2 is CR-003. Decision 3 is CR-001.
