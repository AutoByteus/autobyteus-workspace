# Manual desktop-app test results (agent-driven, observed live by the user), 2026-10-10

Isolated instance `iso-55100-137c`, built from the Step 2 worktree (`codex/anthropic-incomplete-content-block-step2`), keys imported, package `autobyteus-agents` imported. Agent: Data Engineer, runtime AutoByteus, workspace `olr-manual-ws-jZMxBi`. Driven through the app window (sidebar clicks, Agents → Run, model/workspace pickers, typing, Send). Results verified from the window text, the written files and the run's raw traces.

| Test | Model (limit) | Result | Evidence |
| --- | --- | --- | --- |
| A — big file on the real limit (one write_file, 900 lines) | Claude Opus 5.5 (unconfigured → 128K) | **Pass**: one `write_file`, 900 lines / 107,784 bytes, no error, ~3 min; no "content block is incomplete" | `ui-A-opus-done.png`, run `…5889` |
| A | OpenAI gpt-5.4-mini (unconfigured) | **Pass**: one `write_file`, 900 lines, no error, ~2 min | `ui-A-openai-done.png`, run `…cd2f` |
| A | Gemini 3.8 Flash (unconfigured → 65,536) | **Pass**: one `write_file`, 900 lines, no error, ~2 min (model content slip on line 104; 899/900 lines exact) | `ui-A-gemini-done.png`, run `…b43c` |
| B — cut write_file recovers by itself (100 lines) | Claude Opus 5.5 (1,200) | **Pass**: first attempt cut while thinking → hidden "nothing kept" note → 4 × 25-line parts → 100 lines | trace `…c120`, `ui-B-claude.png` |
| B | OpenAI (1,200) | **Pass**: write_file cut mid-call → visible **"Discarded: the output limit was reached…"** → note → run_bash pieces → 100 lines | `ui-B-openai.png` |
| B | Gemini (1,200) | **Designed limit reached**: 4 consecutive cuts with no visible output → clear `LLM_OUTPUT_LIMIT_EXHAUSTED` error; no partial file, no crash | `ui-B-gemini.png` |
| B | DeepSeek (1,200) | **Pass**: write_file cut mid-call → note → built in parts, validated → 100 lines | `ui-B-deepseek.png` |
| C — cut text answer continues | Claude / OpenAI / Gemini / DeepSeek (1,200) | **Pass** on all four: essay cut 1–2 times, each part resumes exactly where the last stopped (mid-word); no "System note" visible; Claude re-checked after reload | `ui-C-*.png` |
| D — retry limit and next message | Claude Opus 5.5 (20) | **Pass**: clear error "hit the output limit of 20 tokens 4 times in a row…"; next message "ok" answered normally | `ui-D1-exhausted.png`, `ui-D2-followup.png` |

Driver notes (no product impact): one prompt was sent to the wrong run while the helper's run selection was being fixed (the Claude run received an extra request; its file was renamed `sea-lines-openai.by-claude-mistake.md`). The Chat page's quick "New Agent" draft only offers chat agents, and the Agents page needed **Reload** after the package import before Data Engineer appeared; neither is part of this change.
