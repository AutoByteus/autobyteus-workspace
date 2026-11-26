# Design Review Report — autobyteus-516 Stage 1 (extension foundation, proven by Voice Input)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/tickets/in-progress/autobyteus-516-extensions/requirements-doc.md` (SR-006 + DEC-017…019)
- Upstream Investigation Notes: `…/investigation-notes.md`
- Upstream Solution Revision Record: `…/solution-revision-record.md`
- Reviewed Design Spec: `…/design-spec.md` (SR-007, revised by SR-008)
- Supplemental Task Artifacts Reviewed: `extension-contract.md` (approved, behavior-defining; §2/§3/§5 wording made exact in SR-008), `use-case-spines.md` Part V and "Final check of Stage 1", `probes/contract-probe`, `probes/spine-probes`, Product `ui-ux-spec.md` (VIS-V*, TR-001/002/024), `staged-plan.md` (informative)
- Relevant Solution Revision IDs: SR-006, SR-007, SR-008
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer round-2 handoff 2026-11-26 (SR-008: AR-001…AR-005 resolved)
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: the worktree was fast-forwarded to `origin/personal` @ `fdde5406fa`, 0 commits behind on 2026-11-26. The round-1 evidence was re-checked at that revision: `directNodeApolloClient.ts`, `remote-access-request-origin.ts`, `nodeCredentialAttacher.ts`, `electronApplication.ts`, `voiceInputStore.ts`.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`.
- Rationale reviewed: a new server subsystem, owner-only routes, download-and-run of code in the node process, a contract frozen across versions, a long-lived child process, deletion of user data, a signed release across repositories.
- Independent Architecture Review required: `Yes`.
- Correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved requirements understood: UC-001…006, REQ-001…012, AC-001…012, DEC-001…019. The founder approved the design on 2026-11-26. SR-008 changes no intended behavior; the contract wording was made exact.
- Scope guardrail confirmed as in round 1.
- Every prospective blocking finding is traceable to an approved ID: `Yes`. No blocking finding remains.
- Statements about existing code, opened at their cited lines at `fdde5406fa`: they hold. One stale reference remains: the removal-plan row `electronApplication.ts:39-40,69,373,400` should read `electron/application/electronApplication.ts:38-39,68,371,398`. Current-State Read already has the right lines. This is a note for the implementer, not a finding.

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Data | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | User | Pass | Pass | Pass | Confirmed | — |

Why each row is confirmed:

- BEH-001:
  - The catalog fetch policy is stated (AR-002).
  - The page's allowed loads match the node's origin rule (AR-003).
  - The catalog URL is fixed (AR-005).
- BEH-003 and BEH-004:
  - `voiceInputStore` reads the embedded node's item in every window through `directNodeApolloClient`, which attaches the credential by origin and is bounded at 25 s.
  - It refreshes at window start, when a voice surface mounts, on window focus, after this window's lifecycle change, and on `EXTENSION_OFF` / `EXTENSION_NOT_INSTALLED` (AR-001).

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose/Scope | Linked | Complete | Consistent | Status/Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| extension-contract.md | Pass | Pass | Pass | Pass | Pass (shape of parts 1–5 unchanged; §2 load kinds and §3 URL made exact) | — |
| use-case-spines.md | Pass | Pass | Pass | Pass | Pass | — |
| Product ui-ux-spec.md (VIS-V*) | Pass | Pass | Pass | Pass (REQ-007 row and VIS-V3-01 superseded by DEC-016) | Pass | — |
| probes/* | Pass | Pass | Pass | Pass | Pass (evidence; the real-node page check is added to AC-002) | — |
| staged-plan.md | Pass | Pass | Pass | Pass | Pass (informative) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | design-spec | — |
| Root cause explicit and evidence-backed | Pass | Boundary/Ownership: the owner sits in the Electron main process | — |
| Refactor decision explicit | Pass | Yes | — |
| Reflected in the design | Pass | Ownership map, removal plan, sequence | — |

## Data Contract Verdict

| Record / Message | Fields | Identities / Lifecycle | Walked + Examples | Checked Against Real Deps | Layers Follow | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `extension.json` / catalog entry + location (§1, §3) | Pass | Pass | Pass | Pass (CP 31/31) | Pass | Pass |
| package layout and page loads (§2) + bridge (§5) | Pass | Pass | Pass | Pass (origin rule read; real-node page check in AC-002) | Pass | Pass |
| server part (§4) | Pass | Pass | Pass | Pass | Pass | Pass |
| `state.json` / folders (§7) | Pass | Pass | Pass | Pass | Pass | Pass |
| ExtensionList / ExtensionItem; `extensions(refreshCatalog)` | Pass (`message` precedence stated) | Pass | Pass | Pass | Pass | Pass |
| action route and error codes | Pass | Pass | Pass | Pass (SP-1, SP-2) | Pass | Pass |
| microphone choice | Pass | Pass | Pass | Pass | Pass | Pass |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | One Owner, Call Order | Off-Spine Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 list | Primary | Pass | Pass | Pass | Pass | Pass (fetch only on open / Try again; polls use the copy in memory) | Pass | Pass |
| DS-002 install/update | Primary | Pass | Pass | Pass | Pass | Pass (a fetch that must verify, at the start) | Pass | Pass |
| DS-003 on/off/remove | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 dictate | Primary | Pass | Pass | Pass | Pass | Pass (`refreshAvailability` is the first step) | Pass | Pass |
| DS-005 page call | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 start/stop | Bounded local | Pass | Pass | N/A | Pass | Pass (a late `start` after Off is ignored) | Pass | Pass |
| DS-007 voice worker | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 old install deletion | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-009 polling | Return | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Extension Manager | Pass | Pass | Pass | Pass | — |
| Server Part Host | Pass | Pass | Pass | Pass | Foreign-code boundary; per-load import key |
| Extension Page Bridge | Pass | Pass | Pass | Pass | — |
| `voiceInputStore` (this computer's voice availability) / `extensionsStore` (window's node) | Pass | Pass | Pass | Pass | Each owns one subject. `extensionsStore` → `voiceInputStore.refreshAvailability()` is a notification with no data (Principle 9) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed | Forbidden | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `api/*` → Manager → catalog/installer/host/store/log | Pass | Pass | Pass | Pass | — |
| web stores → nodes | Pass | Pass | Pass | Pass | Dependency rules updated |

Principle 16: `Pass`. The Manager reaches resolvers through the request context and routes through their dependencies. `startEnabled()` runs after listen, and `stopAll()` runs in `closeProcessResources`. Keep the manager parameter of `registerGraphql` required. Its two test callers (`tests/integration/api/run-file-changes-api.integration.test.ts`, `team-communication-api.integration.test.ts`) pass one.

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `extensions(refreshCatalog)`, `extensionLog(id)` | Pass | Pass | Pass | Low | Pass |
| lifecycle mutations (`id`) | Pass | Pass | Pass | Low | Pass |
| `POST /rest/extensions/:id/actions/:action` | Pass | Pass | Pass | Low | Pass |
| `GET /rest/extensions/:id/ui/*` | Pass | Pass | Pass | Low | Pass |
| `ServerPartHost.load` → `LoadedServerPart` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`.

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| startup/shutdown, owner check, signature technique, client migrations, polling, direct node client | Pass | Pass | N/A | Pass | `directNodeApolloClient` reused for the embedded-node read |
| per-extension log | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation | Decision | Supports Spine | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/extensions/*` | Pass | Pass | Pass | Pass | — |
| web extensions / voice | Pass | Pass | Pass | Pass | — |
| `AutoByteus/autobyteus-extensions` release | Pass | Pass | Pass | Pass | Fixed `catalog` tag, never Latest; packages use `<id>-v<version>` |

## Reusable Owned Structures Verdict

| Structure | Evaluated | Shared File | Ownership | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `domain/extension-description.ts`, `domain/extension-item.ts` | Pass | Pass | Pass | Pass | — |

## Shared Structure Tightness Verdict

| Structure | One Meaning | No Redundancy | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| ExtensionItem | Pass | Pass | Pass | N/A | Pass | `message` precedence stated |

Derived consumers listed: `Pass`. Vocabulary (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `src/extensions/*`, `api/*` | Pass | Pass | Pass | Pass | — |
| `stores/voiceInputStore.ts`, `stores/extensionsStore.ts` | Pass | Pass | N/A | Pass | — |
| `extension-catalog-source.ts`, release scripts | Pass | Pass | N/A | Pass | Fixed URL |

## Subsystem / Folder / File Placement Verdict

| Path | Clear | Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/extensions/{domain,catalog,packages,server-parts,storage,services}` | Pass | Pass | Low | Pass | — |
| web `components/settings/extensions/`, `services/extensions/` | Pass | Pass | Low | Pass | — |
| `autobyteus-server-ts/tests/real-release/` | Pass | Pass | Low | Pass | AC-002 real-release test |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Electron manager, IPC, preload/types, old card, store transports, tests, localization | Pass | Pass | Pass | Pass | — |
| `package.json:29` script, `vi.mock` specs, `voiceInputStore.spec.ts`, e2e fixtures, `electron.d.ts:27-31,109` | Pass | Pass | Pass | Pass | Added in SR-008 |

## Legacy / Backward-Compatibility Verdict

| Area | Compat Retained | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Electron path / IPC fallback / reading the old registry | No | Pass | Pass | — |
| Frozen extension contract | Approved exception (DEC-012) | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<baseDataRoot>/extensions` (old desktop install) | Discard (DEC-016) | Pass | Pass | N/A (idempotent `rm`, retried on failure) | Pass | Separate from `<baseDataRoot>/server-data/extensions` |
| `<data dir>/extensions/*` | New data | Pass | Pass | N/A | Pass | See the messaging-gateway note below |

The obsolete messaging gateway once lived in `<data dir>/extensions/messaging-gateway`. It is deleted by the existing required-on-startup migration `20260924_remove_external_messaging_data` before the node listens; the founder confirmed the gateway is obsolete. The node counts an extension as installed only when `<id>/package/extension.json` is valid, so any leftover folder without it is ignored.

## Change / Refactor Safety Verdict

| Area | Sequence | Seams | Cleanup | Verdict |
| --- | --- | --- | --- | --- |
| Server → package → web → desktop removal → docs → tests | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| list payload, gating, long install, import key, availability read, page loads | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### MP-001 — a sandboxed extension page's CORS-mode loads reach the node's origin rule with `Origin: null`

- Reachability: `Reachable` (round 1).
- Response accepted in round 2:
  - Contract §2 allows only loads that send no `Origin` (inline code, classic scripts, stylesheets and images from `ui/`), plus fonts as `data:`.
  - The CSP matches: `font-src data:`, no module scripts from files.
  - The node gate is unchanged.
  - AC-002 adds a check of the packaged Voice Input page through the real node and the desktop's credential attacher.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`.

## Findings

None open. AR-001…AR-005 are resolved; see `ARCH-REV-002` in the revision record.

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer` (primary). `/solution_designer` gets the informational notice.

## Residual Risks

- In-process server parts: a server part that blocks the event loop affects the node. The deviation is recorded and its reason holds (first-party signed code).
- The catalog release replaces the two assets of the `catalog` tag. Between the delete and the upload a fetch can see `unreachable` for a moment; Install and Update then refuse until the next fetch. This is acceptable.
- The development override variables let whoever controls the node's environment trust another key. That person already controls the machine. The module doc says so (SR-008).
- One stale removal-plan reference: it should read `electron/application/electronApplication.ts:38-39,68,371,398`.
- Voice runtime 0.3.2 on Apple Silicon needs Homebrew `ffmpeg`. The card shows the worker's reason (design Risks).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: Large / High confirmed. The design is ready for implementation on `codex/autobyteus-516-extensions` @ `fdde5406fa`.
