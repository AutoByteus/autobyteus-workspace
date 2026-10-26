# Design Review Report — MCP server secrets in the vault (autobyteus-244)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design/tickets/in-progress/secrets-and-integrations-design/requirements-doc.md` (approved at SR-005; status lines refreshed at SR-007, requirements unchanged)
- Upstream Investigation Notes: `…/investigation-notes.md` ("Architecture Investigation" and "Architecture Investigation, round 2")
- Upstream Solution Revision Record: `…/solution-revision-record.md` (SR-001…SR-007)
- Reviewed Design Spec: `…/design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001…FU-004); `solution-validation.md`, `options-report.md`, `probes/` (long-term context only)
- Relevant Solution Revision IDs: SR-005, SR-006, SR-007
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-007, the revision addressing ARCH-REV-001 (AR-001…AR-010)
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Fail)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis:
  - Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design`, branch `codex/secrets-and-integrations-design` at `a2faf424`. The drift to `origin/personal` `d74f75a5` touches no file the design changes (round 1).
  - Round-1 evidence still holds.
  - Opened again this round:
    - `test-support/test-vault/live-server-vault.ts` L19-87 and `test-vault-selection.ts` L7-23;
    - `test-support/live-e2e/test-runtime-bootstrap.mjs` L229-294 (`startBuiltTestServer`);
    - `autobyteus-server-ts/tests/e2e/helpers/studio-runtime-test-server.ts` L1-45;
    - `tests/e2e/tool-management/mcp-http-auth-remote-server.e2e.test.ts` L19-73;
    - `file-provider.ts` L99-110.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged since round 1; it is still accurate. Security; persisted `mcps.json` shape; GraphQL contract clean cut; user-data rewrite with backup; three packages.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: MREQ-001…MREQ-008 and MDEC-001…MDEC-005, unchanged since SR-005.
- Relevant existing behavior and evidence confirmed: round 1, plus the "Architecture Investigation, round 2" table. I spot-checked its rows against the files opened this round.
- Scope guardrail confirmed: unchanged. No new scope. FU-001…FU-004 stay out.
- Approved change, preserved behavior, and outside scope understood: Yes.
- AR-006 and AR-007 were decided within the approved direction, and I checked that they add no new product behavior:
  - AR-006 applies MDEC-001's "always secret" literally: no value of `token`/`Authorization` is returned, even while stored plain. That satisfies MREQ-002 and keeps MDEC-002's "Move to vault" row.
  - AR-007 implements MDEC-001's "lock toggle per row … other headers", which the form could not express before.
  - "Locking a stored plain row writes the backup" applies MREQ-005 to the same plain → vault change made through the form.

  None of them needs a new user approval.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes` (there are no blocking findings).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on:

| Design statement | Opened at | Result |
| --- | --- | --- |
| Cache filled once, changed only by its own writes (`cached-provider.ts` L21-80) | file | True (round 1) |
| Status/remove/resolve throw when not READY (`secret-management-service.ts` L171-181) | file | True |
| `server-runtime.ts`: vault `initialize` L175, `app.listen` L214, background tasks L240 | file | True |
| Form HTTP section has URL and Token only (`McpServerFormModal.vue` L104-114) | file | True |
| Test vault is read-only; deterministic suites keep their own vault; live opt-ins read the captured setting (`test-vault-selection.ts` L14-23; `live-server-vault.ts` L50-64) | files | True |
| `requireLiveCapability` skips with "missing capability" and fails in strict mode (`live-server-vault.ts` L80-87) | file | True |
| `readSecretEntry` returns `SecretValue` or `SECRET_NOT_FOUND`; `openVerifiedTestVault` opens read-only | `read-only-test-vault.ts` L29-47 (caller); notes round 2 | Consistent |
| The existing MCP e2e suites run against a spawned built server (`startBuiltTestServer`, which runs `dist/app.js` → `server-runtime.ts`, and uses the test vault only when `testVaultSetting` is passed) | `mcp-http-auth-remote-server.e2e.test.ts` L19-25, L59; `test-runtime-bootstrap.mjs` L274-294 | True; relevant to AR-011 |

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 (store) | User | Pass | Pass | Pass: draft → secret fields (store) → provider; saves before the write, removals after the commit | Confirmed | — |
| BEH-001 (use) | System | Pass | Pass | Pass: the resolver is wired before listen | Confirmed | — |
| Preview | User | Pass | Pass | Pass (DS-006): memory-only; kept values stay references | Confirmed | — |
| BEH-005 (no exposure) | User | Pass | Pass | Pass: one `statesOf` owner; `VAULT_UNAVAILABLE` never throws; always-secret never returned | Confirmed | — |
| UC-006 (move) | User | Pass | Pass | Pass: `McpConfigService` drives it; only the provider writes the file, backup and cache | Confirmed | — |
| Import | User | Pass | Pass | Pass | Confirmed | — |
| Delete | User | Pass | Pass | Pass | Confirmed | — |
| Live check | Contract | Pass | Pass | Pass, with the harness named (AR-011, non-blocking) | Confirmed | AR-011 |
| Header rows | User | Pass | Pass | Pass (`McpConfigRows.vue` shared with env) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope | Linked | Complete | Consistent | Status / Approval Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | None |
| `solution-validation.md`, `options-report.md`, `probes/` | Pass | Pass | Pass | Pass | Pass | None |
| Requirements / notes / SR index status lines | Pass | Pass | Pass | Pass | Pass | None (AR-010 resolved) |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present | Pass | "Task Design Health Assessment" | — |
| Root cause explicit and evidence-backed | Pass | `Missing Invariant` | — |
| Refactor decision explicit | Pass | Bounded list: value type, draft, provider batch write, service lock, dead code | — |
| Supported by the concrete sections | Pass | Interfaces, spines, file mapping | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | One Owner, Call Order | Off-Spine Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 store / import / delete | Primary | Pass | Pass | Pass: `McpServerInputMapper` (shape) → `McpConfigService` (sequence) | Pass | Pass (AR-013 clarifies step 6) | Pass | Pass |
| DS-002 use | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 show | Primary | Pass | Pass | Pass: `listMcpServerViews` drives; `statesOf` owns states; the converter is pure | Pass | Pass | Pass | Pass |
| DS-004 move | Primary | Pass | Pass | Pass | Pass | Pass: the vault saves are called by the service, not passed into the provider's updater | Pass | Pass |
| DS-005 live check | Test | Pass | Pass | N/A | Pass | Pass (AR-011) | Pass | Pass |
| DS-006 preview | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 resolve | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `mcps.json` (service → cached → file provider) | Pass | Pass | Pass | Pass | Dependency rule: only the provider writes the file or its backup |
| Vault for `mcpServer` | Pass | Pass | Pass | Pass | Only `McpServerSecretFields` and the resolver call it |
| Core `McpSecretResolver` | Pass | Pass | Pass | Pass | — |
| `McpServerSecretFields` | Pass | Pass | Pass | Pass | store / preview / statesOf / moveCandidates / storePlainAsSecret |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Core ↔ server | Pass | Pass | Pass | Pass | — |
| Service → provider (file) | Pass | Pass | Pass | Pass | — |
| Web → rule | Pass | Pass | Pass | Pass | A shared vector file keeps server and web matching in step |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity Explicit | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `McpConfigValue` / `McpSecretReference` | Pass | Pass | Pass | Low | Pass |
| `McpSecretResolver.resolve(reference, {serverId, field})` | Pass | Pass | Pass (`McpSecretField`) | Low | Pass |
| `useSecretResolver` | Pass | Pass | Pass | Low | Pass (AR-011 for test harness) |
| `SecretConsumerIdentity {kind:"mcpServer", vaultSecretId}` | Pass | Pass | Pass | Low | Pass (AR-012 on `isKnownSecretId`) |
| Test-only ID `test.github.token` | Pass | Pass | Pass | Low | Pass |
| `McpServerDraft` / `DraftValue` | Pass | Pass | Pass | Low | Pass |
| `McpConfigService` operations / `McpServerView` | Pass | Pass | Pass | Low | Pass |
| Provider `replaceWithReferences` | Pass | Pass | Pass | Low | Pass |
| GraphQL output entries + `tokenState` | Pass | Pass | Pass | Low | Pass |
| GraphQL input entries + `McpTokenInput` | Pass | Pass | Pass (both/neither → validation error) | Low | Pass |
| Move candidates / selection / result | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Encrypted storage, resolver | Pass | Pass | N/A | Pass | — |
| Atomic write and cache | Pass | Pass | Pass | Pass | One provider method |
| Live-test key reading | Pass | Pass | Pass | Pass | `readLiveTestSecret` follows `requireLiveCapability`'s skip semantics |
| Service write lock | Pass | Pass | Pass | Pass | A small in-process mutex; see Residual Risks (DESIGN.md rule 1) |

## Subsystem / Capability-Area Allocation Verdict

| Area | Ownership Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/mcp` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/secret-management` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts/src/mcp-server-management` | Pass | Pass | Pass | Pass | `mcp-secret-move.ts` dropped; the move lives in the service |
| `autobyteus-web/components/tools` | Pass | Pass | Pass | Pass | — |
| `test-support/test-vault` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated | File Choice | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Suggestion rule | Pass | Pass | Pass | Pass | With shared vectors |
| Draft | Pass | Pass | Pass | Pass | One type for three entry forms |
| `resolveMcpValues` | Pass | Pass | Pass | Pass | In `mcp-secret-resolver.ts` |
| Env/header rows (`McpConfigRows.vue`) | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `mcps.json` value | Pass | Pass | Pass | N/A | Pass | — |
| `McpSecretState` | Pass | Pass | Pass | N/A | Pass | Distinct from vault health |
| GraphQL `McpConfigEntry` / `tokenState` | Pass | Pass | Pass | N/A | Pass | `tokenSecret` removed |
| JSON keep marker vs secret reference | Pass | Pass | Pass | N/A | Pass | Both in Terminology |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` (cache, configure result, form, card, import view, banner, store/codegen, error text, docs).

Each domain word keeps one meaning, and each concept one name (Principle 15): `Pass` (`field`, draft, state, keep marker, always-secret field).

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Core MCP files | Pass | Pass | Pass | Pass | — |
| `server-runtime.ts` | Pass | Pass | N/A | Pass | AR-011 for in-process harnesses |
| `mcp-server-draft.ts`, `mcp-server-secret-fields.ts`, `mcp-secret-suggestion-rule.ts`, `mcp-config-service.ts` | Pass | Pass | Pass | Pass | — |
| `persistence-provider.ts`, `cached-provider.ts`, `file-provider.ts` | Pass | Pass | Pass | Pass | AR-014 (warning on a dropped entry) |
| GraphQL types, `mcp-server-input-mapper.ts`, converter | Pass | Pass | Pass | Pass | — |
| `test-support/test-vault/live-test-secret.ts`, live e2e | Pass | Pass | N/A | Pass | AR-011 |
| Web files | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Clear | Matches Owner | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `mcp-server-management/domain/mcp-server-draft.ts` | Pass | Pass | Low | Pass | — |
| `api/graphql/converters/mcp-server-input-mapper.ts` | Pass | Pass | Low | Pass | Shape only, no vault |
| `tests/e2e/mcp/mcp-github-remote-live.e2e.test.ts` | Pass | Pass | Low | Pass | The existing MCP e2e suites are in `tests/e2e/tool-management/`; either folder works |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Dead workspace-path code | Pass | N/A | Pass | Pass | — |
| GraphQL JSON maps / `token: String` | Pass | Pass | Pass | Pass | — |
| `createDomainConfigFromInput`, `toStringRecord` | Pass | Pass | Pass | Pass | — |
| `asRecordStringString` | Pass | Pass | Pass | Pass | See P-003 |
| Converter value pass-through | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compat Exists | Clean Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| GraphQL MCP contract | No | Pass | Pass | — |
| Plain strings in `mcps.json` | No | Pass | Pass | Current shape |
| Vault-unavailable fallback | No | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `mcps.json` values | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | — |
| Move to vault (user action) and form lock of a stored plain row | User-triggered rewrite with backup | Pass | Pass | Pass | Pass | Saves first. One locked provider write: backup, then atomic rewrite, then cache. Compensation if the write fails; values read again under the service lock |
| `mcp.<uuid>` entries | New records | Pass | Pass | N/A | Pass | A new ID per new value; obsolete IDs removed after the commit |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `mcps.json` after save | Yes | Pass | N/A | Pass | — |
| Configure input (keep/new/plain/token keep) | Yes | Pass | N/A | Pass | — |
| Output (PLAIN always-secret, MISSING, plain setting) | Yes | Pass | Pass | Pass | — |
| Move / status / resolution shapes | Yes | Pass | Pass | Pass | Good/avoided table |

## Material Premise Validation

### `P-001` — Resolver unset before the MCP background task (round 1)

- Reachability: no longer applicable. The resolver is wired in `server-runtime.ts` after vault initialization (L175) and before listen (L214).

### `P-002` — `mcps.json` write fails after vault changes (round 1)

- Reachability: `Not Reachable` as a supported scenario. The design still states the order and the compensation, which cost nothing.

### `P-003` — A hand-written non-string scalar (for example `"PORT": 8080`) in `mcps.json` was coerced to a string by `asRecordStringString` and becomes a parse error for that server

- Related contract: Data Migration Guideline (data written by older versions must still be read)
- Initiating basis kind: `User` (hand edit) / `Contract` (older writers)
- Evidence: every product writer emits strings (`file-provider.ts` `toStandardEntry` L37-66). Configure, preview and import go through the core constructors, which already reject non-string env/header values (`types.ts` L97-109, L158-170). `mcps.json` is not a product-exposed editing surface.
- Reachability: `Not Reachable` through the product.
- Review consequence: none. No coercion branch is needed (AR-014 only makes a dropped entry visible).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed and the design is ready for implementation. No in-scope machinery depends on an unsupported premise. The four new findings below are non-blocking clarifications for the implementation engineer to apply within the design.

## Findings

### AR-011 — Name the live-check harness: a spawned built server, so the production wiring runs

- Type: Design Impact (clarification). Severity: Low. Non-blocking.
- Protects: MREQ-008, MDEC-005.
- Scope: Within Approved Scope. Changes approved behavior: No.
- Evidence:
  - DS-005 step 2 says "the suite initializes the **in-process** vault runtime with its own application vault". The resolver is wired only in `server-runtime.ts` (design "Interface Boundary Mapping").
  - The in-process harness `startStudioE2eRuntimeServer` calls `buildStudioServer` directly (`studio-runtime-test-server.ts` L19-35), so it would run without the resolver. References would then fail with `VAULT_UNAVAILABLE`.
  - The existing MCP e2e suites use `startBuiltTestServer` (`mcp-http-auth-remote-server.e2e.test.ts` L19-25, L59). It spawns `dist/app.js` (`test-runtime-bootstrap.mjs` L15, L277-294) and uses the test vault only when `testVaultSetting` is passed.
- Required update (implementation):
  - Run DS-005 with `startBuiltTestServer` **without** `testVaultSetting`. The server then uses its own application vault in its runtime root, and its production startup includes the wiring.
  - Call `readLiveTestSecret` in the test process and send the value only through `configureMcpServer`.
  - Do not add test-only `useSecretResolver` calls. The same applies to the dummy-secret e2e with the 189 servers.
- Recipient: Implementation Engineer.

### AR-012 — Do not widen `isKnownSecretId` to `mcp.<uuid>` without a caller that needs it

- Type: Design Impact (clarification). Severity: Low. Non-blocking.
- Evidence: the Interface table says "`isKnownSecretId` accepts that pattern too". `isKnownSecretId` gates only `getStatusForSecretId` (test-vault status) and `saveBatch`/local import authorization (`secret-management-service.ts` L57-65, L142-152; `local-environment-secret-import-service.ts` L120). The MCP paths use the consumer path (`resolve`), which the design already extends. Accepting `mcp.*` there would let the batch importer write MCP IDs, which no design step needs.
- Required update (implementation): extend `catalog.resolve` for `mcpServer` only. Leave `isKnownSecretId` for the fixed IDs plus `test.github.token`, unless implementation finds a caller that needs it. In that case, record it in the implementation handoff.
- Recipient: Implementation Engineer.

### AR-013 — Configure keeps today's discovery behavior; release the lock before re-discovery

- Type: Design Impact (clarification). Severity: Low. Non-blocking.
- Evidence:
  - DS-001 step 6 reads "addConfig, then registration".
  - Today `configureMcpServer` only adds the config and unregisters a disabled server (`mcp-config-service.ts` L80-85). Discovery is the separate `discoverAndRegisterMcpServerTools` call that the form makes when "sync on save" is ticked (`McpServerFormModal.vue` L545-551).
  - Registering on every save would change behavior and duplicate discovery.
  - The design does not say where the service write lock ends in the move (DS-004 step 7).
- Required update (implementation):
  - Keep configure's current registry behavior (`addConfig`; unregister when disabled).
  - In the move, release the service write lock after the provider write and its compensation, before step 7's per-server `registerServer`, so a slow server does not hold up saves.
- Recipient: Implementation Engineer.

### AR-014 — Log a value-free warning when the provider drops an unreadable entry

- Type: Design Impact (clarification). Severity: Low. Non-blocking.
- Protects: DESIGN.md rule 7 (contain bad data, with a logged warning naming the item and reason), which the design cites.
- Evidence: `FileMcpServerConfigProvider.getAll` swallows parse errors silently (`file-provider.ts` L103-107). The new value parser adds a failure mode in a file this change touches (a malformed value object). Such a server would vanish from the page without a trace.
- Required update (implementation): in that catch, log a warning with the server ID and the error message. The core errors name fields, never values.
- Recipient: Implementation Engineer.

## Classification

N/A (Pass). The non-blocking findings are implementation clarifications within the design.

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer gets an informational notice.

## Residual Risks

- The service write lock is new coordination. It is acceptable because it is one in-process mutex around rare, user-driven MCP config writes, and it closes the move's read-check-write sequence. It should stay that small (DESIGN.md rule 1).
- The rule's matching is coded on both server and web; the shared vector file mitigates this.
- The plain backup (0600; the user is told its path and contents) — R-4.
- R-3: the stdio env limit (approved MDEC-003).
- R-5: the live-check token expires 2026-11-25. After that the live check skips with its reason.
- Implementation should prove these premises first, as the design lists them: `SecretManagementService` on an absent ID; codegen of the new types; the `updateJsonFile` updater running inside the lock.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: AR-001…AR-010 are resolved (see ARCH-REV-002). AR-011…AR-014 are non-blocking implementation clarifications.
