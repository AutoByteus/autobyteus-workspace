# Native implementation self-inspection notes

This is implementation-level rendered feedback, not an API/E2E report. Interactive controller commands and successful observations are in native-visual.json. The controller attaches only to native-start.json's owned instance and owns/removes its temporary fixture.

The first setup attempt used window.$nuxt.$router; production does not expose that global. It failed before navigating. Its earlier evidence remains in native-visual-attempt-1.json. The second setup uses the normal observed Electron hash route, and reads the app's existing Pinia through #__nuxt.__vue_app__ for evidence only. No selected context/config is manually changed.

After the first activation, the exact selected source root/ID is recovered and native bytes are loaded, but #contentViewer is absent. Screenshot native-recovered-brief.png records that state. Manual Files-strip activation reveals real content (native-after-manual-files.png). Initial controller observations happen after separate tool calls, not by assuming an awaited click means all application work settled.

Two subsequent attempted link clicks were blocked by the existing modal drawer's backdrop and timed out. This is a harness sequencing mistake, not a second product defect. No force-click or synthetic event bypass was used. Closing the drawer with Escape and then clicking the visible links exercised the actual action. Reopen/dedupe is proven by later state records (two unique tabs and active brief), not by the early screenshot filename native-readonly-deduped.png, which actually shows the second tab before the corrected reopen.

Cmd+S was pressed in the manually visible read-only preview. Only tab/Maximize/Close controls were rendered, and no WriteFileContent GraphQL operation was recorded. Real main-process missing and directory-path failures yielded local-file-preview:unavailable and local-file-preview:not-regular-file; manual Files reveal showed their localized viewer alerts. These do not waive the automatic-reveal defect DI-001.

Named browser-automation skill availability discrepancy: this runtime does not advertise that skill; the guide's autobyteus_mcps/browser-automation/SKILL.md location is absent. Used repository-existing packaged inspection pattern (playwright-core attached via CDP) rather than user's app or unrelated browser. The diagnostic remains ticket-scoped; it is not a new API/E2E suite.

Cleanup: controller unroutes/disconnects and removes its exact fixture. Isolated-app stop uses the exact instance ID and confirms graceful stop, root deletion and both port releases; list afterward is empty. No provider inference, keys, production DB or user files.
