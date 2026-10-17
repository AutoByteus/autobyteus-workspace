# Direct user check — 2026-10-13

Submitted through `request_user_input_async` in the Delivery worker conversation; tool returned `accepted: true`. No answer received as of DR-001. This records a request, not approval or acceptance.

1. “The fix passed browser and isolated Linux desktop testing; your installed app has not been updated. Which affected client are you using (desktop or browser), its OS/version, and is port 8001 its connected backend?”
2. “How should this fix ship? Repository-only is the default; publishing a beta or stable release is separate from updating your installed app.” Options: source-only/no release; next beta; stable.

Reason for the first question: REQ-005 / AC-007 / ASM-001 require affected-client identity to remain distinct from source/build proof. API/E2E already exercised current source, a self-owned browser and a current non-root sandboxed Linux ARM64 Electron build with real API/WS/data/worker preservation. This container cannot inspect the user's macOS binary/display/session, and testing the live app/data is forbidden. This is not a request to repeat proven source behavior, nor a reason to restart backend 8001.

No release is required by default under RELEASE.md. Lack of a release choice alone does not block source finalization. Any chosen publication/install/restart needs its own explicit authority. The affected-client check and any required user-only acceptance remain open; no installed-update claim.
