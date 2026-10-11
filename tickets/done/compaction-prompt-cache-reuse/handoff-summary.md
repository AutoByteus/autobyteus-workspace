# Handoff Summary — compaction-prompt-cache-reuse

## User Verification

- Verified by the user on 2026-10-11: "the task is done. lets finalize, no need to release a new version"
- Decisions:
  1. **Accepted as done.** This covers the AC-003 summary-quality report (including C-022) and the AC-007 check, which the handoff listed as the user's checks before finalization.
  2. **No release.** The change reaches users with the next beta or stable version.
  3. **SR-013:** this package finalizes with the E1 baseline. SR-013 (the comparison of summary output approaches) stays a separate proposal for the Solution Designer.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse`, branch `codex/compaction-prompt-cache-reuse` (local only, not pushed).
  - Implementation commits up to `097192731` (IR-007).
  - `d0f3fbd52`: delivery checkpoint.
  - `fffdc5c2f`: merge of `origin/personal` @ `6314c4ee2`. It brings 57 commits, including Claude Sonnet 5.5 / Haiku 5.5 and v1.5.1. No conflicts.
  - `71b15db4f`: IR-008. The base-added Sonnet 5.5 and Haiku 5.5 now use the cached summary, so all 10 Anthropic models are cached.
  - `e02909845`: checkpoint of the review and API/E2E records.
  - Not committed yet: the delivery documents and the one-line command added to the live suite header.
- Base and finalization target: `origin/personal`. The branch contains the latest `origin/personal` (`6314c4ee2`, re-fetched at DR-002).
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Not to be committed: the untracked `*/dist/` folders and the Electron build output.

## What Changed

- **Same model for compaction.** Memory compaction on the AutoByteus runtime now uses the agent's own model. The compaction-model setting is removed from the server and the web; an old saved value is inert.
- **Cached summary (Anthropic, DeepSeek).**
  - The summary request is the agent's own conversation request plus one appended instruction, so it reads the history from cache (about 96%).
  - If it fails twice, or would not fit, compaction falls back to the transcript summary on the same model.
- **Transcript summary (Gemini and all other models).** As before, but on the agent's own model.
- **Summary contract.**
  - Nine headings, checked by one parser.
  - It accepts a reply with or without the block markers, and a section marked empty with a short explanation, such as `(none — read-only investigation)`.
- **Output limit.** Summary requests get a raised limit fitted to the room the request leaves.
- **Gemini** takes its system prompt from the request.
- **Token Meter** records compaction calls.
- **Docs:** `agent_memory_design.md`, `llm_module_design(_nodejs).md`, server `ARCHITECTURE.md` and `agent_memory.md`, web `settings.md` and `agent_execution_architecture.md`, plus the live suite header (see `docs-sync-report.md`).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-008 Pass |
| Code review | CRR-011 Pass (9.35); CRR-013 Pass on IR-008. Test review CRR-012 Pass; CRR-014 N/A (no test change) |
| API/E2E | API-REV-005 Pass (94.6%). API-REV-006 Pass (94%) on the merged code. Live CCR-E2E-001..004: 4/4 on Opus 5.5 with 95.8% cache read under Anthropic's strict check; the summary limit was 16,384 while the agent's was 4,096. CCR-E2E-001 on Sonnet 5.5: accepted, 95.6% cache read |
| AC-003 summary quality (`ac003-summary-quality-report.md`) | Round 5: every model meets the release bar.<br>• Opus 5.5: cached summary better or equal.<br>• Sonnet 5 and DeepSeek: cached note accepted, with gap A recorded for the follow-up Task.<br>• Gemini: transcript only, as before |
| Delivery on `fffdc5c2f` / `71b15db4f` | • Typechecks: clean.<br>• Core unit: 2072/2072.<br>• Server unit: 667 files and 5242 tests pass.<br>• Web: 601 files and 4175 tests pass.<br>• The gated live suite skips cleanly without its gate.<br>• Logs: `delivery-evidence/` |

## How To Verify

1. **AC-003 — accept the summary quality report** (required before release): `ac003-summary-quality-report.md`, Round 5 at the top plus the per-model verdicts.
   - **C-022:** Sonnet 5.5 and Haiku 5.5 use the cached summary by the "all Anthropic models" rule, without their own quality run.
     - Sonnet 5.5's cached path was checked live (accepted, 95.6% cache read).
     - Haiku 5.5's live cached path was not exercised: the test's aggressive trigger stopped before summarizing. That is test sizing, and Haiku 5.5 uses the same code path as the passing models.
2. **AC-007 — Token Meter against the Anthropic Console.** Start an isolated app freshly built from this worktree; it has separate data:
   ```bash
   cd /Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse
   pnpm --silent isolated-app start --build
   ```
   1. Add your Anthropic key.
   2. Run a `claude-opus-5-5 · AutoByteus` agent until it compacts. To make that happen sooner, lower the compaction trigger in Server Settings.
   3. Expected: the Token Meter shows the compaction call with a high cache read, and its estimate matches the Console for those minutes.
   4. Stop with `pnpm --silent isolated-app stop`.
   - Don't terminate and reopen the run during the comparison. Known bug DEF-B drops meter usage after that.

## Decisions Needed At Verification

1. **SR-013 (proposed, not approved):** you asked to compare four ways of returning the summary (E1 markers + tolerant parser, E2 `write_file`, E3 a handover-note tool, E4 a forced tool call). This package ships E1, the agreed baseline. Release now with E1 and let SR-013 follow as its own change, or hold the release until SR-013 is decided?
2. **Release:** finalize only, or also publish a beta (`v1.5.2-beta.1`) or a stable version?

## Residual Risks (non-blocking)

- AC-010 on a Gemini API key: quota-blocked (429) in every round. Vertex Express is proven.
- N-3: an unwrapped summary cut off in its last section on a provider that reports `unknown` completion (accepted in ARCH-REV-007; not observed).
- `native-compaction-terminal-drain.test.ts` is load-sensitive; run it with no live harness active.
- Right after a compaction, "Latest prompt" shows unknown until the next request (expected).
- An old `AUTOBYTEUS_COMPACTION_MODEL_SETTINGS` value shows as an inert, deletable custom setting.
- Follow-ups:
  - `project_task_9bf18aea…`: gap A, per-model strategies.
  - DEF-C: an override smaller than the maximum output hangs the run.
  - DEF-D: predefined compaction settings cannot be deleted.
  - Backlog `project_task_85711702…`.
  - Test nits N-T1..N-T3.
