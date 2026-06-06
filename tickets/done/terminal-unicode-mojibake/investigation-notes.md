# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Correct frontend + Electron-started backend reproduction complete; root cause isolated to frontend base64/UTF-8 decoding boundary
- Investigation Goal: Identify why AutoByteus Terminal tab displays mojibake/strange symbols for Codex/Claude CLI Unicode output and design a robust fix.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: Investigation crossed process and browser boundaries, but the required code change is isolated to the frontend terminal transport codec.
- Scope Summary: Preserve Unicode/UTF-8 terminal output from spawned CLI process to frontend Terminal tab without breaking ANSI terminal behavior.
- Primary Questions To Resolve:
  - Where is terminal output converted from bytes to strings?
  - Is the pty process configured with the correct encoding?
  - Does the transport preserve strings/bytes without Latin-1 conversion or double-encoding?
  - Does the frontend terminal renderer receive correct Unicode strings?
  - What automated or scripted validation can catch this regression?

## Request Context

User reports that in the AutoByteus frontend Terminal tab, after typing `codex`, the UI shows many strange symbols around the Codex CLI interface. The supplied screenshot shows mojibake-like sequences beginning with `â` around what should likely be Unicode box-drawing borders and symbols. User says the issue can be reproduced by starting the frontend and using the server; Electron starts the application server and agent server.

Reference screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/team_software-engineering-team_9ad6310d/solution_designer_f8470d77c558f43b/context_files/ctx_92b5de76b8c4__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake/tickets/in-progress/terminal-unicode-mojibake`
- Current Branch: `codex/terminal-unicode-mojibake`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-06.
- Task Branch: `codex/terminal-unicode-mojibake` tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Work should remain on the dedicated task worktree/branch above, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-06 | Repro | Correct frontend: `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev`; browser script: `/tmp/autobyteus-terminal-ui-repro.mjs` | `codex` launched in the right-panel Terminal produced `âº` in the trust prompt. Screenshot: `browser-repro-terminal.png`. | Actual frontend + Electron-started backend path reproduces the user issue; root cause remains in frontend terminal codec. |
| 2026-06-06 | Data | User screenshot path listed above | Inspect visible symptom | Codex CLI Unicode UI appears as `â...` mojibake, consistent with UTF-8 decoded as Latin-1/Windows-1252 | Trace terminal data path |
| 2026-06-06 | Repro | Correct frontend deterministic byte-output repro: `printf '\342\224\214\342\224\200\342\224\220\n'` via Playwright/Chrome | Remove Codex as a variable and prove arbitrary UTF-8 PTY output fails | Expected `┌─┐`; actual Terminal UI rendered `â...`. Screenshot: `browser-repro-byte-output.png`. | Fix frontend codec with streaming UTF-8 decode |
| 2026-06-06 | Command | `git status --short --branch && git rev-parse --show-toplevel && git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD || true && git worktree list --porcelain` | Bootstrap repository state | Shared checkout was on `personal`; remote default is `origin/personal`; many prior worktrees exist | No |
| 2026-06-06 | Command | `git fetch origin --prune` | Refresh remote refs before worktree creation | Fetch succeeded | No |
| 2026-06-06 | Command | `git worktree add -b codex/terminal-unicode-mojibake /Users/normy/autobyteus_org/autobyteus-worktrees/terminal-unicode-mojibake origin/personal` | Create dedicated task worktree/branch | Worktree created from latest tracked base | No |
| 2026-06-06 | Code | `autobyteus-web/composables/useTerminalSession.ts` | Inspect frontend terminal transport boundary | Inbound output uses `const decoded = atob(message.data)` then forwards `decoded` to xterm; outbound input uses `btoa(data)`. `atob`/`btoa` operate on binary strings, not UTF-8 text, so non-ASCII terminal bytes render as mojibake and non-ASCII input can throw/corrupt. | Design frontend UTF-8 codec fix |
| 2026-06-06 | Code | `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | Inspect backend terminal transport boundary | Backend preserves terminal bytes as `Buffer` and serializes output with `data.toString("base64")`; input decodes client base64 with `Buffer.from(data.data, "base64")`. Backend byte transport is appropriate. | No backend transport redesign needed |
| 2026-06-06 | Code | `autobyteus-ts/src/tools/terminal/isolated-pty-session.ts`, `isolated-pty-bridge-source.ts`, `pty-session.ts` | Inspect PTY capture path | PTY output is captured as UTF-8 bytes/buffers before backend base64. macOS isolated helper writes node-pty string output to stdout; parent receives Buffer stdout. | Keep backend as byte-preserving base64 transport |
| 2026-06-06 | Command | `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev` in `autobyteus-web` | Start correct frontend against Electron-started backend | Correct worktree frontend served on `http://localhost:3000`; Electron backend on `127.0.0.1:29695` remained healthy. | Use wide browser viewport for desktop terminal |
| 2026-06-06 | Trace | Playwright wide viewport script `/tmp/autobyteus-terminal-ui-repro.mjs` | Reproduce through actual frontend + Electron-started backend path | Browser console showed terminal WebSocket to `ws://127.0.0.1:29695/ws/terminal/...`; running `codex` displayed `âº` in the trust prompt. Screenshot saved to ticket folder. | Add codec validation and implement fix |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `autobyteus-web/components/workspace/tools/Terminal.vue` renders xterm and delegates WebSocket I/O to `autobyteus-web/composables/useTerminalSession.ts`.
- Current execution flow: xterm `onData` -> `useTerminalSession.sendInput` -> base64 JSON WebSocket -> `TerminalHandler.handleMessage` -> `TerminalSession.write`; PTY output -> `TerminalSession.read` as `Buffer` -> `TerminalHandler.encodeOutput` base64 JSON -> `useTerminalSession.onmessage` -> `atob(...)` -> `Terminal.vue` xterm `write(...)`.
- Ownership or boundary observations: Backend terminal streaming owns byte-preserving transport and PTY lifecycle. Frontend terminal session owns conversion between browser strings and transported terminal bytes.
- Current behavior summary: Terminal output from `codex` displays mojibake around Unicode UI elements because frontend output decoding treats UTF-8 bytes as direct JavaScript code units.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor posture evidence summary: No broader refactor appears needed. The existing TerminalSession frontend boundary is the correct owner for browser-side base64/UTF-8 conversion; the bug is isolated to codec implementation details there.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot | `â...` sequences visible where terminal UI likely emits box drawing | Strong initial signal for one byte/string decoding boundary defect | Confirm defective owner and boundary |
| `useTerminalSession.ts` | `atob` output is passed directly to xterm and input uses `btoa` | Confirms local frontend codec defect at the TerminalSession boundary | Add UTF-8 encoder/decoder tests |
| Correct browser reproduction | `codex` trust prompt rendered `âº` through `localhost:3000` frontend and `127.0.0.1:29695` backend | Confirms user-reported behavior in actual runtime path | Implement and browser-verify fix |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/composables/useTerminalSession.ts` | Browser WebSocket terminal session and base64 transport codec | Uses `atob`/`btoa` directly for terminal data | Correct owner for UTF-8 codec fix; add small helpers/tests here |
| `autobyteus-web/components/workspace/tools/Terminal.vue` | xterm rendering and input/resize event wiring | Delegates I/O to `useTerminalSession`; no evidence renderer config causes mojibake | Likely no component change except maybe lifecycle flush if helper is exposed via composable |
| `autobyteus-server-ts/src/services/terminal-streaming/terminal-handler.ts` | Backend WebSocket route handler/read loop and byte-to-base64 envelope | Encodes Buffers to base64 and decodes client base64 to Buffers | Backend transport is already byte-preserving; add tests only if needed |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-06 | Setup | `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev` from `autobyteus-web` | Correct worktree frontend served `http://localhost:3000`; backend health was OK at `http://127.0.0.1:29695/rest/health`. | Runtime path matched user-requested frontend + Electron-started backend. |
| 2026-06-06 | Repro | Correct frontend + Electron backend + `codex` in Terminal tab | Codex trust prompt displayed mojibake such as `âº` where Unicode prompt markers should render. | User-reported symptom reproduced in actual app path. |
| 2026-06-06 | Repro | Deterministic ASCII command emitting UTF-8 bytes: `printf '\342\224\214\342\224\200\342\224\220\n'` | Expected `┌─┐`; actual UI displayed `âââ`/`â...`. | Confirms arbitrary UTF-8 terminal output is misdecoded in frontend, not a Codex-specific behavior. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None yet.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Electron-started backend on `127.0.0.1:29695`; frontend dev server from task worktree on `localhost:3000`.
- Required config, feature flags, env vars, or accounts: Frontend started with `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695`; no extra accounts needed for deterministic terminal reproduction. `codex` launch reached its local trust prompt.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `pnpm install --frozen-lockfile`; `BACKEND_NODE_BASE_URL=http://127.0.0.1:29695 pnpm dev`; Playwright/Chrome reproduction script.
- Cleanup notes for temporary investigation-only setup: Unrelated pre-existing Nuxt server on port 3000 from `/Users/normy/autobyteus_org/autobyteus-com-workspace/frontend` was killed. Correct frontend dev server may still be running for continued validation.

## Findings From Code / Docs / Data / Logs

Key finding: `atob(message.data)` returns a browser binary string where each UTF-8 byte becomes one JS code unit. Passing that string directly to xterm renders UTF-8 byte values such as `0xe2` as characters like `â` and exposes continuation bytes/control-like code units to xterm. The frontend must convert base64 to bytes and then decode those bytes with `TextDecoder("utf-8")`, preferably streaming across WebSocket output chunks. The mirror outbound path should use `TextEncoder` before base64 so non-ASCII terminal input is valid.

## Constraints / Dependencies / Compatibility Facts

- The solution must not break terminal ANSI/control sequence handling.
- The app is expected to run via Electron, which starts application and agent servers.

## Open Unknowns / Risks

- No major root-cause unknown remains. Implementation must choose a streaming decoder so split UTF-8 sequences across output messages are preserved.
- Validation should include both codec-level tests and at least one browser/runtime smoke check against the Electron-started backend path after implementation.

## Notes For Architect Reviewer

Design should keep the backend byte-preserving base64 protocol and fix the frontend terminal transport codec. No backend ownership change is indicated by current evidence.
