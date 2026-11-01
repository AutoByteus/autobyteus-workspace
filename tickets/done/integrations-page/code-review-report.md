# Code Review Report — Integrations page (autobyteus-337)

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `tickets/in-progress/integrations-page/requirements-doc.md` (SR-009; approved at SR-006; DEC-001, DEC-002, DEC-011 and DEC-012 by the user)
- Investigation Notes Reviewed As Context: `…/investigation-notes.md` (through the design)
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (SR-009)
- Design Spec Reviewed As Context: `…/design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: the approved r2 UI/UX spec (VIS-001…VIS-035, plus VIS-019); the manifest contract `8887475`; `follow-ups.md` (FU-001…FU-003); `DESIGN.md`
- Relevant Solution Revision IDs: SR-006, SR-009
- Design Review Report Reviewed As Context: `…/design-review-report.md` (ARCH-REV-002 Pass; AR-007, AR-008 applied)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `…/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Trigger: IR-001 implementation handoff (Large/High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: `1`
- Coverage / execution / API/E2E / delivery records: N/A (implementation review)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page`, branch `codex/integrations-page`. Code `db704b76ee…9e8264614e`; artifacts `b3118b58a1`. Base `0295553657`. AC-009: `autobyteus-integrations-worktrees/integrations-page-readme`, branch `codex/integrations-page-readme` @ `696758f`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The change alters the proxy's access rule, puts user-chosen repository content in the UI, adds two `SkillSourceService` extensions, makes a GraphQL clean cut and adds a page.

## Review Scope

- Server, read in full:
  - `credential-proxy/integration-catalog.ts`, `integration-access-rule.ts`, `integration-import-outcomes.ts`, `integration-manifest.ts`, `tool-presence.ts`, `run-pass-registry.ts`, `integration-run-access.ts`, `integration-connection-service.ts`, `credential-proxy-host.ts`;
  - the `credential-proxy-routes.ts` diff and `delivery-definitions.ts` (`verifyToken`);
  - `skills/domain/integration-folder-requirement.ts`, `skill-source.ts`, and the `skill-source-service.ts` / `skill-service.ts` diffs, with the import, update and remove bodies in full;
  - GraphQL `integrations.ts` and the `skills.ts` diff;
  - the five backends' `environmentForRun` awaits and the composition change.
- Web: `integrationText.ts` (`helpTextParts`), `externalLink.ts`, `useModalDialog.ts`, `IntegrationIcon.vue`, the help-link and token parts of `IntegrationDetail.vue`, and the store's connect path. A `v-html` search over the integrations components and page found nothing.
- Removals checked by search: `agentDefinitionIds`, `setGitHubIntegrationAgentAccess`, `githubIntegration`, `GitHubIntegrationCard`, `allowedIntegrations`. The only mention left is the tolerant reader's comment.
- Docs: `credential_proxy.md` refusal texts and the error table; `settings.md`; the AC-009 README commit.
- Tests: case lists for the catalog integration test, the core and manifest unit tests, and the GraphQL e2e.
- Checks: none rerun. IMP-01…IMP-14 ran at the commits the handoff names, and source after `858e493786` is covered by IMP-02…IMP-09 at `f0eb43c749` and IMP-10/IMP-11b at `9e8264614e`. One count was run: non-empty lines of the two largest changed files.
- Explicit exclusions: the rendered probe (IMP-12) taken as evidence; pre-existing FU-002/FU-003 (reproduced at the base by the engineer).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (REQ-001…REQ-010, AC-001…AC-009, DEC-001…DEC-017).
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-002 Pass. AR-007 is applied (`{requireIntegrationFolder: {reservedIds}}`). AR-008 is applied: `listCatalogSourcePaths` wraps `listSkillCatalogSources`, and the catalog sorts its sources by it.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence |
| --- | --- | --- |
| DS-001 List | Confirmed | `integrations` → `IntegrationCatalog.list()`: `getSkillSources` (LOCAL_PATH, and GitHub not REMOVING), ranked by `listCatalogSourcePaths` → `parseIntegrationSource` per root → one kept entry per ID (others skipped, warned once) → state from `DeliveryDefinitions` and `IntegrationConnectionService.status` → `checkTools` (PATH lookup, no shell). Disk only, no network |
| DS-002 Import / Update | Confirmed | `classifyImportLocation` (GitHub URL, absolute or `~` path, else `NOT_A_LINK_OR_PATH`) → `importGitHubSkillSource` (`assertIntegrationFolderRequirement` on the prepared root before inspection and publication; cleanup on failure) or `addSkillSource` (checked before the paths are written) → `importOutcomeError` mapping table → only new IDs returned. `alreadyImported` from `duplicate()` → `ALREADY_IMPORTED`. Update → `updateGitHubSkillSource` |
| DS-003 Connect | Confirmed | `connectIntegration` (`TOKEN_REQUIRED`, `INTEGRATION_NOT_FOUND`) → `IntegrationConnectionService.connect(id)` → `verifyToken` (`/user`, `redirect: "manual"`; 401 → `TOKEN_REJECTED`) → vault → store. The token is in no output |
| DS-004 Access | Confirmed | Preparation: `grantsForAgent` matches name plus real `rootPath` of resolved, non-disabled bindings against the kept entries' folders → `RunPassRegistry.issue(run, grants)` (or `clearGrants`). Per call: grant for the integration → `allowsCall` (definition re-read: ALL_INSTALLED or the name in `skillNames`; `isSkillDisabled`; `isSourceRegistered`) → token (`INTEGRATION_NOT_CONNECTED` when missing) |
| DS-005 Source removed / changed | Confirmed | `removeSkillSource` / `removeGitHubSkillSource` call `observer.sourceRemoving(root)` before any change, and `updateGitHubSkillSource` calls `observer.sourceChanging(oldRoot, preparedRoot)` before publication. The catalog disconnects the kept entries' connected IDs; a rejection refuses the removal or update. The observer is set by the host and unset on close |
| REQ-006/007 clean cut | Confirmed | GitHub GraphQL, card, store, documents, probe and ticks removed; the beta.4 file is read tolerantly |
| Skills label | Confirmed | `skills` GraphQL `integrationId` from `integrationIdsBySkillRoot()` (one owner) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | REQ-001…REQ-005 | User | User | Set up GitHub | Integrations page | Normal | DS-002 → DS-003 → agent skill → DS-004 | The agent's runs use GitHub | IMP-07, IMP-08, IMP-12 | Supported Normal Scenario | Use |
| SCN-003 | REQ-005, DEC-015 | User | User | Stop an agent's access | Agent skill edit; Remove token; Remove source on either page | Normal | DS-004 cheap check; DS-005 | Next call refused; no token left without a card | IMP-04 catalog cases; IMP-07 | Supported Normal Scenario | Use |
| SCN-DEC-016 | DEC-016 | System | Update (manual or automatic) | An update drops an integration folder | `updateGitHubSkillSource` | Explicit Edge | `sourceChanging` → disconnect; failure refuses | Connection removed with its card | IMP-04 case "disconnects an integration an update drops…" | Supported Explicit Edge Scenario | Use |
| CRS-201 | DS-005 | User | A source removal or update fails after the observer disconnected | — | — | — | The token is gone while the card stays: the user connects again | Fail-safe for DEC-015's rule ("no token left without a card") | design DS-005 order | Supported (consequence benign) | Reject (no finding) |
| CRS-202 | DS-002/DS-005 | User | Concurrent local-source add with a conflicting skill name during an update's `await sourceChanging` | — | — | — | — | — | Two concurrent user actions with no joint goal | Technically Possible but Unsupported/Contrived | Reject |
| CRS-203 | DEC-015 | System | A token in the vault with a null login (connect's vault save succeeded, the file write then failed), then the source is removed | — | — | — | `disconnectConnected` requires `status.connected`, so this token would stay | — | Needs a failed local file write mid-connect | Technically Possible but Unsupported/Contrived | Reject |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | A missing token in the per-call check refuses as `INTEGRATION_NOT_CONNECTED` (handoff assumption) | REQ-010, design DS-004 step 5 | Call with no token stored | The route's `resolveForUse` failure → "{name} is not connected… Connect it on the Integrations page." | `credential-proxy-routes.ts` | Reject | — | Tells the user what to fix; the design names the check but not the code |
| C-02 | Component names follow r2 (`IntegrationTile`, `IntegrationImportDialog`, `IntegrationDetail`) | UI spec (normative) | — | — | handoff | Reject | — | The approved UI spec is the authority for the web; the design's names were provisional |
| C-03 | Extra locale messages for coded outcomes the spec doesn't word | REQ-003 | — | — | handoff | Reject | — | Needed for every coded error; tone matches |
| C-04 | Codegen keeps only this ticket's hunks plus two types needed to compile | — | — | — | handoff | Reject | — | Same practice as earlier tickets |
| C-05 | `names()` (a full catalog scan) runs for every refusal, including `NOT_LOOPBACK` and `RUN_PASS_INVALID`, whose texts don't use the name | design AR-005 ("read only when a refusal is written") | — | A few small directory reads per refusal, on loopback only | `credential-proxy-routes.ts` `fail` → `refuse(…, names(), …)` | Reject | — | Refusals are rare; no measurable consequence |
| C-06 | Update awaits the observer between inspection and publication | — | CRS-202 | — | `skill-source-service.ts` update body | Reject | — | Contrived concurrency; the operation is serialized per repository |
| C-07 | The disconnect happens before the change, so a later failure leaves the card without a token | DEC-015 | CRS-201 | Never the reverse (a token without a card) | design DS-005 | Reject | — | Fail-safe direction, as designed |
| C-08 | The cheap check compares names, not the resolved `rootPath` (handoff Known Risks) | design Key Tradeoffs | — | A rename shadowing within a still-registered source keeps the grant until the next preparation | design | Reject | — | Accepted in the design |
| C-09 | `integration-catalog.ts` (+278 added, 216 effective) and `IntegrationDetail.vue` (224 effective) exceed the `>220` delta signal | `>220` rule | — | — | IMP-13 assessment | Reject | — | Each is one owner after the `858e493786` split; further splitting would cut a single owner |
| C-10 | `api/graphql/types/skills.ts` imports the integration catalog | Dependency rule "`skills/` does not import `credential-proxy/`" | — | The API layer composes both; the `skills/` subsystem stays clean | grep | Reject | — | The rule is about `src/skills/`, which holds |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Bounded refactors done: delivery definitions trimmed and renamed, connection service per integration, ticks removed, exactly two `SkillSourceService` extensions | — |
| Implementation matches approved behavior-defining artifacts | Pass | REQ/AC/DEC map above; DEC-002 (ALL_INSTALLED grants), DEC-014 (folder files stay), DEC-015/016/017 implemented | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-006 follow the design order | — |
| Ownership boundary preservation and clarity | Pass | The catalog is the only integrations caller of `SkillSourceService`; the connection service is the only writer of vault entry and file; the access rule holds the one access fact | — |
| Off-spine concern clarity | Pass | Manifest parsing, tool presence, import outcomes each in their own file | — |
| Existing capability reuse | Pass | Skill-source import, inspection, update and removal; `resolveConfiguredSkillBindingsForAgent`; vault; `MarkdownRenderer`'s external-link path extracted and reused | — |
| Reusable owned structures | Pass | `useModalDialog`, `externalLink`, `integrationText` | — |
| Shared-structure tightness | Pass | `IntegrationGrant` minimal; listing types compose the manifest entry | — |
| Repeated coordination ownership | Pass | One observer, set once; one access rule used at preparation and per call | — |
| Empty indirection | Pass | — | — |
| Separation of concerns and file responsibility | Pass | Size splits in `858e493786`; C-09 | — |
| Ownership-driven dependency direction | Pass | `skills/` imports nothing from `credential-proxy/` (observer interface and presence rule only) | — |
| Authoritative Boundary Rule | Pass | Backends still see only `IntegrationRunAccess`; the route uses `allowsCall` and `describe`, not the catalog's internals | — |
| File placement | Pass | — | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | Per-integration operations with explicit `id`; coded errors with details | — |
| Naming quality; one vocabulary | Pass | delivery definition, integration source, integration skill, integration state as in the glossary | — |
| No unjustified duplication | Pass | FU-001 records the two older modals' copies | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in touched files and modules | Pass | Removals verified by search | — |
| Test scenarios and assertions clear and requirement-aligned | Pass | Same-named skill elsewhere, disabled, removed skill, removed source, failed-disconnect refusal, update drop, DEC-017 precedence, `https:`-only links | — |
| Test fixtures/helpers reusable, structure coherent | Pass | — | — |
| No stale, duplicated, compatibility-only tests in changed scope | Pass | The old GraphQL e2e and the card probe were replaced | — |
| API/E2E readiness | Pass | See Residual Risks | — |

## Source File Size And Structure Audit

| Source File | Before (base) | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/skills/SkillsList.vue` | 488 non-empty (476 effective) | 492 (479) | Pass | +5 | Pass | Pass | Pass | — |
| `…/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | 481 (478) | 481 (478) | Pass | +1 | Pass | Pass | Pass | — |
| `src/credential-proxy/integration-catalog.ts` | new | 216 effective | Pass | +278 (C-09) | Pass, one owner | Pass | Pass | — |
| `components/integrations/IntegrationDetail.vue` | new | 224 effective | Pass | +248 (C-09) | Pass, one owner | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | GitHub-specific GraphQL removed as a clean cut |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files and modules | Pass | — |
| Approved persisted-data transition followed | Pass | `Directly Usable — No Migration`; beta.4 ticks are ignored and dropped on the next write (tested) |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the reviewed design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done:
  - `credential_proxy.md` (the access rule, the catalog, the refusal texts and table);
  - `skills.md`;
  - new `autobyteus-web/docs/integrations.md`;
  - `settings.md` (the GitHub section is gone; the remaining "Server Settings → Basics" mentions are about other settings);
  - `GLOSSARY.md` and `TESTING.md`;
  - AC-009 README on its own branch, for delivery.

## Additional Material Premise Validation

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| Per-call definition read is cheap (R-3) | Confirmed | IMP-01: 0.006 ms shared, 0.009 ms team-local |
| Team-local agents resolve through `resolveConfiguredSkillBindingsForAgent` | Confirmed | IMP-01 |
| Application-owned bundle copy grants nothing | Confirmed | `rootPath` differs; tested |
| A run's source is recorded at preparation | Confirmed | `IntegrationGrant.sourceId` |

New premises: CRS-202 and CRS-203 are contrived, and CRS-201 is benign; all are rejected.

## Review Scorecard (Mandatory)

- Overall score: `9.4/10` (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | Each spine has one driver in the designed order | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | One access fact, one caller of skill sources, one writer of connections; `skills/` stays free of integration types | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | Explicit per-integration operations; complete error-code table | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.3 | Outcomes, rows and tools moved out to keep owners focused | Two files just past the 220-line delta signal (C-09) | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | Grants and listings tight; shared web helpers extracted | — | — |
| `6` | `Naming Quality and Local Readability` | 9.4 | Glossary vocabulary; clear comments on each owner | — | — |
| `7` | `API/E2E Readiness` | 9.3 | Live AC-008 on real GitHub, scripted runtime cells, rendered probe | Live LLM runtime cells and an installed-app run remain | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.4 | Folder-identity access, per-call withdrawal, removal and update disconnects with refusal on failure | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | Clean cut | — | — |
| `10` | `Cleanup Completeness` | 9.4 | GitHub card, ticks and probe removed | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. FU-001…FU-003 were recorded by implementation.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E Engineer, `/software_engineering_team/api_e2e_engineer`; then an informational notice to the Implementation Engineer.

## Residual Risks

- From the handoff, for API/E2E:
  - live LLM runtime cells;
  - AC-008 through the real UI with a real agent;
  - an installed-app run;
  - removal from the Skills page while a run is active;
  - an update dropping an integration on a real repository revision;
  - the beta.4 upgrade on a real data root;
  - `token.help` with non-`https:` links in the rendered dialog.
- R-2: agents set to "all installed skills" get access once the integration is connected (the user's DEC-002; documented).
- R-4: a hand-deleted local integration folder leaves its token in the vault without a card (accepted).
- AC-009's README is on an unpushed branch for delivery to finalize on `AutoByteus/autobyteus-integrations` `main`.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E Engineer
- Notes: the handoff's assumptions (C-01…C-04) are sound, and the size assessments hold (C-09).
