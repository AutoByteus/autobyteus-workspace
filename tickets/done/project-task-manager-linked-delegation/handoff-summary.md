# Handoff Summary — DR-006 (user verified; finalized)

## State
**User verification received 2026-10-05**: the user instructed "finalize and release a new version", then "i meant a new beta version". This accepts candidate `335f78c20` together with the SR-027 known open item. The final repository and release state is recorded in release-deployment-report.md and delivery-revision-record.md (DR-006).

Prior state (DR-005): ready for user verification. Classification: **Large / High / Reviewed**.
- Basis: REQ-BL-009 (SD-AP-003) / SR-023+SR-024 / ARCH-REV-010+011, plus REQ-BL-010 (SR-026, SD-AP-005), which is **partially delivered** (SR-027).
- Gates:
  - CRR-027 and CRR-030 source Pass;
  - API-REV-020 and API-REV-021 Pass 95;
  - CRR-029 and CRR-031 test review;
  - CRR-032: FAPI-013 Design Impact, redesign deferred;
  - API-REV-023: real UI validation, all pass except AC-017;
  - CRR-033: Not Applicable.
- Superseded candidates: `ccb5fbe3`, `4b04d9097` and `e94d83538`.

## Candidate
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`, HEAD **`335f78c208c20b42904fa879afdb86084ee88723`**. That is IR-015 on `e94d83538`.
- Latest base: origin/personal `fc79fad14` is already merged. There are no conflicts or pending merges.
- Delivery checks on HEAD: production `tsc` exit 0; focused units 36 files / 351 tests passed (Codex launch config, Projects, collaboration, termination). Evidence: `delivery-evidence/dr-005/checks.md`.
- API-REV-023 drove the real UI on Codex GPT-6-Luna, Claude Sonnet 5 and Antigravity Gemini 3.8 Flash Medium. It covered setup via forms, assign, coordinator report-back, DONE fence/offline, the open Task unaffected, repeat DONE, and restart.
- Docs: 9 long-lived docs are synced and uncommitted. See docs-sync-report.md.

## What Changed For The User
- **Projects migration.** Projects storage moves once to per-Project folders on first start. The original file is kept as `projects.pre-folders.json`. Until the migration completes, only Projects shows "restart the app to finish".
- **Task records.** Each Task records the agent runs started for it in `tasks/<taskId>/agent_run_resources.json`. Execution trees carry no Task data.
- **DONE.** The Project Task Manager's DONE closes that Task's runs forever and stops exactly them. The Manager, other Tasks and borrowed runs keep running. Repeating DONE retries the stop. Nothing about shutdown is saved.
- **Manager reads.** `list_project_tasks` shows current assignments, or "assignments unavailable" if a Task's run file is damaged.
- **Codex config.** AutoByteus-launched Codex app-servers start with `-c features.multi_agent=false -c features.multi_agent_v2=false`. Your `~/.codex/config.toml` is not edited.

## ⚠ Known Open Item (SR-027): REQ-BL-010 Is Partially Delivered
- **Delivered:** your Codex config can no longer switch Codex multi-agent on for AutoByteus runs. This covers models without a catalog `multi_agent_version`, e.g. gpt-5.5 (not thread-verified).
- **Not delivered:** Codex's server-side model catalog still enables built-in multi-agent for gpt-6.x / gpt-5.6 models (v2) and some v1 models (upstream openai/codex#50880). On those models, a Codex worker may reply with Codex's own `send_message`, and the reply does not reach the Manager.
  - **AC-017 is not met. FAPI-013 is open** (CRR-032: Design Impact, redesign deferred).
  - User decision: proceed without AC-017, keep the IR-015 code, and fix the catalog case later.
- Records: requirements-doc.md (REQ-BL-010 status), design-spec.md (SR-026 "redesign deferred"), solution-revision-record.md (SR-027) and `api-e2e-evidence/api-023/fapi-013-codex-multi-agent-still-on.md`.

## Please Verify
Use the API test instance **`iso-54775-990c`**, which runs the `335f78c20` packaged build with test data only. Alternatively, run a fresh `pnpm --silent isolated-app start --build` of this worktree with disposable data, never your installed app.

1. Projects lists the migrated Projects and Tasks, including Task files.
2. In Chat, have the Project Task Manager assign a saved Task to an Agent or Team; the Task goes to IN_PROGRESS.
3. Have the Manager set DONE. Only that Task's workers go offline. The Manager and other work keep answering.
4. Reopen the Task. Nothing restarts, and a new delegation shows only the new assignment.

Reply **"verified"** (accepting the known open item above), or describe the issue you see. After verification, Delivery will:
- re-fetch the target, and reintegrate and recheck if it has advanced;
- commit with explicit paths only;
- archive the ticket;
- merge into and push origin/personal;
- clean up the worktree and branch.

On your word, API stops `iso-54775-990c` and `iso-50993-65ad` (if it is still running) and removes their test data roots. Release, tag and deploy were not requested.

## Other Known Limits (non-blocking)
- **O-1:** the gated `projects`/`project` GraphQL queries carry no `extensions.code`.
- **Pre-existing, outside this package:**
  - User-level Codex MCP servers start inside AutoByteus Codex runs.
  - Delegated copies that reply by address reach a new instance.
- **Foreign instance:** `iso-52633-5c91` is left untouched.
