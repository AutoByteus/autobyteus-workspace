# API/E2E Execution Coverage Report — mcp-sdk-1-32-upgrade

# Round 2 (IR-002; SR-002 + SR-003 parity) — latest authoritative result

## Plain-Words Summary For The User (AC-016)

**Result: the MCP SDK upgrade (1.30.0 → 1.32.1) changed nothing that we could observe.**

What was checked:
- Two packaged desktop apps were built: one from the commit just before the upgrade (`bf3c550c18`, SDK 1.30.0) and one from current `personal` (`f59055f13f`, SDK 1.32.1).
- Both apps ran side by side, each with its own data.
- The exact same checks ran against both, through the app's own interfaces.

| What we checked | Before (1.30.0) | After (1.32.1) | Same? |
| --- | --- | --- | --- |
| Your kind of MCP server (`uv` + Python): VideoAudioServer lists its tools | 32 tools | 32 tools (same names) | Same |
| media-downloader lists its tools (listing only, nothing downloaded) | 2 tools | 2 tools | Same |
| A local HTTP MCP server with a dummy token | 1 tool, token received | 1 tool, token received | Same |
| A server that crashes at start | "Connection closed" in about 40 ms | same | Same |
| A server that hangs at start | gives up after 60 s ("Request timed out"); app stays responsive | same | Same |
| Calling tools through `/mcp/gateway` (our MCP endpoint for outside clients) | media duration 62.314667 s; HTTP tool answered | same | Same |
| Agent runtimes using our project tools (`create_task` + `update_task`), an external stdio tool and an external HTTP tool | see matrix | see matrix | Same in every cell |
| Old pdf toy server integration tests (implementation check 1) | 4 of 4 pass | 4 of 4 pass | Same |
| A new automatic test that checks every runtime against every MCP tool kind (kept for future upgrades) | — | passes for AGY, native, Claude, Grok and Codex's MCP client | new |
| No leftover processes after closing the app | none | none | Same |

Runtime × MCP matrix (each cell: before / after):

| Runtime | Project tools (`create_task`, `update_task`) | External stdio tool (VideoAudioServer) | External HTTP tool |
| --- | --- | --- | --- |
| Native AutoByteus (local LM Studio model) | pass / pass | pass / pass | pass / pass |
| Claude (haiku) | pass / pass | pass / pass | pass / pass |
| Codex | pass / pass — via Codex's own MCP client, without a model turn (see note) | pass / pass (same) | pass / pass (same) |
| AGY / Antigravity (gemini-3.8-flash-low, real CLI) | pass / pass | pass / pass | pass / pass |
| Grok (grok-4.7) | pass / pass | pass / pass | pass / pass |

Codex note: the Codex account on this machine has hit its usage limit until 25 October, so a Codex agent could not take a model turn on either commit ("You've hit your usage limit"). Instead, a real Codex session was started on each commit and the same four tools were called through Codex's own MCP client. Results were identical on both commits.
If you want, a normal Codex agent turn can be repeated after the limit resets.

What could not be run, and why:
- The HTTP and WebSocket toy servers the old integration tests expect do not exist anywhere.
- No SSH, TTS, image or download tool was called, for safety.

Things we noticed that are **not** caused by the upgrade (identical on both commits):
1. **Your VideoAudioServer setting no longer starts, on either version.** Your settings point at `autobyteus_mcps/video-audio-mcp/server.py`, but that file was removed when the folder was turned into a CLI (`a947f1a`). For this check we used a copy of the last version that had the server.
2. **Bulk import doesn't accept the format of your own `mcps.json`.** Entries without `transport_type`, which is how the app saves them, are rejected ("Imported: 0, Failed: 1") on both versions.
3. **A stdio MCP server started for an agent run keeps running after that run ends, until the app closes.** Closing the app cleans everything up.
4. **A server that hangs at start makes preview wait 60 s before the error.** The app stays responsive during the wait.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` ("Round 2 Plan")
- API/E2E revision ID: `API-REV-002`
- Test progress log: `api-e2e-test-progress.md` (round-2 rows)
- Round and trigger: round 2. Implementation handoff IR-002 (validation only; no code change) for SR-002 + SR-003, from the user's regression request.
- Prior round reviewed: round 1 (API-REV-001, Pass) and DR-001 (delivered).
- Deviations from the plan, and why:
  - API-17 (new): Codex's live model turn was blocked by the account usage limit on both commits. To prove the Codex path without a model, a temporary in-process test called the four tools through Codex's own MCP client (`mcpServer/tool/call`) on a real Codex session.
  - AGY ran as the real CLI inside the isolated instances. The scripted CLI fallback was not needed.
  - The first two API-17 attempts on before failed on the probe's own result parsing (`create_task` returns `{task: {...}}`). The probe was fixed before its passing runs on both commits.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade-parity/tickets/in-progress/mcp-sdk-1-32-upgrade/evidence/` (API-10…API-17)

## Routing Classification

- Task size: `Small` (this round); Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route` (no durable test code changed this round)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-B | `bf3c550c18` (SDK 1.30.0) | macOS 26 arm64 | Packaged worktree build `mcp-sdk-1-32-upgrade-parity-before/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`; bundle holds SDK 1.30.0 only; isolated instance `iso-59202-159b` (backend :59203) | Own data root; throwaway `CODEX_HOME`; host sign-ins for Claude, AGY, Grok (real HOME); LM Studio local |
| ENV-A | `f59055f13f` (SDK 1.32.1) | same | Same for the parity worktree; bundle holds SDK 1.32.1 only; instance `iso-59206-2e45` (backend :59207) | Same |
| ENV-C | both commits | same | In-process studio server per worktree (API-17) | throwaway `CODEX_HOME`, real HOME |
| Shared test instruments | — | — | Test-owned copies of VideoAudioServer (`autobyteus_mcps` `a947f1a^`) and yt-dlp-mcp (`autobyteus_private_mcps` `HEAD`), one per side, each with `uv sync --frozen` (Python `mcp` 1.28.1 / 1.26.0, identical per side); a test HTTP MCP server and gateway client on the same SDK 1.32.1 for both sides (constant instrument); sample `parity-sample.mp4` | — |

## Cases (round 2)

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R10 | AC-010 | core integration tests vs real `pdf_mcp` | Reused IMP-SR2-01 | — | Pass (same) | `IMP-SR2-01-toy-integration-{before,after}.log` | `Tests  4 passed` on both | HTTP and WS toys exist nowhere ("cannot run on either"; WS test removed in after) |
| API-10 | AC-011, AC-012, REQ-010 | isolated app: GraphQL preview → bulk import → discover for VideoAudioServer, media-downloader, test HTTP server, exit-at-start, hang-at-start; responsiveness during the hang | `pnpm --silent isolated-app start --build` per worktree with throwaway `CODEX_HOME`; `node parity-harness.mjs <side> …` | ENV-B, ENV-A | Pass (same) | `API-10-12-parity-harness-{before,after}.txt`, `API-10-12-parity-comparison.txt` | `SAME` on every server row; `preview tool names identical … True`; `hang_at_start responsiveness … 'value': 200` | timings within a few ms; hang 60.0 s on both |
| API-11 | AC-015 | `/mcp/gateway` → external HTTP and stdio tools | same harness run | ENV-B, ENV-A | Pass (same) | same files | `SAME toolCount 35 35 \| stdio {'isError': False, 'text': '62.314667'}` on both | — |
| API-12 | AC-014, AC-017, AC-011 (agent call) | runtime × {project tools, external stdio, external HTTP} | same harness run; one agent per runtime, all four tools selected; tasks checked through GraphQL; the HTTP server records auth on `tools/call` | ENV-B, ENV-A | Pass (same); Codex live turn not run (account usage limit, both sides) | same files | each runtime row `SAME`; `saved task status DONE DONE`; `HTTP server saw on tools/call ['expected'] ['expected']` | Grok also calls its own `search_tool` (both sides) |
| API-17 | AC-014 (Codex), AC-017 (Codex row) | Codex App Server thread's own MCP client → `autobyteus_agent_tools` → project tools and external stdio/HTTP servers; no model turn | temporary `zz-parity-codex-direct-mcp.e2e.test.ts` copied into each worktree, run, removed | ENV-C | Pass (same) | `API-17-codex-direct-mcp-{before,after}.txt` | `"updateTask": {"isError": false, "status": "DONE"}`, `"text": "62.314667"`, `"remoteToolCalls": ["expected"]`; result JSON identical before/after | — |
| API-13 | AC-011, AC-012 | stop both instances; orphan check | `isolated-app stop <id>`; `ps` before and after | ENV-B, ENV-A | Pass (same) | `API-13-processes-and-stop.txt` | `"forced": false`, `"dataRootRemoved": true`; after stop `(no process left)` | 4 VideoAudioServer sessions per side alive until stop (observation 3) |
| API-14 | REQ-010 | user repos and data untouched | `git status` diff of both user MCP repos; mcps.json mtime | local | Pass | `API-14-user-data-untouched.txt` | `diff: identical` for both repos; mcps.json `Sep 16 09:24` | — |
| API-15 | AC-013 | SDK imports per commit | grep | local | Pass | `API-15-sdk-imports.txt` | server `src`: `0` on both | — |
| API-16 | AC-009 | round-2 evidence and raw logs | grep scan | local | Pass | `API-16-ac009-scan.txt` | every raw log `test-dummy=0`; `(no token field in any evidence file)` | — |
| API-18 | AC-017 (going forward), AC-014 | new durable gated suite `autobyteus-server-ts/tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` on the after branch: per runtime, project tools + external stdio (real SDK fixture; env and cwd checked) + external HTTP (credential on `tools/call`) | run 1: `RUN_AGY_FAILURE_E2E=1 … RUN_CODEX_MCP_E2E=1`; run 2: `RUN_LMSTUDIO_E2E=1 RUN_CLAUDE_E2E=1 RUN_GROK_E2E=1`; run 3: no gate | ENV-C (after) | Pass | `API-18-runtime-mcp-matrix-suite.txt` | `✓ agy (scripted CLI)…`, `✓ codex MCP client (no model turn)…`, `✓ native…`, `✓ claude…`, `✓ grok…`; each summary `"taskStatus":"DONE","stdioEnvDelivered":true,"stdioCwdDelivered":true,"httpMarker":true,"httpToolCalls":["expected"]`; no gate: `Tests  6 skipped (6)` | API-18M: with the stdio `env` dropped in `autobyteus-ts/src`, the AGY cell goes red (`"stdioEnvDelivered": false`); restored with `git checkout`. A first mutation attempt on `dist` stayed green because in-process tests run the `autobyteus-ts` source; it is recorded in the evidence. |
| — | setup | test-owned copies, uv sync, probe sources | — | — | — | `API-10-17-setup-and-probe-sources.txt` | harness and Codex test sources | — |

## Acceptance-Criteria Proof (round 2)

| Acceptance-Criteria ID | Critical | Proven By | Result | Note |
| --- | --- | --- | --- | --- |
| AC-010 toy integration parity | Yes | API-R10 | Proven | HTTP/WS toy cases: cannot run on either (toys do not exist) |
| AC-011 real servers in isolated apps, agent call, no child left | Yes | API-10, API-12, API-13 | Proven | — |
| AC-012 exit/hang at start same visible outcome | Yes | API-10, API-13 | Proven | the 60 s hang wait is pre-existing (observation 4) |
| AC-013 code statement | No | API-15, API-R11 | Proven | — |
| AC-014 Claude and Codex `create_task`/`update_task` via Agent Tools MCP | Yes | API-12 (Claude, plus native, AGY, Grok), API-17 (Codex) | Proven | Codex through its own MCP client without a model turn; its live model turn was blocked by the account usage limit on both commits |
| AC-015 gateway call of an external MCP-origin tool | Yes | API-11 | Proven | — |
| AC-016 plain-words report | Yes | summary above | Proven | — |
| AC-017 runtime × MCP matrix | Yes | API-12, API-17 | Proven | every cell same before/after; Codex cells via API-17 |
| AC-009 dummy values only | Yes | API-16 | Proven | — |

## Validation Confidence Scorecard (round 2)

| Category | Final Score | Support | Residual |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | all round-2 ACs proven | the Codex model turn itself was not repeated |
| Changed-boundary execution directness | 97% | real packaged apps of both commits; real `uv` Python servers; real runtimes | — |
| Cross-boundary integration realism and mock gap | 96% | no mocks; four live models plus Codex's real MCP client | Codex without a model turn |
| Environment, configuration, identity, and fixture fidelity | 95% | packaged builds, user's server definitions (env removed), host sign-ins | VideoAudioServer restored from history (the user's current folder no longer has the server) |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | exit/hang at start, responsiveness, stop and orphan check | — |
| User-surface, browser, and desktop-shell confidence | 93% | packaged desktop apps driven through their public endpoints | renderer not driven (unchanged) |
| Durable regression coverage quality and relevance | 95% | new gated runtime × MCP matrix suite (API-18), mutation-proven; round-1 suites remain | before/after parity itself is a one-time cross-commit check (harness kept in evidence) |

- Overall final confidence: 95.4% (simple average of 96, 97, 96, 95, 96, 93, 95). No category below 90%.
- Every critical acceptance criterion directly proven: `Yes`. Default 95% target met. The durable-coverage gap found at the first scoring (94.7%) was closed by adding the API-18 suite, rather than recording it as a follow-up.
- Broader validation decision: `Required`, executed (Project Desktop Validation on both commits, live runtimes, Codex MCP client probe). Browser: not needed (no renderer change).

## Persisted Data / Compatibility (round 2)

- No code change this round; round-1 decisions stand. No compatibility mechanism observed.

## Durable Coverage Changed In The Codebase (round 2)

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` | Added (gated per runtime; skips without gates) | API-18 |

- The two parity probes (harness, Codex direct test) are temporary because the before commit cannot carry tests. Their sources are in `API-10-17-setup-and-probe-sources.txt`. The Codex test file was copied into each worktree only for its run and then removed; `git status` shows no trace.
- Test-code review: `Not Required — direct low-risk route`.

## Temporary Methods And Cleanup (round 2)

| Item | Cleanup | Result |
| --- | --- | --- |
| Isolated instances `iso-59202-159b`, `iso-59206-2e45` | `isolated-app stop` | stopped (not forced); ports released; data roots removed; no process left |
| Test-owned folder `$TMPDIR/mcp-parity-api` (copies, `.venv`s, sample, throwaway `CODEX_HOME`, harness, logs) | removed after the evidence was written | done |
| Before worktree `mcp-sdk-1-32-upgrade-parity-before` | `git worktree remove --force` (it held only build outputs) | done |
| LM Studio model | `lms unload` | unloaded |
| Agent sessions in the user's CLI histories (Claude, AGY, Grok; Codex sessions under the throwaway home) | left in place (signed-in CLIs need the real HOME) | one short session per runtime per commit |
| Packaged build and server `dist` in the after worktree | left as untracked build outputs | — |

## Latest Authoritative Result (round 2)

- Result: `Pass`. No difference between SDK 1.30.0 and 1.32.1 in any check.
- Criteria not proven / user-only parts: `None`. The optional repeat of a Codex model turn after the usage limit resets is offered to the user in the summary.
- Next recipient: Delivery Engineer.
- Follow-up candidates (pre-existing, outside this ticket; same on both commits):
  1. The user's VideoAudioServer setting points at a removed `server.py`.
  2. Bulk import rejects the app's own `mcps.json` shape (no `transport_type`).
  3. Per-run stdio MCP server sessions outlive their terminated runs until the app closes.
  4. A hang-at-start server costs a 60 s preview wait.
  (The durable runtime × MCP matrix suite, first listed here, was added this round as API-18.)

---

# Round 1 (API-REV-001) — superseded as the latest result; kept as history

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/mcp-sdk-1-32-upgrade/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/mcp-sdk-1-32-upgrade/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/mcp-sdk-1-32-upgrade/api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct route)
- Prior round reviewed: none for this ticket
- Deviations from the investigation's plan, and why:
  - API-01M (new): a mutation check that sets `redirectPolicy: "follow"` in the built core, proving API-01 goes red when cross-origin redirects are followed.
  - API-01's first attempt failed on a test expectation: preview applies the tool-name prefix the test itself set, so the expected tool name is `moved_auth_probe`. The test was fixed before the passing run. API-02 passed on the first attempt.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-sdk-1-32-upgrade/tickets/in-progress/mcp-sdk-1-32-upgrade/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `c7f0c18fdc` (source = `4923d179c1`) + API/E2E test changes | macOS 26 (Darwin 25.5.0), node 22, pnpm 10.28.2 | `pnpm -C autobyteus-ts build`, then `pnpm -C autobyteus-server-ts build` at `c7f0c18fdc`; built `dist/app.js` started by `startBuiltTestServer` | `env -i PATH HOME=<resolved temp> TMPDIR`; owned ports, runtime roots and SQLite dbs, removed by the tests; local MCP servers on 127.0.0.1; dummy values |
| ENV-2 | same | same | In-process studio server; host LM Studio `qwen/qwen3.6-35b-a3b` | clean env; model loaded just in time and unloaded after |
| ENV-3 | same | same | In-process studio server; host signed-in `codex` (gpt-5.6-luna) / `claude` (haiku) | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR`; one turn each |
| ENV-4 | same | same | `pnpm test:e2e` (full server e2e) | `env -i PATH HOME=<resolved temp> TMPDIR`; gated suites skip without their gates |
| ENV-5 | same (build context = worktree) | Docker 29.0.1, buildx, linux/arm64 | Image `autobyteus-server:mcp-sdk-1-32-validation` from `autobyteus-server-ts/docker/Dockerfile.monorepo` (same args as `build.sh`); container `mcp181-sdk-validation` | `127.0.0.1:<free>:8000`, no user volumes, dummy `AUTOBYTEUS_MCP_GATEWAY_TOKEN`, stdio fixture mounted read-only; container and image removed |
| ENV-6 | same | macOS 26 arm64 | Packaged Electron worktree build `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (`pnpm --silent isolated-app start --build`), instance `iso-56513-e563` | Own ports (backend 56514), auto-created data root removed on stop; the user's AutoByteus app untouched |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001 | lockfile, manifests | Reused handoff row AC-001 | — | Pass | (implementation handoff) | — | Rechecked here: `autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk` links the `…ba12f93b…` variant, which links SDK 1.32.1, and `@google/genai` links 1.32.1. The `@modelcontextprotocol+sdk@1.30.0` folders still in the local `node_modules/.pnpm` are orphans of the first install; nothing links to them and the lockfile has no 1.30. The Docker build's fresh install has only 1.32.1 (API-07). |
| API-R02 | AC-002, AC-003, AC-004 (core), AC-006, AC-007 | core unit (real SDK servers, stdio fixture) | Reused IMP-00, IMP-02 | — | Pass | (implementation handoff) | — | Source unchanged since `4923d179c1` (`git diff --name-only 4923d179c1 c7f0c18fdc` outside `tickets/` is empty) |
| API-R03 | AC-005 | tsc build, server typecheck, grep | Reused IMP-01, IMP-04, handoff row AC-005 | — | Pass | (implementation handoff) | — | Same |
| API-R04 | AC-004, AC-008 | server unit + integration | Reused IMP-05, IMP-06 | — | Pass | (implementation handoff) | — | Same |
| API-R05 | AC-004 | 179 built-server e2e; AGY scripted agent tool call | Reused IMP-07, IMP-08 | — | Pass | (implementation handoff) | — | Same; both 179 files ran again inside API-05 |
| API-R06 | AC-008 | web full suite | Reused IMP-09 | — | Pass | (implementation handoff) | — | Same |
| API-01 | AC-002, AC-003, AC-006, QR-001; SCN-002, SCN-A1, SCN-A2, SCN-003 | GraphQL preview, configure, discover, import → registry → SDK 1.32.1 → remote; `/mcp/gateway`; built server output | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" MCP_REDIRECT_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts --no-watch`, first `it` | ENV-1 | Pass | `API-01-redirect-transport-e2e.log`, `API-01-observations.json.txt` | `✓ refuses a cross-origin redirect, follows a same-origin one, and rejects a websocket import`; observations `"other": []`; `moved` requests on `"/mcp-new"` all `"auth": "expected"` incl. `tools/call` | Cross-origin (307 with a `?canary=` query): both preview and discover fail with `Redirect to http://127.0.0.1:<B>/mcp not followed (redirectPolicy: 'same-origin')`. The query and the token are absent from the error, and server B gets no request. Same-origin 308 `/mcp → /mcp-new`: preview, save + discover and the gateway tool call work with the credential. WebSocket bulk import: `success false, importedCount 1, failedCount 1`; only the valid entry is saved (GraphQL and `mcps.json`); server output contains `Valid types are: stdio, streamable_http.` |
| API-02 | AC-006, persisted data (`Not Affected`); SCN-A3 | real startup on a `mcps.json` with WebSocket-era entries | same command, second `it` | ENV-1 | Pass | `API-01-redirect-transport-e2e.log`, `API-01-observations.json.txt` | `✓ starts with WebSocket-era entries in mcps.json and registers the valid entry next to them`; `"serverOutputScan": {… "containsDummy": false, "containsCanary": false}` | Entries `legacy_ws: {command: ""}` (what earlier builds wrote for a WebSocket import) and `hand_ws: {transport_type: "websocket", …}` are skipped. The valid `plain` entry registers at startup and is callable with its token; `mcpServers` lists only `plain`. |
| API-01M | AC-002 (non-vacuity) | built core patched to `redirectPolicy: "follow"` | sed patch of `autobyteus-ts/dist/tools/mcp/server/http-managed-mcp-server.js`, API-01 rerun, file restored | ENV-1 | Pass (expected red) | `API-01M-mutation-follow-red.log` | `Tests  1 failed \| 1 passed (2)`; `expected 'Failed to preview tools for MCP serve…' to contain 'Redirect to http://127.0.0.1:…` | sha1 `47fccbe5da91` before and after the restore |
| API-03 | AC-004, AC-008 | native AutoByteus runtime (LM Studio) → registry MCP tools | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" RUN_LMSTUDIO_E2E=1 MCP_AUTH_E2E_EVIDENCE_DIR=<temp> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-03-native-lmstudio-agent-tool-call.log`, `API-03-native-lmstudio-summary.json.txt` | `✓ native: …`; `TOOL_EXECUTION_SUCCEEDED` for `hdr_auth_probe` and `tok_auth_probe`; both `tools/call` `"auth": "expected"` | — |
| API-04 | AC-004, AC-008 | Codex App Server (live) → `autobyteus_agent_tools` | same file with `RUN_CODEX_E2E=1 CODEX_E2E_TOOL_MODEL=gpt-5.6-luna`, real HOME/USER/LOGNAME | ENV-3 | Pass | `API-04-codex-live-agent-tool-call.log`, `API-04-codex-live-summary.json.txt` | `✓ codex: …`; both `tools/call` `"auth": "expected"`; `"dummyValueOnAgentWire": false` | — |
| API-06 | AC-004, AC-008, R-002 | Claude Agent SDK runtime (live; its SDK peer is now 1.32.1) → `autobyteus_agent_tools` | same file with `RUN_CLAUDE_E2E=1`, real HOME/USER/LOGNAME | ENV-3 | Pass | `API-06-claude-live-agent-tool-call.log`, `API-06-claude-live-summary.json.txt` | `✓ claude: …`; both `tools/call` `"auth": "expected"` | — |
| API-05 | AC-008 | full server e2e suite | `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm test:e2e` | ENV-4 | Pass | `API-05-server-e2e-full.log` | `Test Files  89 passed \| 88 skipped (177)`; `Tests  370 passed \| 394 skipped (764)`; `exit 0` | 88 gated files skip without their `RUN_*` gates, and a skip is not a pass. The gated MCP runtime file is proven live by API-03/04/06; IMP-08 covers AGY. Both MCP built-server files ran and passed inside the suite. The `TAU-2 first start: FAILED (…)` stdout line is the deliberate scenario of the passing `task-agent-own-run-startup.e2e.test.ts`. |
| API-07 | AC-001, AC-002, AC-004, AC-007 (packaged), design escalation trigger | Docker image built from the worktree; container; GraphQL + `/mcp/gateway` | build, run, probe and cleanup commands in the evidence file header | ENV-5 | Pass | `API-07-docker-image-mcp.txt` | `autobyteus-ts sdk 1.32.1`, `@modelcontextprotocol+sdk@1.32.1_zod@4.3.6 (only copy)`; probe `"httpToolResult": "MARKER-TOK-9902"`, `"envDelivered": true`, `"cwd": "/tmp"`, `"crossOriginTargetRequests": 0`, `"crossOriginPreviewError": "…Redirect to http://host.docker.internal:<port>/mcp not followed (redirectPolicy: 'same-origin')"`; container logs `test-dummy occurrences: 0` | The fresh `pnpm install --no-frozen-lockfile` in Linux resolved a single SDK copy. It reports no unmet MCP SDK peer; the only peer warnings are Nuxt ones unrelated to this change. The container runs node 22.23.3. |
| API-08 | AC-001, AC-002, AC-004, AC-007 (packaged), design escalation trigger | packaged Electron (isolated instance) → embedded server GraphQL + `/mcp/gateway` | `pnpm --silent isolated-app start --build`; the API-07 probe with `BACKEND_URL=<backendUrl>`, `MCP_HOST=127.0.0.1`, stdio `node <worktree fixture>`; `pnpm --silent isolated-app stop iso-56513-e563` | ENV-6 | Pass | `API-08-electron-packaged-mcp.txt` | `1.32.1 Resources/server/node_modules/.pnpm/@modelcontextprotocol+sdk@1.32.1_zod@4.3.6/… (only copy)`; probe `"httpToolResult": "MARKER-TOK-9902"`, `"envDelivered": true`, `"crossOriginTargetRequests": 0`; stop `"dataRootRemoved": true` | No renderer change, so no UI journey; the shell-relevant change is the packaged server's dependency tree |
| API-09 | AC-009, REQ-007 | evidence, diff, test files, probe, raw run/container/app logs | credential-pattern grep and `test-dummy` counts (commands in the file header) | local | Pass | `API-09-ac009-scan.txt` | `Result: credential-like matches are dummy values …`; every raw log `test-dummy=0` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 one SDK 1.32.1 copy; peers on it | Yes | API-R01, API-07 (fresh Linux install in the image), API-08 (packaged app) | Proven | — |
| AC-002 cross-origin redirect: connect fails, error names the unfollowed redirect, other origin gets nothing | Yes | API-01 (GraphQL preview + discover), API-01M, API-07 (Docker), API-08 (Electron), API-R02 (core, red on 1.30.0) | Proven | — |
| AC-003 same-origin redirect works | Yes | API-01 (308: preview, discover, gateway call with credential), API-R02 (core 307) | Proven | — |
| AC-004 179 behavior green on 1.32.1 | Yes | API-03 native, API-04 Codex, API-06 Claude, API-05 (179 built-server file), API-R05 (AGY), API-07, API-08 | Proven | — |
| AC-005 typecheck + no seams/casts | No | API-R03 | Proven | — |
| AC-006 `websocket` rejected, lists the supported transports, nothing saved | Yes | API-01 (GraphQL import; log names `stdio, streamable_http`), API-02 (stored WebSocket-era entries skipped), API-R02 (parser message) | Proven | — |
| AC-007 real stdio server with env and cwd | Yes | API-R02 (core fixture test), API-07 (Docker), API-08 (packaged app) | Proven | — |
| AC-008 full rerun | Yes | API-R02, API-R03, API-R04, API-R06, API-05, API-03, API-04, API-06 | Proven | — |
| AC-009 dummy values only | Yes | API-09, API-01/02 output scan, API-07/08 log scans | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 97% | All ACs proven (table above) | none material | — |
| Changed-boundary execution directness | 80% | 97% | Redirect and import behavior through GraphQL on the built server, Docker and Electron; mutation red (API-01M) | none material | — |
| Cross-boundary integration realism and mock gap | 75% | 96% | No mocks; real SDK servers; four runtimes, three of them live models; real Docker image and packaged app | remote servers are local fixtures (REQ-007) | — |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | Built-server sanitized env; signed-in CLIs; fresh Linux install in Docker; packaged app | `https` upgrade redirect not exercised locally | TLS on default ports |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | cross vs same origin, query stripping, WebSocket import, WebSocket-era stored entries at startup | 301/302-on-POST is SDK contract only (observation) | — |
| User-surface, browser, and desktop-shell confidence | 85% | 93% | Packaged Electron app starts, and its embedded server runs MCP on 1.32.1 (API-08). The web suite (IMP-09) is green. | No renderer change; the error text reaches the UI through the existing preview message (unchanged path) | — |
| Durable regression coverage quality and relevance | 85% | 96% | New built-server e2e (ungated, about 9 s, mutation-proven); helper redirect option for future SDK upgrades | — | — |

- Overall post-repository confidence: about 81%
- Overall final confidence: 95.6% (97, 97, 96, 95, 95, 93, 96; simple average)
- Calculation method: simple average of the seven final scores
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the `https` upgrade redirect path is not exercised locally (SDK-internal); 301/302 on POST are not followed even within the origin (SDK contract; no working path is lost, because on 1.30.0 a 301/302 turned the POST into a body-less GET, which no MCP endpoint accepts).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (built server), `Lifecycle` (startup with stored entries), `Project Desktop Validation` (packaged Electron isolated instance), `Other` (Docker image; live agent runtimes)
- Confidence gap addressed: the repository evidence proved the core client on 1.32.1 but not the product paths (GraphQL preview, discover, import, startup), the live runtimes, the Claude Agent SDK peer, or the packaged Docker and Electron builds, which are the design's escalation trigger. All are now proven.
- Browser validation needed: No. No renderer or web change; the full web suite is green (IMP-09).

## Desktop Application Validation

- Approach executed: `pnpm --silent isolated-app start --build` (packaged mac-arm64 build of this worktree), driven through the reported `backendUrl` with GraphQL and `/mcp/gateway`; stopped with `isolated-app stop`.
- Cases: API-08 (shell packaging of the server's dependency tree and the embedded server's MCP behavior). No web-equivalent behavior changed.
- Effect on any already-running desktop application: `None`. The user's AutoByteus app kept running on its own ports and data.
- Behavior not directly proven: none material for this change.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: `{command: ""}` (what an earlier build wrote for a WebSocket import) and a hand-written `{transport_type: "websocket", url}` entry, next to a valid HTTP entry with a token (API-02).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-02 (startup skips both, registers the valid entry), API-01 (stdio/HTTP shapes written and read unchanged)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`. API-02 proves the existing per-entry load tolerance. That is the approved general reader policy, not a compatibility shim.
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/tool-management/mcp-http-redirect-and-transport.e2e.test.ts` | Added | API-01, API-02, API-01M | — |
| `autobyteus-server-ts/tests/e2e/helpers/auth-required-mcp-server.ts` | Updated (optional `redirects` map; `path` in observations) | API-01, API-02, API-03, API-04, API-06 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Remote MCP servers, including redirecting endpoints | Local real-SDK servers with a redirect map | REQ-007: dummy values and local servers only | None for the redirect contract |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built servers, runtime roots, SQLite dbs (API-01/02, API-05) | Yes | test-owned cleanup | none left |
| In-process temp data dirs, agent definitions and runs (API-03/04/06) | Yes | test `afterAll` | done |
| LM Studio model `qwen/qwen3.6-35b-a3b` (loaded just in time) | Yes | `lms unload` | unloaded |
| Codex / Claude sessions in the user's CLI history | Created by the runs | left in place (signed-in CLIs need the real HOME) | one short session each |
| `autobyteus-ts/dist` mutation (API-01M) | Yes | restored from backup | sha1 `47fccbe5da91` before and after |
| Docker container `mcp181-sdk-validation` + image `autobyteus-server:mcp-sdk-1-32-validation` | Yes | `docker rm -f -v`, `docker rmi` | removed; the user's `autobyteus-server-*` containers untouched. The buildx cache from this build was left; it is shared builder cache. |
| Isolated instance `iso-56513-e563` | Yes | `isolated-app stop` | stopped; ports released; data root removed |
| Packaged build `autobyteus-web/electron-dist/`, rebuilt server `dist` | Yes | left as untracked worktree build outputs | — |
| Temporary probe and raw logs under `/tmp/mcp181` | Yes | removed after the evidence was written | done |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: Delivery Engineer
- Notes:
  - Design escalation triggers checked:
    - one SDK copy in the lockfile, the Docker image and the packaged app;
    - peers on 1.32.1;
    - Codex, Claude and native runtimes unchanged; AGY in IMP-08;
    - Docker and Electron builds unchanged in MCP behavior.

    None fired.
  - Observation, not a defect: the GraphQL bulk import returns only counts (`Imported: 1, Failed: 1`). The per-entry reason (`Valid types are: stdio, streamable_http.`) appears only in the server log. This is the existing import contract for every failure kind, outside this ticket's Change Scope; a follow-up candidate if the UI should show per-entry reasons.
  - Observation: in this worktree's local `node_modules/.pnpm`, orphan `@modelcontextprotocol+sdk@1.30.0` folders remain from the first install. They are unreferenced and absent from fresh installs (API-07, API-08).
