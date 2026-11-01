# Design Review Report — Integrations page (autobyteus-337)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page/tickets/in-progress/integrations-page/requirements-doc.md` (approved SR-006; AC-008/AC-009 added at SR-008)
- Upstream Investigation Notes: `…/investigation-notes.md`
- Upstream Solution Revision Record: `…/solution-revision-record.md`
- Reviewed Design Spec: `…/design-spec.md` (the handoff says SR-008; the spec's own header says `SR-007`, see AR-001)
- Supplemental Task Artifacts Reviewed:
  - UI/UX r2 `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/integrations-page-r2/ui-ux-spec.md` (Status `Approved`, VIS-001…VIS-035);
  - the manifest contract `/Users/normy/autobyteus_org/autobyteus-integrations/docs/integration-manifest.md` and `github/integration.json`;
  - `product-design-request.md` and `-r2.md`.
- Relevant Solution Revision IDs: SR-006, SR-007, SR-008, SR-009
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-009, the revision addressing ARCH-REV-001 (AR-001…AR-006)
- Prior Review Round Reviewed: `1` (ARCH-REV-001, Fail)
- Latest Authoritative Round: `2`. The round-1 verdicts below are kept for unaffected checks; the "Round 2" section revises the affected ones.
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/integrations-page`, branch `codex/integrations-page` at `e4bebdc858`. `origin/personal` has moved to `0295553657`. The only change in a touched subsystem is a shutdown hook in `credential-proxy-local-server.ts` (`installClientConnectionClose`), which does not affect the design. Every cited file below was opened at the stated lines.

## Round 2 (ARCH-REV-002): Re-Check Of The Affected Spines And Prior Findings

DS-002 redrawn in call order: `importIntegrations(location)` → `IntegrationCatalog.import`:

1. Classify the input. A GitHub URL accepted by `parseGitHubSkillRepository` → GitHub import. An absolute or `~` path → folder import. Anything else → `NOT_A_LINK_OR_PATH`.
2. Call `SkillSourceService.importGitHubSkillSource(url, {requireIntegrationFolder: {reservedIds}})` or `addSkillSource(path, …)`. For GitHub: duplicate check → prepare → inspection (skills, the presence rule, reserved folder names) → publish.
3. Map the outcome: a `duplicate()` result → `ALREADY_IMPORTED {GITHUB_REPOSITORY}`; "already exists" → `ALREADY_IMPORTED {LOCAL_PATH}`; plus `DIRECTORY_NOT_FOUND`, `SKILL_NAME_CONFLICT`, `NO_INTEGRATIONS_FOUND`, `INTEGRATION_ALREADY_IMPORTED {id, existingSource}` and `GITHUB_UNREACHABLE {reason}`.
4. Return the new IDs only (IDs after minus IDs before).

DS-005 (removal and update) is unchanged, except that it disconnects only the entry the source holds (DEC-017).

| Prior Finding | Resolution | Verified Against | Status |
| --- | --- | --- | --- |
| AR-001 Stale ACs and header | AC-001 (empty state, then cards), AC-002 (link and folder, every refusal coded), QR-002 (no network on page open), SCN-001 aligned. The header says `SR-009`; the approval line notes r2 approved; the integrations repository is no longer "left alone"; the Skills label is "approved in r2" | requirements L83, L90-91, L104, L135; design L5, L10, L67, L76-81 | Resolved |
| AR-002 Import outcomes | The mapping table in DS-002, owned by `IntegrationCatalog.import`, covering every UI state (VIS-009…VIS-012) and the new DEC-017 refusal; new IDs only | design L152-174; `skill-source-service.ts` L97-102, L245-248 | Resolved |
| AR-003 `token.help` links | `https:` only, text nodes, never `v-html`, opened through the existing external-link path; `javascript:`/`data:`/`http:` stay text and are tested | design L261; `MarkdownRenderer.vue` L14, L133 (`openExternalLink`) | Resolved |
| AR-004 Duplicate ID | DEC-017: Integrations import refuses it (`reservedIds`); a Skills-page duplicate is skipped with a warning; removal or update disconnects only the kept entry | requirements L162; design L150, L171, L221 | Resolved (AR-008 clarifies the order) |
| AR-005 Refusal texts | New texts; the name comes from `IntegrationCatalog.nameOf(id)` with the ID as fallback; `credential_proxy.md` updated | design L237-248 | Resolved |
| AR-006 Async signatures | `addSkillSource`/`removeSkillSource` → `Promise<SkillSourceInfo[]>`; resolvers `skills.ts` L305-313 and their callers too | design L221 | Resolved |

DEC-017 is a refusal rule for an uncommon case and sits within the approved direction (DEC-012, DEC-015). It is the Solution Designer's decision, and it adds no new product behavior that needs the user.

New this round (non-blocking; for implementation or the next package touch):
- **AR-007 (Low):** the DS-002 bullets still pass `{requireIntegrationFolder: true}`, while the interface row and the mapping table use `{requireIntegrationFolder: {reservedIds}}`. The interface row is authoritative.
- **AR-008 (Low):** "the earliest-imported source's entry is kept" (design L150; DEC-017) has no stored import time across kinds. Local paths have only their order in `AUTOBYTEUS_SKILLS_PATHS`, and the GitHub registry has no import time. Use the skill catalog's own source precedence (`listSkillCatalogSources`, the order `loadCatalog` uses, `skill-service.ts` L127-137), so the kept integration entry and the kept skill copy always agree.
- **AR-009 (Low):** `requirements-doc.md` L5-6 do not record that AC-001/AC-002/QR-002/SCN-001 were aligned at SR-009 (L6 still says `SR-006`).

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`.
  - The proxy's access rule changes.
  - Content from a user-chosen repository reaches the UI.
  - `SkillSourceService` gets two extensions.
  - The GraphQL contract is cut cleanly.
  - There is a new page.
- Design approval: `Obtained` (spec L10, the user 2026-11-01). It is not `Pending`, so the review proceeds.
- Independent Architecture Review required: `Yes`. Correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Contradicted` for the acceptance criteria. Some ACs and QR-002 contradict the approved REQ-002/REQ-009 and the approved UI (AR-001). The intent itself is clear and confirmed.
- Approved intent understood: REQ-001…REQ-010 and DEC-001…DEC-016.
  - Cards exist only for imported integrations.
  - Three states.
  - Import a GitHub link or a local folder as a skill source.
  - Manage: Update for GitHub, Remove for both.
  - Remove also disconnects (DEC-015); an update that drops an integration disconnects it (DEC-016).
  - Access follows the agent's effective skills, including "all installed" (DEC-002).
  - The app keeps the token rule (DEC-001).
  - The ticks are removed (DEC-005).
- Scope guardrail confirmed: UC-001…UC-004.
  - Out of scope: Jira/SSH, OAuth, a built-in repository link, single-integration install or remove, prerequisite installs, the proxy's own behavior.
  - Preserved: 311 AC-002…AC-008.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.
- Statements about existing code the design relies on:

| Design statement | Opened at | Result |
| --- | --- | --- |
| Run access is the tick list (`integration-run-access.ts` L29-41); the route checks `store.isAllowed` per call | `integration-run-access.ts` L20-50; `credential-proxy-routes.ts` L86-101 | True. The route's refusal texts (L38-39) say "Allow it on the … card in Settings" and "Connect it in Settings", and use the definition's `displayName`. See AR-005 |
| `addSkillSource`/`removeSkillSource` only edit `AUTOBYTEUS_SKILLS_PATHS` (L96-118) | `skill-source-service.ts` L96-118 | True. Both are **synchronous** today, as is the GraphQL `removeSkillSource` (`api/graphql/types/skills.ts` L305-313). See AR-006 |
| GitHub import refuses "No valid skills" before publication (L134-135) | L120-151 | True. **A duplicate import is not an error:** `duplicate()` returns a result with the warning "Already imported: …" (L245-248). See AR-002 |
| `updateGitHubSkillSource` inspects a prepared generation before publication | L174-210 | True: there is a prepared root before `replaceRecord`, so `sourceChanging(oldRoot, newRoot)` has a place |
| Automatic updates go through `updateGitHubSkillSource` | `update-notifications/services/update-pass.ts` L154 | True |
| Effective skills cover both scopes (`resolveConfiguredSkillBindingsForAgent` L262-275) | `skill-service.ts` L259-276 | True; "all installed" means all non-disabled installed records |
| The catalog is rebuilt from disk on every lookup (`loadCatalog`) | `skill-service.ts` L127-137 | True. It keeps **one copy per name**, in source precedence order, and logs the others |
| Connection state reads the vault | `integration-connection-service.ts` L127-131 | True; a vault error is caught and means not stored, so the list can't fail on vault state |
| Integration layout: one top-level folder per integration; ID = folder name `^[a-z][a-z0-9-]*$` | `integration-manifest.md` L12-35; repo root `github/{SKILL.md, integration.json, scripts}` | True; it matches the presence check. The ID is the folder name, not the skill name. See AR-004 |

| Behavior | Kind | Alignment | Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| List (REQ-001/002/008/009) | User | Pass | Pass | Pass; one ID could appear twice (AR-004) | Confirmed | AR-004 |
| Import (REQ-003) | User | Pass | Pass | Fail: the approved "already imported" and "not a link or path" outcomes have no server path (AR-002) | Needs Correction | AR-002 |
| Manage / Update / Remove (REQ-003, DEC-014…016) | User | Pass | Pass | Pass (observer in `SkillSourceService`); signature change unstated (AR-006) | Confirmed | AR-006 |
| Connect (REQ-004) | User | Pass | Pass | Pass. `token.help` link scheme unstated (AR-003) | Needs Correction | AR-003 |
| Access (REQ-005/006) | System | Pass | Pass | Pass; refusal texts and their name source unstated (AR-005) | Confirmed | AR-005 |
| ACs / QR-002 | — | Fail (AR-001) | — | — | Needs Correction | AR-001 |

**Point 1 (is the per-call check a faithful guard for REQ-005?): yes.** The per-call check exists to stop access that has been withdrawn. Each way of withdrawing it maps to one per-call check:

| Withdrawal | Caught by |
| --- | --- |
| The skill is removed from the agent | step 2 |
| The agent switches from "all installed" to configured skills without the skill | step 2 |
| The skill is disabled | step 3 (`disabledStore.isDisabled`, cheap) |
| The source is removed | step 4, and the token is gone by DEC-015 (step 5) |
| An update drops the integration | DEC-016 disconnects it (step 5) |
| The token is removed | step 5 |

A same-named skill that later wins precedence (for example one created in the default skills folder) is excluded at the next run's full check. A run already holding a pass keeps the access it legitimately had at start; that is acceptable. The full check at preparation keeps the "resolved skill `rootPath` = integration folder" identity rule. "Prove first" (definitions of team-local and application-owned agents read per call, a run's source recorded at preparation) is correctly put on implementation.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| UI/UX r2 spec | Pass | Pass | Pass | Pass with the REQs; Fail with AC-001/AC-002/QR-002 | Pass (`Approved`) | AR-001 |
| Manifest contract | Pass | Pass | Pass | Pass | Pass | None |
| `design-spec.md` header and approval lines | Pass | Pass | Fail | Fail: L5 `SR-007`; L10 "The r2 UI still needs his approval … review waits for it" (r2 is `Approved`); Change Scope says both "Deliberately left alone: … the integrations repository" and "The integrations repository: README rewritten (AC-009)"; "the 'Integration' label … if the user approves it in r2" (approved) | Fail | AR-001 |

## Task Design Health Assessment Verdict

| Area | Result | Evidence |
| --- | --- | --- |
| Present | Pass | — |
| Root cause evidence-backed | Pass | `Shared Structure Looseness`: name/description in the delivery definition and the manifest (P11) |
| Refactor decision explicit | Pass | Bounded list |
| Supported by sections | Pass | Removal plan, interfaces |

## Spine Inventory Verdict

| Spine | Scope | Readable | Narrative | Facade Vs Owner | Naming | One Owner, Call Order | Off-Spine Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 list | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 import/update | Primary | Pass | Fail | Pass | Pass | Fail: import outcomes incomplete (AR-002) | Pass | Fail |
| DS-003 connect | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 access | Primary | Pass | Pass | Pass (`IntegrationAccessRule`) | Pass | Pass | Pass | Pass |
| DS-005 source removal / update | Return | Pass | Pass | Pass | Pass | Pass. `SkillSourceService` owns the sequence and calls its one registered observer before the change; a refusal vetoes it. Dependency direction is kept | Pass | Pass |
| DS-006 manifest parse | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `IntegrationCatalog` (sole integrations caller of `SkillSourceService`) | Pass | Pass | Pass | Pass | — |
| `IntegrationConnectionService` (sole writer) | Pass | Pass | Pass | Pass | — |
| `IntegrationAccessRule` (one access fact) | Pass | Pass | Pass | Pass | — |
| `skills/` ↛ `credential-proxy/` | Pass | Pass | Pass | Pass | The observer interface and presence check only |

## Dependency Direction / Forbidden Shortcut Verdict

All `Pass`:
- the web never reads a source;
- `skills/` does not import `credential-proxy/`;
- backends depend only on `IntegrationRunAccess`;
- the skills GraphQL gets `integrationId` from the catalog in the API layer.

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Query `integrations` / `integrationSources` | Pass | Pass | Pass | Low | Pass |
| Mutation `importIntegrations(location)` | Pass | Pass | Pass | Medium | Fail: outcome codes are incomplete (AR-002) |
| `update/removeIntegrationSource(sourceId)`, `connect/test/disconnectIntegration(id)` | Pass | Pass | Pass | Low | Pass |
| `SkillSourceService` option + `setSourceChangeObserver` | Pass | Pass | Pass | Low | Pass. `removeSkillSource` becomes async (AR-006) |
| Removed GitHub-specific API (rule 9) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Piece Justified | Verdict |
| --- | --- | --- | --- | --- |
| Download, inspection, update, remove | Pass | Pass (skill sources reused; two named extensions) | Pass | Pass |
| Effective skills | Pass | Pass | N/A | Pass |
| Confirmations (`ConfirmationModal`, `SkillSourceUpdateConfirmation`) | Pass | Pass | N/A | Pass |

## Subsystem / Capability-Area Allocation Verdict

All `Pass`: `credential-proxy/` (catalog, manifest, access rule, tool presence); `skills/` (import option, observer); `api/graphql/types/integrations.ts`; `components/integrations/*`.

## Reusable Owned Structures Verdict

`Pass`. The manifest is the only source of name, description, help and prerequisites (DEC-006). `integrationId` per skill has one owner, the catalog.

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `IntegrationView` | Pass | Pass | Pass | Pass | — |
| Delivery definition without `displayName`/`description` | Pass | Pass | Pass | Pass | The route still reads `displayName` (AR-005) |
| Integration ID vs skill name | Fail | — | Fail | Fail | Two sources can hold the same ID under different skill names (AR-004) |

Derived consumers (Principle 11): `Fail`. The proxy's refusal texts and their name source are missing (AR-005). Vocabulary (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

`Pass`, apart from the files AR-005 adds (`credential-proxy-routes.ts` texts) and AR-006 (`api/graphql/types/skills.ts`).

## Subsystem / Folder / File Placement Verdict

`Pass`. The `delivery-definitions.ts` rename is in place, and the new files sit under their owners.

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope Explicit | Verdict |
| --- | --- | --- | --- | --- |
| GitHub GraphQL, ticks, `setAgentAccess`, `allowedIntegrations`, `isAllowed` | Pass | Pass | Pass | Pass |
| Definition `displayName`/`description` | Pass | Pass | Fail | Fail: their last reader, the route's refusal text, is not re-sourced (AR-005) |
| Web GitHub card, store, queries, Basics entry | Pass | Pass | Pass | Pass |

## Legacy / Backward-Compatibility Verdict

`Pass`. Clean cut of the GitHub-specific API and the ticks. The tolerant reader ignoring `agentDefinitionIds` is not compatibility code.

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence | Proportionate | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `connections.json` | `Directly Usable — No Migration` | Pass | Pass | Pass | The next write drops `agentDefinitionIds` |
| Vault `integration.github.token` | Unchanged | Pass | Pass | Pass | Beta.4 users stay connected; the card appears at first import |
| Skill-source storage | Unchanged | Pass | Pass | Pass | — |

## Change / Refactor Safety Verdict

`Pass`. The sequence is realistic, and the tests cover both removal pages, a failed disconnect, both scopes, a same-named skill elsewhere, and AC-008.

## Example Adequacy Verdict

| Topic | Needed | Present | Verdict |
| --- | --- | --- | --- |
| Good/avoided shapes (removal, skill identity, empty import) | Yes | Pass | Pass |
| Import outcome mapping (importer result/error → code → dialog text) | Yes | Fail | Fail (AR-002) |

## Material Premise Validation

### `P-001` — Two imported sources hold integration folders with the same ID under different skill names

- Related contract: the manifest contract (ID = folder name, L25-27); DEC-015's stated premise ("a skill-name clash refuses a second source with the same integration skill, so no other source can still use that connection").
- Initiating basis kind: `User`.
- Trigger: the user imports the official repository and his own local folder or fork (DEC-014: often an integration he is developing), in which the skill was renamed. The name clash check (`assertNoIncomingSkillNameConflicts`, `skill-source-service.ts` L102) compares skill names only, so the import succeeds.
- Path: DS-001 lists two entries with ID `github`. Both share `connections.json["github"]` and `integration.github.token`. Removing either source disconnects both (DS-005), and DS-004's "that integration's folder" has two candidates.
- Reachability: `Reachable` (an explicitly supported local-folder workflow), but uncommon.
- Review consequence: AR-004 (one deterministic rule; cheap).

### `P-002` — The user deletes an integration folder from his own local source on disk

- Initiating basis kind: `User`. DEC-014: "changes in the folder show directly".
- Consequence: the card disappears; a stored token stays in the vault with nothing on screen to remove it, until the folder returns.
- Reachability: `Reachable`.
- Review consequence: no finding. It is the same shape as the accepted beta.4 case (design "Persisted Data"), so it is recorded under Residual Risks. A per-file watcher would be speculative machinery.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why | Action | Status |
| --- | --- | --- | --- |
| AC-001/AC-002/QR-002 contradict REQ-002/REQ-009 and the approved UI | ACs are the validation authority downstream | Align the ACs to the approved REQs and UI (no new user approval: the approved texts decide) | Open (AR-001) |

## Review Decision

`Pass` (ARCH-REV-002). Round 1's `Fail` is superseded: AR-001…AR-006 are resolved. AR-007…AR-009 are non-blocking.

## Findings

### AR-001 — The acceptance criteria and design header contradict the approved requirements and UI

- Type: Requirement Gap (artifact alignment; **no new user approval needed**, because the approved REQ-002, REQ-009 and the UI spec decide). Severity: Medium.
- Protects: REQ-002 ("no 'Not installed' state"), REQ-009 ("no network to show them"), UI spec UIS-001/UIS-002.
- Evidence:
  - AC-001 expects a GitHub card "Not installed" on a fresh instance, and "Repository unreachable → message and Retry".
  - AC-002 is "Install on the GitHub card".
  - QR-002 says opening the page "makes at most a few unauthenticated GitHub requests".
  - All three predate SR-005/SR-006.
  - The design spec says `SR-007` (L5); its L10 says the r2 UI still awaits approval; Change Scope both edits and "deliberately leaves alone" the integrations repository; the Skills label is "if the user approves it in r2".
- Required update:
  - Rewrite AC-001 (fresh instance → the empty state that invites Import) and AC-002 (Import a link or a folder → cards with "Installed, needs a token"; the refusals and errors listed in REQ-003).
  - Remove or restate QR-002 (no network on page open).
  - Refresh the design header, the approval line, the Change Scope contradiction and the Skills-label condition.
- Recipient: Solution Designer.

### AR-002 — Import outcomes the approved UI shows have no server path

- Type: Design Impact. Severity: Medium.
- Protects: REQ-003 ("the listed errors"), UI spec TR-003 and the states "Error, already imported" (VIS-012) and "Error, not a link or path" (VIS-011).
- Evidence:
  - The design's codes are `NO_INTEGRATIONS_FOUND`, `DIRECTORY_NOT_FOUND`, `SKILL_NAME_CONFLICT`, `GITHUB_UNREACHABLE` and `TOKEN_REJECTED`.
  - A GitHub re-import is **not an error** in the importer: `duplicate()` returns a normal result with an "Already imported" warning (`skill-source-service.ts` L245-248). It throws only for a source still in `REMOVING`.
  - A local re-import throws "Skill source already exists" (L100-102).
  - Nothing classifies "neither a link nor a path".
  - So `importIntegrations` would return the existing integrations as if newly imported, or an unmapped error, where the approved UI shows specific texts.
- Required update: state that `IntegrationCatalog.import` owns the mapping, in order.
  1. It classifies the location: a GitHub URL, a path, or `NOT_A_LINK_OR_PATH`. Say whether this classification is the server's or the web's ("a web address is a repository"), and keep one owner.
  2. It maps a duplicate GitHub result or a local "already exists" to `ALREADY_IMPORTED`, with the kind (repository or folder) so the dialog can pick its text. A `REMOVING` source maps to its own code or message.
  3. It returns only the integrations of the newly imported source, for the success notice.

  Add one short mapping table (importer outcome → code → dialog text).
- Recipient: Solution Designer.

### AR-003 — Restrict the clickable `token.help` link to `https:` (and render it as text nodes)

- Type: Design Impact. Severity: Medium.
- Protects: DEC-013 and the design's own escalation trigger ("repository content would reach the UI as anything but inert data"); REQ-003 ("Connecting a card shows the manifest's `token.help`").
- Evidence: the Dependency Rules say "A link in `token.help` is made clickable and opens in the system browser", with no scheme rule. `token.help` comes from any user-chosen repository or folder. A `javascript:` or `data:` link rendered as an anchor would run in the app's origin, which can call the GraphQL API.
- Required update:
  - Linkify only `https://` URLs (optionally `http://`).
  - Build the anchor from text nodes (no `v-html`).
  - Open it through the product's existing external-link path: the system browser in Electron, `noopener` in a plain browser.
  - Anything else stays plain text.
  - Add a web test with `javascript:` and `data:` inputs.
- Recipient: Solution Designer.

### AR-004 — One rule for a duplicate integration ID across sources

- Type: Design Impact. Severity: Low. Premise P-001.
- Protects: DEC-015 (its premise that no other source shares the connection), REQ-005 (access bound to "that integration's folder").
- Evidence: P-001. The ID is the folder name (contract L25-27); the import guard compares skill names only (L102).
- Required update: one deterministic rule, for example:
  - the catalog keeps one entry per ID, the first by the same source precedence the skill catalog uses, and skips the other with a logged warning naming both folders (rule 7);
  - or `requireIntegrationFolder` also refuses an incoming integration ID that already exists, with a code and text.

  State which one, and add the case to the tests.
- Recipient: Solution Designer.

### AR-005 — The proxy's refusal texts and their name source

- Type: Design Impact. Severity: Low.
- Protects: REQ-005, REQ-007, REQ-010 (the user is told how access works now), DEC-006.
- Evidence: `credential-proxy-routes.ts` L38-39 says "This agent has no ${displayName} access. Allow it on the ${displayName} card in Settings." and "${displayName} is not connected on this node. Connect it in Settings.". `displayName` comes from the delivery definition, which DEC-006 trims, and both instructions become false.
- Required update:
  - Name where the route gets the display name: the catalog's manifest name, or the integration ID.
  - Give the new texts: "Add the `<skill>` skill to this agent" and "Connect it on the Integrations page".
  - Add `credential-proxy-routes.ts` to the file mapping and the `credential_proxy.md` contract update.
- Recipient: Solution Designer.

### AR-006 — Say that `removeSkillSource` (and `addSkillSource`) become async

- Type: Design Impact (clarification). Severity: Low.
- Evidence: both are synchronous today (`skill-source-service.ts` L96-118), as is the GraphQL `removeSkillSource` (`api/graphql/types/skills.ts` L311-313). The observer's `sourceRemoving` returns `Promise<void>`, and the `addSkillSource` folder check sits beside it.
- Required update: show the async signatures in the `SkillSourceService` interface row, and list the GraphQL resolvers that change with them.
- Recipient: Solution Designer.

## Classification

N/A (Pass). Round 1 was `Requirement Gap` (alignment) + `Design Impact`, now resolved.

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`). The Solution Designer gets an informational notice.

## Residual Risks

- P-002: deleting an integration folder from a local source by hand leaves its token in the vault until the folder returns, like the beta.4 case. Documenting it in `integrations.md` is enough.
- R-2 (DEC-002): every "all installed" agent can use a connected integration; documented as the user chose.
- R-3: the per-call re-read of the agent definition; implementation measures it.
- The icon is shown only as an `<img>` data URL after an SVG parse under 64 KB. Scripts in an SVG don't run in an `<img>`, so this is inert.

## Latest Authoritative Result

- Review Decision: `Pass` (ARCH-REV-002)
- Material-Premise Gate: `Pass` (P-001 handled by DEC-017; P-002 recorded as R-4)
- Notes:
  - The core shape is sound:
    - integrations reuse skill sources, with two named extensions;
    - the source-change observer covers both removal pages and automatic updates;
    - one access rule, with a faithful per-call guard (Point 1);
    - a clean GraphQL cut;
    - `connections.json` directly usable.
  - AR-001…AR-006 are resolved in SR-009.
  - AR-007…AR-009 are non-blocking.
