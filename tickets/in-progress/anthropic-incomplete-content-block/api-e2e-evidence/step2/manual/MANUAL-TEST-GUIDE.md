# Manual test guide — output limits and recovery (desktop app)

## The test app (already running)

- An isolated AutoByteus desktop app built from the Step 2 worktree (`codex/anthropic-incomplete-content-block-step2`), so it contains Step 1 + Step 2.
- Instance `iso-55100-137c`, its own data folder; your normal AutoByteus app and data are untouched.
- Provider keys imported into this instance only (Anthropic, OpenAI, Gemini/Vertex Express, DeepSeek, GLM, Grok, …).
- Agent package `autobyteus-agents` imported (all agents and teams, including **Data Engineer** and **Software Engineering Team**).
- Test workspace `olr-manual-ws-jZMxBi` (a temp folder) with 5 prepared Data Engineer runs.
- Stop it when done: `pnpm --silent --dir /Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block-step2 isolated-app stop iso-55100-137c` (or ask me).

The app's model settings don't offer `max_tokens`, so the recovery tests use runs I created with a small limit (same `createAgentRun` call the app makes). Open them under **Workspaces → olr-manual-ws-jZMxBi → Data Engineer (5)**. They all show "Untitled task"; the run header shows the last 4 characters of the id:

| Row (top → bottom) | Header | Model | Limit |
| --- | --- | --- | --- |
| 1 | Data Engineer - 9A5C | Claude Opus 5.5 | 20 tokens (exhaustion test) |
| 2 | Data Engineer - 6F55 | DeepSeek v4 Flash (thinking off) | 1,200 |
| 3 | Data Engineer - 68AB | Gemini 3.8 Flash (thinking low) | 1,200 |
| 4 | Data Engineer - F859 | OpenAI gpt-5.4-mini (reasoning low) | 1,200 |
| 5 | Data Engineer - C120 | Claude Opus 5.5 | 1,200 |

Tools run automatically in these runs (no approval clicks).

---

## Test A — Big file on the real limit (Step 1; the original bug)

Start a new run: open any of the 5 prepared runs and click the **+** at the top-right of the run header ("New Agent"). A new draft opens in workspace `olr-manual-ws-jZMxBi` with Auto-approve on and `claude-opus-5-5 · AutoByteus` preselected (verified). If the agent name above the composer is empty, pick **Data Engineer** from that dropdown. For the other providers, change the model in the composer's model picker (keep runtime **AutoByteus**). Do not change any limit. (The **+** on the "Data Engineer (5)" row appears only on hover.)

Prompt:

> Create the file big.txt with write_file in one single call. It must contain exactly 900 lines. Line N (for every N from 1 to 900) is exactly: "Line N: this sentence belongs to the output-limit validation file and is written out in full with its own number N." Write every line in full, with no ellipsis or omission.

Expected: the write_file block streams for a few minutes, then succeeds; `big.txt` has 900 lines (Files panel). **No "Anthropic content block is incomplete." error.**

Do it with: `claude-opus-5-5` (the important one), then `gpt-5.4-mini`, `gemini-3.8-flash` (optional: `deepseek-v4-flash`). Before this fix Claude failed here at 8,192 tokens.

## Test B — Cut tool call recovers by itself (Step 2) — rows 5, 4, 3, 2

Open the row, then send:

> Create the file sea-lines.md with exactly 100 lines. Line N (for every N from 1 to 100) is "Line N: " followed by one different sentence of 12 to 16 words about the sea. Write every line in full.

Expected:
1. The first write_file block may end as **failed: "Discarded: the output limit was reached before this tool call was complete."** — the cut call is never run.
   - Sometimes the first attempt is cut while the model is still thinking: then there is no block at all, just a short pause.
   - **Gemini** sends tool calls only when complete, so it never shows a Discarded block; the cut shows as a pause.
2. Without you doing anything, the agent continues and writes the file **in smaller pieces** (write_file, then edit_file or run_bash appends).
3. The turn ends normally (e.g. "done"); `sea-lines.md` has 100 lines.
4. Acceptable alternative: if the model keeps trying too-big pieces, after 3 automatic retries you get a clear error (see Test D). That is the designed limit, not a crash.

## Test C — Cut text answer continues seamlessly (Step 2) — same rows 5, 4, 3, 2

In the same run (after Test B), send:

> Write an essay of about 1,500 words on the history of lighthouses. Plain paragraphs only: no title, headings or lists.

Expected: the answer arrives as several consecutive assistant parts that read as **one continuous essay** (the next part starts exactly where the previous stopped, even mid-word); no apology or recap; no error. Then reload (reopen the run, or Cmd+R): the same parts are shown, and **no "System note" text is visible** anywhere.

## Test D — Retry limit and recovery afterwards (Step 2) — row 1 (9A5C, 20 tokens)

Send:

> Write a 300-word paragraph about the history of lighthouses.

Expected: a few seconds of nothing or tiny fragments, then a clear error: *"The model's response hit the output limit of 20 tokens 4 times in a row, so the turn stopped after 3 automatic recovery attempts. Ask for the work in smaller pieces … and send the request again."*

Then send:

> Reply with only the word ok.

Expected: a normal reply ("ok"). The run is not stuck.

## Optional — Real team use (Step 1)

**Agent Teams → Software Engineering Team** → run on `claude-opus-5-5`, runtime AutoByteus, workspace `olr-manual-ws-jZMxBi`. Ask the Solution Designer for a long, detailed design document written to a file. Expected: the large write_file succeeds (the shape of your stuck run).

## Not testable by hand (covered by the automated live suite)

Refusal, context-window overflow, a dropped stream, malformed tool arguments (DeepSeek), and compaction under a small limit. They cannot be triggered on demand in the app.

Your real stuck run (AC-009) is checked in your normal app after the release, not here.
