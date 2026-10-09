# Handoff Summary — anthropic-prompt-caching

## User Verification

- Verified by the user on 2026-10-09: "finalize and release a new beta."
- Decisions:
  1. **Release:** publish the next beta (`v1.4.99-beta.9`).
  2. **Recordings:** the user did not object to the proposal, so it was applied.
     - Near-frozen stretches were cut: `freezedetect` n=0.003, d=1.5 s, keeping 0.5 s from the start and 0.8 s from the end of each stretch. Output is 1512 px, H.264 CRF 30.
     - `recording-dsk.mp4`: 1061 s / 13 MB → 173 s / 2.7 MB.
     - `recording-dsk-after-restart.mp4`: 214 s / 3.2 MB → 35 s / 0.85 MB.
     - The full originals, the freeze lists and the select expressions are kept outside the repo in `/Users/normy/autobyteus_org/ticket-media/anthropic-prompt-caching/`.
  3. **Follow-up tickets:** no answer. DEF-A and DEF-B are passed to Solution Designer in the terminal package as recommended separate tickets.

## State For User Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching`, branch `codex/anthropic-prompt-caching` (local only, not pushed).
  - `56124de85`: baseline test fix.
  - `80845f45e`: the feature and its docs.
  - `b684a8963`: delivery checkpoint (durable gated live E2E, API/E2E and review artifacts).
  - `a89fe62cc`: merge of `origin/personal` @ `e350a194b` (delegate-to-existing-copy, beta.8).
  - `328630c0a`: desktop API/E2E round (API-REV-002) evidence, the `TESTING.md` row, DR-001 artifacts.
  - `b7e318107`: merge of `origin/personal` @ `033a6d780` (gemini-native-cache-hit). Three files overlapped: `token_usage.md`, `provider_model_catalogs.md`, `supported-model-definitions.test.ts`. All three merged with no conflicts, because the additions cover different topics.
  - Not committed yet:
    - this summary and the DR-002 updates;
    - the two desktop recordings (see Decisions).
- Base and finalization target: `origin/personal`. The branch contains the latest `origin/personal` (`033a6d780`, fetched for DR-002).
- Classification: `task_size=Large`, `architectural_risk=High`. Route: reviewed.
- Not to be committed: the untracked `*/dist/` folders.

## What Changed

- **Prompt caching on the native runtime.** Anthropic requests from AutoByteus-runtime agents and teams now carry two 1h cache markers: one on the system prompt and one on the conversation. Compaction summary calls are not cached.
- **Stable prefix:**
  - Tools and system stay byte-identical within a run, and history is append-only.
  - Earlier reasoning (thinking) is kept across new turns instead of being stripped at every turn.
  - It is removed once only when the tools or system change (for example a Settings change) or when a run is restored. This keeps Anthropic from rejecting the request.
- **Interrupt note.** After Stop, the note goes after the history and no longer into the system prompt.
- **Provider-native boundary.** Anthropic-specific history rules moved from memory/agent code into the LLM layer, behind a provider-neutral interface.
- **Token Meter.**
  - Cache reads and 5m/1h writes are priced separately.
  - Claude Sonnet 5 uses the official prices for new usage.
- **SDK.** `@anthropic-ai/sdk` is now 0.132.1.
- **Docs.** `agent_memory_design.md`, `llm_module_design_nodejs.md`, `provider_model_catalogs.md`, `agent_runtime_loop_and_interrupt.md`, `token_usage.md` and `TESTING.md` (see `docs-sync-report.md`).

## Validation Evidence

| Gate | Result |
| --- | --- |
| Architecture review | ARCH-REV-003 Pass |
| Code review | CRR-001 Pass (CR-001 Low, optional). Test-code review CRR-002 Pass |
| API/E2E live server | API-REV-001 Pass (95%). Run 6 under Anthropic's strict preserved-thinking check: 7/7 cases, 45 calls, run-level cache hit **94.9%**. The meter equals Anthropic's raw usage exactly |
| API/E2E desktop app | API-REV-002 Pass (96%). A real isolated Electron build of `a89fe62cc`, driven through the UI (DSK-001..004): Token Meter hit 90.2% → 95.0%, Stop at an approval, a Settings change mid tool round, and a whole-app restart, all with 0 errors. Over 52 calls the meter shows a 94.3% hit and **$1.54**, against about **$8.19** without caching |
| Delivery on `b7e318107` | • Core and server typechecks: clean.<br>• Core unit: 1860/1861. The one failure is the known Gemini retry test, which also fails on base.<br>• Server unit: 669 files and 5172 tests pass, 7 skipped.<br>• Token-usage pricing E2Es added by the base: 10/10.<br>• Logs: `delivery-evidence/dr2-*.log` |

### Cache hit by path (REQ-009)

| Path | Before | After |
| --- | --- | --- |
| Native AutoByteus + Opus 5.5 | 0.0% (your $7.31 run, Console "Not enabled") | 94.9% live server, 94.3% desktop |
| Native Claude Sonnet 5 | 0.0% | Same code path as Opus; not measured live separately |
| After restore / tools change | — | One full rewrite, then cache reads again |
| Compaction summary | — | Not cached, by design |
| Claude Agent SDK runtime | 98.3% | Unchanged (not touched) |
| Others (unchanged) | Codex 93–97%, AGY Gemini 99%, native DeepSeek 96.5%, native Gemini 66–83% | — |

## How To Verify (AC-007)

This check needs your Anthropic Console. Two ways:

- **A. Quick check, no new run:** open the Anthropic Console → Usage for today (2026-10-09). The ticket's validation runs used your key.
  - Expected: Prompt caching shows as active, with a large share of cache-read tokens.
  - These runs' meter totals were $0.61 (run 6) and about $1.54 (desktop run, plus a few post-restart calls). Earlier live runs are also in today's usage, so compare the shape rather than the exact total.
- **B. Clean comparison:** start an isolated app built from this worktree. It has separate data and does not touch your own app.
  1. Start it:
     ```bash
     cd /Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching
     pnpm --silent isolated-app start --build
     ```
  2. Settings → API Keys: add your Anthropic key.
  3. Run an agent on `claude-opus-5-5 · AutoByteus` with a few tool calls over 2–3 messages.
  4. Expected: the Token Meter shows the cache rows and a high hit, and its estimate for that run matches the Console's spend over the same minutes (rounding only).
  5. Stop the app with `pnpm --silent isolated-app stop`.
  - **Do not stop and reopen the run during this comparison.** Known bug DEF-B (pre-existing, also on base) drops the meter usage for calls made after a run is terminated and continued. A whole-app restart is fine.

## Decisions Needed At Verification

1. **Release:** finalize only, or also publish a new beta (`v1.4.99-beta.9`)?
2. **Recordings:** `recording-dsk.mp4` (17.7 min, 13 MB) and `recording-dsk-after-restart.mp4` (3.6 min, 3.2 MB), both 2400×1536. As on earlier tickets, I propose committing trimmed versions (near-frozen stretches cut, ~1–2 MB) and keeping the full ones outside the repo in `/Users/normy/autobyteus_org/ticket-media/anthropic-prompt-caching/`. Screenshots, usage JSON and logs are already committed.
3. **Follow-up tickets:** should I note these for Solution Designer to open?
   - **DEF-A:** Stop with a pending tool approval hangs.
   - **DEF-B:** after Terminate and continue, usage is missing from the meter, because restored turns restart at `turn_0001` and the idempotency keys collide.
   - Both are pre-existing and reproduced on base.

## Residual Risks (non-blocking)

- One full cache rewrite after each restore or tools change. This is expected and documented.
- P-004 (accepted in design).
- CR-001: a vacuous spy assertion in one unit test (Low, optional).
- `memory-manager.ts` is at 498/500 lines; split it before the next change there.
- The base-identical Gemini retry-options unit failure (reported product issue).
