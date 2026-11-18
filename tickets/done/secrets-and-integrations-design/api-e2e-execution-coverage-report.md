# API/E2E Execution Coverage Report — MCP server secrets in the vault (autobyteus-244)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review CRR-002 pass (reviewed route, Large/High)
- Deviations from the plan:
  - A temporary diagnostic (tool events of the matrix suite's live cell) was added to `mcp-runtime-tool-matrix.e2e.test.ts` to investigate one Codex result. It was reverted with `git checkout` and is not committed (finding-the-cause rules).
  - Three driver faults were fixed on the way:
    - a v1 SDK path (the project is on MCP SDK v2);
    - the MCP panel's remembered sub-view;
    - a missing page reload after an out-of-band GraphQL change.

    Each affected phase was rerun completely.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design/tickets/in-progress/secrets-and-integrations-design/evidence/` (`API-*` files, `api-e2e-rendered/`). The handoff message gives the commit.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`; Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. API/E2E changed no durable test code this round; the review covers the round's evidence and the temporary-diagnostic handling.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `f3c52bd0f6` (code `4aa2543f9d`) | macOS 26 arm64, node v22.23.1, pnpm 10.28.2 | `pnpm -C autobyteus-ts build`, `pnpm -C autobyteus-server-ts build` | clean env (`env -i PATH HOME=<temp> TMPDIR`) |
| ENV-2 | same | same | in-process runtime suites | real HOME for the signed-in CLIs; Codex with a throwaway `CODEX_HOME`; LM Studio qwen (unloaded after); test vault for the live check (IDs only) |
| ENV-3 | same | same | packaged worktree build (`isolated-app start --build`): instance A `iso-49772-c791` (auto data root); instance B on an owned data root `<L>/b-root`, started four times (ports 50101 → 50240; root key moved aside, then restored) | the app's own window over CDP (attach only); local Node MCP test servers (stdio; HTTP requiring `test-dummy-http-token-B`); dummy values |
| ENV-4 | same | Linux aarch64 (Docker, root, umask 0022) | image from `autobyteus-server-ts/docker/Dockerfile.monorepo` | test-owned container on 127.0.0.1; no user volumes; removed with its image |

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | MREQ-001…008 (repository level) | core, server unit/integration, built-server MCP e2e, web suite and specs, codegen, live GitHub, rendered dev-stack | Reused IMP-01…IMP-22 | — | Pass | (implementation handoff) | as listed there | code unchanged since `4aa2543f9d` (`git diff --name-only 4aa2543f9d HEAD` outside `tickets/` is empty) |
| API-01 | regression (TESTING.md rerun rule 4) | full server e2e | builds; `pnpm test:e2e` | ENV-1 | Pass | `API-01-server-e2e-full.log` | `Test Files  103 passed \| 95 skipped (198)`; `Tests  443 passed \| 462 skipped (905)`; `exit 0` | includes `mcp-secrets-in-vault`, `mcp-bulk-import`, the 179/181 MCP suites and the secret-management suites |
| API-02 | MREQ-003, MREQ-008, UC-002 (SCN-A8) | gated runtime suites reading MCP credentials from the vault; strict GitHub live check | (a) AGY scripted + Codex MCP client; (b) LM Studio, Claude, Codex live, Grok; (c) GitHub live strict | ENV-2 | Pass. One unreproduced Codex matrix result recorded below | `API-02-gated-runtime-and-live.log` | (a) `Tests  9 passed \| 10 skipped (19)`. (b) `✓ native/claude/grok: an agent calls all three tool kinds`; auth-agent native/codex/claude both cases ✓. (c) `✓ stores the token as a vault reference, discovers the tools and reads the test issue`; token-like strings `0` | **Codex matrix cell:** run 1 ended with the Task `TODO` while env, cwd, the HTTP credential and process cleanup all passed. The run kept no tool events. With a temporary tool-event dump (reverted), **5 of 5 reruns** called `create_task`, `update_task` (DONE), the stdio and the HTTP tool successfully. Not reproduced; recorded as FU-007. |
| API-03 | MREQ-001, MREQ-002, MREQ-003, MDEC-001 (SCN-A1, SCN-A6) | packaged app A, the app's own window | `journey-a.mjs` phases `stdio`, `stdio-edit`, `http`, restart, `after-restart` | ENV-3 | Pass | `API-03-desktop-journey-a.txt`, `api-e2e-rendered/API-03-*.png` | `GITHUB_TOKEN … 'locked': 'true'` after Apply JSON; `state: 'CONFIGURED'`, `value: None`; file `{'vaultSecretId': 'mcp.0006…'}`, `fileHasToken False`; `gatewayDelivered True`; edit note `Stored in the vault. Leave empty to keep it…`; JSON `{"stored": "vault"}`; token: wrong → `HTTP 401`, replace `refChanged True`, keep `refKept True`, invalid marker `'token' must be a string or a keep marker.`, remove `tokenState None`; after restart `delivered True` | The HTTP test server saw `auth=wrong` (1), `auth=ok` (18), `auth=missing` (1, after remove). No token value in `mcps.json` at any point. |
| API-04 | MREQ-005, MDEC-002, MDEC-006, AR-015, CR-001, persisted data (SCN-A2) | install B: seeded plain file; banner; dialog untick + move; "Keep as they are"; restart on a new server port | `journey-b.mjs` phases `seed-check`, `move`, `keep`, stop, start `--server-port 50240`, `after-port-change` | ENV-3 | Pass | `API-04-07-desktop-journey-b.txt`, `api-e2e-rendered/API-04-*.png` | `3 value(s) look like secrets…`; candidates by `NAME`/`ALWAYS_SECRET`; result `Moved to the vault: 2.` + backup path; backup `'mode': '600'`, `holdsPlainValues: True`; moved servers work; unticked value stays plain; reviewState `["ssh_remote|env:…"]`; after the new port `banner … visible: False`, server still reports 2 candidates | A plain `mcps.json` works unchanged before the move (direct use, no migration). The Electron profile lives in the data root, so the review state persisted across the restart. |
| API-05 | MREQ-006, MDEC-004, MDEC-007, AR-016 (SCN-A3, SCN-A4) | A's file into B's Bulk Import; Replace; re-import an older copy | phases `import`, `replace`, `reimport` | ENV-3 | Pass (+ observation O-1) | same file, `API-05-*.png` | toast `Enter these secrets again on this node: github-like env:GITHUB_TOKEN.`; card `Needs secret: env:GITHUB_TOKEN`; state `MISSING`; fresh ref `mcp.6956…` ≠ A's `mcp.0006…`; discover `needs secret: env:GITHUB_TOKEN (no value is stored)`; Replace → `CONFIGURED`, delivered; re-import `olderCopyRef mcp.6956…`, `refAfter == refBefore mcp.4193…`, `gatewayStillB1 True` | O-1: the re-import also stored two values in the vault that had been reviewed and kept plain (rule applied on import, MDEC-004); the servers still work |
| API-06 | MREQ-007 (SCN-A5) | install B with its root key moved aside; then restored | phases `vault-unavailable`, `vault-restored` | ENV-3 | Pass | same file, `API-06-*.png` | `health: 'LOCKED'`; list loaded; cards `Needs secret: …`; fields `VAULT_UNAVAILABLE`; row note `Needs secret: the vault is unavailable…`; discover `needs secret: env:GITHUB_TOKEN (the vault is unavailable)`; plain-only `tts` tool works; restored: `READY`, all `CONFIGURED`, tool delivers `…-B1` | — |
| API-07 | MREQ-002 UI, localization | zh-CN strings in the packaged app | `zh-check.mjs`, `lang-en.mjs` | ENV-3 | Pass | same file, `API-07-*.png` | `有 1 个值看起来像密钥…保持原样 检查并移入密钥库`; `已存入密钥库。留空即保留，输入新值即替换。`; token note `…输入新令牌即替换。`; import toast `请在此节点上重新输入这些密钥：zh-imported env:GITHUB_TOKEN。`; card `需要密钥：env:GITHUB_TOKEN` | switched back to English afterwards |
| API-08 | MREQ-005 backup on Linux (SCN-A7) | Docker image from the worktree; container; move | see the evidence header | ENV-4 | Pass | `API-08-linux-docker-backup.txt` | `600 root:root …backup-before-vault-move-…`; umask `0022`; the backup holds the plain value (count `1`); `mcps.json` holds `{"vaultSecretId": "mcp.…"}`, `LOG_LEVEL` plain; logs `test-dummy=0` | the re-register failure is expected (`node --version` is not an MCP server) |
| API-09 | MREQ-002, safety | instance logs, user data, test vault, worktree | grep; `ls`; `pnpm test-vault status`; `git status` | local | Pass | `API-09-safety-scan.txt` | instance logs `test-dummy occurrences 0` (A, B); user `mcps.json` `Sep 16 09:24`; `CONFIGURED test.github.token`; instances stopped, no process left | the temporary diagnostic was reverted; the Electron-build stray (`autobyteus-server-ts/autobyteus-web/`) was removed |

## Acceptance-Criteria Proof

The ticket's MCP scope states requirements (MREQ) rather than numbered ACs. Each critical requirement is mapped below.

| Requirement | Critical | Proven By | Result |
| --- | --- | --- | --- |
| MREQ-001 secret values in the vault, references in `mcps.json` | Yes | API-03, API-04, API-05, API-08, API-R01 | Proven |
| MREQ-002 no value shown (API, UI, export, log); states shown | Yes | API-03 (form, JSON markers, GraphQL), API-06, API-07, API-09, API-02 (`dummyOnWire false`, live token in no output) | Proven |
| MREQ-003 resolved only at connect (stdio env, HTTP headers) | Yes | API-02, API-03 (stdio delivery, token replace/keep), API-04 (moved servers), API-R01 | Proven |
| MREQ-004 reusable record shape (`mcp.<uuid>`, field by position) | No | API-03…API-05 (references per field) | Proven |
| MREQ-005 move only on approval, 0600 backup, servers still connect | Yes | API-04 (macOS), API-08 (Linux) | Proven |
| MREQ-006 import stores rule matches; MDEC-007 references kept or `needsSecret` | Yes | API-05, API-R01 | Proven (O-1 observation) |
| MREQ-007 needs secret / vault unavailable: no connect, no plain fallback | Yes | API-05 (MISSING), API-06 (LOCKED) | Proven |
| MREQ-008 gated live GitHub check from the test vault | Yes | API-02 (c) strict | Proven |
| MDEC-006 / AR-015 banner review state across restart and port change | Yes | API-04 | Proven |

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Support | Residual |
| --- | --- | --- | --- | --- |
| Requirement proof | 85% | 96% | every MREQ and decision proven in the packaged product | O-1 behavior is as specified, but unspecified for reviewed values |
| Changed-boundary execution directness | 85% | 97% | the real app window; real vault; real files; real restart | — |
| Cross-boundary integration realism and mock gap | 85% | 96% | five runtimes (four live models), GitHub live, Linux image | one Codex run unexplained (FU-007) |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | packaged builds, a realistic seeded file, test vault, Linux root container | Windows not available |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 96% | wrong/missing/locked/restored, invalid marker, foreign references, older copy, restarts | — |
| User-surface / desktop shell | 80% | 95% | packaged renderer; DOM assertions plus screenshots; zh-CN | dark theme and narrow widths not inspected |
| Durable regression coverage quality and relevance | 92% | 93% | the ticket's durable suites (unit, integration, e2e, specs) green in full runs | the desktop journeys are one-off drivers (sources kept in the evidence) |

- Overall final confidence: 95.4% (simple average). No category below 90%. Every critical requirement directly proven.
- Broader validation decision: `Required`, executed:
  - Project Desktop Validation: two isolated instances, restarts, a port change, a locked vault;
  - Live API: gated runtimes and the GitHub live check;
  - Linux: a worktree-built Docker image.

## Observations

- **O-1 (for the Solution Designer; not a failure):**
  - Re-importing your own file applies the secret rule (MDEC-004) to every plain value it carries. That includes values the user had reviewed and deliberately kept plain (unticked in the dialog, or "Keep as they are").
  - In API-05, the key-file path and the notes token became vault entries after the re-import. The toast announced it ("Stored in the vault: …"), and the servers kept working.
  - MDEC-004 and MDEC-006 don't say how import should treat reviewed-plain values. If the user prefers that import respect the review state, that is new behavior (a requirement question).
- **O-2 (pre-existing, seen before):** the Electron build's server packaging leaves `autobyteus-server-ts/autobyteus-web/resources/server/node_modules`; it was removed.
- **FU-007** (added to `follow-ups.md`): the matrix suite keeps no tool events for a failing live cell.

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| Temporary tool-event diagnostic in `mcp-runtime-tool-matrix.e2e.test.ts` | `git checkout` | reverted; never committed |
| Instances A and B | `isolated-app stop` | not forced; A's data root removed; B's owned root removed with the scratch folder |
| HTTP test server process | killed | no process left |
| Docker container and image | `docker rm -f -v`, `docker rmi` | removed |
| LM Studio model | `lms unload` | unloaded |
| Scratch `<L>` (drivers, seeded root, copies, logs, throwaway `CODEX_HOME`) | removed after the evidence was written | done |
| Sessions in the Claude, Grok and Codex CLI histories | left (signed-in CLIs) | short sessions |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven / user-only: `None`. O-1 is a question for the Solution Designer, not a failure.
- Durable coverage changed by API/E2E: none
- Next recipient: the code reviewer (proportional test-code review on the reviewed route)
