# Probe results, 2026-11-10 (Solution Designer)

All probes ran from the task worktree at `310fc2745` (= origin/personal, fetched 2026-11-10 06:1x UTC), with
`AUTOBYTEUS_TEST_VAULT=/root/.autobyteus-test/vault` (key `provider.anthropic.api-key`), inherited `ANTHROPIC_API_KEY`
unset, and a private, throw-away `CLAUDE_CONFIG_DIR` under `/tmp/msr-probes/` (deleted afterwards). Scripts are in
`../probes/` (`<worktree>` = the task worktree). Run with `npx tsx <script>` from `autobyteus-server-ts/` or
`autobyteus-ts/`. Prompt for live calls: "Is 391 prime? Answer yes or no with the factorization, one line."

CLIs: system Claude Code `/usr/bin/claude` -> `/usr/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe`,
`2.1.322` (installed 2026-11-10 05:17). SDK-bundled CLI (`@anthropic-ai/claude-agent-sdk-linux-arm64` of SDK
`0.3.280`), `2.1.280` (built 2026-09-23). The server's control queries and sessions use
`resolveClaudeCodeExecutablePath()` = `CLAUDE_CODE_EXECUTABLE_PATH` etc., else `which claude`.

## PRB-D1 — `prb-sdk-models.mts` (server `ClaudeSdkClient.listModels`, api-key mode, fresh config dir, system CLI)

```
ms 2286 count 5
default  -> canonical claude-opus-5-5  schema {thinking_enabled bool default false, reasoning_effort enum low..max default medium}
opus     -> claude-opus-5-5   (same schema)
fable    -> claude-fable-5-2  (same schema)
sonnet   -> claude-sonnet-5-5 (same schema)
haiku    -> claude-haiku-5-5  (same schema)
```

## PRB-D2 — `prb-sdk-raw.mts` (raw `supportedModels()`, SDK default executable = bundled CLI 2.1.280, same config dir after D1)

```
default            resolvedModel claude-opus-5-5[1m]   supportsEffort, levels low..max, supportsAdaptiveThinking
opus[1m]           resolvedModel claude-opus-5-5[1m]
claude-fable-5-1[1m] resolvedModel claude-fable-5-1
sonnet             resolvedModel claude-sonnet-5
haiku              resolvedModel claude-haiku-4-5-20251001  (no effort / adaptive fields)
```
`.claude.json` afterwards: `additionalModelOptionsCache = [{"value":"claude-fable-5-1[1m]","label":"Fable",...}]`.
The bundled CLI binary contains no `claude-fable-5-2` string; the system CLI binary does (`grep -ao`).

## PRB-D3 — `prb-cli-update.mts` (one process; `CLAUDE_CODE_EXECUTABLE_PATH` -> symlink; swap bundled 2.1.280 -> system 2.1.322 between two reads)

```
before swap: [["default","claude-opus-5-5[1m]"],["opus[1m]","claude-opus-5-5[1m]"],["claude-fable-5-1","claude-fable-5-1"],["sonnet","claude-sonnet-5"],["haiku","claude-haiku-4-5-20251001"]]
after swap:  [["default","claude-opus-5-5"],["opus","claude-opus-5-5"],["claude-fable-5-1[1m]","claude-fable-5-1"],["sonnet","claude-sonnet-5-5"],["haiku","claude-haiku-5-5"]]
```
Measured: the server's read follows a Claude Code update without restarting the process. Identifiers change between
CLI versions (`opus[1m]` -> `opus`, `claude-fable-5-1` -> `claude-fable-5-1[1m]`).

## PRB-D4 — `prb-cli-reread.mts` (three reads, 3 s apart, system CLI, config dir holding the bundled CLI's options cache)

```
read 1..3: [["default","claude-opus-5-5"],["opus","claude-opus-5-5"],["claude-fable-5-1[1m]","claude-fable-5-1"],["sonnet","claude-sonnet-5-5"],["haiku","claude-haiku-5-5"]]
additionalModelOptionsCache unchanged (answeredAt 1794291396770) before and after.
```
Measured: what the CLI offers also depends on the CLI's own cached account state in its config dir (here it kept
`claude-fable-5-1[1m]` instead of `fable` -> 5-2). That state is Claude Code's, outside AutoByteus.

## PRB-A1 — `prb-sdk-off.mts` (Claude Agent SDK session, options exactly as the server sends: `thinking`, `effort`; maxTurns 1, no tools)

System CLI 2.1.322:
```
haiku  thinking disabled                -> resolved claude-haiku-5-5  blocks [thinking,text] thinking_tokens 118  success
haiku  thinking disabled + effort xhigh -> claude-haiku-5-5  [thinking,text] thinking_tokens 238  success
haiku  thinking adaptive + effort xhigh -> claude-haiku-5-5  [thinking,text] thinking_tokens 405  success
sonnet thinking disabled                -> claude-sonnet-5-5 [thinking,text] thinking_tokens 157  success
sonnet thinking disabled + effort xhigh -> claude-sonnet-5-5 [thinking,text] thinking_tokens 316  success
opus   thinking disabled                -> claude-opus-5-5   [thinking,text] thinking_tokens 72   success
fable  thinking disabled                -> claude-fable-5-2  [thinking,text] thinking_tokens 56   success
```
Bundled CLI 2.1.280 (`PRB_CLI=<bundled claude>`):
```
haiku (alias -> claude-haiku-4-5-20251001) disabled + xhigh -> [text] thinking_tokens 0 success
claude-sonnet-5-5 disabled                 -> [thinking,text] thinking_tokens 241 success
claude-sonnet-5-5 disabled + xhigh         -> [thinking,text] thinking_tokens 256 success
claude-haiku-5-5  disabled + high          -> [thinking,text] thinking_tokens 366 success
```
Measured: on the Claude Agent SDK runtime, `thinking: disabled` (the "Off" choice) does not stop thinking on any
current model, with either CLI, and is never rejected (FU-003's 400 does not reproduce through the CLI). Effort does
change the amount of thinking (118 -> 238 -> 405 tokens on Haiku 5.5).

## PRB-A2 — `prb-api-off.mts` (Anthropic Messages API directly; what the AutoByteus runtime sends)

```
claude-opus-5   (no thinking field = today's "Off")  -> [thinking,text] thinking_tokens 25
claude-opus-5   thinking disabled                    -> [text]          thinking_tokens 0
claude-opus-5   thinking disabled + effort xhigh     -> 400 "output_config.effort 'xhigh' is not supported when thinking is disabled on this model. Use effort 'high' or below, or enable thinking."
claude-fable-5  (no thinking field = today's "Off")  -> [thinking,text] thinking_tokens 12
claude-fable-5  thinking disabled                    -> 400 "\"thinking.type.disabled\" is not supported for this model. Use \"thinking.type.adaptive\" and \"output_config.effort\" to control thinking behavior."
claude-sonnet-5 (no thinking field)                  -> [thinking,text] thinking_tokens 33
claude-sonnet-5 thinking disabled                    -> [text] thinking_tokens 0
claude-haiku-5-5 (no thinking field)                 -> [thinking,text] thinking_tokens 32
claude-haiku-5-5 thinking disabled                   -> [text] thinking_tokens 0
claude-sonnet-5-5 (no thinking field)                -> [text] thinking_tokens 0   (adaptive skipped thinking on this easy prompt)
claude-sonnet-5-5 thinking between_tools             -> [text] thinking_tokens 0
```
Measured: today's AutoByteus "Off" on Opus 5 and Fable 5 sends nothing and the model thinks (FU-001 reproduces).
`disabled` really turns thinking off on Opus 5, Sonnet 5 and Haiku 5.5. Fable 5 cannot turn thinking off.

## PRB-A3 — `prb-api-off.mts` with `temperature` (Messages API; SR-003, ARCH-REV-001 AR-003)

```
claude-fable-5   thinking adaptive                     -> [thinking,text] thinking_tokens 12
claude-fable-5-1 thinking adaptive                     -> [text] thinking_tokens 0 (accepted)
claude-fable-5   thinking adaptive + temperature 0.5   -> 400 "`temperature` may only be set to 1 when thinking is enabled or in adaptive mode."
claude-fable-5-1 temperature 0.5                       -> 400 "`temperature` is deprecated for this model."
claude-opus-5-5  temperature 0.5                       -> 400 "`temperature` is deprecated for this model."
```
Measured: explicit adaptive thinking is accepted on Fable 5 and 5.1, and both reject sampling parameters as Opus 5.5 does,
so one `adaptive_required` mode fits all three.

## Cleanup

The private CLI config dirs (`/tmp/msr-probes/claude-config*`) were deleted after the runs; the scripts hold no secret
(the key is read from the test vault at run time). No repository file was changed for diagnostics.
