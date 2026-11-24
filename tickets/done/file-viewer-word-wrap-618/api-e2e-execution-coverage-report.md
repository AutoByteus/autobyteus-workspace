# API/E2E Execution Coverage Report

## Round

- **Coverage investigation:** `api-e2e-coverage-investigation.md`
- **Revision record:** `api-e2e-revision-record.md`, `API-REV-001`
- **Test progress log:** `api-e2e-test-progress.md`
- **Round and trigger:** round 1, from the implementation engineer's handoff IR-001 (direct route)
- **Prior round reviewed:** none
- **Deviations from the plan:**
  - The highlighting check is JSON only. Run1 showed that `getLanguage` opens YAML as `plaintext`. That code is unchanged by this ticket, so YAML was never highlighted (FU-003).
  - MSP-110 types text that ends in "." instead of pressing Escape. Escape leaves the maximized view, which made run1's save land in the panel.
  - Both changes are test-side. Run2 is the result.
- **Evidence folder:** `/Users/normy/autobyteus_org/autobyteus-worktrees/file-viewer-word-wrap-618/tickets/in-progress/file-viewer-word-wrap-618/evidence/` (the `AE-*` files; the `IMP-*` files are the implementation engineer's)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `7824c552b3` (product code as of `0f5e844087`; only `tickets/` changed since) plus the test change `599eda869b`, byte for byte as run | macOS Darwin 25.5.0 | Builds under the clean env: `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`, both exit 0. The probe's stack: alpha and beta nodes, `nuxt dev` for the desktop window, and the phone production bundle at `/mobile`, in headless Chromium. | `env -i PATH HOME=<fresh mktemp -d> TMPDIR USER`. Synthetic files in the probe's temporary workspace. Locale en-US, UTC. Desktop 1440×900; phone 390×844 at 2x, touch, through a pairing session. The founder's app and data were never used. |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | REQ-001, REQ-002 | unit (Monaco mocked) | Reused: IMP-01 | — | Pass (reproduces) | — | — | This is the red half: the new cases fail on the old default. It ran before the change by design. |
| IMP-02 | REQ-001, AC-002, AC-003 | unit | Reused: IMP-02 | — | Pass | — | — | It ran on `77045f2a5d`; `MonacoEditor.vue` and its spec are unchanged since (`git diff --name-only 77045f2a5d 7824c552b3` lists only the probe files and `tickets/`). Its control (ignore the caller's value) fails. |
| IMP-03 | all | typecheck, `guard:web-boundary`, the web unit suite 804/804 | Reused: IMP-03 | — | Pass | — | — | It ran on `0f5e844087`; only `tickets/` changed since. My change is to `tests/e2e/*.mjs`. Those files are not type-checked (`allowJs` without `checkJs`) and not in the unit suite, so the result still holds. |
| IMP-05 | AC-001 (control) | rendered | Reused: IMP-05 | — | Fails as expected | — | — | With the old default `'off'` the same measurement fails ("rows past the editor's edge", "no line wraps"), so the rendered check can detect the defect. |
| AE-001 | AC-001, AC-002, REQ-003 (line numbers, highlighting) | rendered: the desktop Files tab (`nuxt dev`, 1440×900), beside the tree and maximized, plus the context menu's "Toggle Word Wrap"; the phone Files screen (production bundle, 390×844) | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" USER="$USER" node autobyteus-web/tests/e2e/mobile-shell-probe.mjs --cases=MSP-108,MSP-109,MSP-110 --output-dir=/tmp/ae618/run2`, from the worktree root (MSP-108 and MSP-109) | ENV-1 | Pass | `AE-001-002-rendered/probe-run.log`; `AE-001-002-rendered/mobile-shell-probe.json` (`cases.MSP-108`, `cases.MSP-109`); `AE-001-002-rendered/MSP-108-*.png`, `MSP-109-*.png` | Log: "MSP-108 Pass", "MSP-109 Pass", "mobile-shell probe: Pass". JSON summary: `past 0` and `wrapped > 0` for every file and width. Editor widths: 131 (panel), 1372 (maximized), 322 (phone). Wrap off: "wrapped 0 past 2"; on again: "wrapped 2 past 0". `tsconfig.json` token classes `["mtk1","mtk20","mtk5"]` on desktop and phone. Screenshots show wrapped rows indented like their line, with line numbers. | This is my own run on this commit's builds. It replaces reusing IMP-04 because the probe file changed this round. Browser errors: only the known favicon 401s on the phone (`known: true`). One `failedRequests` entry is the phone's `/rest/health` `ERR_ABORTED` during navigation, with no effect on the case. YAML shows `["mtk1"]`, as on the base (FU-003). |
| AE-002 (MSP-110) | REQ-003 (editing, save) | rendered: the desktop Files tab, the long-line text file in the maximized editor with wrap on, and the server's file write | The same probe run (MSP-110). Open `draft-v1.txt` from the tree and maximize it. Click past the end of line 4 and type " EDITED-618.". Press Enter and type a 330-character line. Press Cmd+S and wait for "Changes saved". Read the file on disk, then measure the editor again. | ENV-1 | Pass | `AE-001-002-rendered/mobile-shell-probe.json` (`cases.MSP-110`); `AE-001-002-rendered/MSP-110-desktop-1440-before-edit.png`, `MSP-110-desktop-1440-after-save.png`; `AE-001-002-rendered/probe-run.log` | Log: "MSP-110 Pass". JSON: `"savedEqualsExpected":true`, `"savedBytes":857`, `"expectedBytes":857`, `"newLineWraps":true`, line numbers `["1","2","3","4","5","6"]`, `failures: []` before and after. After-save screenshot: line 4 "A short line. EDITED-618.", line 5 wraps onto a second row, and "Changes saved" at the bottom right. | The expected text is the file's original text with exactly the typed edits. Run1 of this case failed on the test side (Escape leaves full view): `AE-run1-test-side-failures.log`. MSP-109 then shows the saved file on the phone (6 numbered lines). |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 (REQ-001, REQ-003) | Yes | AE-001 (rendered at 390 px and 1440 px, both panel and maximized, with screenshots); IMP-05 (the control) | Proven | — |
| AC-002 (REQ-002) | Yes | IMP-02 (unit); AE-001 (the rendered toggle off and on) | Proven | — |
| AC-003 (REQ-001) | No | IMP-02 (unit, with a control) | Proven | — |
| REQ-003 (line numbers, highlighting, editing, save unchanged) | Yes | AE-001 (line numbers and JSON highlighting at both widths); AE-002 (edit and save in a wrapped editor, the bytes on disk) | Proven | — |
| The founder's own files on his own stack | No | — | Only The User Can Check | I reproduced his file types and line lengths synthetically; IMP-05 reproduces his clipped screenshot with the old default. His running app and data are off-limits by his constraint, so only he can look at his own files after release. |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | IMP-02; AE-001; AE-002 | Before AE-002, REQ-003's edit and save with wrap on had no evidence. Now only the founder's own files remain. | The founder opens his files after release |
| Changed-boundary execution directness | 85% | 95% | AE-001 runs the real Monaco with the changed default; AE-002 runs the real save path | — | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Unit tests mock Monaco. AE-001 and AE-002 use the real Monaco, the real Files tab, the phone production bundle and the server's file write. | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Clean env, fresh builds, a pairing session for the phone | The desktop window is `nuxt dev`, not the packaged app; the files are synthetic copies of the reported types | A packaged-app look, which this renderer-only change does not need |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | IMP-01 red; IMP-05 old-default control; the toggle's off state; the 131 px panel; indentation; a caller's value wins (IMP-02) | — | — |
| User-surface, browser, and desktop-shell confidence | 80% | 95% | AE-001 on the desktop renderer and the phone bundle; AE-002 in the desktop editor | The Electron shell is not exercised; no shell code changed | — |
| Durable regression coverage quality and relevance | 90% | 95% | MonacoEditor.spec.ts; MSP-108/109 now check JSON highlighting; MSP-110 is new | — | — |

- **Overall post-repository confidence:** 83%, counting the unit and reused checks only.
- **Overall final confidence:** 95%.
- **Calculation method:** a simple average of the seven categories.
- **Every critical acceptance criterion directly proven, apart from parts only the user can check:** `Yes`.
- **Any final category below 90%:** `No`.
- **95% target met:** `Yes`.
- **Confidence-limiting residual risks:**
  - The founder's own files, which only he can check.
  - FU-002: the 131 px panel is narrow. That is the existing layout; wrapping makes it readable, only cramped.

## Broader Validation Decision (Mandatory)

- **Decision:** `Required`, and executed.
- **Execution mode:** `Browser`. The repository's rendered probe ran on the desktop renderer and the phone production bundle.
- **Gap it addresses:** the unit tests mock Monaco, so they show neither the real layout nor edit and save with wrap on (REQ-003). The rendered run proves both.
- **Browser validation needed:** yes. The change is in how the editor renders.

## Desktop Application Validation

- **Approach:** the probe's `nuxt dev` desktop window, as planned.
- **Web-equivalent behavior:** AE-001 and AE-002. **Shell-specific behavior:** none changed.
- **Effect on any running desktop app:** `None`. The probe used its own stack, its own ports and a temporary data root.
- **Not directly proven:** the packaged Electron shell. Monaco's wrap lives in the renderer only, so this has a negligible effect on confidence.

## Compatibility / Legacy Scope Check

- Requirements or design introduce or tolerate backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or kept only for compatibility-only behavior: `No`
- Reroute classification: —
- Upstream recipient notified: —

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-file-word-wrap-cases.mjs` | Updated. Adds MSP-110 (edit and save in a wrapped editor; bytes on disk). `measureEditor` records token classes, and `failuresOf` requires highlighting for the JSON file. The desktop setup moves into `openDesktopFiles()`, so MSP-108 and MSP-110 each run alone or together. | AE-001, AE-002 | — |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated: the header line now covers MSP-108…110 | AE-002 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route)
- Diff or repository evidence supplied for removed paths: —

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The agent's answer | The probe's scripted runtime (`ECHO_INPUT`) | The case only needs a run in the workspace; no inference is involved | None for this change |
| The phone | Headless Chromium at 390×844 with touch, on the phone production bundle | The documented phone surface (`TESTING.md`) | A real iPhone's WebView is not exercised. Monaco's layout is the same engine path in the bundle. |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| The probe's stack (two servers, `nuxt dev`, Chromium) and its temporary data root | Yes | The probe's teardown | `cleanup: {"frontendExited":true,"serversLeft":0,"rootRemoved":true}`; no probe or `nuxt dev` process from the worktree left (`ps`) |
| `/tmp/ae618/` (build logs, run1 and run2 output) | Yes | Kept as scratch. The evidence that matters is copied into `evidence/`. | — |
| The clean HOME folders (`mktemp -d`) | Yes | Left to the OS temporary-folder cleanup | — |

## Latest Authoritative Result

- **Result:** `Pass`.
- **Not proven, user-only or accepted risk:** the founder's own files on his own stack, which only he can check (see Acceptance-Criteria Proof).
- **Evidence decisions requested:** `None`.
- **Preliminary classification:** —
- **Next recipient:** `/delivery_engineer` (Pass, Small/Low).
- **Notes:**
  - Follow-ups: FU-003 (YAML and other common file types not highlighted) is new this round. FU-001 and FU-002 stand.
  - No build input changed, so no fresh-start build case was needed.
