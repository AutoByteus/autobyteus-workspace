# Design Spec — draft-run-id-validation

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (revised for ARCH-REV-001: AR-001, AR-002)
- Approved requirements: `requirements-doc.md` (SR-001 as refined on 2026-10-10, REQ-001..009, AC-001..009). Approved by the user on 2026-10-10: "what is your suggestion, do it as you suggested." DEC-001, DEC-002 and DEC-003 are all Yes.
- Behavior-defining supplements: None.
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (same folder).
- Authorities read: `references/architecture-design.md`, `design-principles.md`, `DESIGN.md` (repo root), `autobyteus-server-ts/AGENTS.md`, `TESTING.md` (read in this conversation on 2026-10-09 and still current). `design-examples.md` was not used.
- Conflicts or discrepancies: None.

## Current-State Read

Every context-file entry point parses owners and stored filenames through one codec, `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts`. The entry points are:

- `POST /rest/context-files/upload`
- `POST /rest/context-files/finalize`
- `GET` and `DELETE /rest/drafts/*`
- the four final GET routes
- `ContextFileLocalPathResolver`
- the finalization, read and layout services

The codec has two field validators:

- `safeIdentity` is non-empty, rejects surrounding whitespace, `/`, `\` and control characters, and rejects `.` and `..`.
- `required` only trims.

`required` is still used for `agent_draft.draftRunId`, `team_member_draft.teamDraftId` and `agent_final.runId`. The `filename` validator trims and rejects `..`, `/` and `\`.

`ContextFileLayout.resolveSafeChildPath` resolves the path and checks that it stays inside the root. On failure it throws a plain `Error("Invalid context-file path.")`. The draft route mapping (`sendDraftRouteError`) rethrows plain errors, which gives a 500. The agent-final route rethrows `ContextFileDescriptorError`, which also gives a 500.

A live re-probe on 2026-10-10 against the running app gave:

- `GET` on a crafted path: 200.
- `DELETE` on the same path: 204.
- A deep escape: 500.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. The change touches 3 server source files (the codec, the layout guard error class, and the agent-final route mapping) plus tests: server unit, server integration, and the existing API/E2E probe.
- Architectural risk: `High`. It tightens a security trust boundary on a shared input contract that every context-file route and the runtime locator resolver depend on. It also changes some malformed-input status codes. The risk standard classifies any material security-boundary change as High, even when it is small.
- Escalation trigger: return a `Design Impact` if any legitimate ID or stored filename fails the new rules, or if a migration test that uses `assertStoredFilename` fails.

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| Codec, lines 5–14 and 53–59 | Trim-only `required` vs. `safeIdentity`; `filename` uses a denylist | D1, D2 |
| Live re-probe (`investigation-notes.md`) | Cross-owner `GET` 200 and `DELETE` 204; deep escape 500 | Confirms the root cause |
| `context-file-layout.ts:10-17` | The guard throws a plain `Error` | D3 |
| `api/rest/context-files.ts:71-77, 166-181` | `sendDraftRouteError` rethrows plain errors; the agent-final route rethrows descriptor errors | D3, D4 |
| `context-file-upload-policy.ts` and `git show d39b26e37` | Stored names have been `ctx_<12hex>__<[A-Za-z0-9._-] stem><.alnum ext>` since the feature started (2026-04-13) | D2 is safe for all existing data |
| Users of `assertStoredFilename`: finalization, read, layout, 3 migrations | The same validator is applied to historical locators | D2 is safe because history uses the same generator; the migration tests must still pass |
| ID producers (investigation notes) | Server IDs are `<slug>_<32hex>`; web IDs are `temp-…`, `temp-chat-…`, `team-draft-<uuid>`. Older runs may contain spaces (`agent-run-id-sanitization`, NG-001) | IDs use `safeIdentity`, not a strict allowlist |
| Producers of `agent_draft`/`team_member_draft` descriptors | Only `autobyteus-web/utils/contextFiles/contextFileOwner.ts`, which sends exact fields | D5 is safe |

## Intended Change

- **D1: one identity rule.** `draftRunId`, `teamDraftId` and `agent_final.runId` are validated with `safeIdentity`. After this every owner ID field of every kind uses it. `memberAddress` keeps `assertAgentTeamAddress`. The validator then runs on decoded values, so it covers every entry point: route parameters, the wildcard draft path, upload/finalize JSON, and runtime locators.
- **D2: stored-filename allowlist.** `filename()` accepts only `^[A-Za-z0-9._-]+$`. It **rejects dot-only names (`.`, `..`, `...`)**, still rejects any `..` substring as today, and adds no trimming. A failure throws `ContextFileDescriptorError("storedFilename is invalid.")`. The dot-only rejection is required (AR-001): `resolveSafeChildPath` accepts a candidate equal to its root, so a stored filename of `.` (e.g. `%2E` in a locator) would resolve to the owner folder itself. Without it, `DELETE` gives `unlink(ownerDir)`, which fails with EISDIR/EPERM and returns 500. Generated names always start with `ctx_`, so nothing legitimate is affected.
- **D3: containment guard maps to 400.** `resolveSafeChildPath` throws a dedicated `ContextFilePathContainmentError`, a subclass of `ContextFileDescriptorError` defined in the codec file. The existing route mappings then answer 400 with `detail`. Before this change the guard produced a 500. The guard stays as defence in depth.
- **D4: agent-final route mapping.** `GET /rest/runs/:runId/context-files/:storedFilename` maps `ContextFileDescriptorError` to 400 with `detail`, matching the Team, Org and collaboration final routes.
- **D5: exact draft descriptors.** `agent_draft` accepts only `kind` and `draftRunId`. `team_member_draft` accepts only `kind`, `teamDraftId` and `memberAddress`. Any other field is rejected with `ContextFileDescriptorError`, using the same exact-field pattern as `exactOrgIdentity`.
- **Removal:** `required()` becomes dead once D1 and D2 land, so it is removed.

## Relevant Behavior And Production-Path Map (Mandatory)

| BEH | REQ / AC | Trigger | Target path | Spine |
| --- | --- | --- | --- | --- |
| BEH-001, BEH-002 | REQ-001/002/003, AC-001/002/004 | Crafted draft `GET`/`DELETE` | `/drafts/*` → `parseDraftContextFileLocator` → `safeIdentity` throws → `sendDraftRouteError` → 400 | DS-001 |
| BEH-003, BEH-004 | REQ-001/002/009, AC-003/009 | Crafted upload or finalize owner | `parseDraftContextFileOwnerDescriptor` throws → the route's existing catch → 400 with `detail` | DS-001 |
| BEH-005 | REQ-007, AC-007 | Crafted `/rest/runs/…` request | `parseFinalContextFileOwnerDescriptor` or `filename` throws → D4 mapping → 400 | DS-001 |
| BEH-006 | REQ-004, AC-005 | Locator in message content | Resolver → codec throws → caught → `null` | DS-002 |
| BEH-008 | REQ-008, AC-008 | Crafted filename | `filename()` allowlist → 400 | DS-001 |
| SCN-004 | REQ-005, AC-006 | Normal use | Unchanged results | DS-001 |

## Relevant Supplemental Task Artifacts

None. The handover file and the OBS-001 report are evidence only.

## Task Design Health Assessment (Mandatory)

- Change posture: Bug Fix (security hardening).
- Current design issue found: `Yes`.
- Root cause classification: `Missing Invariant`. The right owner already exists: the codec is the single parse point. It just doesn't apply its own safe-identity invariant to three fields, and its filename check is a denylist. The containment guard's error has no domain type, so routes cannot map it.
- Refactor needed now: `No`. The fix sits inside the existing owner. Boundaries and dependency direction are unchanged.
- Structural triggers ruled out:
  - Duplicated policy: removed, because one rule now covers every field.
  - Boundary bypass: none, because every entry point already goes through the codec. This was checked against the list in the Current-State Read.

## Terminology

N/A.

## Legacy Removal Policy (Mandatory)

There is no compatibility path. The trim-tolerant acceptance of IDs is removed rather than kept beside the new rule. `required()` is deleted.

## Persisted Data / State Transition Decision

`Not Affected`.

- Owner folder names produced by supported clients already pass `safeIdentity`.
- Stored filenames produced since 2026-04-13 match the allowlist.
- Historical run IDs with inner spaces still pass, because `safeIdentity` allows inner spaces.
- No migration is needed.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary | HTTP request to any context-file route | 400 with `detail`, or the unchanged valid result | Codec, then the route error mapping |
| DS-002 | Primary | Runtime resolves a locator from message content | A local path, or `null` | Codec, via `ContextFileLocalPathResolver` |

## Primary Execution Spine(s)

- DS-001: `HTTP route → codec parse (owner and filename validation) → owner resolver / layout (containment guard) → read/upload/finalize service → filesystem`. A failure at any validation node surfaces as `ContextFileDescriptorError` and becomes 400 with `detail`.
- DS-002: `message locator → ContextFileLocalPathResolver → codec parse → layout → path | null`.

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Untrusted input is decoded, then validated once in the codec before any lookup or filesystem access. If an invalid path still slips through, the layout guard catches it and raises the same family of domain error, so the response is always a 4xx with an explanation and no file is touched. |
| DS-002 | The runtime gets exactly the same validation: an invalid locator is unresolved. |

## Spine Actors / Main-Line Nodes

The REST routes (`context-files.ts`), the codec (`context-file-owner-types.ts`), `ContextFileLayout`, and the existing services.

## Ownership Map

- **Codec:** owns input validity for owner IDs, descriptors and stored filenames, and owns the error types.
- **Layout:** owns path containment and raises a codec error type.
- **Routes:** own only the HTTP status mapping.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced by | Scope |
| --- | --- | --- | --- |
| `required()` in the codec | Dead after D1 and D2: no remaining callers | `safeIdentity` and the `filename` allowlist | In This Change |
| Trim-and-accept behavior for the three IDs and for filenames | Superseded | Strict validation | In This Change |
| Plain `Error("Invalid context-file path.")` | No domain type to map | `ContextFilePathContainmentError` | In This Change |
| `observeOnly` flags on the three API/E2E probe rows | Become graded | Pass/fail assertions | In This Change |
| `getStoredFilenameFromLocator` (codec export) and its unit-test assertions | Dead: a repo-wide grep finds callers only in `tests/unit/context-files/context-file-owner-types.test.ts`, and it delegates to `filename()`, whose semantics change (AR-002) | — | In This Change |
| `getDisplayNameFromStoredFilename` (server codec export) and its unit-test assertions | Dead on the server: same grep; the web has its own separate function in `contextAttachmentModel.ts`, which is unaffected (AR-002) | — | In This Change |

## Off-Spine Concerns Around The Spine

None new.

## Ownership Boundaries

Validation lives only in the codec. Routes must not add their own ID checks. The layout must not accept unvalidated input from outside: it already calls `assertStoredFilename`.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden |
| --- | --- | --- | --- |
| Codec parse functions | Field validity | All routes, services, resolver, migrations | Per-route ad hoc ID or regex checks |

## Dependency Rules

Unchanged. The layout already imports from the codec domain file, and it now also imports the containment error from there.

## Interface Boundary Mapping

| Interface | Change |
| --- | --- |
| `parseDraftContextFileOwnerDescriptor` | `agent_draft` and `team_member_draft` use exact fields and `safeIdentity` |
| `parseFinalContextFileOwnerDescriptor` | `agent_final.runId` uses `safeIdentity` |
| `assertStoredFilename` / `filename` | Allowlist `[A-Za-z0-9._-]+`; rejects dot-only names and any `..` substring |
| `ContextFilePathContainmentError` | New export, a subclass of `ContextFileDescriptorError` |
| Agent-final route | Maps `ContextFileDescriptorError` to 400 |

HTTP mapping after the change:

| Request | Response | Notes |
| --- | --- | --- |
| Malformed or traversal ID, filename or descriptor, and containment failures | 400 `{detail}` | All routes |
| Owner not found | 404 | Unchanged |
| Valid draft `GET` of a missing file | 404 | Unchanged |
| Valid draft `DELETE` | 204 | Unchanged |

## Interface Boundary Check

Each interface has a single responsibility and an explicit identity shape. Risk is Low.

## Main Domain Subject Naming Check

`ContextFilePathContainmentError` is a natural name.

## Existing Capability / Subsystem Reuse Check

Reuse `safeIdentity`, the `exactOrgIdentity` pattern, and the existing route mappings. Nothing new is created apart from the error subclass.

## Subsystem / Capability-Area Allocation

`context-files/domain` (extend), `context-files/store` (modify), `api/rest` (modify).

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts` | D1, D2 (including dot-only rejection), D5; export `ContextFilePathContainmentError`; remove `required`, `getStoredFilenameFromLocator` and `getDisplayNameFromStoredFilename` |
| `autobyteus-server-ts/src/context-files/store/context-file-layout.ts` | `resolveSafeChildPath` throws `ContextFilePathContainmentError` |
| `autobyteus-server-ts/src/api/rest/context-files.ts` | D4: the agent-final route maps `ContextFileDescriptorError` to 400 with `detail` |
| `autobyteus-server-ts/tests/unit/context-files/context-file-owner-types.test.ts` | Per-kind and per-field validator cases. Legitimate formats: `<slug>_<32hex>`, `temp-1728555555555-3`, `temp-chat-…`, `team-draft-<uuid>`, an ID with inner spaces, and an encoded team `memberAddress`. Rejected: `..`, `.`, `a/b`, `a\b`, `%00`, surrounding spaces, extra fields. Filename cases: a generated name passes; `.`, `..`, `...`, `a..b`, `a b`, `a:b` and `a\u0000b` are rejected. The tests for the removed `getStoredFilenameFromLocator` and `getDisplayNameFromStoredFilename` are deleted. |
| `autobyteus-server-ts/tests/unit/context-files/context-file-layout.test.ts` | The guard throws `ContextFilePathContainmentError` |
| `autobyteus-server-ts/tests/integration/api/rest/draft-context-files-universal.integration.test.ts` | Extend `INVALID_LOCATORS` with `agent-runs` and `team-runs` traversal cases, `%00` filenames, and dot-only filenames (`.../context-files/%2E` and `.../context-files/.`; `GET` and `DELETE` must both give 400 with `detail` and leave the owner folder intact). Each must give 400 with `detail`, with sentinel files intact. Add upload and finalize cases with traversal and extra-field owners. |
| `autobyteus-server-ts/tests/integration/api/rest/context-files.integration.test.ts` | Agent-final: `%2E%2E` `runId` and an invalid filename give 400 with `detail` |
| `autobyteus-server-ts/tests/unit/context-files/context-file-local-path-resolver.test.ts` | A traversal draft locator resolves to `null` |
| `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs` | Grade the three `observeOnly` rows as 400 with `detail` and assert that all three sentinels survive (draft-root level, other owner, app data). Add `team-runs/..%2F…` and `/rest/runs/%2E%2E/…` rows, and a draft `DELETE` row for `/rest/drafts/agent-runs/<valid owner>/context-files/%2E` (400 with `detail`, owner folder and its files intact). |
| `TESTING.md` | CF-001 description (around line 874): state that traversal-shaped paths for `agent-runs`, `team-runs` and `/rest/runs/` must return 400 with `detail` and leave all sentinels intact |

## Reusable Owned Structures Check / Shared Structure Tightness

N/A beyond the existing codec.

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

As in the table above. No new files or folders.

## Folder Boundary Check

Unchanged.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| ID field | `draftRunId: safeIdentity(input.draftRunId, "draftRunId")` | `required(String(input.draftRunId ?? ""), …)` |
| Filename | `/^[A-Za-z0-9._-]+$/.test(v) && !/^\.+$/.test(v) && !v.includes("..")` | Denylisting individual bad characters; forgetting dot-only names (`.` resolves to the owner folder) |
| Containment | `throw new ContextFilePathContainmentError("context-file path escapes its owner folder.")` | `throw new Error(...)`, which becomes a 500 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep trimming and accepting IDs with surrounding whitespace | Rejected | Strict `safeIdentity` (the web already trims) |
| A strict character allowlist for owner IDs | Rejected | `safeIdentity` plus the containment guard. Historical IDs may contain inner spaces, so a strict allowlist would block composing in old runs |
| Tolerate extra descriptor fields | Rejected | Exact fields (DEC-003) |

## Change / Refactor Sequence

1. Codec changes (D1, D2, D5) and the unit tests.
2. Layout error class (D3) and the layout test.
3. Agent-final route mapping (D4).
4. Server integration tests. Run `pnpm -C autobyteus-server-ts typecheck`, the unit suite, and `test:integration:prepare` followed by `test:integration`. The migration test suites that use `assertStoredFilename` must pass. The known PB-001 cadence failures are the accepted pre-existing exception.
5. Grade the API/E2E probe rows, update `TESTING.md`, and run the probe for the traversal cases (CF-001) against a freshly built backend.

## Key Tradeoffs

Owner IDs get a denylist (`safeIdentity`) plus the containment guard, while stored filenames get an allowlist. Filenames are always server-generated, so the allowlist cannot break anything. Owner IDs include historical run IDs, so the shared rule plus the guard is the safe choice for them.

## Risks

- Some unknown third-party client may send untrimmed IDs or extra fields. That client would now get 400. No such client exists in the repo.
- The migrations use `assertStoredFilename` on historical names. Those names come from the same generator, and the migration tests will confirm this.

## Guidance For Implementation

- Do not change locator strings, the layout paths, the upload naming, or the Project-task context routes.
- Every new error must carry a human-readable `detail` message.
- Follow `TESTING.md`. Record the PB-001 exception as pre-existing.
