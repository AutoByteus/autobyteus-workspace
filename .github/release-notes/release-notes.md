## Improvements
- Improved generated work-trace readability for Skill Improvement by using canonical role/event labels and keeping target identity in metadata.
- Documented the Docker server browser-opening bridge used by CLI auth/device-login flows.

## Fixes
- Fixed Docker server CLI browser opening so root-shell auth flows route URLs into the VNC Chromium session without recursively re-entering the bridge or failing with `runuser: may not be used by non-root users`.
- Rebuilt Docker server images include the corrected browser bridge; recreate or upgrade existing containers to pick up the fix.
