# Demo verification against Apple's criteria — autobyteus-279, round 1

- By: Solution Designer, 2026-11-18, at the founder's request ("he will base his approval on your verification")
- Tested: the design reference `http://127.0.0.1:3279/ios` (design branch `design/ios-demo-mode-279` @ `cede2cff`), headless Chrome via `walk.mjs` (this folder), iPhone 17 Pro Max 440×956, iPad Air 11-inch 1180×820 and 820×1180. Every step and screenshot is in `shots/`. Browser errors: none.
- Measured against: Apple's message of 2026-07-02 (Guideline 2.1(a), two items), guideline 2.1(a) ("placeholder text … should be scrubbed"; "demo mode exhibits your app's full features"; "reject … binaries that … exhibit obvious technical problems"), "Before You Submit" ("fully-featured demo mode … sample QR code"), guideline 4.2 (beyond a repackaged website).

## Verdict

**Not yet complete enough to submit.** The structure is right: Try demo and the demo QR, sample runs of every kind, the ⋮ views, Settings, Stop, New run, a scripted reply, Leave demo, iPad split view. But three gaps are likely to draw a second rejection, and five more weaken the "full features" claim. With these fixed, I judge it ready.

## What works (verified)

- First screen: Scan and Try demo; Scan opens the scanner (simulated in a browser); Try demo opens the demo; Leave demo returns to the first screen.
- Run list: agents, Teams, an Org with members, delegated work; Running / Idle / Stopped; the welcome card.
- Daily Assistant showcase: thinking, tool calls, terminal, file edits, table, quote, sample chart, a message from another agent. Send → `read_file` → a scripted reply that says it is a sample.
- Project Task Manager: the red stop button turns it Idle (also in the list).
- ⋮: Artifacts (3 items), Files (tree), Messages (Org member: messages with file references), Activity (2 background tasks, tool calls with details), Settings (Runtime, Model `demo/sample-model`, Save), VNC Viewer (view only), Text size.
- New run → Create run → send → scripted reply.
- iPad landscape: list beside the open run; portrait: the phone layout.

## Must fix (likely rejection otherwise)

| ID | Finding | Evidence | Why it matters to Apple | Fix |
| --- | --- | --- | --- | --- |
| V-01 | Opening a file shows placeholder text: `requirements.md` → "Prototype Workspace — This content is synthetic." | `shots/iphone4-16-wait-1500.png` | 2.1(a): "placeholder text … should be scrubbed before submission" | Every file a reviewer can open has realistic sample content. The Files tree holds the files the conversations name (`docs/release-notes-1.6.md`, `docs/pilot-summary.md`, `dashboard-after.png`, …), not only `docs/requirements.md` |
| V-02 | A run's status differs between the list and its own screen: Daily Assistant is Idle (green) in the list but "Stopped" in its Settings on iPad (and "Stopped" in the earlier iPad screenshot 11); `launch_lead` is "Running" in the list but "Stopped · in Product Launch Org" when opened | `shots/ipadL-07-wait-1500.png`, `shots/ipadP-04-wait-1500.png` | 2.1(a): "obvious technical problems"; a reviewer reads it as a bug | One status per run, the same everywhere |
| V-03 | The app's share extension (share text or a file from another app into AutoByteus) has no demo path | `autobyteus-ios/AutoByteusMobileShareExtension/`; not in the design | Apple tests every feature it can find; the share sheet entry is visible to the reviewer. It is also one of the app's own (non-web) features that answers 4.2 | Design what a share does in the demo (e.g. it lands in a demo run's composer as a context file), or remove the extension from this build; say it in the notes |

## Should fix (weakens "full features")

| ID | Finding | Evidence | Fix |
| --- | --- | --- | --- |
| V-04 | After Send the view does not follow: the reply is below the fold behind a ↓ "Jump to latest" button; a reviewer may think nothing happened | `shots/iphone2-06-wait-6000.png` (after send), `iphone3-06-role-Jump_to_latest.png` (after the tap) | After a send in the demo, scroll to the new message and its reply (check what the real app does; if the real app also stays, decide it for both) |
| V-05 | Team and Org member conversations are one line ("Please work on the Task you were assigned. I will post the result here when it is ready.") and their Messages do not match the Org's topic (a launch Org discussing `upload.ts` and "first-turn upload") | `shots/iphone4-08-role-content_writer.png`, `iphone4-11-wait-1000.png`, `ipadP-04-wait-1500.png` | Give at least one Team member and one Org member a real conversation, and Messages that fit their work |
| V-06 | A new run's scripted reply reads `docs/release-notes-1.6.md`, a file of another run, and answers "Hello, what can you do?" with a release-notes plan | `shots/iphone7-08-wait-7000.png` | A reply that fits a new run (no other run's file), or a short "what I can do" sample answer |
| V-07 | VNC Viewer is view only; the real app has Control mode | `shots/iphone3-25-wait-2000.png` | Either let Control show (taps on the sample desktop) or say "view only in the demo" in the notes |
| V-08 | Guideline 4.2 risk: the notes describe screens, not why the app is more than a website | `app-review-notes-draft.md` | Name the app's own parts: QR pairing with the camera, the share extension, the offline built-in demo, iPad layout |

## Answers to the designer's questions

- **(a) "All account types":** the app has one kind of user, so one demo covers it, once V-01…V-03 are fixed.
- **(b) Missing from the demo:** the share extension (V-03). Pairing a real computer, Switch node and Unpair can stay out; say in the notes that connecting a computer needs the AutoByteus desktop app and is not part of the demo.
- **(c) Notes draft changes:**
  - Use the App Store name "AutoByteus" (the draft says "AutoByteus Mobile").
  - Do not say "every feature" unless V-01…V-07 are done; list the share extension and how to try it.
  - Say VNC is view only (V-07).
  - Say the demo works offline and needs no network.
  - Add one line on what the user needs outside the demo: the AutoByteus desktop app on their own computer.
- **(d) The "prior approval" reply:** advisable, sent with the resubmission and quoting Apple's own line ("It is also acceptable to include a demonstration mode…"); do not wait for an answer before building. The founder's word is needed before anything goes to Apple.

# Round 2 — 2026-11-18 (design branch `design/ios-demo-mode-279` @ `e69a284c`)

Same method (`walk.mjs`, iPhone 440×956, iPad 1180×820); screenshots in `shots-r2/`.

**Verdict: almost ready. Two items remain before I would call it ready to submit.**

| ID | Round 1 | Round 2 result |
| --- | --- | --- |
| V-01 placeholder | Must | **Half fixed.** Files: every file opens with real sample content (`shots-r2/r2b-09-wait-1500.png`). **Artifacts: still placeholder.** Daily Assistant › Artifacts › `pilot-summary.md` shows "Synthetic file — Fixture content only." (the reference's generic file-content answer, `plugins/00.prototype-state.client.ts:860`). Must fix. |
| V-02 status | Must | Fixed: Daily Assistant Idle in list, screen and Settings; launch_lead Running in both, then Idle in both (`shots-r2/r2c-06-wait-7000.png`, `r2e-06-wait-7000.png`). |
| V-03 share extension | Must | D6 (remove it from this build): I agree. It only carried a pairing link into the old form, which the scan-first screen replaces; with no share-sheet entry there is nothing un-demoable. Founder's decision. |
| V-04 follow on send | Should | Fixed (`shots-r2/r2d-06-wait-7000.png`). Note: it changes the real app too (engineering scope). |
| V-05 members | Should | Fixed: launch_lead has real work (read_file, two send_message_to, a plan). launch_lead's Artifacts is the empty state "No Artifacts yet" (acceptable). |
| V-06 new run | Should | Fixed: `list_directory · demo-workspace` and a general plan. |
| V-07 VNC | Should | Fixed: View only → Control with Keyboard and Clipboard. Minor: switching logs a console error "Disconnection timed out." in the reference; engineering must not show or log an error in the build. |
| V-08 notes | Should | Fixed, except R2-02 below. |

New in round 2:

| ID | Finding | Fix |
| --- | --- | --- |
| R2-02 | The reference runs on an older base (`fc68a7a4`): the run's ⋮ menu still has the four-step Text size block. On personal the run menu no longer has Text size: it is one phone-wide setting under "On this phone" in the run list's ⋮, with three steps (Standard, Large, Largest). The notes list "Text size" under the run's ⋮ menu. Apple reviews the build, so the notes and the final screenshots must match the current app. | Rebase the reference on current personal; notes: "Text size: the run list's ⋮ › On this phone". |

# Round 3 — 2026-11-18 (design branch `design/ios-demo-mode-279` @ `0cc02bcc`, phone baseline `origin/personal@f7b4d68711`, v1.5.13)

Same method; screenshots in `shots-r3/`. Browser errors: none.

**Verdict: ready to submit, from Apple's criteria as I know them.** Every round 1 and round 2 finding is resolved:

- V-01: Artifacts and Files open real sample content (`shots-r3/r3a-07-wait-1500.png`); no placeholder anywhere I opened.
- V-02: one status per run, including "Background task running" on the list from the start (DC-006).
- R2-02: the reference is the shipped phone. The run's ⋮ is Artifacts, Files, Activity, VNC Viewer, Settings. Text size is under the run list's ⋮ › On this phone (Standard, Large, Largest; `shots-r3/r3d-04-wait-800.png`). The notes match.
- Re-walked: Try demo; Stop (PTM → Idle, then "Background task running"); New run → reply (`list_directory · demo-workspace`); an Org member's reply on iPad (`shots-r3/r3c-06-wait-7000.png`); Leave demo → first screen.

What remains is not a verification finding:
- The founder's decisions D1–D6 and his approval of the screens.
- Engineering items: the build shows and logs no error when VNC switches to Control. V-04 (follow on send) changes the real app too. DC-006 notes that the shipped app learns a top-level row's background tasks only when the run is opened: the demo shows them from the start; the real app's behavior is a separate question (follow-up candidate, not this ticket's).
- What a reference cannot prove, and engineering's tests will: the real camera scan of the demo QR and the `autobyteus://demo` link from the Camera app, offline behavior in the built app, and an iPad build.

# Round 4 — strict App Reviewer pass, 2026-11-18 (design branch `0cc02bcc`)

At the founder's request ("perform the verification like you are the person who is doing [it] from Apple"), I swept the whole demo the way a reviewer does, not only the review notes' path:
- every one of the 40 run rows, with all groups unfolded and "Show older" opened;
- every ⋮ entry of every run, and the first file in Files and in Artifacts;
- the first screen's Other ways to connect and Scan;
- attaching a file;
- iPhone portrait and landscape, and iPad landscape.

Tools: `crawl.mjs` and `upload.mjs` in this folder; the data is in `sweep-r4/`.

**Verdict: not ready.** Four findings would likely cause a rejection under 2.1(a): "obvious technical problems", placeholder or unfinished content, and a claim the app does not keep.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| A-01 | Blocker | After a Team (or the Org) has been opened, tapping one of its members does nothing: the row highlights and the run list stays. Console: `[mobile] Failed to open run: Error: Team context 'mx-set-0001' is already mounted.` It happens for every Team and the Org (mx-set-0001…0004, mx-mkt-0001, mx-sup-0001, mx-org-0001), on iPhone and iPad. | `sweep-r4/018-run_implementation_engineer.png`; the `errors` in `sweep-r4/sweep-*.json` | Every member row opens its member, whatever was opened before (also after going back and forth). |
| A-02 | Blocker | Artifacts › README.md shows "Content not available yet. This file change will become viewable after the edit completes and the server captures the final content." This is an unfinished state that mentions a server, in a demo with none. Seen on Project Task Manager, Agent Package Creator, Market Researcher, Daily Assistant and Codex. | `sweep-r4/008-run_Project_Task_Manager_Artifacts_file.png` | Every artifact opens its sample content; no "not available" state in the demo. |
| A-03 | Blocker | Attaching a file (the composer's +, then pick a file) shows "Couldn't attach sample.txt." | `sweep-r4/upload-2-sent.png` | In the demo an attached file is accepted locally, and the agent's sample reply can name it. Or the + is not offered in the demo, with the notes saying so. A visible error is not acceptable. |
| A-04 | Blocker (claim) | Icons are fetched at run time from `https://api.iconify.design/…` (heroicons cog-6-tooth, document-text, chat-bubble-left, document). Offline the icons are missing (round 1 saw the Messages icon missing), so the notes' "works offline … nothing is sent anywhere" is false. | the `errors` in `sweep-r4/sweep-*.json` (external-request) | The build bundles every icon (engineering). The reference should not depend on it either; until then the notes must not claim offline. |
| A-05 | Should | Names do not match: the rows "Agent Package Creator", "Market Researcher" and "Codex" open a run titled "Research Assistant". | `sweep-r4/021-run_Agent_Package_Creator.png` | The run's title is its row's agent. |
| A-06 | Should | Activity on a Team (Software Engineering Team, Support Team) is "No activity yet". | `sweep-r4/sweep-iphone.json` (log) | Give Teams some Activity, or accept the empty state for the stopped one only. |
| A-07 | Should | "Show older" repeats names: Daily Assistant 5×, Software Engineering Team 3×, Project Task Manager 2×, Codex 2×. It reads like filler. | `sweep-r4/sweep-iphone.json` (rows) | Fewer older rows, or distinct agents and titles. |
| A-08 | Engineering | Console: "Disconnection timed out." (VNC) and Vue "Set operation on key … failed: target is readonly" warnings. | the sweep's errors | The build has no console errors on these paths. |
| A-09 | Check | The Artifacts viewer shows an edit (pencil) button. | `008…png` | In the demo, editing either works on the sample or is not offered. |

Not findings:
- "failed / error" in Daily Assistant's text is the sample release notes' own wording.
- iPhone landscape is usable.
- Other ways to connect offers Type an address and Paste a link (a reviewer may try them and see the normal "can't connect" message; acceptable, and the notes say connecting needs the desktop app).

Next: the designer fixes A-01…A-07 and A-09. I re-run this same sweep (all rows, all ⋮ entries, all files, attach, both sizes) until it reports no finding, and only then tell the founder the design can pass review. A-04 and A-08 become engineering acceptance criteria.

# Round 5 — strict sweep again, 2026-11-19 (design branch `1519e42e`)

Sweep (`crawl.mjs`): iPhone 440×956 and iPad 1180×820, 40 rows each, every ⋮ entry, the first files; **0 findings, 0 browser errors, 0 external requests** (`sweep-r5/`).
- Every Team and Org member opens, also after its Team was opened (iPad: `sweep-r5/029-run_implementation_engineer.png`).
- Titles match the rows; the older runs are distinct agents.
- No "not available" state: runs without files show the product's "No Artifacts yet".
- Attaching works: "I read sample.txt." (`upload.mjs`).

A further path (`final.mjs`): Settings on a live run (Stop first), then change the runtime and the model, Save, reopen; then Leave demo, Try demo again and open a Team member.
- Works: Stop, Save, the reopened values, Leave (back to the first screen), re-entry (the change forgotten, as designed), and a member opening after re-entry.

| ID | Severity | Finding | Fix |
| --- | --- | --- | --- |
| R5-01 | Blocker | Settings › Model for the other runtimes lists fixture names a reviewer sees: "GPT-5.6 Sol — Synthetic run-settings model", "GPT-5.6 Mini — Synthetic run-settings mode…" (runtimes Codex App Server, Claude Agent SDK). It is placeholder-like wording (2.1(a)) and does not match the demo's "demo/sample-model". | Every runtime's model list in the demo uses demo sample names and descriptions (no "Synthetic", "fixture", "run-settings model"). |
| R5-02 | Blocker | Choosing a model (Settings › Model sheet) logs `[Vue warn]: Unhandled error during execution of component event handler at <MobileChoiceSheet … label="Model">` (and a native event handler). An unhandled error on a tap risks a stuck screen or crash in the build. | Find and fix the error; choosing any model in any runtime logs nothing. |

Sweep addition: `crawl.mjs` will open every choice sheet (Runtime, Model and their options) in round 6.

# Round 6 — 2026-11-19 (design branch `81dc80e9`)

All four checks run on this version (data in `sweep-r6/`):
- `crawl.mjs`, iPhone 440×956 and iPad 1180×820: 40 rows each, every ⋮ entry, the first files; 0 findings, 0 browser errors, 0 external requests.
- `sheets.mjs`: every Runtime option and every Model option, in New run and in a stopped run's Settings, plus Refresh models. Every model is a sample ("A sample model. Its answers are scripted."), none uses fixture wording, 0 errors, Save enabled.
- `final.mjs`: live Settings → Stop → change → Save → reopen ("Codex App Server / Sample Codex mini"); Leave demo → Try demo → a Team member opens; 0 errors.
- `upload.mjs`: an attached file is read ("I read sample.txt."); 0 errors.

**Verdict on the design: it can pass App Review as designed.** On every surface a reviewer can reach in this reference, I find nothing Apple's 2.1(a) or 4.2 would reject.

This is no promise about the build. These become the engineering acceptance criteria, each to be verified by me on the built app with the same sweep (plus the native parts):
1. Every icon and asset is bundled, and the app makes no network request in airplane mode (A-04). Only then do the notes say "works offline".
2. No console errors on these paths (A-08, R5-02).
3. The real camera scans the demo QR, and the iPhone/iPad Camera app opens `autobyteus://demo`.
4. The app runs on iPhone and iPad (simulators, and a real iPhone through TestFlight on the founder's word) with no crash, from a fresh install.
5. Every step of the review notes works exactly as written.

For the notes (designer): add one sentence on why the app allows plain-HTTP web content (`NSAllowsArbitraryLoadsInWebContent`, `autobyteus-ios/AutoByteusMobile/Info.plist:63`). It connects only to the user's own computer, on a private network or Tailscale, which may not have HTTPS.

For App Store Connect (founder): a privacy policy link, the App Privacy answers ("Data not collected"), and iPhone and iPad screenshots.

# Round 7 — final reference, 2026-11-19 (design branch `78b51f73`)

All checks on the final reference (`sweep-r7/`):
- `crawl.mjs`, iPhone and iPad: 40 rows each, 0 findings, 0 errors, 0 external requests.
- `sheets.mjs`: every Runtime and Model option, sample names only, 0 errors.
- `final.mjs`: Settings stop, change, Save, reopen; Leave, re-enter, a member opens; 0 errors.
- `upload.mjs`: the attached file is read; 0 errors.
- `share.mjs` (D6, Android behavior): a pairing link → "Saved. Open AutoByteus to connect." and connects on the next open; `autobyteus://demo` → the demo opens; other text → Type an address pre-filled; nothing usable → "AutoByteus couldn't read text or a link from this share."; the shared text is used once; 0 errors. (In the reference a pairing link "connects" to the mock node; in the build a reviewer without a computer gets the can't-reach screen, as the notes say.)

**Verdict: the final design passes my App Reviewer sweep.** Ready for the founder's approval of the screens. The Round 6 engineering acceptance conditions stand.
