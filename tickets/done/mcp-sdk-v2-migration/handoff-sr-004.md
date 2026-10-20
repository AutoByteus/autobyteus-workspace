# Handoff — mcp-sdk-v2-migration, SR-004: design revised after ARCH-REV-001

- Status: **Architecture Design Complete** (revised); `task_size=Medium`, `architectural_risk=High` (unchanged, confirmed by the review)
- Package: `mcp-sdk-v2-migration`; Project Task `autobyteus-182`; requested by `/project_task_manager`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration/tickets/in-progress/mcp-sdk-v2-migration/`
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-v2-migration`, branch `codex/mcp-sdk-v2-migration`, base `origin/personal` @ `dc530fdcb0`. No code changes; ticket documents uncommitted.
- Requirements basis: unchanged, `requirements-doc.md` SR-002, approved by the user on 2026-10-20 with the condition REQ-013. SR-004 clarifies only the verification wording of AC-001 and AC-008.
- Full context of the package: `handoff-sr-003.md` (original request, decisions, evidence).

## Corrections for ARCH-REV-001

**AR-001 (accepted).**
- `design-spec.md` now describes the real path in three places: the DS-002 spine and narrative, the Change Scope "Deliberately left alone" reason, and the Architecture Investigation Evidence row "Our routes vs a v2 `auto` client".
- `investigation-notes.md` carries the matching corrections: the Source Log dispatcher row, the probe (3) row, and a new probe row.
- The real path: the routes' `mcp-protocol-version` check runs first and answers `server/discover` with `2026-07-28` using HTTP 400 + `-32600` (`id: null`). The v2 client then falls back to `initialize`.
- New evidence: `probes/route-protocol-header-auto-fallback-probe.mjs` reproduces that exact check (output appended to `probes/probe-output.txt`). Its result: `auto` gets 400/-32600 on `server/discover`, then `initialize`, era `legacy`, 2025-11-25, list and call work.
- The Final File Responsibility Mapping now requires the AC-007 cases to run against the real routes over loopback and to assert era `legacy`, version `2025-11-25`, list and call. The 400-then-`initialize` assertion is optional.

**AR-002 (accepted, one correction).**
- The Removal Plan names each O-002 item with line evidence and adds `callSdkFunction` (L445-450; only caller L345).
- The `asObject` import is **not** dead: it is still used at L478 (`tryGetSupportedModelsFromQueryControl`). It stays, and the Removal Plan says so.
- The AC-008 grep is narrowed in Change Sequence step 7: `createMcpServer|createSdkMcpServer|callSdkFunction` in server-ts `src` and `tests`, and `createToolDefinition` only in `src/runtime-management` and `tests/integration/runtime-management`. The AC-008 Verification column in `requirements-doc.md` is aligned to it.

**Non-blocking items taken.**
- RR-001 is added to R-003 in the design Risks and the investigation notes. The parity run records each real server's `outputSchema` `$schema`.
- AC-001 now notes that header comments naming the v1 package must be reworded, and that "the lockfile" means the root `pnpm-lock.yaml`.
- Change Scope lists FU-003.

## Route record

- 2026-10-20: `get_handoff_rules` (3 rules). The matching rule is architecture review for `architectural_risk=High` → `/software_engineering_team/architecture_reviewer`, for re-review of AR-001/AR-002.
