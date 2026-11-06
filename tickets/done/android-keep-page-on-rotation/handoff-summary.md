# Handoff Summary: android-keep-page-on-rotation (autobyteus-415, prerequisite of autobyteus-407)

- Status: verified from the evidence (audited, not redone), archived and finalized on `personal`. **No release**: the ticket says "release only on the user's word", and the user's beta request covered the previous delivery (autobyteus-405, v1.5.12-beta.5).
- Classification: `task_size=Small`, `architectural_risk=Low`, direct route. No independent reviews; test-code review Not Required. API/E2E API-REV-001 Pass, 95.1%. Every AC is proven directly, and no category is below 93%.

## What Changed

- `MainActivity` declares `android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboard|keyboardHidden|navigation"` (`dd129696a4`). Rotating the phone, resizing its window (split screen, a foldable) or attaching a keyboard keeps the same activity, WebView and page instead of reloading the node's start page.
- Dark mode, language and font size still recreate the activity by design (DEC-001). The app then reopens the saved node, still paired.
- Tests:
  - `MainActivityManifestTest` (unit) checks the seven values.
  - `MainActivityConfigurationChangeTest` (instrumented, `a16b00c218`) checks that the same activity and the typed connection address survive landscape and back.
- `autobyteus-android/README.md` describes the behavior and how to run the instrumented tests.

## Integration

- Already current with `origin/personal` at `3bf9240d42`. There were no new base commits, so nothing was rerun.

## Verification (audit of the evidence)

- AC-001 (an open screen survives rotation; no second load):
  - API-03: a Files preview at 0° → 270° → 90° → 0° keeps `"marker":"api03-before-rotation","navigationStart":1793997597533`, with the preview shown.
  - The access proxy logged no request during the rotations; a final page fetch appears at once as line 107, so the proxy was live.
  - API-08 shows the same on Android 14.
  - The relaunch log has no MainActivity relaunch during any rotation (API-07b).
- AC-002 (typed address kept): IMP-03 keeps `http://abx415-typed-input.example:8000/mobile` in portrait, landscape and portrait again; before the fix it was lost. The durable instrumented test passes on API 35 and API 34. Its control without `configChanges` fails with `the activity is not recreated expected same:<…@31ba7ac> was not:<…@ec01336>`.
- AC-003 (insets in both orientations): API-08b. The WebView spans `[0,128][1080,2337]` at 0°, `[0,63][2272,1017]` with the cutout on the right at 270°, and `[128,63][2400,1017]` with the cutout on the left at 90°. After a resize the bounds follow the new navigation bar (API-06).
- AC-004 (seven values): the APK's `configChanges=0xdf0` decodes to exactly the seven values (IMP-05). `MainActivityManifestTest` passes, and fails against the unchanged manifest (IMP-06).
- AC-005 (no new permission; existing tests pass):
  - The APK's permissions are identical before and after (IMP-05).
  - Unit tests all pass (IMP-06).
  - Instrumented tests are `tests=13 failures=0` on API 35 and API 34.
  - The file chooser (API-04: `Context Files (1) abx415-upload.txt`, upload reaches the node) and the QR scanner (API-05) work across a rotation.
- Minor reading in API-03: the "portrait again" summary line shows the landscape viewport `863x360`. The step's own read after the last rotation (`mRotation=0`) shows `412x839`, so the summary was read before layout settled. Marker and `navigationStart` are unchanged in both, and this does not affect the result.
- No user check is needed. Everything was proven on emulators at API 35 and 34 against a real node. A physical phone is not used, by team rule.

## Residual

- No physical phone was used.
- Split screen and a hardware keyboard were not exercised. They are declared, and `wm size` exercises the same size values.
- The instrumented tests run only on demand. The README now gives the command.
- Follow-ups FU-001 and FU-002 are in `follow-ups.md`.

## Release

- None. The change ships in the next release the user asks for (its Android APK).
