# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/requirements-doc.md` (Approved; SR-002 basis unchanged)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed: None (none exist)
- Relevant Solution Revision IDs: SR-002 (approved requirements), SR-003 (round 1), SR-004 (round 2), SR-005 (round 3)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: SR-005 re-review request from `/solution_designer`. It resolves code-review failure-origin finding CR-002 / API-F-001 (CRR-003): the SR-004 `downloaded`-status lock can be bypassed after a manual or failed check.
- Prior Review Round Reviewed: Round 2 (`ARCH-REV-002`, Pass on SR-004)
- Latest Authoritative Round: 3
- Downstream Evidence Reviewed:
  - `code-review-report.md` § "API/E2E Failure-Origin Review — API-F-001"
  - `api-e2e-evidence/harness-results/E2E-07b-downloaded-then-check-then-opt-out.json`
  - The current implemented `appUpdater.ts`: `applyState` merges partial state, and the `checkForUpdates` guard blocks only checking and downloading
  - electron-updater 6.8.3: `DownloadedUpdateHelper.clear()` is called only in the download-failure cleanup path (`AppUpdater.js` ~609)
- Current-State Evidence Basis:
  - Round 1 evidence remains valid: electron-updater 6.8.3 and app-builder-lib 25.1.8 sources, the workflows, the updater and renderer files, and the release script.
  - Round 2 additions:
    - `release-server-docker.yml` `build-and-push` job: checkout of `release_ref` with `fetch-depth: 0`, then QEMU, buildx, Docker Hub login and `build-push-action`, all in one job.
    - `git tag -l 'v*'`: 310 tags, of which 301 match the pinned canonical grammar (verified).

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: Unchanged from round 1 and still sound.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Requirements are unchanged since SR-002. The SR-004 edits are design-only, and the Solution Designer states the intended behavior is unchanged. I confirmed this: REQ-007's promise is kept rather than altered.
- Relevant existing behavior and evidence confirmed: Yes (round 1, plus the Docker job structure above)
- Scope guardrail confirmed: Yes
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain)
- Remaining material ambiguity: None

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass. The round-2 lock was proven bypassable at runtime (E2E-07b: `downloaded` → Check → `available` → `set-channel:stable` accepted). | Pass. SR-005 locks on a sticky per-process `updateStaged` (set on `update-downloaded`, never cleared in-process, false at startup) through one shared rule, `isAppUpdateChannelLocked(state)`, used by both the main-process guard and the About switch. A later check or error no longer unlocks it. | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass. `next-beta` uses the canonical grammar and strict `--base`, and its refusals are enumerated. | Confirmed | — |
| BEH-007 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | Operational | Pass | Pass | Pass. The canonical grammar ignores rc, e2e and voice tags. `:beta` moves in a post-push step after a tag re-fetch, and the failed-newer-build residual is documented. | Confirmed | — (see ARCH-005, non-blocking) |

## Supplemental Artifact Coherence Verdict

None.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; No Design Issue Found | — |
| Root-cause classification is explicit and evidence-backed | Pass | Unchanged; verified in round 1 | — |
| Refactor decision is explicit | Pass | No refactor; local extraction of the `release` tail | — |
| Refactor decision is supported by the concrete design sections | Pass | — | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade Vs Owner | Naming | Ownership | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Desktop publish | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Update check | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Channel switch | Pass | Pass (lock = busy status OR sticky `updateStaged`; one shared rule for main and renderer; result shape explicit) | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Beta command | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Docker `:beta` | Pass | Pass (owner moved to the build-and-push final step; decision taken after the push) | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppUpdater.setUpdateChannel` | Pass | Pass | Pass | Pass | Sole owner of the guard, persistence call, policy and re-check. It sets `updateStaged` only in its own `update-downloaded` listener. The renderer reads the mirrored fact and never decides the lock on its own. |
| `appUpdateChannelStore.ts` | Pass | Pass | Pass | Pass | — |
| `release_versions.py` | Pass | Pass | Pass | Pass | The one grammar and ordering authority for both callers |

## Dependency Direction / Forbidden Shortcut Verdict

All pass. This is unchanged from round 1; the Docker step depends on the helper read-only.

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| IPC `app-update:set-channel` → `AppUpdateChannelChangeResult {accepted, persisted, state}` | Pass | Pass | Pass | Low | Pass |
| `AppUpdateState.updateChannel` / `currentVersionIsPrerelease` | Pass | Pass | Pass | Low | Pass |
| `release_versions.py next-beta` | Pass | Pass | Pass (canonical grammar; strict `--base`) | Low | Pass |
| `release_versions.py is-newest` | Pass | Pass | Pass (an out-of-grammar candidate gives `false`) | Low | Pass |
| `desktop-release.sh beta` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

All pass (unchanged).

## Subsystem / Capability-Area Allocation Verdict

All pass (unchanged).

## Reusable Owned Structures Verdict

| Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AppUpdateChannel`, `AppUpdateChannelChangeResult` | Pass | Pass | Pass | Pass | Shared main/renderer types |
| Canonical release-tag grammar and precedence | Pass | Pass | Pass | Pass | Defined once in the design terminology; implemented once in `release_versions.py` |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `AppUpdateState` additions | Pass | Pass | Pass | N/A | Pass | No save-error fields. `updateStaged` has one meaning (downloaded in this process, so it installs on quit) and does not overlap with `status`, which is transient. `applyState` merges partial state, so the flag survives later status changes. |
| `isAppUpdateChannelLocked(state)` | Pass | Pass | Pass | N/A | Pass | Replaces the status-only `APP_UPDATE_CHANNEL_LOCKED_STATUSES`, which the Removal plan removes. Main and renderer share one rule, so the two cannot drift apart. |
| `AppUpdateChannelChangeResult` | Pass | Pass | Pass | N/A | Pass | Command result only; not mirrored into state |
| `app-update-channel.v1.json` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

All pass. The store, About, i18n, Docker workflow and test-fixture rows now reflect the SR-004 changes.

## Subsystem / Folder / File Placement Verdict

Pass (unchanged).

## Removal / Decommission Completeness Verdict

Pass. Prepare-release carries no `:beta` logic. SR-005 explicitly removes `APP_UPDATE_CHANNEL_LOCKED_STATUSES` and its imports, and nothing replaces it with a dual path.

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retention | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Desktop classification | No | Pass | Pass | — |
| Channel preference | No | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `userData/app-update-channel.v1.json` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Unchanged |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Helper → workflows → script → updater → renderer → tests → docs | Pass | Pass | Pass | Pass |

Step 2's wording ("Docker checkout/`is-newest`/`:beta`") predates the revision. The authoritative Docker shape is in DS-005, the file mapping and the Guidance, which agree with each other.

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Channel application | Yes | Pass | Pass | Pass | — |
| Ordering / next-beta | Yes | Pass | Pass | Pass | — |
| Real tag inventory | Yes | Pass | Pass (lax regex shown) | Pass | — |
| Concurrent betas | Yes | Pass | Pass | Pass | — |
| Switch after a download (CR-002) | Yes | Pass | Pass (status-only lock shown as the avoided shape) | Pass | `downloaded` → Check → `available`/`error` → still locked; `accepted:false` |
| Docker tags | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

The round-1 premises have been rechecked.

- **P-001 (downloaded-state opt-out):** Still Reachable as a user action. The design now refuses the change, so the consequence is eliminated.
- **P-002 (real tag inventory):** Still Reachable. It is neutralized by the canonical grammar. I verified that 301 of the 310 `v*` tags match it and that the 9 excluded tags are exactly the rc, e2e and voice tags.
- **P-003 (concurrent Docker runs):** Still Reachable. Deciding after the push plus a tag re-fetch resolves it. The failed-newer-build residual is documented with a re-run remedy.
- **P-004 (`e2e` profile):** Not Reachable; unchanged, and it drives nothing.

### `P-005` — Manual-dispatch re-publish of a tag older than this change

- Related approved requirement: REQ-010 ("If an older tag is re-published by manual dispatch, `beta` must not move backward")
- Relevant behavior IDs: BEH-008
- Initiating basis kind: `Operational`
- Independent trigger: The operator runs the Docker workflow by `workflow_dispatch` with `release_tag` set to an existing older tag, for example `v1.4.80`. This is an input the workflow already supports, and REQ-010 names this case.
- Forward path: `build-and-push` checks out `release_ref`, which defaults to `release_tag`, so the checkout is the older tag's tree. That tree predates `scripts/release_versions.py`. After the version and `latest` images are pushed, the final step runs `python3 scripts/release_versions.py is-newest …` from that checkout.
- Consequence:
  - The file is missing, so the step exits non-zero. `:beta` is not moved, which is correct for REQ-010.
  - The run is marked failed even though the publish itself succeeded. This only affects operator-visible run status.
  - No wrong image is published and no user is affected.
- Reachability: `Reachable`
- Review consequence: ARCH-005 (Low, non-blocking implementation note)

### `P-006` — After a download, a manual or failed check moves the status away from `downloaded` while the update stays staged

- Related approved requirement: REQ-007 / AC-008; REQ-002 / QR-001
- Relevant behavior IDs: BEH-004
- Initiating basis kind: `User`
- Independent trigger: About → Updates. The user downloads an update, then clicks "Check for updates", which is enabled in `downloaded` (preserved behavior). The check may also end in an error, for example when offline.
- Forward path: `AppUpdater.checkForUpdates` blocks only checking and downloading, so the check proceeds and the status becomes `available`, `no-update` or `error`. The electron-updater quit handler is still registered, and `DownloadedUpdateHelper` still holds the file. Verified by runtime evidence (E2E-07b) and by the code-review failure-origin review.
- Consequence under SR-004: the switch unlocks and opting out is accepted, but the staged beta still installs on quit. This violates REQ-007.
- Reachability: `Reachable` (confirmed at runtime)
- Review consequence: Resolved by SR-005, whose lock is a sticky `updateStaged`.

### `P-007` — A replacement download fails after an earlier update was staged

- Relevant behavior IDs: BEH-004
- Initiating basis kind: `User`
- Trigger and path: Staged beta.N → Check → `available` beta.N+1 → Download → the download fails. The electron-updater failure cleanup calls `downloadedUpdateHelper.clear()`, so on Windows and Linux the earlier file may no longer be staged. On macOS, Squirrel may still hold the earlier update.
- Consequence: `updateStaged` stays true, so the switch stays locked until the next restart even though nothing may be staged. This errs on the safe side: the hint (install or restart) remains truthful enough, and no REQ is violated.
- Reachability: `Reachable`
- Review consequence: None. The conservative lock is correct given the platform differences, and no machinery is needed.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

No new findings in round 3. CR-002 / API-F-001 is resolved at the design level by SR-005. ARCH-005 (below) was applied by implementation, as recorded in CRR-003.

### ARCH-005 — The Docker "Move beta tag" step should run the helper from the workflow revision

- Type: Design Impact (implementation note)
- Severity: Low (non-blocking)
- Protected: REQ-010 (operability of manual re-publish)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: P-005. `build-and-push` checks out `needs.prepare-release.outputs.release_ref`. Tags up to `v1.4.89` do not contain the new helper.
- Required update (for implementation; no design re-review needed): load the helper from the workflow's own revision rather than from the release checkout. For example, `git show "$GITHUB_SHA:scripts/release_versions.py" > "$RUNNER_TEMP/release_versions.py"`; the full-history checkout contains that commit. Keep the grammar and decision logic unchanged. Validation should include one manual-dispatch re-publish case in the workflow review.
- Why proportionate: A one-line change that avoids a false red run. No new machinery.
- Recommended recipient: `/implementation_engineer` (with the Pass package)

## Classification

N/A. The review passes; ARCH-005 is a non-blocking implementation note.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- RSK-001 (accepted): beta resolution follows the order of the releases feed. At worst the result is "no update", never a downgrade.
- UNK-001 was resolved from source. The first real beta CI run must inspect the release assets and flags, and the design's escalation triggers apply.
- Failed newer Docker build (accepted): `:beta` can stay one build behind until the failed run is re-run.
- Beta users will hit the pre-existing release-window race more often; the outcome is bounded to the existing classified error.
- The Android patch ≤ 99 limit is pre-existing and out of scope.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes:
  - Round 3 (SR-005): the sticky `updateStaged` lock with one shared rule correctly restores ARCH-001 / REQ-007 against the runtime-proven bypass (P-006). Preserved Check and install-on-quit behavior are untouched.
  - The required regression is well specified: after `update-downloaded`, a check ending in available, no-update or error, followed by `setUpdateChannel`, must return `accepted:false`. It should also include a UI assertion that the switch stays disabled with the hint.
  - The over-lock after a failed replacement download (P-007) is acceptable.
  - ARCH-001..005 are all resolved or applied.
