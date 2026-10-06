# Release Notes — electron-host-file-open

Status: prepared before user verification; user has now authorized finalization and one new beta. **Not yet published**. Beta helper uses generated GitHub notes; this archived ticket note remains the durable fix/limitation summary, not stale stable curated notes.

## Fix
- Event Monitor activation of a supported local file in embedded Electron now uses the selected Agent/member workspace identity even when its metadata is incomplete, recovering a missing ID only from that execution's exact source root.
- The same activation automatically shows the read-only Files preview or ordinary file error in the existing responsive drawer or fitting dock. Reopening reuses the existing tab.

## Preserved Contracts
- Selected member/conversation and other tabs are retained; passive text does not open or read files.
- Remote/browser/mobile workspace containment and native absolute/regular/readable-file checks are unchanged. No edit/save access is added.
- No data migration, schema change or configuration action is required.

## Verification / Limits
API-REV-001: 214 web tests, 19 Electron tests, nine durable native/HTTP cases Pass; public saved projection/initial metadata fixtures and emulated responsive metrics disclosed. Delivery latest-base merge: 54 focused tests Pass. Exact installed-user state and other platforms are not certified. Explicit evidence-based completion/acceptance direction received: “finalize and release a new beta version”; no manual test claimed.
