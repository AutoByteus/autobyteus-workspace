# Delivery / Release / Deployment Report — DR-004

## Authoritative outcome
**Delivery Completed — v1.4.87**. Package `docker-image-http400-20260926`;
Medium / High / Reviewed. Canonical package: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/team-attachment-exact-execution`.
This report and handoff-summary.md supersede in-progress delivery reports; cumulative
history retained in delivery-revision-record.md (DR-001..004).

## Explicit user verification and release authorization
2026-09-26: **“i tested. its done. lets finalize and release a new version”**.
Subsequent explicit correction: **“you can actually fix those and re-trigger the build
for the same version. It's not good like we increased two versions.”**
Acceptance complete. Same-version recovery authorized; no application-code changes
after acceptance. No renewed product verification needed for evidence filename,
version-metadata and delivery-record corrections.

## Integration and documentation
- Bootstrap and initial/post-acceptance fetched base:
  e06080b0027636cecf20b5e437c496d423c7f26b; candidate HEAD equal, divergence 0/0.
- Already current. No checkpoint, integration source delta or executable rerun needed.
- Docs synchronized after refresh: server FILE_RENDERING_AND_MEDIA_PIPELINE.md;
  web agent_execution_architecture.md and settings.md. docs-sync-report.md Pass.
- API-REV-001: 202 automated tests, server build, real browser/live-Codex journey Pass;
  evidence score 95.9%, not a reliability probability. CRR-001 source and CRR-002 test
  review Pass. Code unchanged between accepted candidate and final release except
  package version metadata; exact diff checked.
- Initial source/docs whitespace check passed. Staged historical raw logs/diff contain
  trailing whitespace/blank EOFs and were preserved; no all-evidence whitespace Pass
  claimed. Repository artifact hygiene passes after byte-identical log renames.

## Archive and repository finalization — Completed
Ticket moved to tickets/done/team-attachment-exact-execution before final commit.
1. Ticket branch commit d88dd4382d276707a0287e2201bc07956c3cc459, pushed to
   origin/codex/team-attachment-exact-execution.
2. Personal updated to verified base; --no-ff merge
   712d790a974850d330b3f0a86b85f9c59253150b pushed to origin/personal.
3. Clean auxiliary worktree used for documented release helper because main worktree
   contains unrelated untracked files. Helper --no-push creates version/tag; personal
   fast-forward and push precede tag push. Archived release-notes.md supplied.
4. Initial 1.4.87 helper commit 5e53d026d114475f5254ce29a6c3dadd05bad3d0 failed
   Desktop artifact hygiene: two archived log paths exceeded 200 characters. Delivery
   shortened paths in e47949fa1; hashes/mapping in delivery-evidence/evidence-renames.json.
5. Unnecessary 1.4.88 attempt at 8c420f8743bb95e6b8235b60f4e447af372d7357 was
   stopped at user direction. Version restored in d0dc1f57b; withdrawal record in
   1284fe5233718564a4618eb2e355c9e07c1e3177.
6. **Final v1.4.87 release commit: 1284fe5233718564a4618eb2e355c9e07c1e3177.**
   Tag retargeted under explicit user-directed exception with exact old-tag lease;
   annotated tag object ffb9effdd70c40df78b18eced63c9aa34d99ec39. One new tag-push
   workflow set, no duplicate manual dispatch.
7. Concurrent remote fa5919da16130d4e8dda5ce59f6c9b223bcf31f8 added only another
   ticket's delivery records after release. Main personal fast-forwarded without
   altering the released commit; no source re-integration or rollback of others' work.
   Final delivery evidence is committed separately on personal; exact receipt commit
   is supplied in the terminal message and Git history of this report.

## Release/publication — Completed
Public release: https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.87
Package/tag both 1.4.87. Public, non-draft; 17 assets inspected (Desktop platforms,
Android APK/checksum, updater metadata). No downloaded binaries falsely claimed tested.

| Workflow | Run | Outcome |
|---|---|---|
| Desktop Release | 36267210438 | Success; macOS Intel/ARM, Windows x64, Linux x64/ARM64 and GitHub publication |
| Android APK Release | 36267210457 | Success; APK/checksum publication |
| iOS App Store Connect Release | 36267210472 | Success on attempt 2; build/tests, publish-secret validation and archive/upload all success |
| Server Docker Release | 36267210420 | Success; default multi-arch publication; zh not selected by standard workflow |

All runs build the final release SHA above. First iOS attempt failed fake-node WebView
smoke assertions; unchanged iOS/workflow diff vs v1.4.86 was empty. Retried only failed
jobs on the same run/tag; attempt 2 passed without code change. Failure log retained;
transient failure observed, precise underlying cause not asserted.
Docker registry inspection confirms `autobyteus/autobyteus-server:1.4.87` index
`sha256:5a1364b67bff22e7d3a5cb54d5470da316d044e4021f5a879bd75b095d2c9fb1`
with linux/amd64 and linux/arm64 manifests. See delivery-evidence/docker-1.4.87-manifest.txt.
Workflow/job JSON and asset inventory retained under delivery-evidence/.
App Store Connect upload success is not a claim of Apple review/public store approval.

## Unintended 1.4.88 withdrawal — Completed
All four runs Cancelled. During cancellation Android briefly published APK/checksum
at 19:43:56Z; both showed zero downloads at inspection. Release 397371396 returned
to draft (withdrawn privately for audit), not falsely reported as never published.
Remote/local v1.4.88 tags removed with exact old-object lease; history not rewritten.
Docker 1.4.88 registry inspection returned not found; Docker build cancelled before
successful manifest publication. No rollback claim about unknown downstream caches.
User-visible release remains 1.4.87. Audit evidence preserves this recovery.

## Installed deployment / migration — Not required for this publication
No user installation, Docker runtime or installed-data migration performed. User
requested finalization/release, not node rollout. Migration Required when installing
this version: stop all writers; take consistent app-data/memory/database/configuration
snapshot; rehearse isolated installed-copy migration; require clean SUCCEEDED/complete
manifest and byte/non-locator validation; deploy matching clients/server and smoke
send/read/restart. API fixtures are not exhaustive installed-corpus proof.
No ownership guessing, history deletion, forced migration success or restoring backups
over newer writes. Canonical server operations guide records recovery criteria.
Browser validation is not Electron-shell proof. Live installation rollout remains a
separate explicitly scoped action, not an unresolved gate for package publication.

## Post-finalization cleanup — Completed
Ticket and auxiliary worktrees removed; both local task branches deleted after merged
ancestry checks; worktree prune completed. Initial ticket directory deletion failed
with Directory not empty after deregistration; its verified-clean, merged remainder
was then removed explicitly. Generated task-only SDK dist removed, never committed.
Remote ticket branch retained for audit: deletion Not required. Unrelated main-worktree
untracked files preserved. API-owned process/data/tab cleanup already recorded;
inactive provider-managed conversations retained. See delivery-evidence/cleanup.json.

## Final gates and terminal return
Explicit user verification: Completed. Repository finalization: Completed.
Release publication: Completed. Installed deployment: Not required for publication.
Safe cleanup: Completed. Docs and archived release notes: Completed.
Unresolved blocker: None. Result **Delivery Completed**; eligible for terminal return.
Rule-based terminal dispatch is prepared to Solution Designer; exact transport
acknowledgment belongs to the send_message_to tool result, not an inferred prior send.
