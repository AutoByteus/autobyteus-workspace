# Independent real desktop validation — API-REV-001
Corrected worktree build 1.4.92-beta.9, production source e67f6f4f3; exact converter packaged/dist SHA-256 equal (build-identity.txt). Isolated instance iso-60354-9ef4, own data, control 60354/backend 60355. AGY CLI 1.2.15 with existing authenticated account; Daily Assistant, antigravity_cli, gemini-3.8-flash-medium selected through actual UI, confirmed in saved metadata. No vault copy/import required.

## Journey and direct proof
1. New chat selected configured runtime/model; read-only shell snapshot empty.
2. Asked actual agent to open test-owned localhost /first; returned c4cffe, assigned to shell. Tools panel was initially collapsed; no visible selection/native viewport proof captured for that opening. Guarded attempted Activity click deliberately did nothing after finding an assigned session, so it did not overwrite selection. This first request is setup evidence, NOT a counted visible-attachment pass.
3. Opened Activity through UI. Actual second request /second with reuse_existing=false: before Activity=true/Browser=false, after Browser=true/Activity=false; active shell 874f12 equals canonical actual tool result. Native same URL/title + fixture marker, 696×757 viewport. No focus/Browser click between request and observation.
4. Selected Activity again, submitted third request /third. Same direct correlation for 2a801b, 696×757; all three sessions retained. Two independent Activity-origin visible opens satisfy repeated journey. No provider-output injection or store mutation.
5. Selected Activity, terminated run via UI, observed Offline; New chat then reopened saved sidebar run. First text-based click missed due changing relative time, retried using observed data-run-id selector. Activity remained selected, shell snapshot unchanged; all 3 exact tool results preserved in GraphQL saved projection and displayed conversation. No historical focus replay.
6. Correlation assertions in assert-desktop.cjs all passed (desktop-assertions.json). Screenshots inspected: native content clear; renderer Browser tab and session selection/address correct. Main renderer screenshot does not include native WebContentsView pixels, as documented; native screenshot captured separately.
7. Stopped only owned desktop, removed its auto-created data root, freed both ports; stopped local fixture server and verified port freed. Receipts retained. No production app/data touched.

## Incidental probe corrections / limits
- An observation script initially used innerText on SVG-bearing nodes and threw; corrected to textContent, no product mutation or relaxed assertion.
- Saved sidebar text-selector click returned NOT_FOUND; selector-based real UI retry succeeded.
- First opening while tools panel was collapsed proves assignment only. No claim of new auto-expansion policy or generalized collapsed-panel/recovery behavior.
- No broad viewport/platform sweep, live other-runtime matrix, cookie persistence across app upgrade, or F-002 IPC rejection recovery test. Current architecture/eligibility/lease units and exact scope preservation apply; these are not newly implemented capabilities.
- Model-generated statements are not proof: actual trace/metadata, shell snapshot, panel DOM, native DOM/viewport and normal history API are independently correlated.
- AGY may retain its own authenticated-provider conversation records; no broad deletion of provider home/auth state attempted. Owned AutoByteus data was removed.
