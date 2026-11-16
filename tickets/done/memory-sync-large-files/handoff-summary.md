# Handoff Summary — memory-sync-large-files (autobyteus-workspace-7)

## What this delivers

Memory Sync carries files of any size to the hub, and one problem file no longer stops the others. Before, one attachment above about 37 MiB made the hub answer `Request body is too large`; the run failed, the same files were planned first every time, and nothing synced any more.

- **Byte-bounded batches.** A run cuts the changed files into batches of at most `batchSize` files, 24 MiB of inline content and 4 GiB of staged content; no request exceeds the hub's 50 MiB limit.
- **Large files in pieces.** A file above 8 MiB is uploaded as raw bytes in pieces of at most 8 MiB to the hub's staging area (`memory/memory-sync-staging/<memorySyncSourceId>/<sha256>.partial`) and committed by reference. It appears under `imports/` and in the manifest only after its full size and SHA-256 are verified. An interrupted upload resumes from the bytes the hub holds. Memory use of a transfer does not grow with the file size (measured to 8 GiB).
- **Unchanged files are not read.** A file whose size and modification time equal its last synced record is skipped; a changed one is hashed by streaming.
- **One file never stops the rest.** A file the hub refuses (or that cannot be read) gets a failure record with its reason, retried after 1 minute doubling to 1 hour, at once when it changes and at once on **Sync now**. Unreachable hub, revoked token, disabled hub and lost connection stay run-level errors with today's messages.
- **The owner sees it.** Nodes → Memory Sync shows "N files could not be synced" with path, size, reason and next attempt (at most 20, then "and N more"), in English and Chinese; the node log has one warning per new failure.
- **Same release on both nodes.** An older hub does not know the staged-file routes; nothing detects or works around that (`DESIGN.md` rule 9). The feature document says so.

`task_size` `Large`, `architectural_risk` `High`, route `Code Review` (architecture review ARCH-REV-003 Pass; implementation review CRR-004 Pass; API/E2E API-REV-003 Pass, final confidence 93%; test-code review CRR-005 Not Applicable). Requirements SR-005 (approved; AC-003/QR-002 revised in SR-005 / DEC-008).

## Delivery state

- Branch `task/memory-sync-large-files` (pushed as `codex/memory-sync-large-files`), reviewed code commit `542bf871f`. Base `origin/personal` was `3d738de6e` at bootstrap and advanced to `64cd30d2c` (workspace-6's merge) during delivery; it was merged into the ticket branch (`fa14fc465`, no conflicts, no overlapping files) and the relevant checks reran on Node 22: all passed (`evidence/DEL-01`…`DEL-05`; the web typecheck fails exactly as it does on the base commit, FU-003).
- Verification: from the evidence, `Sufficient` (see the release/deployment report's Verification table). No user check was needed to finalize.
- Docs sync: `Updated` (`autobyteus-web/docs/memory.md`, `agent_memory.md`, `ARCHITECTURE.md`, references in `memory_sync.md`); `DESIGN.md`, `TESTING.md`, `RELEASE.md` no change.
- Release decision: **No release** (the user did not ask for one and `RELEASE.md` defaults to none). A release is available. `release-notes.md` is written (with the `## What you need to do` section a beta's notes need) so a later release finds it.
- Finalization: `--no-ff` merge into `origin/personal` through `finalize/memory-sync-large-files` under `RELEASE.md`. Commit, push and merge SHAs are in the terminal message and in git history; a commit cannot hold its own SHA.

## Release order — RC-001 and REQ-010

**This change must be released before or with `autobyteus-workspace-6`** (2 GiB context-file uploads). `autobyteus-workspace-6` is already merged on `personal` (`64cd30d2c`) and not in any release tag (latest tag `v1.5.13-beta.6`). After this ticket's merge, any release cut from `personal` contains both, which satisfies the order. **Do not tag a release from a `personal` state that has workspace-6 but not this ticket.** The same note is in `implementation-handoff.md` and in `autobyteus-server-ts/docs/features/memory_sync.md`.

## Release readiness: the desktop build stops at the web typecheck (FU-003, urgent)

`pnpm -C autobyteus-web typecheck` fails on `personal` today and on the base commit `3d738de6e` the same way: `tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts(67,46)` lacks the `workspaceSkills` property that autobyteus-460 made required (`production errors: 0; test-file errors: 94 in 41 files (baseline 93 in 40 files)`). `build:electron:*` runs this typecheck, so **a desktop release build of `personal` stops there until FU-003 is fixed**. This ticket neither caused nor changes it (evidence: `evidence/API-12-fresh-start-build.log` section 2, base commit; `evidence/DEL-05-web-typecheck.log`, integrated state). The cause is known and small (one property in a test); TESTING.md Rule 9 allows a baseline-fix commit in the ticket that needs it, so the release that follows should either carry that fix or have FU-003 done first.

## Not verified here

- The packaged desktop app: the fresh-start build was run to the step that fails for every branch (install, localization audit, typecheck) and then `generate:electron` separately (pass; the bundle contains the card strings in en and zh-CN and `fileFailureCount`). Packaging, signing, notarization and "Verify bundled Prisma / terminal runtime" did not run. No shell code changed.
- The card was proven in headless Chrome on a Nuxt dev server against real nodes (en and zh-CN, 23 real failures, long path, DOM assertion with a negative control), not inside the Electron renderer.
- Memory figures were measured on npm Node 24.15.0 standing in for Electron's embedded Node, on loopback only (no real proxy or second machine: FU-002).
- Windows and Linux builds need the release runners.

## Open items, none blocking this merge

| ID | Item | Owner |
| --- | --- | --- |
| FU-003 (urgent) | Web typecheck gate fails on `personal` (one test file; stops the desktop release build) | Solution Designer sends it |
| FU-001 | Let a source owner exclude files from sync by size or kind; decide whether the hub shows imported attachments | Solution Designer sends it |
| FU-002 | Document the request sizes a hub's reverse proxy must accept | Solution Designer sends it |
| FU-004 | Reduce the first-use memory cost of the staged transfer (measured on Node 24) | Solution Designer sends it |
| FU-005 | Show file-failure reasons as short localized phrases | Solution Designer sends it |
| FU-006 | Delete the release-order sentence from `memory_sync.md` after the first release containing both tickets | Solution Designer sends it |
| Guide fix proposed | `RELEASE.md` names `codex/<ticket-name>`; worktrees are bootstrapped as `task/<ticket-name>` (already proposed by workspace-6's delivery) | The user decides |

## Package

`requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`, `code-review-report.md`, `code-review-revision-record.md`, `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-progress.md`, `api-e2e-test-review-report.md`, `docs-sync-report.md`, this summary, `release-deployment-report.md`, `delivery-revision-record.md`, `release-notes.md`, `follow-ups.md`, the SR hand-off files, `evidence/`, `probes/`. Archived at `tickets/done/memory-sync-large-files/`.
