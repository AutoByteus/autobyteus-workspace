# Release Notes: Android APK Build And Website Download Support

## Added

- Added a signed Android APK release path for AutoByteus. Release tags now include an Android APK build workflow that publishes `AutoByteus_personal_android-<version>-release.apk` when Android signing secrets are configured.
- Added Android APK support to the autobyteus.com download flow. Android users are directed to the Android APK, and desktop users can manually choose `Android APK` from the download picker.

## Operational Notes

- Public Android APK publishing requires Android signing secrets in the AutoByteus workspace repository.
- Debug APKs remain build-only validation artifacts and are not published through GitHub Releases or the website download flow.
