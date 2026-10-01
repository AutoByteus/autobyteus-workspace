# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/requirements.md` (SR-013 content, approved SR-014; SR-016 metadata-only edit)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/investigation-notes.md` (AE-01–AE-22)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/design-spec.md` (SR-016, `Ready`; SR-015 archived at `history/sr-015-design-spec.md`)
- Supplemental Task Artifacts Reviewed: `product-model-analysis.md`; `solution-handoff.md`; `history/*` (archival)
- Relevant Solution Revision IDs: `SR-014` (approval), `SR-015` (initial design), `SR-016` (revision after ARCH-REV-001)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: Solution Designer resubmission of SR-016 addressing ARCH-REV-001 findings AR-001–AR-005
- Prior Review Round Reviewed: `1` (ARCH-REV-001, `Fail / Design Impact`)
- Latest Authoritative Round: `2`
- Current-State Evidence Basis:
  - The same worktree at `origin/personal` `40b1783f4`. The repo is unchanged apart from the untracked ticket folder.
  - Round-1 code evidence is retained.
  - Re-verified in round 2:
    - `discordBindingIdentityValidation.ts`: its only non-test importer is `messagingChannelBindingSetupStore.ts`.
    - The AE-19 test cases in `agent-team-run-manager.integration.test.ts` L147–155 and `custom-provider-readable-id-startup-migration.e2e.test.ts` L149–166/L653–657.
    - Root `index.html`: last touched `5fe4430e5`. No CI, script, or package reference, and no tracked `_nuxt/` assets.
    - All remaining `autobyteus-message-gateway` path/filter references (workflows, root/server README, `Dockerfile.allinone`, the android bootstrap) are already in the removal plan.
    - A residual `messaging` search across server and web source (results under N-2 below).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1 and still valid. SR-016 adds workspace-membership removal, which strengthens the release/packaging risk factor.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes (unchanged since round 1). SR-016 changes no intended behavior. The `requirements.md` edit is limited to the supplement status field.
- Relevant existing behavior and evidence confirmed: Yes. AE-01–AE-16 were verified in round 1. AE-17–AE-22 are re-verified in this round.
- Scope guardrail confirmed: In-scope UC-107, UC-109, UC-110, UC-111. Out of scope and Preserved as approved.
  - Moving the three in-progress tickets into `tickets/done/` adds records there. It neither deletes nor rewrites existing done records, so it does not touch the Out-of-Scope clause.
  - The requirements' "Architecture Phase Input" delegated the handling of these tickets to design.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`. No blocking findings remain.
- Remaining material ambiguity, if any: None. The AR-003 reconciliation stays within REQ-120's approved exceptions (see the Legacy and Persisted-Data sections and the AR-003 resolution).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-101 | User | Pass | Pass (`pages/settings.vue` L313–398; unknown section keeps default) | Pass (DS-003) | Confirmed | None |
| BEH-102 | System | Pass | Pass (`rest/index.ts`, `schema.ts`, route policy) | Pass (DS-001/DS-002; loopback 404, remote default protected rejection, R-4) | Confirmed | None |
| BEH-103 | System | Pass | Pass (`server-runtime.ts`, `build-studio-server.ts`) | Pass (DS-001/DS-004) | Confirmed | None |
| BEH-106 | Operational | Pass | Pass (roots from the `getAppDataDir/getDownloadDir/getLogsDir` derivations; runner catches and retries) | Pass (DS-001/DS-007; constructor-injected roots per R-1; MP-001, MP-002) | Confirmed | None |
| BEH-107 | Operational | Pass | Pass (workflows, scripts, Docker, `pnpm-workspace.yaml`, `pnpm-lock.yaml` L147, root `onlyBuiltDependencies`) | Pass (DS-006). The gateway leaves the pnpm workspace. `personal-docker.sh` and the full compose remainder are planned. The release-workflow edits are surgical (R-2). | Confirmed | None |
| BEH-108 | Contract | Pass | Pass | Pass (preserved) | Confirmed | None |
| BEH-109 | User | Pass | Pass (opaque metadata; `input_origin` fallback to `user_message`) | Pass (DS-005). The durable test uses a generic unknown metadata key, plus a one-time probe on a real binding-created run. | Confirmed | None |
| (gateway) REQ-121 | Operational | Pass | Pass (the gateway imports only `autobyteus-ts/external-channel/*`) | Pass (DS-008; the gateway is not a workspace member, so main-product install is independent of it) | Confirmed | None |
| REQ-101 / REQ-120 (cross-cutting) | Contract | Pass | Pass | Pass. The removal plan is complete (AE-17–AE-21). The verification gate has an exact allowed-hit set tied to approved exceptions, plus a supplementary residue search. | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `product-model-analysis.md` | Pass | Pass | Pass | Pass (gateway row: workspace removal, DEC-112 delete; Build/release row complete) | Pass (Approved SR-014; metadata refreshed SR-016) | None |
| `investigation-notes.md` | Pass | Pass | Pass (inventory lists `history/sr-002-*`, `sr-003-*`, `sr-008-*`; `sr-015-design-spec.md` is referenced from the design spec) | Pass (the Persisted Data section now matches REQ-114; tokens are deleted) | Pass | Non-blocking N-1 |
| `requirements.md` Supplemental Artifacts table | Pass | Pass | Pass | Pass | Pass (Current / Approved SR-014) | Non-blocking N-1 (ASM-103 still `Open`) |
| `history/*` | Pass | Pass | Pass | Pass | Pass (historical) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design spec, "Task Design Health Assessment" | None |
| Root-cause classification is explicit and evidence-backed | Pass | `Boundary Or Ownership Issue` | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor = removal. The stale gateway Dockerfile/runtime script is a user-accepted deferral (SR-011). | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The removal plan is now complete (AR-002 resolved) | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Startup/shutdown | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | HTTP ingress absence | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Settings section | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Live stream return path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | History replay (preserved) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Release/packaging/workspace | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 | Cleanup migration (bounded local) | Pass | Pass | Pass (runner authoritative; roots injected by registry) | Pass | Pass | Pass | Pass |
| DS-008 | Gateway type import (bounded local) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppDataMigrationRunner.runPending()` | Pass | Pass | Pass | Pass | The cleanup is registered, not called directly |
| Prisma `migrate deploy` | Pass | Pass | Pass | Pass | No raw DDL from TS |
| Stream contract packages | Pass | Pass | Pass | Pass | Tracked `dist/` rebuild is explicit |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Main-product packages vs gateway | Pass | Pass | Pass | Pass | No import either way, and no workspace membership |
| Cleanup migration | Pass | Pass | Pass | Pass | Depends only on `node:fs`/`node:path` and the domain types. The registry injects the roots. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `RemoveExternalMessagingDataMigration(<four roots>)` (`20260924_remove_external_messaging_data`) | Pass | Pass | Pass | Low | Pass |
| Prisma `20260924120000_remove_external_channel_tables` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Delete data on upgrade | Pass | Pass | N/A | Pass | App-data migration runner |
| Drop orphan tables | Pass | Pass | N/A | Pass | Prisma precedent (AE-11) |
| Settings deep-link fallback | Pass | Pass | N/A | Pass | `normalizeSection()` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server app-data migrations | Pass | Pass | Pass | Pass | — |
| Server Prisma | Pass | Pass | Pass | Pass | — |
| Server API/runtime/streaming/config | Pass | Pass | Pass | Pass | Signature middleware and callback accessors added |
| Contracts | Pass | Pass | Pass | Pass | — |
| Web settings/streaming/config | Pass | Pass | Pass | Pass | `.env.local.example`, README, Discord validator added |
| CI/Docker/scripts/workspace | Pass | Pass | Pass | Pass | AR-001 and AR-002 resolved |
| Gateway | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Cleanup summary helper | Pass | N/A | N/A | Pass | Local, following the precedent |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Stream unions | Pass | Pass | Pass | N/A | Pass | The unions lose one member |
| `RemoteAccessRouteClassification` | Pass | Pass | Pass | N/A | Pass | `EXTERNAL_SIGNATURE` removed |
| `AppConfig` | Pass | Pass | Pass | N/A | Pass | The three channel-callback accessors are removed. Shared normalizers are kept only if still used. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `remove-external-messaging-data-migration.ts` | Pass | Pass | N/A | Pass | — |
| `tests/unit/app-data-migrations/remove-external-messaging-data-migration.test.ts` | Pass | Pass | N/A | Pass | Temp-dir cases through constructor injection |
| Prisma `20260924120000_remove_external_channel_tables/migration.sql` | Pass | Pass | N/A | Pass | — |
| `scripts/copy-build-assets.mjs` | Pass | Pass | N/A | Pass | — |
| `tickets/done/<3 tickets>/superseded.md` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-message-gateway/src/external-channel/**`, `tests/unit/external-channel/**` | Pass | Pass | Low | Pass | — |
| `app-data-migrations/migrations/` + `tests/unit/app-data-migrations/` | Pass | Pass | Low | Pass | — |
| `tickets/done/{messaging-agent-team-support,messaging-gateway-desktop-distribution,telegram-managed-flow-hardening}` | Pass | Pass | Low | Pass | The repo has only the `done/` and `in-progress/` conventions (AE-21) |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server modules, APIs, route class, internal URL, streaming, wiring | Pass | N/A | Pass | Pass | Verified in round 1 |
| `verify-gateway-signature.ts` + its test | Pass | N/A | Pass | Pass | AR-002 resolved |
| `AppConfig.getChannelCallback*` | Pass | N/A | Pass | Pass | AR-002 resolved |
| `scripts/personal-docker.sh` gateway handling | Pass | N/A | Pass | Pass | AR-002 resolved. Server/web ports are kept. |
| `docker/compose.personal-test.yml` (`GATEWAY_*`, `MESSAGE_GATEWAY_*`, port 8010, `gateway-memory`) | Pass | N/A | Pass | Pass | AR-002 resolved. Existing named volumes are not pruned (R-3). |
| Web `.env.local.example` block + README paragraph | Pass | N/A | Pass | Pass | AR-002 resolved |
| `docs/future-tickets/mobile-backend-authorization-hardening.md` | Pass | Reworded | Pass | Pass | AR-002 resolved |
| Root `index.html` | Pass | N/A | Pass | Pass | Delete. It is stale and unreferenced, and `_nuxt/` is untracked (AE-20). |
| Web `discordBindingIdentityValidation.ts` + its spec; binding cases in 3 server tests | Pass | N/A | Pass | Pass | AE-19, re-verified |
| Gateway pnpm-workspace entry, lockfile importer, root `onlyBuiltDependencies` `@whiskeysockets/baileys` | Pass | N/A | Pass | Pass | AR-001 resolved. `protobufjs` is correctly left in place. |
| In-progress messaging tickets | Pass | `tickets/done/` + `superseded.md` | Pass | Pass | AR-004 resolved |
| Historical app-data migration branches (AE-10) | Pass | Pass | Pass | Pass | — |
| Release workflows (desktop/Android) | Pass | N/A | Pass | Pass | Surgical. The desktop version validation is kept (R-2). |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Ingress / GraphQL / stream contract / Settings | No | Pass | Pass | Aligned with the approved Non-Goals |
| Historical `externalSource` metadata | No | Pass | Pass | A generic opaque-metadata reader, not compatibility code |
| Messaging config accessors and signature middleware | No (now removed) | Pass | Pass | AR-002 resolved |
| Verification tests | No | Pass | Pass | No durable test keeps legacy route strings or fixtures. AC-102/AC-103 are verified by one-time probes whose evidence is kept in the ticket folder. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Four messaging data roots | Discard (DEC-110) | Pass | Pass | N/A (discard). Idempotent, `FAILED` retries on the next start. | Pass | Roots are injected, and tests run on temp directories |
| Orphan channel tables | Discard via Prisma migration | Pass | Pass | N/A | Pass | MP-001 |
| Historical run memory with `externalSource` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| Docker all-in-one `gateway.log`, `gateway-memory` volume | Untouched (outside approved scope) | Pass | Pass | N/A | Pass | Release-notes mention (R-3) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–2 (type move, `autobyteus-ts` cleanup) | Pass (brief unbuildable seam between steps 1 and 2 is resolved in step 2) | Pass | Pass | Pass |
| Steps 3–5 (contracts, server, web) | Pass | Pass | Pass | Pass |
| Step 6 (CI/Docker/scripts/workspace) | Pass (workspace removal and lockfile refresh after the gateway `package.json` edit in step 1) | Pass | Pass | Pass |
| Step 6a (tickets) | Pass | N/A | Pass | Pass |
| Step 7 (verification gate) | Pass | N/A | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Cleanup migration | Yes | Pass | Pass | Pass | — |
| Gateway import rewrite | Yes | Pass | Pass | Pass | — |
| Old ingress path | Yes | Pass | Pass | Pass | — |
| REQ-120 allowed-hit set | Yes | Pass | N/A | Pass | Exact paths listed |

## Material Premise Validation (Only When Needed)

The three premises from round 1 are unchanged, and the SR-016 revision affects none of them.

### `MP-001` — The Prisma table-drop migration fails and blocks startup (tension with QR-105)

- Related approved requirement or established contract: REQ-114, QR-105
- Relevant behavior ID(s): BEH-106
- Initiating basis kind: `Operational`
- Independent product-supported initiating trigger or applicable governing contract: an app upgrade, then startup `prisma migrate deploy`
- Support evidence: SCN-113; `startup/migrations.ts`
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `server start → runMigrations → 20260924120000 DROP TABLE IF EXISTS ×2`
- Lifecycle preconditions and material consequence at the claimed point: The drop fails only through DB infrastructure faults, which would fail any migration equally. There is no distinct failure mode.
- Reachability: `Not Reachable` (as a distinct failure)
- Review consequence / proportionate response: The Prisma placement is accepted, with no wrapper or fallback.

### `MP-002` — An old gateway process is still running during the cleanup

- Related approved requirement or established contract: REQ-114, QR-104
- Relevant behavior ID(s): BEH-106
- Initiating basis kind: `Operational`
- Independent product-supported initiating trigger or applicable governing contract: app upgrade and restart
- Support evidence: the supervisor spawns the gateway as a non-detached child with SIGTERM/SIGKILL on stop. Nothing spawns it after the upgrade.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `old server stop → child terminated → new server start → cleanup`
- Lifecycle preconditions and material consequence at the claimed point: No gateway process exists at cleanup time.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: No process-detection or lock-handling machinery is needed.

### `MP-003` — An older remote node emits `EXTERNAL_USER_MESSAGE` to an upgraded web client

- Related approved requirement or established contract: Non-Goal "no compatibility mode"; REQ-101
- Relevant behavior ID(s): BEH-103, BEH-109
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: the user connects the upgraded desktop to an older remote node that has an active binding
- Support evidence: No mixed-version contract exists, and the web has no version gate.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `old remote server → stream → web projector / TeamStreamingService.handleMessage`
- Lifecycle preconditions and material consequence at the claimed point: The message is logged and ignored. The stream stays connected, and history is unaffected.
- Reachability: `Unclear`
- Review consequence / proportionate response: No finding and no machinery. The approved Non-Goal governs.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`: the upstream behavior basis is confirmed, the design is ready for implementation, and no in-scope machinery or finding depends on an unsupported material premise.

## Findings

None. All ARCH-REV-001 findings (AR-001 to AR-005) are resolved. See the prior-finding resolution table in `architecture-review-revision-record.md` ARCH-REV-002.

## Classification

N/A (Pass).

## Recommended Recipient

- Primary: `/implementation_engineer`
- Informational: `/solution_designer`

## Residual Risks

**Non-blocking notes** (no rework required; the implementer or delivery can pick them up):

- **N-1:** Minor stale text remains in `investigation-notes.md`. None of it contradicts an approved requirement or the authoritative design spec.
  - "Design Health Assessment Evidence" still says transport pieces are "reused".
  - "Findings" #8 cites the retired DEC-101.
  - AE-01 still calls tracked logs a "REQ-120 exception", whereas the design gate now places them outside the search domain.
  - `requirements.md` ASM-103 is still `Open`, though it was effectively confirmed by the SR-014 approval.
- **N-2:** The supplementary residue search does not include the word `messaging`. A plain search finds only these additional hits, none of which is product behavior:
  - `autobyteus-web/scripts/lib/localizationLiteralAudit.mjs` L15. The filename regex includes `messaging`, a harmless dead alternative once the files are gone.
  - Two unrelated historical UI-prototype prompts mention a "Messaging" nav item: `ui-prototypes/current-shell-history-hierarchy/.../agents-page-history-by-workspace-default.md` L18/L58 and `ui-prototypes/server-settings-user-friendly-redesign/.../server-settings-advanced-raw-settings-v2-fresh.md` L30.
  - `tests/integration/app-font-size-fixed-px-audit.integration.test.ts` L112. It references a deleted messaging component and will fail loudly, so the implementer will fix it.

  Recording a disposition for each (keep or trim), as with the WeChat prototype illustration, is sufficient.
- **N-3:** The AC-102 and AC-103 one-time probes and the AC-119 real-run probe are validation-stage obligations. The API/E2E stage must record their evidence in the ticket folder.

**Accepted residual risks (unchanged):**

- The gateway's own Dockerfile and runtime-package script stay stale (SR-011).
- Release workflow edits cannot be fully exercised without a tag.
- The data deletion is irreversible (approved, exactly four roots).
- The gateway is left unvalidated.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. MP-001 and MP-002 are `Not Reachable`, and MP-003 is `Unclear` with a benign consequence. Nothing depends on them.
- Notes: SR-016 resolves AR-001 through AR-005 and R-1 through R-4 within the approved scope. It widens no REQ-120 exception and changes no intended behavior.
