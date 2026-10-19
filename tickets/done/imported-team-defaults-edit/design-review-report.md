# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/requirements-doc.md` (Approved, SR-001)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/design-spec.md` (SR-001, `Ready`, with the user's naming correction: `AgentLaunchPreferenceStore`, `agent-launch-preferences.json`, `applyAgentLaunchPreference`)
- Supplemental Task Artifacts Reviewed: None
- Relevant Solution Revision IDs: SR-001
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-team-defaults-edit/tickets/in-progress/imported-team-defaults-edit/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: URGENT `Architecture Design Complete` from `/software_engineering_team/solution_designer` (2026-10-14), plus the naming correction, plus the mid-review UX refinement (REQ-004, AC-006, DEC-006/007; design Intended Change 6: imported Team/Org forms show other fields read-only and Save sends only the default; `isPackageSourced` / `packageRoot` on the GraphQL types). This report reflects SR-001 as refined.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree at `c285adf6bf`. Read:
  - `agent-team-definition-service.ts` (`getDefinitionById`, `getAllDefinitions`, `listAdmissionEntries`, `updateDefinition`, `buildDefinitionUpdateCandidate`);
  - `agent-definition-service.ts` `updateAgentDefinition`;
  - `file-agent-definition-provider.ts` `update` (`writeRawFile(mdPath)` and `writeJsonFile(configPath, mergeAgentConfigRecord…)`, unconditional);
  - `collaborator-definition-catalog.ts` (reads via services);
  - `application-launch-resource-baseline-builder.ts` (reads via services);
  - web `AgentTeamEdit.vue` and `AgentTeamDefinitionForm.vue` `handleSubmit` (full, normalized payload);
  - the user's package `software-engineering-team/team-config.json`, which has no `avatarUrl`.

## Routing Classification Review

- Task size: `Medium`; Architectural risk: `High`. The design adds new persisted app data, changes definition-ownership semantics, and every reader must see the overlay. The classification is justified, and independent review is required: `Yes`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved intent: REQ-001..REQ-006, AC-001..AC-009, DEC-001 (user: personal defaults in the app), DEC-002..DEC-005.
- Existing behavior confirmed:
  - Team and Org writes are refused by the `external_read_only` assertion.
  - Agent update writes `agent.md` and `agent-config.json` into the package unconditionally.
  - Readers go through the services: the collaborator catalog, the application baseline builder, and GraphQL for the web.
- Scope guardrail confirmed: Yes.
- Every blocking finding is traceable: `Yes`.
- Remaining ambiguity: None.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass: after the refinement the Team/Org Save sends only the default (AR-001 resolved within this round, with one precision note) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Fail: a default-only Agent save still rewrites both package files (AR-002) | Needs Correction | AR-002 |
| BEH-003 | System | Pass | Pass | Pass: overlay in the service reads; consumers verified to read via the services | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present / evidence-backed / explicit / reflected | Pass | Root cause: inconsistent source policy between Agents and Teams/Orgs (verified). The response is a service-owned overlay plus a split update | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | Ownership | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 (save) | Edit page → service → preference store / refusal | Pass | Fail: the Agent branch still writes the package (Team/Org is resolved by the refinement) | Pass | Pass | Pass | Pass | Fail (AR-002) |
| DS-002 (read) | Consumers → service → overlay | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Definition services (overlay owners) | Pass | Pass | Pass | Pass | Verified: `createCollaboratorDefinitionCatalog` and the application baseline builder use the services; the implementation audit stays as designed |
| `AgentLaunchPreferenceStore` | Pass | Pass | Pass | Pass | Only the services write it |
| Providers (package file owners) | Pass | Pass | Fail | Fail | The Agent provider is still invoked for default-only package saves (AR-002) |

## Dependency Direction / Forbidden Shortcut Verdict

Pass. Services → store and providers; providers never see preferences; consumers must not read providers or caches for `defaultLaunchConfig`.

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Store keyed `"<kind>:<definitionId>"` (kinds `agent` / `agent_team` / `agent_org`) | Pass | Pass | Pass | Low | Pass |
| `applyAgentLaunchPreference(definition, preference)` | Pass | Pass | Pass | Low | Pass |
| `isPackageSourcedAgent(id)` | Pass | Pass | Pass | Low | Pass |
| `DEFINITION_PACKAGE_READ_ONLY` refusal | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

Pass. The design reuses `launch-preferences/` (`DefaultLaunchConfig`), the services' reload hook, and the source-class model.

## Subsystem / Capability-Area Allocation Verdict

Pass. The store and overlay live in `launch-preferences/`, and the services own the overlay.

## Reusable Owned Structures Verdict

| Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Overlay function (three services) | Pass | Pass | Pass | Pass | — |
| "Changed fields" comparison (Team, Org, Agent package saves) | Fail | N/A | N/A | Fail | Needed for the Agent split (AR-002). Team/Org use it only as the server safety net |

## Shared Structure / Data Model Tightness Verdict

Pass. Each preference entry is a single `DefaultLaunchConfig` per key; there is no version field.

## File Responsibility Mapping Verdict

Pass, apart from the missing owner for Agent change detection (AR-002). The refinement's GraphQL fields and the web form changes are mapped.

## Subsystem / Folder / File Placement Verdict

Pass.

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Writing `defaultLaunchConfig` into package `agent-config.json` | Pass | Pass | Fail | Fail | Only the field is removed; the whole-file rewrite on a default-only save remains (AR-002) |

## Legacy / Backward-Compatibility Verdict

Pass. Dual-write and writable package roots are rejected.

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| New `agent-launch-preferences.json` | `Not Affected` (new store; absent file = none) | Pass | Pass | N/A | Pass | Tolerant reader, atomic write, stale keys ignored (REQ-005). Existing package values are read unchanged |

## Change / Refactor Safety Verdict

Pass. The test plan includes a hash-before/after check on the package files, which will catch AR-002. It should also include the AR-001 round trip.

## Example Adequacy Verdict

| Topic | Needed | Present | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Default-only save from the real edit form | Yes | Fail | Fail | Team/Org: resolved by the refinement. Agent: needs the payload-versus-package comparison (AR-002) |

## Material Premise Validation

### `P-001` — A default-only Team save from the edit page is seen as changing other fields

- Related requirement: REQ-001, REQ-004 ("A Save that changes only the default succeeds"), AC-001, AC-002
- Initiating basis: `User`, Agent Teams → Software Engineering Team (imported) → Edit → change only the default → Save.
- Forward path:
  1. `AgentTeamDefinitionForm.handleSubmit` always sends `name` (trimmed), `category` (`|| undefined`), `description` and `instructions` (trimmed), `coordinatorMemberName`, `nodes` (`buildSubmitNodes`), `handoffs` (`toDefinitionHandoffs`), `avatarUrl` (`newData.avatarUrl || ''`) and `defaultLaunchConfig`.
  2. The user's `team-config.json` has no `avatarUrl` (existing `null`), so the payload carries `''`. `team.md` ends with a newline, which the trimmed form value lacks unless the reader also trims. `nodes` and `handoffs` are rebuilt by web mappers.
  3. "compute the field diff against the existing (package) definition" is not defined.
- Consequence: a raw-input comparison, or any field whose normalization differs between the reader and the form, makes the core use case refuse with `DEFINITION_PACKAGE_READ_ONLY`. This is the user's AC-001.
- Reachability: `Reachable` for the SR-001 design as first submitted. **After the mid-review refinement** the Team/Org form sends only `defaultLaunchConfig` and `expectedRevision`, so the web path no longer carries other fields.
- Review consequence: AR-001, resolved by the refinement (see the finding).

### `P-002` — A default-only Agent save still rewrites the package files

- Related requirement: REQ-001 ("Package files are not written"), AC-003 ("the member's `agent-config.json` in the package is not modified")
- Initiating basis: `User`, edit an imported member Agent's LLM config → Save.
- Forward path:
  1. The design routes `defaultLaunchConfig` to the store, and "the remaining fields keep today's path (provider write)".
  2. `FileAgentDefinitionProvider.update` always runs `writeRawFile(mdPath, serializeAgentMd(...))` and `writeJsonFile(configPath, mergeAgentConfigRecord(existing, domainObj))`.
  3. The investigation already observed this merge adding empty processor lists, `skillScope` and `avatarUrl: null` to the user's files.
- Consequence: the package checkout is modified even though only the default changed. This violates REQ-001 and AC-003, and the design's own hash test.
- Reachability: `Reachable` (certain).
- Review consequence: AR-002.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Fail`

## Findings

### AR-001 — The Team/Org "field diff" is undefined against the web's normalized full payload — **resolved by the mid-review UX refinement**

- Status: Resolved within this round. The Team/Org Save now sends only the default (design Intended Change 6, REQ-004 / AC-006). Remaining precision, non-blocking: define the server safety net as "a key other than `defaultLaunchConfig` / `expectedRevision` is **present** in the input and its normalized value differs from `existing`". Absent keys mean unchanged; this matches `buildDefinitionUpdateCandidate`. Keep the AC-006 API refusal test.
- Original classification: `Design Impact`
- Original severity: High
- Protects: REQ-001, REQ-004, AC-001, AC-002, AC-006
- Scope status: `Within Approved Scope`
- Changes approved behavior: No
- Evidence: `AgentTeamDefinitionForm.vue:440-457` sends every field, normalized. The user's team has no `avatarUrl` while the form sends `''`. `buildDefinitionUpdateCandidate` normalizes some fields (`avatarUrl` via `normalizeOptionalString`), but not necessarily in the same way the reader produced the existing value. The Org form follows the same pattern.
- Material premise: P-001 (Reachable)
- Required update:
  - Define the change detection precisely. Compare the **normalized candidate** (`buildDefinitionUpdateCandidate(existing, input)`, and its Org equivalent) with `existing`, field by field, using semantic equality:
    - trimmed or normalized strings;
    - `''` equal to `null` for optional strings;
    - member and handoff lists compared after the same normalization the provider applies.
  - Exclude `defaultLaunchConfig`, `revision` and ownership fields.
  - Put this in one owned function per kind (for example `packageContentChanges(existing, candidate)`), shared with AR-002.
  - Add a round-trip test: load the real form payload of an unchanged imported Team/Org (a fixture of the user's SE team shape, without `avatarUrl` and with a trailing newline in the markdown), change only the default, and check that the Save succeeds and the package is byte-identical. Keep AC-006 refusing real changes.
- Why proportionate: a pure comparison function and one test; no new mechanism.
- Recommended recipient: `/software_engineering_team/solution_designer`

### AR-002 — A default-only Agent save still rewrites `agent.md` and `agent-config.json` in the package (**open**; unaffected by the refinement, because imported Agents keep their full form per DEC-007)

- Type: `Design Impact`
- Severity: High
- Protects: REQ-001, AC-003; preserved boundary "package files are never written for launch defaults"
- Scope status: `Within Approved Scope`
- Changes approved behavior: No. Saves that change other Agent fields keep today's path, as approved (BEH-002 preserved, Out of Scope).
- Evidence: `file-agent-definition-provider.ts:341-380` writes both files unconditionally; the design keeps "remaining fields → provider write"; the investigation observed the merge adding normalized keys to the user's checkout.
- Material premise: P-002 (Reachable)
- Required update:
  - Equivalent alternative: have the imported-Agent form send only the changed keys, so a default-only Save sends just `defaultLaunchConfig`. Then skip the provider write when the input has no other keys, mirroring the Team/Org refinement.
  - Otherwise, for a package-sourced Agent, apply the same split as Teams: detect real changes to other fields with the AR-001 semantic comparison (Agent variant).
  - Default-only change: write only the preference and **skip the provider write entirely**.
  - Other fields changed: keep today's provider path, with `mergeAgentConfigRecord` preserving the file's `defaultLaunchConfig`, as designed.
  - Add an AC-003 test: hash `agent.md` and `agent-config.json` before and after a default-only save from the real Agent form payload.
- Why proportionate: this reuses the AR-001 comparison and only skips a write.
- Recommended recipient: `/software_engineering_team/solution_designer`

## Classification

`Design Impact` (AR-002; AR-001 is resolved by the refinement).

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Residual Risks

- The user's existing uncommitted package edits remain package values (a stated non-goal).
- Non-blocking recommendations:
  - **Pinning:** write or remove a preference only when the submitted default differs from the current **effective** value. Otherwise an untouched form re-Save pins the current package default as a personal setting, and later package updates to the default would no longer apply.
  - **Concurrent saves:** serialize store read-modify-write in-process with one async lock, so two quick saves of different definitions cannot lose an entry. Concurrent edits are not a stated scenario, but the cost is trivial.
  - **Org-owned Teams:** they are nested and appear in `listAdmissionEntries`. Make sure they are overlaid with the `agent_team` kind key and that their refusal message names the Org package.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (P-002 is Reachable and drives AR-002; P-001 is addressed by the refinement)
- Notes: The direction, store, overlay ownership, reader routing, persisted-data decision and the read-only Team/Org form refinement are sound. One small fix remains: a default-only Agent Save must not write the package (AR-002). Urgent turnaround is expected.
