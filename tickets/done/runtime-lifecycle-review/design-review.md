# Independent review — "AI Runtimes" (runtime-lifecycle-usability)

Reviewer: Solution Designer of the new software engineering team, 2026-10-20.
Subject: predecessor requirements (Approved SR-012) and design (SR-015, ARCH-REV-006 Pass) in
`/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-lifecycle-usability/tickets/in-progress/runtime-lifecycle-usability/`.
Judged against current `origin/personal` 3d4d9d0a95, the repository `DESIGN.md` and the team design principles.
Evidence IDs (E-R…) are in `investigation-notes.md` in this folder; each says whether it was read, reproduced, measured or fetched.
Nothing was installed, updated or signed in during this review.

## Verdict: redesign

**The problem is right; the solution is far too big, would ship switched off, and is now out of date.**

- The goal is worth doing: today a user who has not installed the engines in a terminal sees them as "unavailable", and the only advice is a terminal command (E-R06, E-R12).
- The design answers it by building a private software distribution and process-safety system: an AutoByteus-signed version feed, version qualification, a second data folder, a private Electron↔server channel, per-engine "fences" persisted across restarts, and boot-ID checks (E-R16).
- Even if finished, it would give users nothing they can use: Install and Sign in stay switched off until signed release assets and per-engine qualifications exist, and none do (E-R04).
- 78 of its 113 edited files have changed since (E-R02), so "finishing" means redoing it.

I recommend keeping the goal and the user journey, dropping almost all of the machinery, and building it again in small slices on current personal.

## What the other team got right (keep)

- The user journey: Settings → AI Runtimes, all four engines visible, Install → Sign in → use, with Update only when the user clicks (their AP-003).
- Install, sign-in state and "ready to use" are shown separately; nothing says "Signed in" without evidence.
- Engines the user installed themselves are used and never overwritten.
- Local desktop first; remote and Docker nodes only show status.
- No credentials copied, no silent switch to API-key billing.
- They found the provider sign-in policies (finding 7) and recorded them honestly.

## Findings

| # | Severity | Finding | How established |
| --- | --- | --- | --- |
| F-01 | Critical | **As built, it ships switched off.** Install and Sign in depend on a signed AutoByteus release catalogue and per-engine "qualification IDs". No catalogue, signing key or qualification exists, and the code that assembles them is never called. In 15 solution rounds no real install or sign-in was ever completed; the last API/E2E round was Blocked at 67.9 %. | Read (E-R04) |
| F-02 | Critical | **Claude is already inside the app.** The installed AutoByteus 1.5.7-beta.4 contains a working Claude Code 2.1.280 binary (shipped by the Claude Agent SDK we depend on). Our code ignores it and looks only on PATH, so Claude shows "unavailable" without a terminal install. Fixing that is a small resolver fallback, not an installer. | Reproduced (E-R05), read (E-R06) |
| F-03 | High | **It fights the vendors instead of using them.** All four vendors ship their own home-folder installer (no admin rights, no package manager), an `update` command and a sign-in command (browser or device code). The design builds a parallel AutoByteus distribution channel, then has to suppress the vendors' own self-updaters. Every vendor release would need AutoByteus to qualify, sign and publish it — permanent release work for four fast-moving tools. | Reproduced help output (E-R08), read (E-R16) |
| F-04 | High | **It defends a boundary that does not exist.** A large part of the design (a private Electron↔server IPC channel, written after an earlier token scheme was rejected) exists so that a network client cannot trigger an install. But any trusted-network client can already open a terminal on the server (`/ws/terminal`) or run an agent with shell tools. Installing a CLI adds no new power. The existing owner-route check, which already refuses phone credentials, is enough. | Read (E-R10) |
| F-05 | High | **Crash-safety machinery that hurts the very user it is for.** Each engine gets a persisted "possibly active" fence. After a forced restart where cleanup could not be proven, Claude/Codex stay blocked until the OS boot ID changes; the planned message is "Restart this device to safely recover". No supported scenario needs this: vendor updaters install new versions side by side, and running processes keep the binary they started with. This contradicts `DESIGN.md` rule 1 ("do not front-load speculative … concurrency machinery") and its "Phase 1: clean working functionality first". | Read (E-R16), local install layout (E-R08) |
| F-06 | High | **Blast radius and staleness.** It refactors all four execution backends, the provider factories, server composition, the Electron server managers and the core terminal. 1,715 commits have landed since; 78 of its 113 edited files changed upstream (Codex multi-agent flags, private runtime skills/NFS, AGY sign-in reporting, …). Rebasing amounts to re-implementing. | Measured (E-R02, E-R03, E-R13) |
| F-07 | Needs your decision | **Provider policy decides the Sign-in buttons.** Anthropic does not allow third-party products to offer claude.ai (subscription) login unless previously approved, and points to API keys instead. OpenAI allows app-server ChatGPT sign-in for local or open-source apps, but "never" for commercial or hosted services. AutoByteus is both AGPL open source and commercially licensed. The old design recorded this but left it as a "gate", so its Claude Sign-in button would also have stayed off. | Fetched official docs 2026-10-20 (E-R09) |
| F-08 | Medium | **Part of it is already done or outdated.** The latest round (SR-015, "the selected runtime must not wait for other runtimes") landed in personal separately on 2026-10-03. Upstream also changed how a signed-out AGY is reported (2026-10-12). | Read (E-R11, E-R12) |
| F-09 | Medium | **"Qualified versions" contradicts how the product works today.** Today AutoByteus uses whatever version of each engine is installed, and `DESIGN.md` rule 9 rejects cross-version compatibility machinery. A per-vendor version-qualification gate would be a new release process, not something the requirements needed. | Read (DESIGN.md, E-R06) |
| F-10 | Medium | **The process drowned the product.** 21 documents (712 KB, a 142 KB design spec), 26 revision headings and 6 architecture reviews, but no working Install or Sign in. Passing its own architecture review did not catch F-01, F-04 or F-05 because those reviews judged the design against itself, not against the simplest working answer. | Measured (E-R16) |
| F-11 | Low | **Some requirements pull in the machinery.** REQ-005 ("AutoByteus-qualified recommended versions"), REQ-008 ("verified official distributions or vetted route … before executing") and REQ-006 (a version must be "compatibility-qualified" before activation) are what led to the signed feed. Rewording them to "the vendor's official installer and updater" removes the need. | Read |

## What I would cut

Private owner IPC channel; the second runtime data root and its controller lock; persisted per-engine fences and boot-ID recovery; the `boundRoot`/`operatorExternal` split; the lease registry and qualification IDs; the signed catalogue, Ed25519 feed and release tooling; suppression of vendor self-updaters; the new executable PTY in core; the new contracts package; the refactor of all four execution backends. Also the mandatory Docker sign-in session (VAL-001) as a release gate: a check in the real desktop app by you, with your own consent, during delivery fits the team's normal process better.

## Proposed direction (for discussion, not yet requirements)

Three small slices, each delivered and checked by you in a beta before the next starts:

1. **AI Runtimes page + Claude works out of the box.** A Settings → AI Runtimes page showing the four engines for the current node: installed or not, version, where it comes from (built into AutoByteus / installed by you), and signed-in status where the vendor offers a status command (Claude `auth status --json`, Codex account read). Claude falls back to the binary already inside the app when none is configured or found. The "unavailable" model-menu reason links to this page. Estimated Medium size, low risk.
2. **Install and Update buttons.** Install runs the vendor's own official installer for that engine in the background, shows progress, then re-checks. Update runs the vendor's own `update` command and is disabled while that engine has running agents. Desktop (embedded node) first, as the old approval said. Option: carry Codex inside the app like Claude (it is Apache-2.0 and published per platform), at about +250 MB per platform.
3. **Sign in.** One button per engine that starts the vendor's own sign-in and shows the link or device code in AutoByteus, then refreshes the status: Codex through its app-server sign-in (device code), Grok through `grok login --device-auth`, Claude depending on your decision below. AGY has no separate sign-in command, so AutoByteus would open its built-in terminal panel already running `agy` — you follow the browser and never type a command.

Size of the whole thing: a few server files around the existing `RuntimeAvailabilityService`, one Settings component and store, and small changes to the Claude resolver. No changes to the execution backends.

## Decisions I need from you

| ID | Question | My reasoning | My recommendation |
| --- | --- | --- | --- |
| D-1 | Finish the old work, shrink it, redesign it, or drop it? | F-01, F-05 and F-06: finishing costs more than rebuilding and still ships switched off. | **Redesign in the three slices above**, starting with slice 1. |
| D-2 | Claude sign-in, given Anthropic's policy | Offering claude.ai login inside AutoByteus without approval breaks Anthropic's stated terms. API-key sign-in is allowed but bills the user's Console account, not their subscription. | Show Claude's signed-in status. Offer API-key setup in the app. Ask Anthropic for approval before adding a subscription "Sign in" button. Users already signed in to Claude Code keep working. |
| D-3 | Codex sign-in, given OpenAI's policy | Allowed for "local or open-source" apps and "never" for commercial or hosted ones. The desktop app is AGPL open source, but you also sell commercial licences. | Offer it for the open-source desktop app, and apply to "Sign in with ChatGPT" for commercial use. This is a legal call, so it is yours. |
| D-4 | How to install engines | Running the vendor's own installer executes a downloaded script; that is the same trust as following their docs. Bundling makes the app bigger but works offline and needs no script. | Claude: use the binary already bundled. Codex, Grok, AGY: run the vendor's official installer. Bundling Codex is optional. |
| D-5 | How updates work | Vendors update their own tools, and some do it automatically. AutoByteus-"qualified" versions would mean permanent release work (F-03, F-09). | Show the installed version and an **Update** button that runs the vendor's own update. No AutoByteus version catalogue. |
| D-6 | AGY sign-in | AGY can only sign in through its interactive screen. | Open AutoByteus's built-in terminal panel already running `agy` (no typing), rather than building a screen parser. |
| D-7 | The old worktree | Everything is preserved on branch `preserve/runtime-lifecycle-usability-wip-20261020` (commit 9684363). | Keep the branch. Remove the old worktree only after you decide, and only with your OK. |

## Limits of this review

I read the design and code, ran the bundled Claude binary's `--version`, read the four CLIs' `--help` output, queried npm and fetched two vendor policy pages. I did not run any install, update or sign-in, did not run the old team's tests, and did not check Windows. Windows installers for Codex, Grok and AGY, and AGY/Grok redistribution terms, are still unknown (investigation U-01, U-02).
