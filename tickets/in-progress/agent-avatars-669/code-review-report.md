# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002; REQ-001…008, AC-001…007, DEC-001…007)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (data contract, S-1…S-4, W-1…W-6, walks)
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass; N-1…N-5). It is untracked and was left as found.
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`. Round 2 is the `API/E2E Failure-Origin Review` of API-REV-001 F-1 (code tested `950061c296`, API/E2E commit `befbfcd154`, reproduction AV-02). Round 1 below stays as recorded.
- Previous: `CRR-001`
- Current Review Round: `2`
- Review Scope: `Full Review` of `ea787a37b1..950061c296` (code commits `785fa286a9`…`8a185cc850`)
- Trigger: implementation engineer, IR-001, Large / High

## Routing Classification Review

Large / High: a new route that reads node files for phones, a shared contract change, and every avatar renderer replaced. `Implementation Review`. Confirmed.

## Review Scope

- **Read:**
  - server:
    - `definition-avatar-file.ts` (S-1), `definition-avatar-address.ts` (S-2), `definition-avatars.ts` (S-3, the route);
    - `definition-avatar-fields.ts` (GraphQL);
    - the agent, team, org and personal-settings services' input handling;
    - the watcher allow-list;
    - the run-tree records and `run-own-agents-reader` (S-4);
  - web:
    - `DefinitionAvatar.vue` (W-1), `useAvatarObjectUrl.ts` (W-2), `definitionAvatarStore.ts` (W-3);
    - the change-feed hook;
    - `authorizedResourceUrl` (the new protected prefix);
    - `mobileRunListRows` (W-4);
    - the forms' use of `userAvatarUrl` (W-6);
    - the update and personal-settings callers, to check what `null` now means.
- **Re-run by me at `950061c296`:**
  - server: `agent-package-definitions`, the route, node route permissions, personal settings, delegation, the own-agents reader, team definitions; 42 files and 439 tests passed;
  - web: the avatar composable and store, `components/common`, `runList`, `mobile/runList`, `workspace/history`, `utils/mobile`, agents, agentTeams, agentOrgs, conversation; 78 files and 597 tests passed.
- **Excluded:** the probe (IMP-003 used) and the full suites (IMP-002).

## Upstream Behavior And Production-Path Basis Confirmation

Behavior-basis status: `Confirmed`.

| Behavior | Status | Evidence |
| --- | --- | --- |
| REQ-001, REQ-002 (the convention; invalid ignored and logged once) | Confirmed | `readDefinitionAvatar`:
  - reads the four names only, with one candidate allowed;
  - `lstat` refuses a symlink or non-file;
  - accepts at most 1 MiB, and reads with `O_NOFOLLOW`;
  - checks PNG, JPEG and WebP magic bytes;
  - caches the hash by size and mtime (N-3).

  `readPackageAvatar` logs per folder only when the reason changes (N-2). The hash is part of the fingerprint; the watcher now allows `avatar.*` |
| REQ-003 (the order; Remove only for the user's picture; never pin the package's) | Confirmed | `effectiveBaseAvatarUrl` returns the config's or personal picture, else the package address, else null. `userAvatarUrlOf` counts only the personal setting for package definitions, the config for the user's own. `userAvatarInput` treats `null`, `''` and any definition-avatar address (by path) as clear, in every create, update and personal path. The forms fill from `userAvatarUrl` and offer Remove only when it is set |
| REQ-004, REQ-005, REQ-007 (every surface; one picture per definition; the slot) | Confirmed | One renderer (`DefinitionAvatar`, 57 uses; no other avatar `<img>` remains). Rows take `definitionId` from S-4. Peer rows get null |
| REQ-006 (the phone: a header, never the address; one read per address) | Confirmed | `/rest/definition-avatars/` is a protected prefix. `useAvatarObjectUrl` makes one reference-counted object URL per credential and address, revoked 60 s after its last user or on a credential change. The route's access is the default gate (a peer gets 403, per the route-permission spec) |
| S-3 route safety | Confirmed | The path comes from the definition's recorded folder and the fixed name, never the request. It is re-validated before sending, and sent through `sendUserFile` (sandbox CSP, nosniff, ETag) |

## Supported Product Scenario And Reachability Gate

| ID | Scenario | Validity | Use |
| --- | --- | --- | --- |
| S-1 | A package (GitHub or local) carries `avatar.*`; it shows on desktop and phone; a replaced file shows its new version | Supported Normal | Use |
| S-2 | A third-party GitHub package carries a hostile `avatar.*` (a symlink, the wrong type, too large) | Supported Explicit Edge | Use |
| S-3 | The user uploads, resets or removes a picture; a form is saved with an old `?v=` | Supported Normal | Use |
| S-4 | The phone shows many rows of one definition, or the phone's network fails a read | Supported Normal | Use |

### Candidate Finding And Mechanism Gate

| ID | Observation | Scenario | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-1 | The route validates with `lstat` and `O_NOFOLLOW`, then sends by path (`createReadStream` follows links). A swap to a symlink between the two would be followed | S-2 | Reject | A GitHub package's symlink is static and is refused at read time. A swap needs a local writer racing the request, and even then only a file named `avatar.*` with image magic bytes is sent, to the owner or their phone |
| C-2 | `null` in the personal-settings and update input changed from "not sent" to "clear" | S-3 | Reject (callers checked) | Every caller is a form (agent, team, team-local member, org) that sends the user's own picture value from `userAvatarUrl`. There are no server-internal callers. API/E2E's AC-006 run checks it |
| C-3 | `definitionAvatarStore`: a failed first read of a kind is not retried until a change-feed event. `useAvatarObjectUrl`: a failed fetch is remembered for the session | S-4 | Hold for Evidence | By design ("no retry storm"). On a phone, a transient failure means fallbacks until a definition changes or the page reloads. The fallback is correct, so nothing is wrong, only absent |
| C-4 | `AgentTeamDefinitionForm.vue` (499), `AgentDefinitionForm.vue` (495) and `AgentOrgExperience.vue` (493) are just under the 500-line limit | — | Note | Under the limit. The next change there needs a split |
| C-5 | Deviations 1–5 (the route serves the recorded folder; the watcher allow-list; an unsaved Remove shows the fallback; a caller's `data-test`; twenty team copies in the probe) | Design | Pass, deviation recorded, reason holds | 1 keeps one source of truth, with the same boundary. 2 is needed for S-1's live update. 3 follows W-6. 4 is harmless; the state attributes stay. 5 is history paging |

## Structural / Design Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Data-flow spine | Pass | Folder → reader → definition → address (S-2) → GraphQL → store (W-3) → renderer (W-1) → cache (W-2) → route (S-3) |
| Ownership | Pass | One reader rule, one address module, one renderer, one cache, one rows source |
| Existing capability reuse | Pass | `sendUserFile`, the authorized fetch, the change feed |
| Shared-structure tightness | Pass | `DefinitionAvatarRead` is a union; `PackageAvatar` is derived, never stored |
| Visible dependencies | Pass | — |
| Authoritative Boundary Rule | Pass | Rows read only the store; the forms read only `userAvatarUrl` |
| File placement and size | Pass (C-4 note) | — |
| Dead code removed | Pass | The per-component `<img>` and broken maps; `normalizeOptionalString` (replaced by `userAvatarInput`); stale fixture lines |
| Tests aligned | Pass | 10 web, 14 server and 5 watcher cases are red on the base (IMP-001) |
| API/E2E readiness | Pass | The probe covers AC-001, AC-002, AC-003, AC-005, the installed `file://` window and the phone |

## Legacy / Compatibility

Pass. No stored-data change; the optional contract field is the contract as built (rule 9).

## Docs-Impact Verdict

Yes, done in the change: `agent_packages.md`, `agent_definition.md`, the web docs on agents, teams and orgs, and `design-cases.md`.

## Review Scorecard

- Overall: 9.3 / 10. Every category is ≥ 9.2. Separation of concerns is 9.2, for C-4's forms at the limit.

## Round 2 Failure-Origin Finding (CRR-002)

### CR-001 (F-1): a package picture replaced with one of the same size and the same whole second keeps its old version

- **Severity:** Medium. Rare, but silent: AC-001's "replace the file and update: the version changes and the new picture shows" fails for that input.
- **Where:** `autobyteus-server-ts/src/agent-package-definitions/domain/definition-avatar-file.ts`. `contentByPath` reuses the hash while `size` and `mtimeMs` are unchanged.
- **Cause:** a package update writes new bytes (a new inode), but tar and other time-preserving tools keep whole-second times. With the same size and the same second, the old hash, so the old `?v=`, survives. Then:
  - the address is unchanged, so the phone's object URL (keyed by address) and any cached `<img>` keep the old picture;
  - the route sends the new bytes under the old user-file ETag, so a revalidation gets 304.

  This lasts until the file changes again or the node restarts.
- **Evidence:**
  - AV-02 (`tests/e2e/agent-definitions/definition-avatars-github.e2e.test.ts`, fake GitHub, two revisions) is red 3 of 3 with revision 2 pinned to revision 1's time, and red 1 run in 3 with natural timing.
  - API/E2E's uncommitted diagnosis: adding `ino` and `ctimeMs` to the check made it pass 2 of 2.
- **Origin and classification:** N-3 chose the change signal "size and mtime" for a purpose: do not re-hash an unchanged picture. The signal is too weak to mean "unchanged". A replacement always changes the file's `ctime` (no tool can set it) and normally its inode. Strengthening the signal keeps N-3's purpose and AC-001 both. So this is an implementation `Local Fix` with a recorded refinement of N-3, not a design change. The unit spec that pins the weak signal ("other bytes, same size and time keep the old hash") was written to the signal, not to the purpose, and changes with it.
- **Required action (Local Fix, implementation):**
  1. Key the cache's reuse on `size`, `mtimeMs`, `ctimeMs` and `ino` from the same `lstat`.
  2. Rewrite the N-3 unit case to say what N-3 means:
     - an untouched file is not read again;
     - a file replaced by one of the same size and mtime, but another inode or ctime, is read again and gets a new hash (`fs.rename` of a new file over it, then `utimes` back to the old time).
  3. AV-02 green, including the pinned-time variant.
  4. Record the refinement in the handoff (N-3's signal is size, mtime, ctime and inode).
- **Review gap I own:** CRR-001 accepted N-3's cache as specified without asking whether size and mtime can stay equal across a replacement. Archive tools' whole-second times make that a real input.
- **Follow-up:** the node's user-file ETag (`user-file-reply.ts:27`, `"<size>-<floor(mtimeMs)>"`, 574 D-1) has the same weakness for every file route. It is recorded as FU-002 in `follow-ups.md`, for the Solution Designer to send. This ticket's `?v=` fix gives a new address, so the avatar does not depend on it.

## Findings

Round 1: none. Round 2: CR-001 (above).

## Follow-ups

None added.

## Recommended Recipient

`/api_e2e_engineer`

## Residual Risks

- C-3: a transient failure on the phone shows fallbacks for the session.
- C-4: the forms at the size limit.
- A peer node's row is covered by specs, not the probe.

## Latest Authoritative Result

- Review Decision: `Fail` (round 2, CRR-002). The origin is implementation: CR-001, `Local Fix` (a stronger cache identity; N-3's purpose kept and recorded).
- Review Entry Point: `API/E2E Failure-Origin Review`
- Recommended Recipient: `/implementation_engineer`. Then a targeted delta review, then API/E2E (AV-02), then the test-code review.
- Round 1 result (CRR-001, superseded):
- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Score Summary: 9.3 / 10
- Recommended Recipient: `/api_e2e_engineer`
