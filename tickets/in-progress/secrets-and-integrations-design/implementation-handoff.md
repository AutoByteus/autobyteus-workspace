# Implementation Handoff — MCP server secrets in the vault (autobyteus-244)

Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design`, branch `codex/secrets-and-integrations-design`, base `origin/personal` @ `a2faf424d6`. origin/personal has since moved to `d74f75a5`; none of the files this ticket touches changed there.

Implementation commits: `5ec97f1aba`, `3ed397318d`, `bdac653cb6`, `7250e64c05`, `ff58750ff7`, `5b27a997f4`, `c100661947`, `bd1ed1a232`. The ticket artifacts and evidence are in the commit that adds this file.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large/High, so independent architecture review was selected and passed as ARCH-REV-002 (design SR-007), which sent the package to implementation.
- Requirements doc: `tickets/in-progress/secrets-and-integrations-design/requirements-doc.md` (approved, SR-005).
- Investigation notes: `…/investigation-notes.md`.
- Solution revision record: `…/solution-revision-record.md` (SR-007).
- Design spec: `…/design-spec.md` (SR-007).
- Supplemental task artifacts: `…/options-report.md`, `…/solution-validation.md`, `…/follow-ups.md`, `…/probes/`.
- Design review report: `…/design-review-report.md` (ARCH-REV-002, pass).
- Architecture review revision record: `…/architecture-review-revision-record.md`.
- Triggering rework report: N/A (initial round).

## Current Implementation Summary

- Implementation cycle: `Initial`.
- Implementation revision record: `…/implementation-revision-record.md`; current revision `IR-001`.
- Related revision IDs: solution SR-005 and SR-007; architecture review ARCH-REV-002. Code review, API/E2E and delivery: N/A.
- Triggering finding IDs: N/A. The reviewer's non-blocking clarifications AR-011…AR-014 are applied:
  - **AR-011.** The gated GitHub live check runs on `startBuiltTestServer` without `testVaultSetting`. The spawned server uses its own application vault and its normal startup (`installRuntimeMcpSecretResolver` in `server-runtime.ts`). `readLiveTestSecret` runs in the test process, and the token goes to the server only through `configureMcpServer`. The dummy-secret e2e (`mcp-secrets-in-vault.e2e.test.ts`) runs the same way, with the autobyteus-189 Node test server. No test-only resolver wiring was added.
    - One related decision, flagged for review. Two existing in-process suites were already gated and save the token or an `Authorization` header: `mcp-runtime-tool-matrix` and `mcp-http-auth-agent-tool-call`. Their server is in-process and never ran server startup, so they could not keep working unchanged. They now open the run database's application vault themselves, the established in-process pattern (`getSecretVaultRuntime().initialize({kind:"application", …})`, as the llm-management e2e suites do). They then call the same production `installRuntimeMcpSecretResolver()` that `server-runtime.ts` calls. That startup step had been two inline lines in `server-runtime.ts`; it is now one exported function. Converting those suites to built servers would rewrite them; I judged that out of proportion.
  - **AR-012.** `catalog.resolve` accepts `{kind:"mcpServer"}` only for `^mcp\.[0-9a-f-]{36}$`. `isKnownSecretId` is **not** widened to `mcp.*`; no caller needed it (batch import and test-vault status handle fixed IDs only). A test asserts both.
  - **AR-013.** `configureMcpServer` keeps today's registry behavior: `addConfig`, and unregister when the server is disabled. There is no discovery on save. In the move, the service write lock is released after the provider write and its compensation, and each changed server is then added again and re-registered.
  - **AR-014.** `FileMcpServerConfigProvider.getAll` logs `Skipping MCP server '<id>' in mcps.json: <error>` and never a value. A test asserts it.
  - **Premises proven first:** see IMP-06. `SecretManagementService` on an absent ID gives `NOT_FOUND`, an idempotent remove and the status `MISSING`. The `updateJsonFile` updater runs inside the lock. Codegen handles the new types (IMP-13).

## Routing Classification (Mandatory)

- Task size: `Large`.
- Architecture risk: `High`.
- Design classification section: `design-spec.md` § "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`.
- Evidence and rationale: security-sensitive persisted data (`mcps.json` and vault entries), a GraphQL contract clean cut, changes across all three packages, and a service write lock plus a provider batch write. The implementation matches that.
- Selected route: `Code Review`.
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High).
- New design impact or escalation trigger: `None`. The decisions made within the design's latitude are listed under Important Assumptions, for the reviewer.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (store) / DS-001 | A secret value is a vault entry; `mcps.json` holds `{vaultSecretId}` | GraphQL `configureMcpServer` → `McpServerInputMapper.toDraft` → `McpConfigService.configureMcpServer` (write lock) → `McpServerSecretFields.store` (new `mcp.<uuid>` saves) → provider `create`/`update` (backup when a plain value becomes a reference) → remove `obsolete` after commit, or `created` on failure | Done. IMP-05 (integration: keep, replace, unlock, form-lock backup), IMP-07 |
| BEH-001 (use) / DS-002, DS-007 | Resolved at connect only; no plain fallback | `Stdio/HttpManagedMcpServer.createClientSession` → `resolveMcpValues` → `McpSecretResolver` (`SecretManagementMcpSecretResolver` → `resolveForUse({kind:"mcpServer"})`), installed by `installRuntimeMcpSecretResolver` | Done. Core integration (189 servers, fake resolver), server integration and e2e (gateway calls after restart), live check |
| BEH-005 / DS-003 | No secret value is returned; states instead | `McpConfigService.listMcpServerViews` → `McpServerSecretFields.statesOf` (VAULT_UNAVAILABLE on a vault that is not READY, never a throw) → `McpServerConverter.toGraphql` | Done. An always-secret field stored plain returns `value: null, state: PLAIN` (AR-006) |
| Preview / DS-006 | Stores nothing | `previewMcpServerTools(draft)` → `toPreviewConfig` (new values in memory, kept values as references) → `listRemoteTools` | Done. Integration: no vault entry and no file after preview |
| UC-006 move / DS-004 | User-triggered; backup 0600; compensation; re-register after the lock | `mcpSecretMoveCandidates` / `moveMcpSecretsToVault` → `McpConfigService.moveSecretsToVault` → `storePlainAsSecret` → `provider.replaceWithReferences` (one locked write: check still plain, backup, rewrite; cache updated) → on failure remove new entries → after the lock: `addConfig` + `registerServer` | Done. Integration (backup, cache, compensation), e2e (plain file → move → gateway), rendered |
| Import (MREQ-006, MDEC-004) | Rule matches and always-secret values go to the vault; result lists them | `importMcpServerConfigs` → core parse → `importedDraft` (rule) → `configureMcpServer` → `stored_secrets` → GraphQL `storedSecrets` | Done. Import refuses an entry holding a secret reference (see Important Assumptions) |
| Delete (MREQ-001) | Removes the entries | `deleteMcpServer` (lock) → unregister → provider delete → remove the referenced entries | Done. Integration |
| Live check / DS-005 (MREQ-008, MDEC-005) | GitHub remote MCP with its token in the vault | `tests/e2e/mcp/mcp-github-remote-live.e2e.test.ts`; `test-support/test-vault/live-test-secret.ts` | **Pass**, strict mode (IMP-09). Issue #1 of `ryan-zheng-teki/autobyteus-mcp-test` read through `/mcp/gateway`; token in no response, output or file |
| Test-only ID and alias | `test.github.token` known and listed, resolved for no consumer; alias accepted only by `test-vault setup` | catalog `TEST_ONLY_SECRET_IDS`, `testVaultOnlyCredentialAliases`, `LocalEnvironmentSourceReader(aliasScope)` | Done. Token imported (IMP-10, IDs only) |
| Web (AR-006, AR-007, MDEC-001/002) | Rows with locks, token states, keep markers, banner, card, import result | `McpConfigRows.vue`, `McpServerFormModal.vue` + `utils/mcp/{mcpConfigRows,mcpServerFormState}.ts`, `McpSecretMoveBanner.vue`, `McpServerCard.vue`, `McpBulkImportView.vue`, store, queries, mutations, locales | Done. IMP-11, IMP-12, IMP-14 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.

## Key Files Or Areas

- **Core (`autobyteus-ts/src/tools/mcp/`):**
  - `types.ts`: value types and the constructors' parse;
  - `mcp-secret-resolver.ts` (new);
  - `server/{base,stdio,http}-managed-mcp-server.ts`;
  - `server-instance-manager.ts`: `useSecretResolver`; dead workspace code removed;
  - `index.ts`.
- **Server vault (`autobyteus-server-ts/src/secret-management/`):**
  - `domain/secret-id.ts`;
  - `catalog/provider-credential-catalog.ts`;
  - `provisioning/{local-import-credential-alias-registry,local-environment-source-reader}.ts`;
  - `test-vault/test-vault-commands.ts`;
  - `resolution/mcp-secret-resolver.ts` (new).
  - Also `src/server-runtime.ts`.
- **Server MCP (`autobyteus-server-ts/src/mcp-server-management/`):**
  - `domain/{mcp-server-draft,mcp-server-view,mcp-config-fields}.ts` (new);
  - `services/{mcp-server-secret-fields,mcp-secret-suggestion-rule}.ts` (new);
  - `services/mcp-config-service.ts`;
  - `providers/{file-provider,cached-provider,persistence-provider}.ts`.
- **GraphQL (`autobyteus-server-ts/src/api/graphql/`):**
  - `types/{mcp-server-config,mcp-server}.ts`;
  - `converters/{mcp-server-input-mapper (new),mcp-server-converter}.ts`.
- **Web (`autobyteus-web/`):**
  - `components/tools/{McpConfigRows,McpSecretMoveBanner}.vue` (new);
  - `components/tools/{McpServerFormModal,McpServerCard,McpServerList,McpBulkImportView,ToolsManagementWorkspace}.vue`;
  - `utils/mcp/{mcpConfigRows,mcpServerFormState}.ts` (new) and `types/mcpServer.ts` (new);
  - `stores/toolManagementStore.ts`;
  - `graphql/{queries,mutations}/mcpServer*.ts`;
  - `generated/graphql.ts` (MCP hunks only);
  - `localization/messages/{en,zh-CN}/tools.generated.ts`.
- **Shared test support:**
  - `test-support/fixtures/mcp-secret-suggestion-vectors.json`: the rule plus vectors, used by the server and web tests;
  - `test-support/test-vault/live-test-secret.ts`.
- **Tests:**
  - core: `tests/unit/tools/mcp/types.test.ts`, `tests/integration/tools/mcp/secret-reference-resolution.test.ts`;
  - server unit (catalog, source reader, resolver, rule, file provider references and HTTP auth, config service, input/view mapping);
  - server integration: `mcp-secrets-in-vault.integration.test.ts`;
  - e2e: `tool-management/{mcp-secrets-in-vault,mcp-bulk-import,…}.e2e.test.ts`, `mcp/mcp-github-remote-live.e2e.test.ts`, and the existing MCP suites on the new shapes;
  - web specs: rows, form, card, banner, import.
- **Docs:**
  - `GLOSSARY.md` (MCP Secrets);
  - `docs/design-cases.md` (Case 5 entry);
  - `autobyteus-server-ts/docs/modules/{mcp_server_management,secret_management}.md`;
  - `autobyteus-web/docs/tools_and_mcp.md`;
  - `TESTING.md` (Test vault alias and command).

## Important Assumptions

These are decisions within the design's latitude, listed for the reviewer:

1. **Value parsing has one owner.** The core config constructors (`parseMcpConfigValueRecord` in core `types.ts`) parse values. There is no separate provider parser; the provider's `asRecordStringString` is gone. A malformed value fails that entry only.
2. **Core checks the reference's shape only:** exactly `{vaultSecretId: <non-empty string>}`. The vault and catalog own the ID format, so an unknown or ill-formed ID shows as `MISSING` (design rule 8). This also keeps core free of a static vault import (the module-graph guard, `3ed397318d`).
3. **Import takes values, never secret references.** An imported entry holding `{vaultSecretId}` fails with `MCP server '<id>' <field>: import takes values, not secret references.`. A reference belongs to one server's field on one node; a shared reference would let one server's delete or replace remove another's entry. Consequence: re-importing the app's own `mcps.json` (autobyteus-190 AC-002) still works for plain entries, but an entry that holds a secret is reported as failed. The e2e asserts this.
4. **Blank values.** A plain value that is blank is not a move candidate, and import keeps a blank value plain (the vault refuses an empty `SecretValue`). A `newSecret` needs a non-empty value; an empty secret row with a stored value means `keep`.
5. **Duplicate names in a draft** are refused: `MCP server '<id>' lists env:X more than once.`.
6. **The form-save backup is logged, not returned.** When a form save turns a stored plain value into a reference, the provider writes the same 0600 backup as the move and logs its path (a path, not a value). `configureMcpServer` returns the view as the design specifies, without a backup path.
7. **Interface addition.** The provider's `replaceWithReferences` returns `{backupPath, configs}`, not only `{backupPath}`: the cache and the service's re-registration need the changed configs as saved.
8. **JSON View review step.** When the JSON adds a new value the rule matches, Save switches to the Form View with the row locked and saves on the next click (design entry-form table). Preview from the JSON View needs no review, because it stores nothing.
9. **Web icons are inline SVG.** `McpConfigRows` draws its lock and remove icons as inline heroicons SVG. The app's `i-heroicons-*` classes have no provider and render nothing (FU-005), and an invisible lock toggle would hide the main affordance.
10. **The generated types fix a mis-merge.** `generated/graphql.ts` carries only the MCP hunks. Three of them fix a mis-merge from autobyteus-190 in `ImportMcpServerConfigsResult` / `ImportMcpServerConfigFailure` and the import document (IMP-13).

## Known Risks

- **R-1, secrets in errors.** Errors name the server and field only. Tests assert no dummy value in results, logs (the integration suite fails on any console line containing one), server output or files.
- **R-2, orphan entries after a failed removal or a hand edit.** Harmless. A removal failure is logged with the ID and error code only.
- **R-3, the stdio environment limit.** A stdio server receives its secrets in its own environment. This is stated in the UI (`env_secret_hint`) and the docs.
- **R-4, the backup holds plain values.** It is mode 0600, written with `wx` (never overwritten). The move result and the dialog name its path and say it holds the plain values.
- **R-5, the live token expires 2026-11-25.** After that the live check fails with GitHub's status; renew the token.
- **The two gated in-process suites** open the run database's application vault (see AR-011 above). If an earlier test leaves the shared test database's vault under another root key, they would fail with a vault state error. They passed with the scripted AGY gate (IMP-08).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature (security).
- Reviewed root-cause classification: Missing Invariant.
- Reviewed refactor decision: `Refactor Needed Now` (bounded).
- Implementation matched the reviewed assessment: `Yes`. One value type, one server draft (`createDomainConfigFromInput` removed), the provider batch write, the service write lock and the dead workspace code removal are all done.
- Routed as `Design Impact`: `N/A`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The GraphQL `GraphQLJSON` env/headers and `token: String` are a clean cut. Plain strings in `mcps.json` stay a current, supported shape.
- Legacy old-behavior retained in scope: `No`.
- Dead code in the touched files and modules removed: `Yes`. Removed:
  - `setWorkspacePathProvider`, `applyWorkspaceEnv` and `WorkspacePathProvider`;
  - `createDomainConfigFromInput` and `toStringRecord`;
  - `asRecordStringString`;
  - the old locale keys `McpServerFormModal.key`, `.value` and `.add_variable`.
- Dead code found elsewhere, added to `follow-ups.md`: FU-005 (dead `i-heroicons-*` classes across the web app).
- Shared structures remain tight: `Yes`. The draft has stdio and HTTP variants, and the view is a separate type.
- Canonical shared design guidance reapplied: `Yes`.
- Size guardrails: `Yes`.
  - `McpServerFormModal.vue` was exactly 500 effective lines before; this change took it to 586, so it was split (`utils/mcp/mcpServerFormState.ts`) and is now 438.
  - `toolManagementStore.ts` went 408 → 515, so it was split (`types/mcpServer.ts`) and is now 479.
  - Changed-line deltas over 220: `mcp-config-service.ts` (265; 319 lines) is the designed owner of the new sequences and stays one owner; `McpServerFormModal.vue` is split as above.
- Notes: `cached-provider.test.js` (a JS twin of a TS test) predates this ticket; untouched.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration` (design "Persisted Data / State Transition Decision").
- No migration was added, and there is no version-specific runtime fallback: `Yes`.
- Direct-use evidence: an existing plain `mcps.json` loads and works unchanged (e2e "loads the plain file…"; existing HTTP auth e2e restart). References load and resolve. The move is a user-triggered maintenance action with a backup (MDEC-002). The user's own `~/.autobyteus` and `mcps.json` were never touched.
- Deviation: `None`.

## Environment Or Dependency Notes

- Server typecheck and e2e need a current core build (`pnpm -C autobyteus-ts build`), then the server build. The server resolves `autobyteus-ts` through `dist`.
- In a fresh worktree:
  - `test:integration` needs `pnpm -C autobyteus-server-ts test:integration:prepare` first;
  - web tests need `pnpm -C autobyteus-web exec nuxi prepare`.
- **Test vault:** `pnpm test-vault setup --source ~/.autobyteus-test/secrets/github-mcp-test.env` was run once. `status` shows `CONFIGURED test.github.token` (IDs only; the token was never printed). The vault is at `~/.autobyteus-test/vault`.
- **Rendered check:**
  - it used a temporary built server (`startBuiltTestServer`, its own runtime and DB, seeded with dummy data) and `nuxt dev` with every `BACKEND_*` variable pointed at it;
  - both were stopped and the runtime removed;
  - a separate `nuxt dev` process (port 4822) that was not started by this ticket was left alone;
  - the helper scripts lived in `/tmp/244-*` and are not in the repository.
- No release; `dist/` outputs are untracked.

## Checks Run

All on macOS Darwin 25.5.0 with Node v22.23.1. The server and core runs used a clean env (`env -i PATH HOME=<temp> TMPDIR`). Evidence is in `tickets/in-progress/secrets-and-integrations-design/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-ts exec vitest run tests/unit` | c100661947 (core last changed 3ed397318d) | clean env | core, incl. MCP types and the vault module-graph guard | DS-002 | Pass | IMP-01-core-unit.log | `Tests  2047 passed (2047)` |
| IMP-02 | `pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` | same | clean env; Python via uv and Node fixtures | managed-server resolution against the 189 test servers | DS-002, DS-007 | Pass | IMP-02-core-integration-mcp.log | `Tests  32 passed \| 1 skipped (33)`; `[mcp-test-server] python: used` (the skip is the opt-in real-server test) |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | bd1ed1a232 + artifacts | — | server src | all | Pass | IMP-03-server-typecheck.log | `exit=0` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` | c100661947 | clean env | server unit, incl. catalog, reader, resolver, rule, provider, service, mapping | DS-001…DS-004 | Pass | IMP-04-server-unit.log | `Tests  6867 passed \| 7 skipped (6874)` |
| IMP-05 | `test:integration:prepare` then `test:integration` | bd1ed1a232 (server last changed 5b27a997f4) | clean env | full server integration, incl. `mcp-secrets-in-vault.integration.test.ts` (real vault, real provider, Node test server) | DS-001…DS-004, DS-006 | Pass | IMP-05-server-integration.log | `Tests  436 passed \| 69 skipped (505)`; the file's cases appear in the log |
| IMP-06 | Premise probes (temporary tests, removed) | step-2/3 working trees | — | `SecretManagementService` absent ID; `updateJsonFile` lock; codegen | design guidance | Pass | IMP-06-premise-probes.md | `NOT_FOUND`, `a-start \| a-end \| b-start saw [1]` |
| IMP-07 | built-server MCP e2e (6 files, command in the file header) | working tree = 5b27a997f4 | clean env | GraphQL → vault → `mcps.json` → `/mcp/gateway`, restart, move and backup, import | DS-001…DS-004, BEH-005 | Pass | IMP-07-e2e-mcp-built-server.log | `Tests  14 passed (14)` |
| IMP-08 | gated runtime MCP e2e, `RUN_AGY_FAILURE_E2E=1` (scripted AGY CLI) | working tree = 5b27a997f4 | clean env | in-process run database vault + `installRuntimeMcpSecretResolver`; agents' MCP tool calls with vault-held credentials | DS-002 | Pass (AGY cases) | IMP-08-e2e-mcp-runtime-agy-scripted.log | `Tests  8 passed \| 11 skipped (19)` (other runtimes need their gates) |
| IMP-09 | GitHub live check, `RUN_GITHUB_MCP_E2E=1 AUTOBYTEUS_LIVE_STRICT=1` with the test vault | working tree = 5b27a997f4 | clean env + network | DS-005 end to end against GitHub | MREQ-008, DS-005 | Pass | IMP-09-live-github-mcp-vault.log | `✓ stores the token as a vault reference, discovers the tools and reads the test issue`; 0 token-like strings |
| IMP-10 | `pnpm test-vault setup --source …`, `pnpm test-vault status` | bdac653cb6+ | user's test vault (`~/.autobyteus-test/vault`) | alias and test-only ID | MDEC-005 | Pass | IMP-10-test-vault-status.txt | `CONFIGURED test.github.token` |
| IMP-11 | web MCP specs, web guards, literal audit, localization tests | bd1ed1a232 + artifacts | Nuxt test env | rows, form, card, banner, import, rule vectors | AR-006/007, MDEC-001/002/004 | Pass | IMP-11-web-mcp-specs-guards.log | `Tests  67 passed (67)`; `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-12 | full web suite `NUXT_TEST=true vitest run` | 5b27a997f4 (tools files rechecked after the split in IMP-11) | Nuxt test env | whole web app | — | Pass | IMP-12-web-full-suite.log | `Tests  4942 passed \| 5 skipped (4947)` |
| IMP-13 | web codegen against a temporary built server | 7250e64c05 | — | GraphQL schema → generated types | — | Pass | IMP-13-codegen.md | `[SUCCESS] Generate to ./generated/graphql.ts`; 28 MCP hunks committed |
| IMP-14 | rendered check (Playwright on `nuxt dev` + seeded built server) | 5b27a997f4 | Chromium headless, 1400×1000 | list, banner, card, form rows, token, keep markers, dialog, move | MDEC-001/002, AR-006/007 | Pass | rendered/IMP-14-*.png | see Frontend section |
| IMP-15 | web `tsc` on `.nuxt/tsconfig.json`, filtered to touched files | bd1ed1a232 | — | store, utils, types, generated | — | Pass (no new error kinds) | IMP-15-web-tsc-filtered.log | only the pre-existing unresolved-Apollo TS2307 and the same implicit-any pattern as existing store lines |

- **Not run, and why:**
  - the gated runtime suites for Codex, Claude, LM Studio and Grok: they need live CLIs or models, and the AGY scripted gate covers the wiring;
  - an isolated Electron instance: left to API/E2E;
  - `vue-tsc`: not installed.

## Frontend Rendered-Result Check

- **Affected surfaces / journeys:** Tools → MCP Servers:
  - the list, with the review-and-move banner and the card's "Needs secret";
  - the review dialog and its result;
  - Edit server: env and header rows with lock toggles, the token states, the JSON View keep markers;
  - bulk import (spec-covered).
- **Approved references:** requirements MDEC-001/002/004 (lock toggle per row, rule pre-ticks, banner, per-row move) and design AR-006/AR-007 (reuse the env-row pattern; no new visual language; no Product Design round).
- **Existing design system reviewed:** the existing env and argument rows, toasts, buttons, card badges and the gateway panel. The new rows reuse the env-row layout, and the banner and dialog use the existing amber/indigo/red tones.
- **Surface used:** `nuxt dev` against a test-owned built server (dummy data), driven by Playwright. Screenshots are scrolled to the rows, because the app scrolls inside its own container.
- **States inspected:**
  - a plain secret-looking value: "Looks like a secret · Move to vault";
  - an always-secret token stored plain: "Stored as plain text …, or Move to vault", plus "Remove the stored token";
  - a stored secret: empty, readonly name, "Leave empty to keep", "Stored in the vault";
  - a missing reference: red "Needs secret";
  - the JSON keep markers;
  - the dialog with candidates and reasons;
  - the move result with the backup path, its warning and the servers that failed to re-register (expected, since the seeded servers are fake);
  - the list after the move, with no banner.
- **Issues found and corrected:**
  1. The lock and remove buttons were invisible, because `i-heroicons-*` renders nothing in this app. They are now inline SVG, re-rendered and verified (FU-005 covers the app-wide issue).
  2. The dead decorative icon spans were removed from the new banner and card.
- **Evidence and limitations:** IMP-14 screenshots. Keyboard focus was not exercised beyond the native buttons and inputs. The dark theme was not inspected. The bulk import result and the review step are covered by specs, not screenshots. After the size split (`bd1ed1a232`), the form behavior was rechecked by its 17 specs, not re-rendered.

## Downstream Coverage Hints / Suggested Scenarios

- **An isolated desktop instance (real Electron):**
  1. Add a GitHub-like stdio server with a `GITHUB_TOKEN` row (pre-locked).
  2. Save, sync and call a tool.
  3. Restart and confirm the tool still works.
  4. Check that `mcps.json` holds only a reference.
- **The move from the banner**, on a copy of a realistic multi-server `mcps.json` (dummy values). Unticking a row leaves it plain; delete the backup afterwards.
- **The vault locked or unavailable:** the list still loads, rows read "Needs secret: the vault is unavailable", and connect fails naming the field.
- **Token states:** keep, replace and remove the token; switch Form ↔ JSON with keep markers; send an invalid keep marker.
- **Import:** a mixed file reports `storedSecrets`; an entry carrying a reference is refused.
- **The zh-CN locale** on the new strings.

## API / E2E / Executable Coverage Investigation And Execution Still Required

The API/E2E engineer owns independent executable validation. The implementation-scoped e2e and live runs above (IMP-07…IMP-09) can be reused while the code they exercise is unchanged. Still open:

- the scenarios above on an isolated desktop instance;
- a broader regression pass of MCP-dependent suites with the runtime gates available (Codex, Claude, LM Studio);
- the backup and permissions behavior on Linux.
