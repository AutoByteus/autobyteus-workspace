# Handoff Summary — draft-run-id-validation

## User Verification

- Verified by the user on 2026-10-10: "i checked. finalize no need tog release a new version"
- Decisions:
  1. **Release:** none. The change is merged into `personal` without a new version.
  2. **CND-002:** no answer. It goes to Solution Designer in the terminal package as a recommended separate ticket.
- After verification, `origin/personal` had advanced to `92de64600` (skill-sources-dialog-redesign: web skills UI, localization, one server e2e test and `TESTING.md`). It shares no context-file or server source files with this change, so renewed verification was not needed. See `release-deployment-report.md` § Repository Finalization.
- The rest of this summary is the state handed over for verification (DR-001).

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation`
- Branch: `codex/draft-run-id-validation`. It is local only and not pushed.
  - `a9c9a65f2`: baseline test path fix after the skill repository's `references/` move (test only).
  - `36a444f0e`: the change (reviewed source; unchanged since CRR-001).
  - Not committed yet: the API/E2E probe changes (`composer-context-file-removal-probe.mjs`, `TESTING.md`), the docs sync, and the review, API/E2E and delivery artifacts. These are committed at finalization.
- Base and finalization target: `origin/personal`. The branch contains the latest `origin/personal` (`d28c56d5d` = `v1.4.99` plus its delivery record, fetched 2026-10-10). No merge was needed.
- Classification: `task_size=Small`, `architectural_risk=High`. Route: reviewed.
- Not to be committed: the untracked `*/dist/` folders.

## What Changed (server only)

- **Security fix (OBS-001).** A crafted owner ID such as `..%2Fagent-runs%2Fvictim` could address another owner's draft. It could read it (200), delete it (204), upload into the wrong folder, or move a file during finalize. A deeper escape gave 500.
- **Every owner ID of every owner kind** is now validated as a safe identity. It must be non-empty, have no surrounding whitespace, contain no `/`, `\` or control characters, and not be `.` or `..`. The `agent_draft` and `team_member_draft` descriptors reject unknown fields, like the other kinds.
- **Stored filenames** are allowlisted to `A-Z a-z 0-9 . _ -`, not dot-only and not containing `..`. Every name the server has generated since April 2026 fits.
- **Malformed input returns 400 with `detail` on every route**, and no file is touched. The changed codes are:
  - untrimmed IDs or extra fields: 400;
  - traversal on upload, finalize or draft GET/DELETE: 400 (was 200, 204 or 500);
  - agent-final traversal `runId`: 400 (was 404);
  - agent-final invalid filename: 400 (was 500).
- **Runtime locator resolution** treats malformed locators as unresolved.
- **Docs:** `FILE_RENDERING_AND_MEDIA_PIPELINE.md`. `TESTING.md` was updated by API/E2E (see `docs-sync-report.md`).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-002 Pass |
| Code review | CRR-001 Pass (9.5/10). Test-code review CRR-002 Pass, no findings |
| API/E2E | API-REV-001 Pass (96%). Run 1: 11/11 cases against a real built backend, Nuxt and Chrome.<br>• CF-001 checks 42 traversal and malformed mappings plus 9 rejected upload/finalize requests. A snapshot of the data root shows no context file changed, and all 4 sentinel files are intact.<br>• Every real composer flow still works (CF-002..009).<br>• New chat send with finalize and a final read works for an agent and a team (CF-011/CF-012).<br>• A stability rerun also passed 11/11 |
| Delivery on `36a444f0e` + docs | • Server typecheck: exit 0.<br>• Unit (`tests/unit/context-files`, `tests/unit/agent-execution/input`): 11 files, 141/141 pass.<br>• REST integration (draft universal + context-files): 2 files, 28/28 pass.<br>• Baseline-fix test: 12/12 pass.<br>• Logs: `delivery-evidence/dr1-*.log` |

Not exercised: packaged Electron (a server-only change).

## How To Verify

This is a server-only change, and the app's normal flows must work exactly as before.

1. Start a desktop app built from this worktree, or your dev setup on this branch. For example:
   ```bash
   cd /Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation
   pnpm --silent isolated-app start --build
   ```
2. In a few run kinds (New chat, a standalone agent, a Team member, a delegated child), paste an image and add a file with `+`. Check the preview, use × and Clear All, then attach a file and **send**. Everything should behave as before, and the sent message should show its file.
3. Optional, the security check: with the server port from step 1 (and a token if remote access is on), run:
   ```bash
   curl -i "http://127.0.0.1:<port>/rest/drafts/agent-runs/..%2Fagent-runs%2Fx/context-files/a.txt"
   ```
   Expected: `400` with a `detail`.

## Decisions For You

1. **Verification:** reply with your result. If it is OK, delivery will archive the ticket, commit, push, merge into `personal` and push.
2. **Release:** a new beta (`v1.4.100-beta.1`), or merge without a release? The requirements leave release to you.
3. **Separate ticket?** CND-002 is pre-existing and was not caused by this change: a file whose name contains `..`, such as `report..v2.pdf`, cannot be uploaded, because the name generator keeps the inner `..`.
